-- Apply after 20261005121608_manifestazioni_interesse.sql and before deploying
-- the notification UI. This migration backfills existing interests as unread;
-- all other event types begin here. News publishing is intentionally deferred.
-- Reads and read acknowledgements are service-role RPCs behind authenticated
-- application endpoints; private tables are never exposed to browser clients.
begin;
set local lock_timeout = '10s';

create table private.notifiche (
  id bigint generated always as identity primary key,
  destinatario uuid not null references public.utente(utente_uuid) on delete cascade,
  tipo text not null check (tipo in ('interesse','follower','annuncio_seguito','stato_annuncio','segnalazione','profilo_speciale','novita')),
  evento text not null,
  dati jsonb not null default '{}'::jsonb,
  interesse_id bigint references private.manifestazioni_interesse(id) on delete set null,
  creato_il timestamptz not null default clock_timestamp(),
  letto_il timestamptz,
  unique (destinatario, evento)
);
create index notifiche_destinatario_data_idx on private.notifiche (destinatario, creato_il desc, id desc);
create index notifiche_non_lette_idx on private.notifiche (destinatario) where letto_il is null;
create index notifiche_interesse_idx on private.notifiche (interesse_id) where interesse_id is not null;
alter table private.notifiche enable row level security;
alter table private.notifiche force row level security;
revoke all on private.notifiche from public, anon, authenticated;
revoke all on sequence private.notifiche_id_seq from public, anon, authenticated;
grant select, insert, update, delete on private.notifiche to service_role;
grant usage, select on sequence private.notifiche_id_seq to service_role;

-- A separate marker prevents republishing existing announcements from notifying followers.
create table private.annunci_notificati (
  annuncio uuid primary key references public.annuncio(uuid) on delete cascade
);
alter table private.annunci_notificati enable row level security;
alter table private.annunci_notificati force row level security;
revoke all on private.annunci_notificati from public, anon, authenticated;
grant select, insert, delete on private.annunci_notificati to service_role;
insert into private.annunci_notificati select uuid from public.annuncio where stato_annuncio = 'pubblicato';

-- Resolve the precise subprofile at event time; no dynamic table names or SQL.
create function private.notification_profile_ref(p_id uuid, p_type text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_type text; v_detail jsonb; v_label text;
begin
  select coalesce(p_type, tipologia_principale) into v_type from public.profilo
    where uuid = p_id and nascosto is false and uuid_utente is not null;
  if not found then return null; end if;
  case v_type
    when 'giocatore' then select to_jsonb(p) into v_detail from public.profilo_giocatore p where uuid_profilo = p_id and nascosto is false;
    when 'squadra' then select to_jsonb(p) into v_detail from public.profilo_squadra p where uuid_profilo = p_id and nascosto is false;
    when 'staff-sportivo' then select to_jsonb(p) into v_detail from public.profilo_staff_sportivo p where uuid_profilo = p_id and nascosto is false;
    when 'arbitro' then select to_jsonb(p) into v_detail from public.profilo_arbitro p where uuid_profilo = p_id and nascosto is false;
    when 'torneo-evento' then select to_jsonb(p) into v_detail from public.profilo_torneo_evento p where uuid_profilo = p_id and nascosto is false;
    when 'campi-impianti-sportivi' then select to_jsonb(p) into v_detail from public.profilo_campi_impianti p where uuid_profilo = p_id and nascosto is false;
    when 'servizi-consulenze' then select to_jsonb(p) into v_detail from public.profilo_servizi_consulenze p where uuid_profilo = p_id and nascosto is false;
    when 'creators' then select to_jsonb(p) into v_detail from public.profilo_creator p where uuid_profilo = p_id and nascosto is false;
    else return null;
  end case;
  if v_detail is null then return null; end if;
  v_label := coalesce(nullif(v_detail->>'nome_societa',''), nullif(v_detail->>'nome_creator',''),
    nullif(v_detail->>'nome_organizzazione',''), nullif(btrim(concat_ws(' ',v_detail->>'nome',v_detail->>'cognome')),''), 'Profilo');
  return jsonb_build_object('id',p_id,'type',v_type,'kind','profilo','label',v_label);
end;
$$;

create function private.notification_target_ref(p_announcement uuid, p_profile uuid, p_type text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_title text;
begin
  if p_announcement is null then return private.notification_profile_ref(p_profile,p_type); end if;
  select titolo_annuncio into v_title from public.annuncio where uuid = p_announcement;
  if not found then return null; end if;
  return jsonb_build_object('id',p_announcement,'kind','annuncio','label',coalesce(nullif(v_title,''),'Annuncio'));
end;
$$;

create function private.notify_interest_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  insert into private.notifiche (destinatario,tipo,evento,dati,interesse_id,creato_il)
  values (new.uuid_utente_destinatario,'interesse','interesse:'||new.id,
    jsonb_build_object('actor',private.notification_profile_ref(new.uuid_profilo_mittente,new.sottoprofilo_mittente),
      'target',private.notification_target_ref(new.uuid_annuncio,new.uuid_profilo_destinatario,new.sottoprofilo_destinatario)),
    new.id,new.creato_il) on conflict do nothing;
  return new;
end;
$$;
create trigger notification_interest after insert on private.manifestazioni_interesse
  for each row execute function private.notify_interest_v1();

insert into private.notifiche (destinatario,tipo,evento,dati,interesse_id,creato_il)
select uuid_utente_destinatario,'interesse','interesse:'||id,
  jsonb_build_object('actor',private.notification_profile_ref(uuid_profilo_mittente,sottoprofilo_mittente),
    'target',private.notification_target_ref(uuid_annuncio,uuid_profilo_destinatario,sottoprofilo_destinatario)),id,creato_il
from private.manifestazioni_interesse on conflict do nothing;

create function private.notify_follow_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_recipient uuid;
begin
  select p.uuid_utente into v_recipient from public.profilo p join public.utente u on u.utente_uuid = p.uuid_utente
    where p.uuid = new.uuid_profilo_seguito and u.registrato_il is not null;
  if v_recipient is not null then
    insert into private.notifiche (destinatario,tipo,evento,dati)
    values (v_recipient,'follower','follower:'||new.uuid_profilo_follower||':'||new.uuid_profilo_seguito||':'||new.creato_il,
      jsonb_build_object('actor',private.notification_profile_ref(new.uuid_profilo_follower),
        'target',private.notification_profile_ref(new.uuid_profilo_seguito))) on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger notification_follow after insert on public.profilo_follow for each row execute function private.notify_follow_v1();

create function private.notify_announcement_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_owner uuid; v_target jsonb; v_first uuid;
begin
  select p.uuid_utente into v_owner from public.profilo p join public.utente u on u.utente_uuid = p.uuid_utente
    where p.uuid = new.autore_annuncio and u.registrato_il is not null;
  v_target := private.notification_target_ref(new.uuid,null);
  if v_owner is not null and new.stato_annuncio is not null then
    if tg_op = 'INSERT' or old.stato_annuncio is distinct from new.stato_annuncio then
      insert into private.notifiche (destinatario,tipo,evento,dati)
      values (v_owner,'stato_annuncio','stato:'||new.uuid||':'||gen_random_uuid(),
        jsonb_build_object('target',v_target,'state',new.stato_annuncio,'info',new.info_stato_annuncio));
    end if;
  end if;
  if new.stato_annuncio = 'pubblicato' and new.nascosto is false and new.privato is false then
    insert into private.annunci_notificati values (new.uuid) on conflict do nothing returning annuncio into v_first;
    if v_first is not null and v_owner is not null then
      insert into private.notifiche (destinatario,tipo,evento,dati)
      select distinct p.uuid_utente,'annuncio_seguito','pubblicazione:'||new.uuid,
        jsonb_build_object('actor',private.notification_profile_ref(new.autore_annuncio), 'target',v_target)
      from public.profilo_follow f join public.profilo p on p.uuid = f.uuid_profilo_follower
        join public.utente u on u.utente_uuid = p.uuid_utente
      where f.uuid_profilo_seguito = new.autore_annuncio and p.uuid_utente <> v_owner and u.registrato_il is not null
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;
create trigger notification_announcement after insert or update of stato_annuncio,nascosto,privato on public.annuncio
  for each row execute function private.notify_announcement_v1();

create function private.notify_report_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.uuid_utente_segnalatore is not null then
    insert into private.notifiche (destinatario,tipo,evento,dati)
    values (new.uuid_utente_segnalatore,'segnalazione','segnalazione:'||new.id,
      jsonb_build_object('target',private.notification_target_ref(new.uuid_annuncio,new.uuid_profilo))) on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger notification_report after insert on private.segnalazioni for each row execute function private.notify_report_v1();

create function private.notify_special_profile_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_owner uuid;
begin
  select uuid_utente into v_owner from public.profilo where uuid = new.profile_id;
  if v_owner is not null then
    insert into private.notifiche (destinatario,tipo,evento,dati)
    values (v_owner,'profilo_speciale','abilitazione:'||new.profile_id||':'||new.profile_type||':'||new.enabled_at,
      jsonb_build_object('state',new.profile_type)) on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger notification_special_profile after insert on public.restricted_profile_access
  for each row execute function private.notify_special_profile_v1();

-- Links are resolved again when reading; removed content retains its descriptive snapshot.
create function private.notification_display_ref(p_ref jsonb, p_owner_target boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_href text;
begin
  if p_ref is null or p_ref = 'null'::jsonb then return null; end if;
  if p_ref->>'kind' = 'profilo' then
    if private.notification_profile_ref((p_ref->>'id')::uuid,p_ref->>'type') is not null then
      v_href := '/dettagli-profilo?id='||(p_ref->>'id')||'&type='||(p_ref->>'type');
    end if;
  elsif exists (select 1 from public.annuncio where uuid = (p_ref->>'id')::uuid) then
    if p_owner_target then v_href := '/il-tuo-profilo?sezione=annunci';
    elsif exists (select 1 from public.annuncio where uuid = (p_ref->>'id')::uuid and stato_annuncio = 'pubblicato' and privato is false) then
      v_href := '/dettagli-annuncio?id='||(p_ref->>'id');
    end if;
  end if;
  return jsonb_build_object('label',p_ref->>'label','href',v_href);
end;
$$;

create function public.get_notifications_v1(p_user uuid, p_limit integer default 20, p_cursor_date timestamptz default null, p_cursor_id bigint default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_items jsonb; v_cursor jsonb; v_count bigint;
begin
  if p_limit not in (0,3,20) or p_limit is null or (p_cursor_date is null) <> (p_cursor_id is null) then
    raise exception 'Invalid notification pagination' using errcode = '22023';
  end if;
  select count(*) into v_count from private.notifiche where destinatario = p_user and letto_il is null;
  with page as (
    select n.* from private.notifiche n where n.destinatario = p_user
      and (p_cursor_date is null or (n.creato_il,n.id) < (p_cursor_date,p_cursor_id))
    order by n.creato_il desc,n.id desc limit p_limit + 1
  ), shown as (select * from page order by creato_il desc,id desc limit p_limit)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id::text,'type',s.tipo,'createdAt',s.creato_il,'readAt',s.letto_il,
    'actor',private.notification_display_ref(s.dati->'actor'),
    'target',private.notification_display_ref(s.dati->'target',s.tipo = 'stato_annuncio'),
    'targetKind',s.dati->'target'->>'kind','state',s.dati->>'state','info',s.dati->>'info',
    'email',i.email,'phone',i.telefono) order by s.creato_il desc,s.id desc),'[]'::jsonb),
    case when (select count(*) from page) > p_limit and p_limit > 0 then
      (select jsonb_build_object('date',creato_il,'id',id::text) from shown order by creato_il,id limit 1) else null end
  into v_items,v_cursor from shown s left join private.manifestazioni_interesse i
    on i.id = s.interesse_id and i.uuid_utente_destinatario = p_user;
  return jsonb_build_object('items',v_items,'nextCursor',v_cursor,'unreadCount',v_count);
end;
$$;

create function public.mark_notifications_read_v1(p_user uuid, p_ids bigint[])
returns bigint language plpgsql security invoker set search_path = '' as $$
declare v_count bigint;
begin
  if coalesce(cardinality(p_ids),0) > 20 then raise exception 'Too many notification IDs' using errcode = '22023'; end if;
  update private.notifiche set letto_il = clock_timestamp() where destinatario = p_user and id = any(p_ids) and letto_il is null;
  select count(*) into v_count from private.notifiche where destinatario = p_user and letto_il is null;
  return v_count;
end;
$$;

revoke all on function private.notification_profile_ref(uuid,text), private.notification_target_ref(uuid,uuid,text),
  private.notification_display_ref(jsonb,boolean), private.notify_interest_v1(),private.notify_follow_v1(),
  private.notify_announcement_v1(),private.notify_report_v1(),private.notify_special_profile_v1(),
  public.get_notifications_v1(uuid,integer,timestamptz,bigint),public.mark_notifications_read_v1(uuid,bigint[])
  from public, anon, authenticated;
grant execute on function private.notification_profile_ref(uuid,text),private.notification_target_ref(uuid,uuid,text),
  private.notification_display_ref(jsonb,boolean),private.notify_interest_v1(),private.notify_follow_v1(),
  private.notify_announcement_v1(),private.notify_report_v1(),private.notify_special_profile_v1(),
  public.get_notifications_v1(uuid,integer,timestamptz,bigint),public.mark_notifications_read_v1(uuid,bigint[]) to service_role;
commit;

-- Apply after centro_notifiche, before deploying the new Follow UI.
begin;

-- Visibility writes now use the authorized server writer; retain the authenticated actor.
create or replace function private.stamp_annuncio_visibility_update() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.nascosto is distinct from old.nascosto then
    new.ultima_modifica_il := now();
    new.ultima_modifica_da := coalesce((select auth.uid()),new.ultima_modifica_da);
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_annuncio_visibility_update() from public,anon,authenticated,service_role;

create function private.follow_default_type(p_id uuid) returns text
language sql stable security invoker set search_path = '' as $$
  select t.type from public.profilo p cross join unnest(array[
    'giocatore','squadra','staff-sportivo','arbitro','torneo-evento',
    'campi-impianti-sportivi','servizi-consulenze','creators']) with ordinality as t(type, position)
  where p.uuid = p_id and private.notification_profile_ref(p_id,t.type) is not null
  order by (t.type = p.tipologia_principale) desc, t.position limit 1;
$$;

alter table public.profilo_follow add column sottoprofilo_follower text, add column sottoprofilo_seguito text;
update public.profilo_follow set sottoprofilo_follower = private.follow_default_type(uuid_profilo_follower),
  sottoprofilo_seguito = private.follow_default_type(uuid_profilo_seguito);

-- Preserve unresolved legacy rows privately; never invent an unavailable identity.
create table private.follow_legacy_archive (
  uuid_profilo_follower uuid not null, uuid_profilo_seguito uuid not null, creato_il timestamptz not null,
  primary key(uuid_profilo_follower,uuid_profilo_seguito)
);
insert into private.follow_legacy_archive
  select uuid_profilo_follower,uuid_profilo_seguito,creato_il from public.profilo_follow
  where sottoprofilo_follower is null or sottoprofilo_seguito is null;
delete from public.profilo_follow where sottoprofilo_follower is null or sottoprofilo_seguito is null;
alter table private.follow_legacy_archive enable row level security;
alter table private.follow_legacy_archive force row level security;
revoke all on private.follow_legacy_archive from public,anon,authenticated;
grant select on private.follow_legacy_archive to service_role;

alter table public.profilo_follow
  alter column sottoprofilo_follower set not null, alter column sottoprofilo_seguito set not null,
  drop constraint profilo_follow_pkey,
  add primary key(uuid_profilo_follower,uuid_profilo_seguito,sottoprofilo_seguito),
  add constraint follow_source_type check(sottoprofilo_follower in ('giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators')),
  add constraint follow_target_type check(sottoprofilo_seguito in ('giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators'));
create index follow_target_subprofile_idx on public.profilo_follow(uuid_profilo_seguito,sottoprofilo_seguito,creato_il desc);
create index follow_source_subprofile_idx on public.profilo_follow(uuid_profilo_follower,sottoprofilo_follower);
comment on table public.profilo_follow is 'Exact subprofile follows; one sender account per target subprofile. Server RPC authorizes writes.';

create table private.follow_daily_usage (
  sender uuid not null references public.utente(utente_uuid) on delete cascade,
  day date not null, used smallint not null check(used between 1 and 30), primary key(sender,day)
);
alter table private.follow_daily_usage enable row level security;
alter table private.follow_daily_usage force row level security;
revoke all on private.follow_daily_usage from public,anon,authenticated;
grant select,insert,update,delete on private.follow_daily_usage to service_role;

create function public.set_profile_follow_v2(p_user uuid,p_target uuid,p_target_type text,p_source_type text,p_followed boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_own uuid; v_source text; v_day date; v_used integer;
begin
  if p_followed is null or p_target_type is null or p_target_type not in ('giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators') then
    raise exception using errcode='22023',message='FOLLOW_PROFILE_UNAVAILABLE';
  end if;
  select p.uuid into v_own from public.profilo p join public.utente u on u.utente_uuid=p.uuid_utente
    where u.utente_uuid=p_user and u.registrato_il is not null;
  if v_own is null then raise exception using errcode='P0001',message='FOLLOW_PROFILE_UNAVAILABLE'; end if;
  if v_own=p_target then raise exception using errcode='P0001',message='FOLLOW_SELF'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('follow:'||p_user::text,0));
  -- Subprofile deletion writers lock their parent too. Use a consistent order.
  perform 1 from public.profilo where uuid in(v_own,p_target) order by uuid for update;
  if not p_followed then
    delete from public.profilo_follow where uuid_profilo_follower=v_own and uuid_profilo_seguito=p_target and sottoprofilo_seguito=p_target_type;
    return jsonb_build_object('active',false,'sourceType',null);
  end if;
  select sottoprofilo_follower into v_source from public.profilo_follow
    where uuid_profilo_follower=v_own and uuid_profilo_seguito=p_target and sottoprofilo_seguito=p_target_type;
  if found then return jsonb_build_object('active',true,'sourceType',v_source); end if;
  if private.notification_profile_ref(v_own,p_source_type) is null or p_source_type is null
    or private.notification_profile_ref(p_target,p_target_type) is null
    or not exists(select 1 from public.profilo p join public.utente u on u.utente_uuid=p.uuid_utente where p.uuid=p_target and u.registrato_il is not null) then
    raise exception using errcode='P0001',message='FOLLOW_PROFILE_UNAVAILABLE';
  end if;
  v_day := (clock_timestamp() at time zone 'Europe/Rome')::date;
  select used into v_used from private.follow_daily_usage where sender=p_user and day=v_day;
  if coalesce(v_used,0)>=30 then raise exception using errcode='P0001',message='FOLLOW_DAILY_LIMIT'; end if;
  insert into public.profilo_follow(uuid_profilo_follower,uuid_profilo_seguito,sottoprofilo_follower,sottoprofilo_seguito)
    values(v_own,p_target,p_source_type,p_target_type);
  insert into private.follow_daily_usage values(p_user,v_day,1)
    on conflict(sender,day) do update set used=private.follow_daily_usage.used+1;
  return jsonb_build_object('active',true,'sourceType',p_source_type);
end;
$$;

create or replace function private.notify_follow_v1() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_recipient uuid;
begin
  select p.uuid_utente into v_recipient from public.profilo p join public.utente u on u.utente_uuid=p.uuid_utente
    where p.uuid=new.uuid_profilo_seguito and u.registrato_il is not null;
  if v_recipient is not null then
    insert into private.notifiche(destinatario,tipo,evento,dati)
    values(v_recipient,'follower','follower:'||gen_random_uuid(),
      jsonb_build_object('actor',private.notification_profile_ref(new.uuid_profilo_follower,new.sottoprofilo_follower),
        'target',private.notification_profile_ref(new.uuid_profilo_seguito,new.sottoprofilo_seguito))) on conflict do nothing;
  end if;
  return new;
end;
$$;

create function private.announcement_profile_type(p_type text) returns text
language sql immutable security invoker set search_path = '' as $$
  select case p_type
    when 'annuncio_giocatore' then 'giocatore'
    when 'annuncio_staff_sportivo' then 'staff-sportivo'
    when 'annuncio_arbitro' then 'arbitro'
    when 'annuncio_torneo_evento' then 'torneo-evento'
    when 'annuncio_campo_impianto' then 'campi-impianti-sportivi'
    when 'annuncio_servizi_consulenze' then 'servizi-consulenze'
    when 'annuncio_creators' then 'creators'
    when 'annuncio_squadra' then 'squadra'
    when 'annuncio_squadra_cerca_giocatore' then 'squadra'
    when 'annuncio_squadra_cerca_staff' then 'squadra'
    when 'annuncio_squadra_cerca_partita' then 'squadra'
    when 'annuncio_squadra_cerca_sponsor' then 'squadra' end;
$$;
create or replace function private.notify_announcement_v1() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_owner uuid; v_target jsonb; v_first uuid; v_type text;
begin
  select p.uuid_utente into v_owner from public.profilo p join public.utente u on u.utente_uuid=p.uuid_utente
    where p.uuid=new.autore_annuncio and u.registrato_il is not null;
  v_target := private.notification_target_ref(new.uuid,null);
  v_type := private.announcement_profile_type(new.tipologia_annuncio);
  if v_owner is not null and new.stato_annuncio is not null then
    if tg_op='INSERT' or old.stato_annuncio is distinct from new.stato_annuncio then
      insert into private.notifiche(destinatario,tipo,evento,dati)
      values(v_owner,'stato_annuncio','stato:'||new.uuid||':'||gen_random_uuid(),
        jsonb_build_object('target',v_target,'state',new.stato_annuncio,'info',new.info_stato_annuncio));
    end if;
  end if;
  if new.stato_annuncio='pubblicato' and new.nascosto is false and new.privato is false then
    insert into private.annunci_notificati values(new.uuid) on conflict do nothing returning annuncio into v_first;
    if v_first is not null and v_owner is not null then
      insert into private.notifiche(destinatario,tipo,evento,dati)
      select distinct p.uuid_utente,'annuncio_seguito','pubblicazione:'||new.uuid,
        jsonb_build_object('actor',private.notification_profile_ref(new.autore_annuncio,v_type),'target',v_target)
      from public.profilo_follow f join public.profilo p on p.uuid=f.uuid_profilo_follower
        join public.utente u on u.utente_uuid=p.uuid_utente
      where f.uuid_profilo_seguito=new.autore_annuncio and f.sottoprofilo_seguito=v_type
        and private.notification_profile_ref(f.uuid_profilo_follower,f.sottoprofilo_follower) is not null
        and p.uuid_utente<>v_owner and u.registrato_il is not null on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

-- Only hashes and dates are stored; snapshots are computed on writes, never in directory queries.
create table private.profile_activity (
  profile_id uuid not null references public.profilo(uuid) on delete cascade,
  profile_type text not null, content_hash text not null, last_activity timestamptz not null,
  primary key(profile_id,profile_type)
);
create table private.announcement_activity (
  announcement_id uuid primary key references public.annuncio(uuid) on delete cascade,
  content_hash text not null
);
alter table private.profile_activity enable row level security;
alter table private.profile_activity force row level security;
alter table private.announcement_activity enable row level security;
alter table private.announcement_activity force row level security;
revoke all on private.profile_activity,private.announcement_activity from public,anon,authenticated;
grant select,insert,update,delete on private.profile_activity,private.announcement_activity to service_role;

create function private.profile_content_snapshot(p_id uuid,p_type text) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_content jsonb; v_image text;
begin
  case p_type
    when 'giocatore' then select to_jsonb(p) into v_content from public.profilo_giocatore p where uuid_profilo=p_id;
    when 'squadra' then select to_jsonb(p) into v_content from public.profilo_squadra p where uuid_profilo=p_id;
    when 'staff-sportivo' then select to_jsonb(p) into v_content from public.profilo_staff_sportivo p where uuid_profilo=p_id;
    when 'arbitro' then select to_jsonb(p) into v_content from public.profilo_arbitro p where uuid_profilo=p_id;
    when 'torneo-evento' then select to_jsonb(p) into v_content from public.profilo_torneo_evento p where uuid_profilo=p_id;
    when 'campi-impianti-sportivi' then select to_jsonb(p) into v_content from public.profilo_campi_impianti p where uuid_profilo=p_id;
    when 'servizi-consulenze' then select to_jsonb(p) into v_content from public.profilo_servizi_consulenze p where uuid_profilo=p_id;
    when 'creators' then select to_jsonb(p) into v_content from public.profilo_creator p where uuid_profilo=p_id;
    else return null;
  end case;
  if v_content is null then return null; end if;
  select link_media into v_image from public.media_profilo
    where uuid_profilo=p_id and sottoprofilo=p_type and formato_media='foto_profilo' order by id desc limit 1;
  if not found then select link_foto_profilo into v_image from public.profilo where uuid=p_id; end if;
  return jsonb_build_object('content',v_content-array['id','uuid_profilo','nascosto','richiede_caricamento_highlights'],'image',nullif(v_image,''),
    'locations',(select coalesce(jsonb_agg(jsonb_build_array(regione,citta) order by regione,citta),'[]'::jsonb) from public.localita_profilo where uuid_profilo=p_id and sottoprofilo=p_type),
    'social',(select coalesce(jsonb_agg(jsonb_build_array(piattaforma,sublink) order by piattaforma,sublink),'[]'::jsonb) from public.link_social_profilo where uuid_profilo=p_id and sottoprofilo=p_type),
    'highlights',(select coalesce(jsonb_agg(link_media order by link_media),'[]'::jsonb) from public.media_profilo where uuid_profilo=p_id and formato_media='video_highlights' and p_type='giocatore'));
end;
$$;

create function private.refresh_profile_activity(p_id uuid,p_type text) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_hash text;
begin
  perform 1 from public.profilo where uuid=p_id for update;
  v_hash := md5(private.profile_content_snapshot(p_id,p_type)::text);
  if v_hash is null then return; end if;
  insert into private.profile_activity values(p_id,p_type,v_hash,transaction_timestamp())
    on conflict(profile_id,profile_type) do update set content_hash=excluded.content_hash,
      last_activity=greatest(private.profile_activity.last_activity,excluded.last_activity)
    where private.profile_activity.content_hash is distinct from excluded.content_hash;
end;
$$;

-- Deferred triggers see the final state: delete/reinsert of identical locations or links is a no-op.
create function private.track_profile_activity() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_row jsonb; v_old jsonb; v_id uuid; v_type text;
begin
  if tg_op<>'DELETE' then v_row:=to_jsonb(new); else v_row:=to_jsonb(old); end if;
  if tg_op='UPDATE' then v_old:=to_jsonb(old); end if;
  v_id:=coalesce((v_row->>'uuid_profilo')::uuid,(v_row->>'uuid')::uuid);
  if tg_nargs>0 then
    perform private.refresh_profile_activity(v_id,tg_argv[0]);
  elsif v_row->>'sottoprofilo' is not null then
    perform private.refresh_profile_activity(v_id,v_row->>'sottoprofilo');
  else
    foreach v_type in array array['giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators'] loop
      perform private.refresh_profile_activity(v_id,v_type);
    end loop;
  end if;
  -- Also refresh the old scope if an administrative update reassigned a sidecar row.
  if v_old is not null and (v_old->>'uuid_profilo',v_old->>'sottoprofilo') is distinct from (v_row->>'uuid_profilo',v_row->>'sottoprofilo') then
    v_id:=(v_old->>'uuid_profilo')::uuid;
    foreach v_type in array array['giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators'] loop
      perform private.refresh_profile_activity(v_id,v_type);
    end loop;
  end if;
  return null;
end;
$$;

create function private.cleanup_subprofile_follow() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.profilo where uuid=old.uuid_profilo for update;
  delete from public.profilo_follow where (uuid_profilo_follower=old.uuid_profilo and sottoprofilo_follower=tg_argv[0])
    or (uuid_profilo_seguito=old.uuid_profilo and sottoprofilo_seguito=tg_argv[0]);
  delete from private.profile_activity where profile_id=old.uuid_profilo and profile_type=tg_argv[0];
  return old;
end;
$$;

create function private.announcement_content_snapshot(p_id uuid) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_announcement public.annuncio; v_content jsonb;
begin
  select * into v_announcement from public.annuncio where uuid=p_id;
  if not found then return null; end if;
  case v_announcement.tipologia_annuncio
    when 'annuncio_giocatore' then select to_jsonb(a) into v_content from public.annuncio_giocatore a where uuid_annuncio=p_id;
    when 'annuncio_squadra_cerca_giocatore' then select to_jsonb(a) into v_content from public.annuncio_squadra_cerca_giocatore a where uuid_annuncio=p_id;
    when 'annuncio_squadra_cerca_staff' then select to_jsonb(a) into v_content from public.annuncio_squadra_cerca_staff a where uuid_annuncio=p_id;
    when 'annuncio_squadra_cerca_partita' then select to_jsonb(a) into v_content from public.annuncio_squadra_cerca_partita a where uuid_annuncio=p_id;
    when 'annuncio_squadra_cerca_sponsor' then select to_jsonb(a) into v_content from public.annuncio_squadra_cerca_sponsor a where uuid_annuncio=p_id;
    when 'annuncio_staff_sportivo' then select to_jsonb(a) into v_content from public.annuncio_staff_sportivo a where uuid_annuncio=p_id;
    when 'annuncio_arbitro' then select to_jsonb(a) into v_content from public.annuncio_arbitro a where uuid_annuncio=p_id;
    when 'annuncio_torneo_evento' then select to_jsonb(a) into v_content from public.annuncio_torneo_evento a where uuid_annuncio=p_id;
    when 'annuncio_campo_impianto' then select to_jsonb(a) into v_content from public.annuncio_campo_impianto a where uuid_annuncio=p_id;
    when 'annuncio_servizi_consulenze' then select to_jsonb(a) into v_content from public.annuncio_servizi_consulenze a where uuid_annuncio=p_id;
    when 'annuncio_creators' then select to_jsonb(a) into v_content from public.annuncio_creator a where uuid_annuncio=p_id;
    else return null;
  end case;
  return jsonb_build_object('title',v_announcement.titolo_annuncio,'type',v_announcement.tipologia_annuncio,
    'author',v_announcement.autore_annuncio,'content',v_content-'uuid_annuncio',
    'locations',(select coalesce(jsonb_agg(to_jsonb(a)-array['id','uuid_annuncio'] order by (to_jsonb(a)-array['id','uuid_annuncio'])::text),'[]'::jsonb) from public.localita_annuncio a where uuid_annuncio=p_id),
    'media',(select coalesce(jsonb_agg(jsonb_build_array(formato_media,link_media) order by formato_media,link_media),'[]'::jsonb) from public.media_annuncio where uuid_annuncio=p_id),
    'links',(select coalesce(jsonb_agg(jsonb_build_array(piattaforma,sublink) order by piattaforma,sublink),'[]'::jsonb) from public.link_social_annuncio where uuid_annuncio=p_id));
end;
$$;

create function private.track_announcement_activity() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_ann public.annuncio; v_hash text; v_changed uuid; v_type text;
begin
  if tg_op='DELETE' then
    v_id:=coalesce((to_jsonb(old)->>'uuid_annuncio')::uuid,(to_jsonb(old)->>'uuid')::uuid);
  else
    v_id:=coalesce((to_jsonb(new)->>'uuid_annuncio')::uuid,(to_jsonb(new)->>'uuid')::uuid);
  end if;
  select * into v_ann from public.annuncio where uuid=v_id;
  if not found or v_ann.stato_annuncio is distinct from 'pubblicato' or v_ann.nascosto is distinct from false or v_ann.privato is distinct from false then return null; end if;
  v_type:=private.announcement_profile_type(v_ann.tipologia_annuncio);
  if v_type is null or v_ann.autore_annuncio is null then return null; end if;
  v_hash:=md5(private.announcement_content_snapshot(v_id)::text);
  if v_hash is null then return null; end if;
  insert into private.announcement_activity values(v_id,v_hash)
    on conflict(announcement_id) do update set content_hash=excluded.content_hash
    where private.announcement_activity.content_hash is distinct from excluded.content_hash returning announcement_id into v_changed;
  if v_changed is not null then
    perform private.refresh_profile_activity(v_ann.autore_annuncio,v_type);
    update private.profile_activity set last_activity=greatest(last_activity,transaction_timestamp())
      where profile_id=v_ann.autore_annuncio and profile_type=v_type;
  end if;
  return null;
end;
$$;

-- Seed historical dates without treating deployment as community activity.
insert into private.profile_activity
select p.uuid,t.type,md5(private.profile_content_snapshot(p.uuid,t.type)::text),p.ultima_modifica_il
from public.profilo p cross join unnest(array['giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi','servizi-consulenze','creators']) as t(type)
where private.profile_content_snapshot(p.uuid,t.type) is not null;
insert into private.announcement_activity
select uuid,md5(private.announcement_content_snapshot(uuid)::text) from public.annuncio
where stato_annuncio='pubblicato' and private.announcement_content_snapshot(uuid) is not null;
update private.profile_activity p set last_activity=greatest(p.last_activity,a.created)
from (select autore_annuncio,private.announcement_profile_type(tipologia_annuncio) as type,max(creato_il) as created
  from public.annuncio where stato_annuncio='pubblicato' group by autore_annuncio,private.announcement_profile_type(tipologia_annuncio)) a
where p.profile_id=a.autore_annuncio and p.profile_type=a.type;

do $$
declare v_type text; v_table text;
begin
  for v_type,v_table in select * from (values
    ('giocatore','profilo_giocatore'),('squadra','profilo_squadra'),('staff-sportivo','profilo_staff_sportivo'),
    ('arbitro','profilo_arbitro'),('torneo-evento','profilo_torneo_evento'),('campi-impianti-sportivi','profilo_campi_impianti'),
    ('servizi-consulenze','profilo_servizi_consulenze'),('creators','profilo_creator')) as t(type,tbl) loop
    execute format('create constraint trigger profile_activity_change after insert or update or delete on public.%I deferrable initially deferred for each row execute function private.track_profile_activity(%L)',v_table,v_type);
    execute format('create trigger subprofile_follow_cleanup before delete on public.%I for each row execute function private.cleanup_subprofile_follow(%L)',v_table,v_type);
  end loop;
  foreach v_table in array array['profilo','localita_profilo','media_profilo','link_social_profilo'] loop
    execute format('create constraint trigger profile_activity_change after insert or update or delete on public.%I deferrable initially deferred for each row execute function private.track_profile_activity()',v_table);
  end loop;
  foreach v_table in array array['annuncio','annuncio_giocatore','annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff','annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor','annuncio_staff_sportivo','annuncio_arbitro','annuncio_torneo_evento','annuncio_campo_impianto','annuncio_servizi_consulenze','annuncio_creator','localita_annuncio','media_annuncio','link_social_annuncio'] loop
    execute format('create constraint trigger announcement_activity_change after insert or update or delete on public.%I deferrable initially deferred for each row execute function private.track_announcement_activity()',v_table);
  end loop;
end;
$$;

create function public.get_profile_activity_v1(p_ids uuid[])
returns table(profile_id uuid,profile_type text,last_activity timestamptz)
language plpgsql stable security invoker set search_path = '' as $$
begin
  if coalesce(cardinality(p_ids),0)>200 then raise exception using errcode='22023',message='INVALID_ACTIVITY_BATCH'; end if;
  return query select a.profile_id,a.profile_type,a.last_activity from private.profile_activity a where a.profile_id=any(p_ids);
end;
$$;

revoke all on function public.set_profile_follow_v2(uuid,uuid,text,text,boolean),public.get_profile_activity_v1(uuid[]) from public,anon,authenticated;
grant execute on function public.set_profile_follow_v2(uuid,uuid,text,text,boolean),public.get_profile_activity_v1(uuid[]) to service_role;
revoke all on function private.follow_default_type(uuid),private.announcement_profile_type(text),private.profile_content_snapshot(uuid,text),
  private.refresh_profile_activity(uuid,text),private.track_profile_activity(),private.cleanup_subprofile_follow(),private.announcement_content_snapshot(uuid),private.track_announcement_activity()
  from public,anon,authenticated;
grant execute on function private.follow_default_type(uuid),private.announcement_profile_type(text),private.profile_content_snapshot(uuid,text),
  private.refresh_profile_activity(uuid,text),private.track_profile_activity(),private.cleanup_subprofile_follow(),private.announcement_content_snapshot(uuid),private.track_announcement_activity()
  to service_role;
commit;

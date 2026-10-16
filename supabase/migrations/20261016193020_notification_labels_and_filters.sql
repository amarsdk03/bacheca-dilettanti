-- Apply before deploying the application using get_notifications_v2.
-- Existing RPCs remain compatible; browser roles receive no new database access.
begin;
set local lock_timeout = '10s';

create function private.notification_profile_type_label(p_type text)
returns text language sql immutable security invoker set search_path = '' as $$
  select case p_type
    when 'giocatore' then 'Giocatore' when 'squadra' then 'Squadra'
    when 'staff-sportivo' then 'Staff sportivo' when 'arbitro' then 'Arbitro'
    when 'torneo-evento' then 'Torneo o evento' when 'campi-impianti-sportivi' then 'Campo e impianto'
    when 'servizi-consulenze' then 'Servizi e professionisti' when 'creators' then 'Creator'
    else 'Profilo non disponibile' end;
$$;

-- Prefer the explicit announcement title, then the author's current public name.
-- Resolve the precise subprofile; its anonymity preference is applied by the resolver.
create or replace function private.notification_target_ref(p_announcement uuid, p_profile uuid, p_type text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_announcement record; v_type text; v_author jsonb; v_label text;
begin
  if p_announcement is null then return private.notification_profile_ref(p_profile,p_type); end if;
  select titolo_annuncio, tipologia_annuncio, autore_annuncio into v_announcement from public.annuncio where uuid = p_announcement;
  if not found then return null; end if;
  v_type := case v_announcement.tipologia_annuncio
    when 'annuncio_giocatore' then 'giocatore'
    when 'annuncio_staff_sportivo' then 'staff-sportivo'
    when 'annuncio_arbitro' then 'arbitro'
    when 'annuncio_torneo_evento' then 'torneo-evento'
    when 'annuncio_campo_impianto' then 'campi-impianti-sportivi'
    when 'annuncio_servizi_consulenze' then 'servizi-consulenze'
    when 'annuncio_creators' then 'creators'
    when 'annuncio_squadra_cerca_giocatore' then 'squadra'
    when 'annuncio_squadra_cerca_staff' then 'squadra'
    when 'annuncio_squadra_cerca_partita' then 'squadra'
    when 'annuncio_squadra_cerca_sponsor' then 'squadra'
    else null end;
  v_author := private.notification_profile_ref(v_announcement.autore_annuncio, v_type);
  v_label := coalesce(nullif(nullif(btrim(v_announcement.titolo_annuncio), ''), 'Annuncio'),
    nullif(nullif(btrim(v_author->>'label'), ''), 'Profilo'),
    private.notification_profile_type_label(v_type));
  return jsonb_build_object('id',p_announcement,'kind','annuncio','label',v_label);
end;
$$;

-- Refresh old references too. Hidden/deleted profiles never reveal saved names.
create or replace function private.notification_display_ref(p_ref jsonb, p_owner_target boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_href text; v_current jsonb; v_label text;
begin
  if p_ref is null or p_ref = 'null'::jsonb then return null; end if;
  if p_ref->>'kind' = 'profilo' then
    v_current := private.notification_profile_ref((p_ref->>'id')::uuid,p_ref->>'type');
    v_label := coalesce(nullif(nullif(btrim(v_current->>'label'), ''), 'Profilo'),
      private.notification_profile_type_label(p_ref->>'type'));
    if v_current is not null then
      v_href := '/dettagli-profilo?id='||(p_ref->>'id')||'&type='||(p_ref->>'type');
    end if;
  else
    v_current := private.notification_target_ref((p_ref->>'id')::uuid,null);
    v_label := coalesce(v_current->>'label', nullif(nullif(btrim(p_ref->>'label'), ''), 'Annuncio'), 'Annuncio non più disponibile');
    if v_current is not null then
      if p_owner_target then v_href := '/il-tuo-profilo?sezione=annunci';
      elsif exists (select 1 from public.annuncio where uuid = (p_ref->>'id')::uuid and stato_annuncio = 'pubblicato' and privato is false and nascosto is false) then
        v_href := '/dettagli-annuncio?id='||(p_ref->>'id');
      end if;
    end if;
  end if;
  return jsonb_build_object('label',v_label,'href',v_href);
end;
$$;

revoke all on function private.notification_profile_type_label(text) from public, anon, authenticated;
grant execute on function private.notification_profile_type_label(text) to service_role;

create function public.get_notifications_v2(p_user uuid, p_limit integer default 20, p_cursor_date timestamptz default null, p_cursor_id bigint default null, p_type text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_items jsonb; v_cursor jsonb; v_count bigint;
begin
  if p_limit not in (0,3,20) or p_limit is null or (p_cursor_date is null) <> (p_cursor_id is null) then
    raise exception 'Invalid notification pagination' using errcode = '22023';
  end if;
  if p_type is not null and p_type not in ('interesse','follower','annuncio_seguito','stato_annuncio','segnalazione','profilo_speciale','novita') then
    raise exception 'Invalid notification type' using errcode = '22023';
  end if;
  select count(*) into v_count from private.notifiche where destinatario = p_user and letto_il is null;
  with page as (
    select n.* from private.notifiche n where n.destinatario = p_user
      and (p_type is null or n.tipo = p_type)
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


revoke all on function public.get_notifications_v2(uuid,integer,timestamptz,bigint,text) from public, anon, authenticated;
grant execute on function public.get_notifications_v2(uuid,integer,timestamptz,bigint,text) to service_role;
notify pgrst, 'reload schema';
commit;

-- Step 10. Deploy compatible Web readers and drain old caches BEFORE enabling.
begin;
set local lock_timeout = '10s';
alter table public.annuncio add column eliminato_il timestamptz, add column eliminato_da uuid;
alter table public.annuncio add constraint annuncio_trash_metadata_v1 check
  ((eliminato_il is null)=(eliminato_da is null) and (eliminato_il is null or (isfinite(eliminato_il) and nascosto is true and oscurato_da_admin)));
create index annuncio_admin_trash_order_v1_idx on public.annuncio ((eliminato_il is not null),creato_il desc nulls last,uuid desc);
create table private.admin_trash_release_v1(singleton boolean primary key default true check(singleton),enabled boolean not null default false);
alter table private.admin_trash_release_v1 enable row level security;
revoke all on private.admin_trash_release_v1 from public,anon,authenticated,service_role;
insert into private.admin_trash_release_v1 values(true,false);

create function private.guard_announcement_trash_v1() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='DELETE' then
    if old.eliminato_il is not null then raise exception using errcode='42501',message='ANNOUNCEMENT_TRASH_PROTECTED'; end if;
    return old;
  end if;
  if tg_op='INSERT' then
    if new.eliminato_il is not null and current_user<>'postgres' then raise exception using errcode='42501',message='ANNOUNCEMENT_TRASH_PROTECTED'; end if;
    return new;
  end if;
  if (new.eliminato_il,new.eliminato_da) is distinct from (old.eliminato_il,old.eliminato_da) and current_user<>'postgres' then
    raise exception using errcode='42501',message='ANNOUNCEMENT_TRASH_PROTECTED';
  end if;
  if old.eliminato_il is not null and new.eliminato_il is not null then
    if (new.eliminato_il,new.eliminato_da) is distinct from (old.eliminato_il,old.eliminato_da)
      or (to_jsonb(new)-array['stato_annuncio','livello_annuncio','priorita_attiva','priorita_inizio_il','priorita_fine_il','info_stato_annuncio','ultima_modifica_il','ultima_modifica_da'])
        is distinct from (to_jsonb(old)-array['stato_annuncio','livello_annuncio','priorita_attiva','priorita_inizio_il','priorita_fine_il','info_stato_annuncio','ultima_modifica_il','ultima_modifica_da'])
      or (new.stato_annuncio is distinct from old.stato_annuncio and not(old.stato_annuncio is not distinct from 'in_attesa_pagamento' and new.stato_annuncio is not distinct from 'in_revisione')) then
      raise exception using errcode='42501',message='ANNOUNCEMENT_TRASH_PROTECTED';
    end if;
  end if;
  return new;
end $$;
create trigger zz_guard_announcement_trash_v1 before insert or update or delete on public.annuncio
for each row execute function private.guard_announcement_trash_v1();
alter function private.guard_announcement_trash_v1() owner to postgres;
revoke all on function private.guard_announcement_trash_v1() from public,anon,authenticated,service_role;

-- Restrictive policies add a condition; they grant no access by themselves.
create policy annuncio_not_trashed_v1 on public.annuncio as restrictive for all to anon,authenticated
using(eliminato_il is null) with check(eliminato_il is null);
do $$ declare tab text; begin
  foreach tab in array array['annuncio_generico','annuncio_giocatore','annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff',
    'annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor','annuncio_staff_sportivo','annuncio_arbitro','annuncio_torneo_evento',
    'annuncio_campo_impianto','annuncio_servizi_consulenze','annuncio_creator','localita_annuncio','contatto_annuncio','link_social_annuncio','media_annuncio'] loop
    if to_regclass('public.'||tab) is not null then
      execute format('create policy not_trashed_v1 on public.%I as restrictive for all to anon,authenticated using(exists(select 1 from public.annuncio a where a.uuid=%I.uuid_annuncio and a.eliminato_il is null)) with check(exists(select 1 from public.annuncio a where a.uuid=%I.uuid_annuncio and a.eliminato_il is null))',tab,tab,tab);
    end if;
  end loop;
end $$;

-- Extend existing child serialization without bypassing privileged writers.
do $$ declare definition text; begin
  definition:=pg_get_functiondef('private.lock_announcement_child_parent_v1()'::regprocedure);
  if strpos(definition,'perform 1 from public.annuncio where uuid=v_id for update nowait;')=0 then raise exception 'TRASH_CHILD_GUARD_REVIEW_REQUIRED'; end if;
  definition:=replace(definition,'perform 1 from public.annuncio where uuid=v_id for update nowait;',
    'perform 1 from public.annuncio where uuid=v_id for update nowait; if exists(select 1 from public.annuncio where uuid=v_id and eliminato_il is not null) then raise exception using errcode=''42501'',message=''ANNOUNCEMENT_TRASH_PROTECTED''; end if;');
  execute definition;
end $$;

create or replace function private.admin_moderation_capabilities_v1(p_snapshot jsonb,p_detail jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare b jsonb:=p_snapshot->'base'; status text:=b->>'stato_annuncio'; complete boolean;
  operation text; reason text; caps jsonb:='{}';
begin
  complete:=(p_detail->>'complete')::boolean;
  foreach operation in array array['approve','reject','hide','show','trash','restore'] loop
    reason:=null;
    if operation in ('trash','restore') and not coalesce((select enabled from private.admin_trash_release_v1 where singleton),false) then reason:='TRASH_NOT_ENABLED';
    elsif operation='trash' and b->>'eliminato_il' is not null then reason:='ALREADY_TRASHED';
    elsif operation='restore' and b->>'eliminato_il' is null then reason:='NOT_TRASHED';
    elsif operation not in ('trash','restore') and b->>'eliminato_il' is not null then reason:='IN_TRASH';
    elsif operation in ('approve','reject') and status is distinct from 'in_revisione' then reason:='REVIEW_REQUIRED';
    elsif operation='hide' and b->'nascosto'='true'::jsonb then reason:='ALREADY_HIDDEN';
    elsif operation='show' and b->'nascosto' is distinct from 'true'::jsonb then reason:='NOT_HIDDEN';
    elsif operation='show' and (status is null or status not in ('in_revisione','pubblicato','rifiutato')) then reason:='PAYMENT_OR_STATE_PENDING';
    elsif operation in ('approve','show') then
      if not complete then reason:='INCOMPLETE_CONTENT';
      elsif nullif(btrim(b->>'titolo_annuncio'),'') is null then reason:='TITLE_REQUIRED';
      elsif b->>'tipologia_annuncio'='annuncio_servizi_consulenze' and jsonb_array_length(p_snapshot->'locations')=0 then reason:='REGIONS_REQUIRED';
      elsif b->>'tipologia_annuncio'='annuncio_servizi_consulenze' and exists (
        select 1 from jsonb_array_elements(p_snapshot->'locations') location
        where not exists(select 1 from public.restricted_profile_access access
          where access.profile_id=(b->>'autore_annuncio')::uuid and access.profile_type='servizi-consulenze'
            and location->>'regione'=any(access.allowed_regions))
      ) then reason:='REGIONS_NOT_ALLOWED';
      elsif operation='approve' and b->>'livello_annuncio'='prioritario' and not exists (
        select 1 from private.announcement_submission s where s.announcement_id=(b->>'uuid')::uuid
          and s.requested_visibility='prioritario' and s.paid_at is not null and s.refund_required_at is null and s.refunded_at is null
      ) then reason:='PAYMENT_REQUIRED';
      end if;
    end if;
    caps:=caps||jsonb_build_object(operation,jsonb_build_object('allowed',reason is null,'reason',reason));
  end loop;
  return caps;
end $$;

create or replace function private.project_admin_announcement_v1(v_snapshot jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' set timezone='UTC' as $$
declare result jsonb; b jsonb; v_type text; v_spec jsonb; v_fields jsonb:='{}'; v_issues jsonb:='[]';
  v_key text; v_kind text; v_projected jsonb; v_name_field text; v_collection text; v_rows jsonb; v_limit integer;
  v_collections jsonb:='{}'; v_row jsonb; v_item jsonb; v_count integer;
begin
  b:=v_snapshot->'base'; v_type:=b->>'tipologia_annuncio'; v_spec:=private.admin_announcement_detail_spec_v1(v_type);
  if v_spec is null then v_issues:=v_issues||'"UNSUPPORTED_TYPE"'::jsonb;
  elsif v_snapshot->'detail'='null'::jsonb then v_issues:=v_issues||'"DETAIL_MISSING"'::jsonb;
  end if;
  for v_key,v_kind in select key,value from pg_catalog.jsonb_each_text(coalesce(v_spec,'{}')) loop
    v_name_field:=case when v_type='annuncio_staff_sportivo' and v_key='lista_esperienze' then 'titolo' else 'ente' end;
    v_projected:=private.admin_announcement_field_v1(v_snapshot->'detail'->v_key,v_kind,v_name_field);
    v_fields:=v_fields||pg_catalog.jsonb_build_object(v_key,v_projected->'value');
    if (v_projected->>'invalid')::boolean then v_issues:=v_issues||pg_catalog.jsonb_build_array('INVALID_FIELD:'||v_key); end if;
  end loop;
  foreach v_collection in array array['locations','contacts','links','media'] loop
    v_rows:='[]'; v_count:=0; v_limit:=case when v_collection='locations' then 100 else 30 end;
    for v_row in select value from pg_catalog.jsonb_array_elements(v_snapshot->v_collection) loop
      v_count:=v_count+1;
      if v_count>v_limit then v_issues:=v_issues||pg_catalog.jsonb_build_array('COLLECTION_TRUNCATED:'||v_collection); exit; end if;
      v_item:=pg_catalog.jsonb_build_object('id',v_row->>'id');
      if v_collection='locations' then v_item:=v_item||pg_catalog.jsonb_build_object('region',v_row->'regione','city',v_row->'citta');
      elsif v_collection='contacts' then v_item:=v_item||pg_catalog.jsonb_build_object('kind',v_row->'tipo','value',v_row->'valore','referent',v_row->'referente');
      elsif v_collection='links' then v_item:=v_item||pg_catalog.jsonb_build_object('platform',v_row->'piattaforma','value',v_row->'sublink');
      else v_item:=v_item||pg_catalog.jsonb_build_object('mimeType',v_row->'formato_media','value',v_row->'link_media'); end if;
      v_rows:=v_rows||pg_catalog.jsonb_build_array(v_item);
    end loop;
    v_collections:=v_collections||pg_catalog.jsonb_build_object(v_collection,v_rows);
  end loop;
  result:=v_collections||pg_catalog.jsonb_build_object(
    'summary',pg_catalog.jsonb_build_object('id',b->'uuid','title',b->'titolo_annuncio','type',v_type,'status',b->'stato_annuncio',
      'trashed',b->>'eliminato_il' is not null,'hidden',b->'nascosto','private',b->'privato','creatorId',b->'creato_da',
      'createdAt',pg_catalog.to_char((b->>'creato_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'updatedAt',pg_catalog.to_char((b->>'ultima_modifica_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'rowFingerprint',pg_catalog.md5(b::text),'author',private.admin_announcement_author_v1((b->>'autore_annuncio')::uuid,v_type)),
    'trash',jsonb_build_object('deletedAt',pg_catalog.to_char((b->>'eliminato_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'deletedBy',b->'eliminato_da'),'metadata',pg_catalog.jsonb_build_object('moderationInfo',b->'info_stato_annuncio','level',b->'livello_annuncio','priorityActive',b->'priorita_attiva',
      'priorityStartsAt',pg_catalog.to_char((b->>'priorita_inizio_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'priorityEndsAt',pg_catalog.to_char((b->>'priorita_fine_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'updatedById',b->'ultima_modifica_da'),
    'content',pg_catalog.jsonb_build_object('type',case when v_spec is null then 'unsupported' else v_type end,'fields',v_fields),
    'contentFingerprint','content-v1:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_snapshot::text,'UTF8')),'hex'),
    'complete',pg_catalog.jsonb_array_length(v_issues)=0,'issues',v_issues);
  v_issues:=private.admin_review_issues_v1(result);
  result:=result||jsonb_build_object('issues',v_issues,'complete',jsonb_array_length(v_issues)=0);
  return result||jsonb_build_object('moderation',jsonb_build_object('adminHidden',b->'oscurato_da_admin','capabilities',private.admin_moderation_capabilities_v1(v_snapshot,result)));
end;
$$;

create or replace function private.moderate_admin_announcement_v1(p_id uuid,p_operation text,p_fingerprint text,p_reason text)
returns jsonb language plpgsql volatile security definer set search_path='' set timezone='UTC' as $$
declare actor record; snapshot jsonb; detail jsonb; b jsonb; fingerprint text;
  reason text:=nullif(btrim(p_reason),''); event_id uuid; correlation uuid:=gen_random_uuid(); changes jsonb;
begin
  if current_setting('role',true) is distinct from 'authenticated' then
    raise exception using errcode='42501',message='ADMIN_ACCESS_DENIED';
  end if;
  select * into actor from private.require_admin_context_v1();
  if p_id is null or p_operation is null or p_operation collate "C" not in ('approve','reject','hide','show','trash','restore')
    or p_fingerprint is null or p_fingerprint !~ '^content-v1:[0-9a-f]{64}$'
    or (p_operation in ('reject','hide','trash') and (reason is null or reason !~ '[^[:space:]]'))
    or char_length(reason)>1000 or (p_operation in ('approve','show','restore') and reason is not null) then
    return jsonb_build_object('status','invalid','correlationId',correlation);
  end if;
  begin
    perform 1 from private.announcement_submission where announcement_id=p_id order by submission_id for update nowait;
    perform 1 from public.annuncio where uuid=p_id for update nowait;
    if not found then return jsonb_build_object('status','not_found','correlationId',correlation); end if;
    -- A separate volatile statement after the locks obtains the current snapshot.
    snapshot:=private.admin_announcement_snapshot_v1(p_id); b:=snapshot->'base';
    fingerprint:='content-v1:'||encode(sha256(convert_to(snapshot::text,'UTF8')),'hex');
    if fingerprint<>p_fingerprint then return jsonb_build_object('status','conflict','correlationId',correlation); end if;
    detail:=private.project_admin_announcement_v1(snapshot);
    if not (detail#>>array['moderation','capabilities',p_operation,'allowed'])::boolean then
      return jsonb_build_object('status','not_allowed','reason',detail#>>array['moderation','capabilities',p_operation,'reason'],'correlationId',correlation);
    end if;
    if p_operation in ('trash','restore') then
      changes:=jsonb_build_object('trashed',jsonb_build_object('before',b->>'eliminato_il' is not null,'after',p_operation='trash'));
      if b->'nascosto' is distinct from 'true'::jsonb then
        changes:=changes||jsonb_build_object('hidden',jsonb_build_object('before',b->'nascosto','after',true));
      end if;
      update public.annuncio set eliminato_il=case when p_operation='trash' then statement_timestamp() else null end,
        eliminato_da=case when p_operation='trash' then actor.utente_uuid else null end,nascosto=true,oscurato_da_admin=true,
        info_stato_annuncio=case when p_operation='restore' then 'Annuncio ripristinato dal cestino. Rimane oscurato fino alla verifica amministrativa.' else info_stato_annuncio end,
        ultima_modifica_da=actor.utente_uuid,ultima_modifica_il=statement_timestamp() where uuid=p_id;
    elsif p_operation in ('approve','reject') then
      changes:=jsonb_build_object('status',jsonb_build_object('before',b->'stato_annuncio','after',case when p_operation='approve' then 'pubblicato' else 'rifiutato' end));
      update public.annuncio set stato_annuncio=case when p_operation='approve' then 'pubblicato' else 'rifiutato' end,
        info_stato_annuncio=case when p_operation='approve' then 'Annuncio approvato.' else 'Annuncio non approvato. Motivo: '||reason end,
        ultima_modifica_da=actor.utente_uuid,ultima_modifica_il=statement_timestamp() where uuid=p_id;
    else
      changes:=jsonb_build_object('hidden',jsonb_build_object('before',b->'nascosto','after',p_operation='hide'));
      update public.annuncio set nascosto=p_operation='hide',oscurato_da_admin=p_operation='hide',
        info_stato_annuncio=case when p_operation='hide' then 'Annuncio oscurato. Motivo: '||reason else 'Oscuramento rimosso. Lo stato di moderazione rimane invariato.' end,
        ultima_modifica_da=actor.utente_uuid,ultima_modifica_il=statement_timestamp() where uuid=p_id;
    end if;
    event_id:=private.append_admin_audit_event_v1(actor.auth_user_uuid,actor.utente_uuid,'announcement.'||p_operation,
      'announcement',p_id,'success',correlation,reason,null,changes,'{}');
    return jsonb_build_object('status','ok','id',p_id,'eventId',event_id,'correlationId',correlation);
  exception
    when lock_not_available or deadlock_detected or serialization_failure then
      return jsonb_build_object('status','conflict','correlationId',correlation);
    when insufficient_privilege then
      if sqlerrm='PRIORITY_PAYMENT_REQUIRED' then return jsonb_build_object('status','not_allowed','reason','PAYMENT_REQUIRED','correlationId',correlation); end if;
      return jsonb_build_object('status','unavailable','correlationId',correlation);
    when others then
      -- Subtransaction rollback includes mutation, priority, notifications, audit.
      -- Never serialize SQL exception messages or original data to the client.
      return jsonb_build_object('status','unavailable','correlationId',correlation);
  end;
end $$;
create or replace function private.list_admin_announcements_v1(p_query jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' set timezone = 'UTC' as $$
declare
  v_search text := ''; v_status text; v_type text; v_visibility text := 'all'; v_trash text := 'exclude';
  v_limit integer := 30; v_filters jsonb; v_cursor jsonb; v_cursor_id uuid;
  v_cursor_date timestamptz; v_cursor_present boolean := false; v_result jsonb;
begin
  -- The original role survives SECURITY DEFINER; a technical key is not a user.
  if pg_catalog.current_setting('role', true) is distinct from 'authenticated' then
    raise exception using errcode='42501', message='ADMIN_ACCESS_DENIED';
  end if;
  perform private.require_admin_context_v1();

  if p_query is null or pg_catalog.jsonb_typeof(p_query) is distinct from 'object' then
    raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
  end if;
  if exists (select 1 from pg_catalog.jsonb_object_keys(p_query) k where k not in ('search','status','type','visibility','trash','limit','cursor'))
    or (p_query ? 'search' and pg_catalog.jsonb_typeof(p_query->'search') is distinct from 'string')
    or (p_query ? 'visibility' and pg_catalog.jsonb_typeof(p_query->'visibility') is distinct from 'string')
    or (p_query ? 'status' and pg_catalog.jsonb_typeof(p_query->'status') not in ('string','null'))
    or (p_query ? 'type' and pg_catalog.jsonb_typeof(p_query->'type') not in ('string','null')) then
    raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
  end if;
  -- Same whitespace set as ECMAScript String.trim(), independent of DB locale.
  v_search := pg_catalog.btrim(coalesce(p_query->>'search',''),
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
  if pg_catalog.length(v_search) > 200 then
    raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
  end if;
  if v_search ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then v_search := pg_catalog.lower(v_search); end if;
  v_status := p_query->>'status'; v_type := p_query->>'type';
  v_visibility := coalesce(p_query->>'visibility','all');
  if (v_status is not null and v_status collate "C" not in ('pubblicato','in_revisione','rifiutato','in_attesa_pagamento'))
    or (v_type is not null and v_type collate "C" not in (
      'annuncio_giocatore','annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff',
      'annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor','annuncio_staff_sportivo',
      'annuncio_arbitro','annuncio_torneo_evento','annuncio_campo_impianto','annuncio_servizi_consulenze','annuncio_creators'))
    or v_visibility collate "C" not in ('all','shown','hidden','unknown') then
    raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
  end if;
  v_trash:=coalesce(p_query->>'trash','exclude');
  if v_trash collate "C" not in ('exclude','only','all') or (p_query ? 'trash' and jsonb_typeof(p_query->'trash')<>'string') then raise exception using errcode='22023',message='ADMIN_ANNOUNCEMENT_QUERY_INVALID'; end if;
  if p_query ? 'limit' then
    if pg_catalog.jsonb_typeof(p_query->'limit') is distinct from 'number' or (p_query->>'limit') !~ '^[0-9]{1,2}$' then
      raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
    end if;
    v_limit := (p_query->>'limit')::integer;
    if v_limit < 1 or v_limit > 30 then
      raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
    end if;
  end if;
  v_filters := pg_catalog.jsonb_build_object('search',v_search,'status',v_status,'type',v_type,'visibility',v_visibility,'trash',v_trash);
  v_cursor := p_query->'cursor';
  if v_cursor is not null and v_cursor <> 'null'::jsonb then
    if pg_catalog.jsonb_typeof(v_cursor) is distinct from 'object' then
      raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
    end if;
    if (select count(*) from pg_catalog.jsonb_object_keys(v_cursor)) <> 4
      or not (v_cursor ?& array['v','createdAt','id','filters'])
      or v_cursor->'v' is distinct from '2'::jsonb or v_cursor->'filters' is distinct from v_filters
      or pg_catalog.jsonb_typeof(v_cursor->'id') is distinct from 'string'
      or (v_cursor->>'id') !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
      or pg_catalog.jsonb_typeof(v_cursor->'createdAt') not in ('string','null') then
      raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
    end if;
    v_cursor_present := true; v_cursor_id := (v_cursor->>'id')::uuid;
    if v_cursor->>'createdAt' is not null then
      if (v_cursor->>'createdAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6}Z$' then
        raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
      end if;
      begin
        v_cursor_date := (v_cursor->>'createdAt')::timestamptz;
      exception when invalid_datetime_format or datetime_field_overflow then
        raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
      end;
      if pg_catalog.to_char(v_cursor_date,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') <> v_cursor->>'createdAt' then
        raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
      end if;
    end if;
  end if;

  with candidates as materialized (
    select a.* from public.annuncio a
    where (v_trash='all' or (v_trash='exclude' and a.eliminato_il is null) or (v_trash='only' and a.eliminato_il is not null))
      and (v_status is null or a.stato_annuncio collate "C" = v_status)
      and (v_type is null or a.tipologia_annuncio collate "C" = v_type)
      and (v_visibility = 'all' or (v_visibility = 'shown' and a.nascosto is false)
        or (v_visibility = 'hidden' and a.nascosto is true) or (v_visibility = 'unknown' and a.nascosto is null))
      and (v_search = '' or case when v_search ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
        then a.uuid = v_search::uuid else a.titolo_annuncio ilike
          '%' || pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(v_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\' end)
      and (not v_cursor_present or
        (v_cursor_date is null and a.creato_il is null and a.uuid < v_cursor_id) or
        (v_cursor_date is not null and (a.creato_il < v_cursor_date or a.creato_il is null or
          (a.creato_il = v_cursor_date and a.uuid < v_cursor_id))))
    order by a.creato_il desc nulls last, a.uuid desc limit v_limit + 1
  ), page as materialized (
    select * from candidates order by creato_il desc nulls last, uuid desc limit v_limit
  ), enriched as (
    select a.creato_il, a.uuid, pg_catalog.jsonb_build_object(
      'id',a.uuid,'title',a.titolo_annuncio,'type',a.tipologia_annuncio,'status',a.stato_annuncio,
      'trashed',a.eliminato_il is not null,'hidden',a.nascosto,'private',a.privato,'creatorId',a.creato_da,
      'createdAt',pg_catalog.to_char(a.creato_il,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'updatedAt',pg_catalog.to_char(a.ultima_modifica_il,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'rowFingerprint',pg_catalog.md5(pg_catalog.to_jsonb(a)::text),
      'author',pg_catalog.jsonb_build_object('profileId',a.autore_annuncio,'userId',p.uuid_utente,
        'displayName',coalesce(nullif(pg_catalog.btrim(display.name),''),'Profilo non disponibile'),
        'anonymous',display.anonymous,'available',nullif(pg_catalog.btrim(display.name),'') is not null)
    ) as item
    from page a
    left join public.profilo p on p.uuid = a.autore_annuncio and p.nascosto is false
    left join lateral (
      select names.name, names.anonymous from (
        select g.id, case when g.nominativo_anonimo is true then 'Giocatore' when g.nominativo_anonimo is false then pg_catalog.btrim(concat_ws(' ',g.nome,g.cognome)) end as name,
          g.nominativo_anonimo as anonymous from public.profilo_giocatore g where g.uuid_profilo=p.uuid and g.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_giocatore'
        union all
        select s.id, case when s.nominativo_anonimo is true then 'Squadra' when s.nominativo_anonimo is false then s.nome_societa end, s.nominativo_anonimo
          from public.profilo_squadra s where s.uuid_profilo=p.uuid and s.nascosto is false and a.tipologia_annuncio collate "C" in ('annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff','annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor')
        union all
        select s.id, case when s.nominativo_anonimo is true then 'Staff sportivo' when s.nominativo_anonimo is false then pg_catalog.btrim(concat_ws(' ',s.nome,s.cognome)) end, s.nominativo_anonimo
          from public.profilo_staff_sportivo s where s.uuid_profilo=p.uuid and s.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_staff_sportivo'
        union all
        select r.id, case when r.nominativo_anonimo is true then 'Arbitro' when r.nominativo_anonimo is false then pg_catalog.btrim(concat_ws(' ',r.nome,r.cognome)) end, r.nominativo_anonimo
          from public.profilo_arbitro r where r.uuid_profilo=p.uuid and r.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_arbitro'
        union all
        select s.id, s.nome, false from public.profilo_servizi_consulenze s where s.uuid_profilo=p.uuid and s.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_servizi_consulenze'
        union all
        select c.id, c.nome_creator, false from public.profilo_creator c where c.uuid_profilo=p.uuid and c.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_creators'
        union all
        select e.id, e.nome_organizzazione, false from public.profilo_torneo_evento e where e.uuid_profilo=p.uuid and e.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_torneo_evento'
        union all
        select c.id, c.nome_organizzazione, false from public.profilo_campi_impianti c where c.uuid_profilo=p.uuid and c.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_campo_impianto'
      ) names order by names.id limit 1
    ) display on true
  )
  select pg_catalog.jsonb_build_object(
    'items',coalesce((select pg_catalog.jsonb_agg(item order by creato_il desc nulls last, uuid desc) from enriched),'[]'::jsonb),
    'hasMore',(select count(*) > v_limit from candidates),
    'nextCursor',case when (select count(*) > v_limit from candidates) then (
      select pg_catalog.jsonb_build_object('v',2,'id',uuid,'createdAt',pg_catalog.to_char(creato_il,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'filters',v_filters)
      from page order by creato_il asc nulls first, uuid asc limit 1
    ) else null end
  ) into v_result;
  return v_result;
end;
$$;

-- Legacy generic contents participate in the same freeze/serialization protocol.
do $$ begin
  if to_regclass('public.annuncio_generico') is not null then
    execute 'create trigger admin_lock_parent_v1 before insert or update or delete on public.annuncio_generico for each row execute function private.lock_announcement_child_parent_v1()';
  end if;
end $$;

-- Known Web database consumers. Optional functions are absent in minimal test
-- fixtures, not silently bypassed if present with an unexpected implementation.
do $$ declare r record; definition text; old_text text; new_text text; begin
  for r in select p.oid,p.proname,n.nspname,l.lanname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    join pg_language l on l.oid=p.prolang where n.nspname in ('public','private') and p.proname in
    ('notify_announcement_v1','notification_target_ref','notification_display_ref','get_owned_priority_checkout_v1',
     'get_notifications_v1','get_notifications_v2','record_priority_checkout_session_v1','record_priority_checkout_event_v1','auto_approve_new_announcement_until_v1','prune_revoked_professional_regions_v1','sync_published_profile_snapshot_v1') loop
    definition:=pg_get_functiondef(r.oid);
    case r.proname
      when 'notify_announcement_v1' then
        old_text:='begin'; new_text:='begin if new.eliminato_il is not null then return new; end if; if tg_op=''UPDATE'' and old.eliminato_il is not null then return new; end if;';
      when 'notification_target_ref' then
        if r.lanname<>'plpgsql' then raise exception 'TRASH_CONSUMER_REVIEW_REQUIRED: %',r.proname; end if;
        old_text:='begin'; new_text:='begin if p_announcement is not null and exists(select 1 from public.annuncio where uuid=p_announcement and eliminato_il is not null) then return null; end if;';
      when 'notification_display_ref' then
        old_text:='begin'; new_text:='begin if p_ref->>''kind''=''annuncio'' and exists(select 1 from public.annuncio where uuid=(p_ref->>''id'')::uuid and eliminato_il is not null) then return jsonb_build_object(''label'',''Annuncio non più disponibile'',''href'',null); end if;';
      when 'get_notifications_v1','get_notifications_v2' then
        old_text:='''state'',s.dati->>''state'',''info'',s.dati->>''info'',';
        new_text:='''state'',case when not exists(select 1 from public.annuncio where uuid=(s.dati->''target''->>''id'')::uuid and s.dati->''target''->>''kind''=''annuncio'' and eliminato_il is not null) then s.dati->>''state'' end,''info'',case when not exists(select 1 from public.annuncio where uuid=(s.dati->''target''->>''id'')::uuid and s.dati->''target''->>''kind''=''annuncio'' and eliminato_il is not null) then s.dati->>''info'' end,';
      when 'get_owned_priority_checkout_v1' then
        old_text:='where submission.announcement_id = p_announcement_id'; new_text:='where announcement.eliminato_il is null and submission.announcement_id = p_announcement_id';
      when 'record_priority_checkout_session_v1' then
        old_text:='begin'; new_text:='begin perform 1 from private.announcement_submission where announcement_id=p_announcement_id order by submission_id for update nowait; perform 1 from public.annuncio where uuid=p_announcement_id for update nowait; if exists(select 1 from public.annuncio where uuid=p_announcement_id and eliminato_il is not null) then raise exception using errcode=''42501'',message=''ANNOUNCEMENT_TRASH_PROTECTED''; end if;';
      when 'record_priority_checkout_event_v1' then
        old_text:='privato = false,'; new_text:='privato = case when eliminato_il is not null then privato else false end,';
      when 'auto_approve_new_announcement_until_v1' then
        old_text:='where uuid = new.uuid'; new_text:='where eliminato_il is null and uuid = new.uuid';
      when 'prune_revoked_professional_regions_v1' then
        old_text:='where location.uuid_annuncio = announcement.uuid'; new_text:='where announcement.eliminato_il is null and location.uuid_annuncio = announcement.uuid';
      when 'sync_published_profile_snapshot_v1' then
        old_text:='begin'; new_text:='begin perform 1 from public.annuncio where uuid=p_announcement_id for update nowait; if exists(select 1 from public.annuncio where uuid=p_announcement_id and eliminato_il is not null) then return; end if;';
    end case;
    if strpos(definition,old_text)=0 then raise exception 'TRASH_CONSUMER_REVIEW_REQUIRED: %',r.proname; end if;
    execute replace(definition,old_text,new_text);
  end loop;
end $$;
notify pgrst,'reload schema';
commit;

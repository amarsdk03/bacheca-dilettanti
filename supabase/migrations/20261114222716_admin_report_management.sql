begin;
set local lock_timeout='10s';

alter table private.segnalazioni
  add column admin_uuid uuid not null default gen_random_uuid() unique,
  add column stato text not null default 'open' check(stato in ('open','working','resolved','archived')),
  add column nota_interna text not null default '' check(char_length(nota_interna)<=1000),
  add column versione integer not null default 0 check(versione>=0),
  add column aggiornata_il timestamptz,
  add column aggiornata_da uuid;
create index segnalazioni_admin_order_idx on private.segnalazioni(creato_il desc,admin_uuid desc);
create index segnalazioni_admin_status_idx on private.segnalazioni(stato,creato_il desc,admin_uuid desc);

-- Extend the strict existing audit contract without changing historical events.
alter function private.admin_audit_payload_valid_v1(text,text,text,text,jsonb,jsonb) rename to admin_audit_payload_before_reports_v1;
create function private.admin_audit_payload_valid_v1(p_action text,p_outcome text,p_reason text,p_failure_code text,p_changes jsonb,p_details jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$ begin
  if p_action is distinct from 'report.update' then
    return private.admin_audit_payload_before_reports_v1(p_action,p_outcome,p_reason,p_failure_code,p_changes,p_details);
  end if;
  if p_outcome='failure' then return private.admin_audit_payload_before_reports_v1('announcement.approve',p_outcome,p_reason,p_failure_code,p_changes,p_details); end if;
  return p_outcome='success' and p_reason is null and p_failure_code is null and jsonb_typeof(p_changes)='object'
    and (select count(*) from jsonb_object_keys(p_changes))=1
    and jsonb_typeof(p_changes->'status')='object' and (select count(*) from jsonb_object_keys(p_changes->'status'))=2
    and p_changes#>>'{status,before}' in ('open','working','resolved','archived')
    and p_changes#>>'{status,after}' in ('open','working','resolved','archived')
    and jsonb_typeof(p_details)='object' and (select count(*) from jsonb_object_keys(p_details))=1
    and jsonb_typeof(p_details->'note_changed')='boolean';
end $$;
alter table private.admin_audit_event_v1 drop constraint admin_audit_payload_v1;
alter table private.admin_audit_event_v1 add constraint admin_audit_payload_v1 check(private.admin_audit_payload_valid_v1(action,outcome,reason,failure_code,changes,details) is true);
alter table private.admin_audit_event_v1 drop constraint admin_audit_resource_v1;
alter table private.admin_audit_event_v1 add constraint admin_audit_resource_v1 check (
  case when action in ('auth.login','auth.logout','auth.access_denied') then resource_type='session' and (outcome='failure' or resource_uuid is not null)
    when action='announcement.export' then resource_type='announcement_export' and resource_uuid is null
    when action='report.update' then resource_type='report' and (outcome='failure' or resource_uuid is not null)
    else resource_type='announcement' and (outcome='failure' or resource_uuid is not null) end);
do $$ declare d text; begin
  d:=pg_get_functiondef('private.admin_list_audit_events_bridge_v1(jsonb)'::regprocedure);
  if strpos(d,'''announcement.export''')=0 then raise exception 'ADMIN_AUDIT_READ_REVIEW_REQUIRED'; end if;
  execute replace(d,'''announcement.export''','''announcement.export'',''report.update''');
  d:=pg_get_functiondef('private.admin_get_audit_event_bridge_v1(uuid)'::regprocedure);
  d:=replace(d,'''status'',''hidden'',''trashed''','''status'',''hidden'',''trashed'',''considered''');
  if strpos(d,'''reason'',e.reason')=0 then raise exception 'ADMIN_AUDIT_DETAIL_REVIEW_REQUIRED'; end if;
  execute replace(d,'''reason'',e.reason','''noteChanged'',case when e.action=''report.update'' and e.outcome=''success'' then e.details->''note_changed'' else null end,''reason'',e.reason');
  d:=pg_get_functiondef('private.record_admin_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)'::regprocedure);
  execute replace(d,'''announcement_export'' else ''announcement''','''announcement_export'' when p_action = ''report.update'' then ''report'' else ''announcement''');
end $$;

-- Shared bounded query parsing; no identities, notes or hashes enter diagnostics.
create function private.admin_community_query_v1(p_query jsonb,p_kind text) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare q jsonb:=coalesce(p_query,'{}'); k text; v text; n integer; begin
  if jsonb_typeof(q) is distinct from 'object' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  for k in select jsonb_object_keys(q) loop
    if k not in ('search','status','target','from','to','offset','pending') or
      (k='pending' and p_kind<>'invitations') or (k in ('status','target','from','to') and p_kind<>'reports') then
      raise exception 'INVALID_QUERY' using errcode='22023'; end if;
    if k='offset' then
      if jsonb_typeof(q->k)<>'number' or (q->>k)!~'^(0|[1-9][0-9]{0,6})$' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
    elsif k='pending' then
      if jsonb_typeof(q->k)<>'boolean' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
    elsif jsonb_typeof(q->k)<>'string' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  end loop;
  n:=coalesce((q->>'offset')::integer,0);
  if n>1000000 or char_length(coalesce(q->>'search',''))>200 or
    coalesce(q->>'status','active') not in ('active','all','open','working','resolved','archived') or
    coalesce(q->>'target','all') not in ('all','annuncio','profilo') then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  foreach k in array array['from','to'] loop
    v:=coalesce(q->>k,'');
    if v<>'' then
      begin
        if v!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or v<'0001-01-01' or to_char(v::date,'YYYY-MM-DD')<>v then raise exception 'date'; end if;
      exception when others then raise exception 'INVALID_QUERY' using errcode='22023'; end;
    end if;
  end loop;
  if coalesce(q->>'from','')<>'' and coalesce(q->>'to','')<>'' and q->>'from'>q->>'to' then raise exception 'INVALID_QUERY' using errcode='22023'; end if;
  return q||jsonb_build_object('search',lower(btrim(coalesce(q->>'search',''))),'offset',n);
end $$;

create function private.admin_reports_v1(p_query jsonb,p_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare q jsonb; items jsonb; more boolean; result jsonb; begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  perform private.require_admin_context_v1();
  q:=private.admin_community_query_v1(p_query,'reports');
  with candidates as materialized (
    select s.*,u.indirizzo_email reporter_email,editor.indirizzo_email editor_email,
      case when s.uuid_annuncio is not null then 'annuncio' else 'profilo' end target_kind,
      coalesce(s.uuid_annuncio,s.uuid_profilo) target_id,
      case when s.uuid_annuncio is not null then coalesce(nullif(btrim(a.titolo_annuncio),''),'Annuncio senza titolo') else 'Profilo' end target_title
    from private.segnalazioni s left join public.annuncio a on a.uuid=s.uuid_annuncio
      left join public.utente u on u.utente_uuid=s.uuid_utente_segnalatore
      left join public.utente editor on editor.utente_uuid=s.aggiornata_da
    where (p_id is null or s.admin_uuid=p_id) and (p_id is not null or (
      (coalesce(q->>'status','active')='all' or s.stato=q->>'status' or (coalesce(q->>'status','active')='active' and s.stato in ('open','working')))
      and (coalesce(q->>'target','all')='all' or (q->>'target'='annuncio' and s.uuid_annuncio is not null) or (q->>'target'='profilo' and s.uuid_profilo is not null))
      and (coalesce(q->>'from','')='' or s.creato_il >= ((q->>'from')::date::timestamp at time zone 'Europe/Rome'))
      and (coalesce(q->>'to','')='' or s.creato_il < (((q->>'to')::date+1)::timestamp at time zone 'Europe/Rome'))
      and (q->>'search'='' or lower(coalesce(s.uuid_annuncio,s.uuid_profilo)::text)=q->>'search' or s.admin_uuid::text=q->>'search'
        or position(q->>'search' in lower(coalesce(u.indirizzo_email,'')))>0)))
    order by s.creato_il desc,s.admin_uuid desc limit 31 offset case when p_id is null then (q->>'offset')::integer else 0 end
  ), projected as (
    select row_number() over(order by creato_il desc,admin_uuid desc) n,jsonb_build_object(
      'id',admin_uuid,'number',id::text,'createdAt',creato_il,'targetKind',target_kind,'targetId',target_id,'title',target_title,
      'reporterEmail',reporter_email,'reason',motivazione,'status',stato,'version',versione,
      'note',case when p_id is not null then nota_interna else '' end,'updatedAt',aggiornata_il,'updatedBy',coalesce(editor_email,aggiornata_da::text),
      'profileTypes',case when p_id is not null and uuid_profilo is not null then (select coalesce(jsonb_agg(t),'[]') from (
        select 'giocatore' t where exists(select 1 from public.profilo_giocatore where uuid_profilo=candidates.uuid_profilo)
        union all select 'squadra' where exists(select 1 from public.profilo_squadra where uuid_profilo=candidates.uuid_profilo)
        union all select 'staff-sportivo' where exists(select 1 from public.profilo_staff_sportivo where uuid_profilo=candidates.uuid_profilo)
        union all select 'arbitro' where exists(select 1 from public.profilo_arbitro where uuid_profilo=candidates.uuid_profilo)
        union all select 'torneo-evento' where exists(select 1 from public.profilo_torneo_evento where uuid_profilo=candidates.uuid_profilo)
        union all select 'campi-impianti-sportivi' where exists(select 1 from public.profilo_campi_impianti where uuid_profilo=candidates.uuid_profilo)
        union all select 'servizi-consulenze' where exists(select 1 from public.profilo_servizi_consulenze where uuid_profilo=candidates.uuid_profilo)
        union all select 'creators' where exists(select 1 from public.profilo_creator where uuid_profilo=candidates.uuid_profilo)
      ) kinds) else '[]'::jsonb end) item from candidates
  ) select coalesce(jsonb_agg(item order by n) filter(where n<=30),'[]'),coalesce(bool_or(n>30),false) into items,more from projected;
  if p_id is not null then return items->0; end if;
  return jsonb_build_object('items',items,'hasMore',more);
end $$;

create function private.admin_update_report_v1(p_id uuid,p_status text,p_note text,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor record; s private.segnalazioni; correlation uuid:=gen_random_uuid(); event_id uuid; begin
  if current_setting('role',true) is distinct from 'authenticated' then raise exception 'ADMIN_ACCESS_DENIED' using errcode='42501'; end if;
  select * into strict actor from private.require_admin_context_v1();
  if p_status is null or p_status not in ('open','working','resolved','archived') or p_note is null or char_length(p_note)>1000 or p_version is null or p_version<0 then
    raise exception 'INVALID_INPUT' using errcode='22023'; end if;
  select * into s from private.segnalazioni where admin_uuid=p_id for update;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if s.versione<>p_version then return jsonb_build_object('status','conflict'); end if;
  if s.stato=p_status and s.nota_interna=btrim(p_note) then return jsonb_build_object('status','ok','id',p_id,'changed',false); end if;
  update private.segnalazioni set stato=p_status,nota_interna=btrim(p_note),versione=versione+1,aggiornata_il=statement_timestamp(),aggiornata_da=actor.utente_uuid where admin_uuid=p_id;
  event_id:=private.append_admin_audit_event_v1(actor.auth_user_uuid,actor.utente_uuid,'report.update','report',p_id,'success',correlation,null,null,
    jsonb_build_object('status',jsonb_build_object('before',s.stato,'after',p_status)),jsonb_build_object('note_changed',s.nota_interna<>btrim(p_note)));
  return jsonb_build_object('status','ok','id',p_id,'changed',true,'eventId',event_id);
end $$;

create function public.admin_list_reports_v1(p_query jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.admin_reports_v1(p_query); $$;
create function public.admin_get_report_v1(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_reports_v1('{}',p_id); $$;
create function public.admin_update_report_v1(p_id uuid,p_status text,p_note text,p_version integer) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_update_report_v1(p_id,p_status,p_note,p_version); $$;
revoke all on function private.admin_community_query_v1(jsonb,text),private.admin_audit_payload_before_reports_v1(text,text,text,text,jsonb,jsonb),private.admin_audit_payload_valid_v1(text,text,text,text,jsonb,jsonb) from public,anon,authenticated,service_role;
revoke all on function private.admin_reports_v1(jsonb,uuid),private.admin_update_report_v1(uuid,text,text,integer),public.admin_list_reports_v1(jsonb),public.admin_get_report_v1(uuid),public.admin_update_report_v1(uuid,text,text,integer) from public,anon,authenticated,service_role;
grant execute on function private.admin_reports_v1(jsonb,uuid),private.admin_update_report_v1(uuid,text,text,integer),public.admin_list_reports_v1(jsonb),public.admin_get_report_v1(uuid),public.admin_update_report_v1(uuid,text,text,integer) to authenticated;
notify pgrst,'reload schema';
commit;

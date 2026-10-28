-- Step 11: bounded current-page export; no remote application or activation.
begin;
set local lock_timeout='10s';

do $$ begin
  if to_regprocedure('private.list_admin_announcements_v1(jsonb)') is null
    or to_regprocedure('private.require_admin_context_v1()') is null
    or to_regprocedure('private.append_admin_audit_event_v1(uuid,uuid,text,text,uuid,text,uuid,text,text,jsonb,jsonb)') is null
    or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='annuncio' and column_name='eliminato_il') then
    raise exception 'ADMIN_EXPORT_PREREQUISITES_REQUIRED';
  end if;
end $$;

create or replace function private.admin_audit_payload_valid_v1(
  p_action text, p_outcome text, p_reason text, p_failure_code text,
  p_changes jsonb, p_details jsonb
)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare v_key text; v_value jsonb; v_before jsonb; v_after jsonb;
begin
  if p_action is null or p_outcome is null
    or p_action collate "C" not in ('auth.login','auth.logout','auth.access_denied',
      'announcement.approve','announcement.reject','announcement.hide','announcement.show',
      'announcement.trash','announcement.restore','announcement.export')
    or p_outcome collate "C" not in ('success','failure')
    or pg_catalog.jsonb_typeof(p_changes) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_details) is distinct from 'object' then return false; end if;
  if pg_catalog.octet_length(p_changes::text) + pg_catalog.octet_length(p_details::text) > 16384 then return false; end if;
  if p_reason is not null and (pg_catalog.char_length(p_reason) > 1000
    or p_reason !~ '[^[:space:]]') then return false; end if;

  if p_outcome collate "C" = 'failure' then
    -- Never store an exception message, attempted email, credential or payload.
    return p_reason is null and p_changes = '{}'::jsonb and p_details = '{}'::jsonb
      and p_failure_code is not null and p_failure_code collate "C" in (
        'INVALID_CREDENTIALS','ACCESS_DENIED','SESSION_INVALID','AUTH_UNAVAILABLE',
        'VALIDATION_FAILED','RESOURCE_NOT_FOUND','STATE_CONFLICT','OPERATION_FAILED',
        'AUDIT_UNAVAILABLE','EXPORT_FAILED','LOGOUT_FAILED');
  end if;
  if p_failure_code is not null or p_action collate "C" = 'auth.access_denied' then return false; end if;

  if p_action collate "C" in ('auth.login','auth.logout') then
    return p_reason is null and p_changes = '{}'::jsonb and p_details = '{}'::jsonb;
  end if;
  if p_action collate "C" = 'announcement.export' then
    if p_reason is not null or p_changes <> '{}'::jsonb or not (p_details ? 'row_count')
      or pg_catalog.jsonb_typeof(p_details -> 'row_count') is distinct from 'number' then return false; end if;
    if (p_details ->> 'row_count') !~ '^(0|[1-9][0-9]?)$' then return false; end if;
    if (p_details ->> 'row_count')::integer > 30 then return false; end if;
    for v_key, v_value in select key,value from pg_catalog.jsonb_each(p_details) loop
      if v_key collate "C" = 'columns' then
        if pg_catalog.jsonb_typeof(v_value) is distinct from 'array' then return false; end if;
        if pg_catalog.jsonb_array_length(v_value) not between 1 and 6 then return false; end if;
        if exists(select 1 from pg_catalog.jsonb_array_elements(v_value) c
          where pg_catalog.jsonb_typeof(c) <> 'string' or (c #>> '{}') collate "C"
            not in ('title','author','type','status','visibility','created_at')) then return false; end if;
      elsif v_key collate "C" = 'announcement_ids' then
        if jsonb_typeof(v_value) is distinct from 'array' then return false; end if;
        if jsonb_array_length(v_value) <> (p_details->>'row_count')::integer then return false; end if;
        if exists(select 1 from jsonb_array_elements(v_value) x where jsonb_typeof(x) is distinct from 'string'
          or (x#>>'{}') !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') then return false; end if;
        if (select count(distinct x) from jsonb_array_elements(v_value) x) <> jsonb_array_length(v_value) then return false; end if;
      elsif v_key collate "C" <> 'row_count' then return false; end if;
    end loop;
    return true;
  end if;

  if p_details <> '{}'::jsonb or p_changes = '{}'::jsonb then return false; end if;
  if p_action collate "C" in ('announcement.reject','announcement.hide','announcement.trash')
    and p_reason is null then return false; end if;
  for v_key, v_value in select key,value from pg_catalog.jsonb_each(p_changes) loop
    if v_key collate "C" not in ('status','hidden','trashed')
      or pg_catalog.jsonb_typeof(v_value) is distinct from 'object' then return false; end if;
    if not (v_value ?& array['before','after'])
      or exists(select 1 from pg_catalog.jsonb_object_keys(v_value) k
        where k collate "C" not in ('before','after')) then return false; end if;
    v_before := v_value -> 'before'; v_after := v_value -> 'after';
    if v_before = v_after then return false; end if;
    if v_key collate "C" = 'status' then
      if pg_catalog.jsonb_typeof(v_after) is distinct from 'string'
        or (v_after #>> '{}') !~ '^[a-z][a-z0-9_]{0,63}$' then return false; end if;
      if pg_catalog.jsonb_typeof(v_before) <> 'null' and (
        pg_catalog.jsonb_typeof(v_before) <> 'string'
        or (v_before #>> '{}') !~ '^[a-z][a-z0-9_]{0,63}$') then return false; end if;
    elsif pg_catalog.jsonb_typeof(v_after) is distinct from 'boolean'
      or pg_catalog.jsonb_typeof(v_before) not in ('boolean','null') then return false;
    end if;
  end loop;
  -- Describe the actual semantic change, not a complete record snapshot.
  return case p_action collate "C"
    when 'announcement.approve' then p_changes #> '{status,after}' = '"pubblicato"'::jsonb
    when 'announcement.reject' then p_changes #> '{status,after}' = '"rifiutato"'::jsonb
    when 'announcement.hide' then p_changes #> '{hidden,after}' = 'true'::jsonb
    when 'announcement.show' then p_changes #> '{hidden,after}' = 'false'::jsonb
    when 'announcement.trash' then p_changes #> '{trashed,after}' = 'true'::jsonb
    when 'announcement.restore' then p_changes #> '{trashed,after}' = 'false'::jsonb
    else false end is true;
end;
$$;

create function private.export_admin_announcements_v1(p_query jsonb,p_selection jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' set timezone='UTC' as $$
declare actor record; page jsonb; expected jsonb; item jsonb; ids jsonb;
  event_id uuid; correlation uuid:=gen_random_uuid();
begin
  if current_setting('role',true) is distinct from 'authenticated' then
    raise exception using errcode='42501',message='ADMIN_ACCESS_DENIED';
  end if;
  select * into actor from private.require_admin_context_v1();
  if p_selection is null or jsonb_typeof(p_selection) is distinct from 'array' then
    return jsonb_build_object('status','invalid','correlationId',correlation);
  end if;
  if jsonb_array_length(p_selection) not between 1 and 30 or octet_length(p_selection::text)>1048576
    or p_query is null or jsonb_typeof(p_query) is distinct from 'object'
    or (p_query ? 'limit' and p_query->'limit' is distinct from '30'::jsonb) then
    return jsonb_build_object('status','invalid','correlationId',correlation);
  end if;
  for item in select value from jsonb_array_elements(p_selection) loop
    if jsonb_typeof(item) is distinct from 'object' then
      return jsonb_build_object('status','invalid','correlationId',correlation);
    end if;
    if (select count(*) from jsonb_object_keys(item))<>3 or not(item ?& array['id','rowFingerprint','authorName'])
      or jsonb_typeof(item->'id') is distinct from 'string' or (item->>'id') !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
      or jsonb_typeof(item->'rowFingerprint') is distinct from 'string' or (item->>'rowFingerprint') !~ '^[0-9a-f]{32}$'
      or jsonb_typeof(item->'authorName') is distinct from 'string' or char_length(item->>'authorName')>5000 then
      return jsonb_build_object('status','invalid','correlationId',correlation);
    end if;
  end loop;
  if (select count(distinct value->>'id') from jsonb_array_elements(p_selection))<>jsonb_array_length(p_selection) then
    return jsonb_build_object('status','invalid','correlationId',correlation);
  end if;
  begin
    -- Reuse the full authorized, filtered v2 page. This makes a bounded second
    -- context check inside the existing reader, never an authorization per row.
    page:=private.list_admin_announcements_v1(p_query);
  exception when sqlstate '22023' then
    return jsonb_build_object('status','invalid','correlationId',correlation);
  end;
  select coalesce(jsonb_agg(jsonb_build_object('id',value->'id','rowFingerprint',value->'rowFingerprint',
    'authorName',value#>'{author,displayName}') order by ordinality),'[]'::jsonb),
    coalesce(jsonb_agg(value->'id' order by ordinality),'[]'::jsonb)
    into expected,ids from jsonb_array_elements(page->'items') with ordinality;
  if expected is distinct from p_selection then
    return jsonb_build_object('status','conflict','correlationId',correlation);
  end if;
  begin
    event_id:=private.append_admin_audit_event_v1(actor.auth_user_uuid,actor.utente_uuid,'announcement.export',
      'announcement_export',null,'success',correlation,null,null,'{}',jsonb_build_object(
        'row_count',jsonb_array_length(ids),'columns',jsonb_build_array('title','author','type','status','visibility','created_at'),
        'announcement_ids',ids));
    -- Success means an authorized snapshot was prepared, not that a browser
    -- received or saved it. No CSV contents are persisted in the event.
    return jsonb_build_object('status','ok','items',page->'items','eventId',event_id,'correlationId',correlation);
  exception when others then
    return jsonb_build_object('status','unavailable','correlationId',correlation);
  end;
end $$;
alter function private.export_admin_announcements_v1(jsonb,jsonb) owner to postgres;
revoke all on function private.export_admin_announcements_v1(jsonb,jsonb) from public,anon,authenticated,service_role;

create function public.admin_export_announcements_v1(p_query jsonb,p_selection jsonb)
returns jsonb language sql volatile security invoker set search_path='' as $$
  select private.export_admin_announcements_v1(p_query,p_selection);
$$;
alter function public.admin_export_announcements_v1(jsonb,jsonb) owner to postgres;
revoke all on function public.admin_export_announcements_v1(jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.export_admin_announcements_v1(jsonb,jsonb),public.admin_export_announcements_v1(jsonb,jsonb) to authenticated;

-- The private bridge is executable by authenticated SQL callers, as in 07/09,
-- but never exposed through PostgREST. It independently checks the human role
-- and session, including when called directly or through another definer.
notify pgrst,'reload schema';
commit;

-- Read-only audit access. No direct audit/Auth grants and no technical reader.
begin;
set local lock_timeout = '10s';

do $$ begin
  if to_regprocedure('private.require_admin_context_v1()') is null or
     to_regclass('private.admin_audit_event_v1') is null or
     to_regprocedure('public.admin_export_announcements_v1(jsonb,jsonb)') is null then
    raise exception 'ADMIN_AUDIT_READ_PREREQUISITES_REQUIRED';
  end if;
end $$;

create index admin_audit_event_auth_time_v1
  on private.admin_audit_event_v1 (actor_auth_user_uuid, occurred_at desc, event_uuid desc)
  where actor_auth_user_uuid is not null;

create function private.admin_list_audit_events_bridge_v1(p_query jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_filters jsonb;
  v_from text; v_to text; v_operator text; v_action text; v_outcome text;
  v_start timestamptz; v_end timestamptz;
  v_cursor jsonb; v_time timestamptz; v_id uuid; v_operator_id uuid; v_limit integer := 30;
  v_items jsonb; v_more boolean; v_last jsonb;
begin
  if current_setting('role', true) is distinct from 'authenticated' then
    raise exception using errcode = '42501', message = 'ADMIN_ACCESS_DENIED';
  end if;
  perform private.require_admin_context_v1();
  if p_query is null or jsonb_typeof(p_query) <> 'object' or
     exists (select 1 from jsonb_object_keys(p_query) k where k not in ('from','to','operator','action','outcome','limit','cursor')) then
    raise exception using errcode = '22023', message = 'INVALID_QUERY';
  end if;
  if exists (select 1 from jsonb_each(p_query) e where e.key in ('from','to','operator','action','outcome') and jsonb_typeof(e.value) <> 'string') then
    raise exception using errcode = '22023', message = 'INVALID_QUERY';
  end if;
  v_from := coalesce(p_query->>'from',''); v_to := coalesce(p_query->>'to','');
  v_operator := lower(btrim(coalesce(p_query->>'operator','')));
  v_action := coalesce(p_query->>'action',''); v_outcome := coalesce(p_query->>'outcome','');
  if v_operator <> '' and v_operator <> 'unknown' and
     v_operator !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and
     (length(v_operator)>254 or v_operator !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception using errcode = '22023', message = 'INVALID_QUERY';
  end if;
  if v_action <> '' and v_action not in ('auth.login','auth.logout','auth.access_denied','announcement.approve','announcement.reject','announcement.hide','announcement.show','announcement.trash','announcement.restore','announcement.export') or
     v_outcome not in ('','success','failure') then
    raise exception using errcode = '22023', message = 'INVALID_QUERY';
  end if;
  if v_operator ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_operator_id := v_operator::uuid;
  end if;
  begin
    if v_from <> '' then
      if v_from !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or v_from < '0001-01-01' or to_char(v_from::date,'YYYY-MM-DD') <> v_from then raise exception 'date'; end if;
      v_start := v_from::date::timestamp at time zone 'Europe/Rome';
    end if;
    if v_to <> '' then
      if v_to !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or v_to < '0001-01-01' or to_char(v_to::date,'YYYY-MM-DD') <> v_to then raise exception 'date'; end if;
      v_end := (v_to::date + 1)::timestamp at time zone 'Europe/Rome';
    end if;
    if v_from <> '' and v_to <> '' and v_from > v_to then raise exception 'date'; end if;
    if p_query ? 'limit' then
      if jsonb_typeof(p_query->'limit') <> 'number' or (p_query->>'limit') !~ '^[0-9]+$' then raise exception 'limit'; end if;
      v_limit := (p_query->>'limit')::integer;
      if v_limit < 1 or v_limit > 30 then raise exception 'limit'; end if;
    end if;
  exception when others then raise exception using errcode = '22023', message = 'INVALID_QUERY'; end;
  v_filters := jsonb_build_object('from',v_from,'to',v_to,'operator',v_operator,'action',v_action,'outcome',v_outcome);
  v_cursor := p_query->'cursor';
  if v_cursor is not null and v_cursor <> 'null'::jsonb then
    begin
      if jsonb_typeof(v_cursor) <> 'object' or
         (select count(*) from jsonb_object_keys(v_cursor)) <> 4 or
         v_cursor->'v' is distinct from '1'::jsonb or v_cursor->'filters' is distinct from v_filters or
         jsonb_typeof(v_cursor->'id') is distinct from 'string' or
         jsonb_typeof(v_cursor->'occurredAt') is distinct from 'string' or
         (v_cursor->>'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or
         (v_cursor->>'occurredAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6}Z$' then raise exception 'cursor'; end if;
      v_time := (v_cursor->>'occurredAt')::timestamptz; v_id := (v_cursor->>'id')::uuid;
      if to_char(v_time at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') <> v_cursor->>'occurredAt' then raise exception 'cursor'; end if;
    exception when others then raise exception using errcode = '22023', message = 'INVALID_QUERY'; end;
  end if;
  -- A single bounded query, including identity resolution. Never one query per row.
  with candidates as materialized (
    select e.event_uuid, e.occurred_at, e.action, e.outcome, e.actor_auth_user_uuid, e.actor_utente_uuid, u.email
    from private.admin_audit_event_v1 e left join auth.users u on u.id = e.actor_auth_user_uuid
    where (v_start is null or e.occurred_at >= v_start) and (v_end is null or e.occurred_at < v_end)
      and (v_action = '' or e.action = v_action) and (v_outcome = '' or e.outcome = v_outcome)
      and (v_operator = '' or
        (v_operator = 'unknown' and e.actor_auth_user_uuid is null and e.actor_utente_uuid is null) or
        e.actor_auth_user_uuid = v_operator_id or e.actor_utente_uuid = v_operator_id or lower(u.email) = v_operator)
      and (v_time is null or (e.occurred_at,e.event_uuid) < (v_time,v_id))
    order by e.occurred_at desc, e.event_uuid desc limit v_limit + 1
  ), numbered as (
    select *, row_number() over(order by occurred_at desc,event_uuid desc) n from candidates
  ) select coalesce(jsonb_agg(jsonb_build_object(
      'id',event_uuid,'occurredAt',to_char(occurred_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'action',action,'outcome',outcome,'actor',jsonb_build_object('authId',actor_auth_user_uuid,'userId',actor_utente_uuid,'email',email)
    ) order by occurred_at desc,event_uuid desc) filter(where n <= v_limit),'[]'::jsonb), coalesce(bool_or(n > v_limit),false)
    into v_items,v_more from numbered;
  v_last := v_items->(jsonb_array_length(v_items)-1);
  return jsonb_build_object('items',v_items,'hasMore',v_more,'nextCursor',case when v_more then
    jsonb_build_object('v',1,'filters',v_filters,'id',v_last->'id','occurredAt',v_last->'occurredAt') else null end);
end;
$$;

create function private.admin_get_audit_event_bridge_v1(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if current_setting('role',true) is distinct from 'authenticated' then
    raise exception using errcode = '42501', message = 'ADMIN_ACCESS_DENIED';
  end if;
  perform private.require_admin_context_v1();
  if p_id is null then raise exception using errcode = '22023', message = 'INVALID_EVENT_ID'; end if;
  select jsonb_build_object(
    'id',e.event_uuid,'occurredAt',to_char(e.occurred_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'action',e.action,'outcome',e.outcome,'actor',jsonb_build_object('authId',e.actor_auth_user_uuid,'userId',e.actor_utente_uuid,'email',u.email),
    'resourceType',e.resource_type,'resourceId',e.resource_uuid,'correlationId',e.correlation_uuid,
    'reason',e.reason,'failureCode',e.failure_code,
    'changes',coalesce((select jsonb_object_agg(c.key,jsonb_build_object('before',c.value->'before','after',c.value->'after'))
      from jsonb_each(e.changes) c where c.key in ('status','hidden','trashed')),'{}'::jsonb),
    'export',case when e.action = 'announcement.export' and e.outcome = 'success' then
      jsonb_build_object('rowCount',e.details->'row_count','columns',e.details->'columns','announcementIds',e.details->'announcement_ids') else null end
  ) into v_result from private.admin_audit_event_v1 e left join auth.users u on u.id = e.actor_auth_user_uuid where e.event_uuid = p_id;
  return v_result;
end;
$$;

create function public.admin_list_audit_events_v1(p_query jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.admin_list_audit_events_bridge_v1(p_query);
$$;
create function public.admin_get_audit_event_v1(p_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.admin_get_audit_event_bridge_v1(p_id);
$$;

alter function private.admin_list_audit_events_bridge_v1(jsonb) owner to postgres;
alter function private.admin_get_audit_event_bridge_v1(uuid) owner to postgres;
alter function public.admin_list_audit_events_v1(jsonb) owner to postgres;
alter function public.admin_get_audit_event_v1(uuid) owner to postgres;
revoke all on function private.admin_list_audit_events_bridge_v1(jsonb), private.admin_get_audit_event_bridge_v1(uuid),
  public.admin_list_audit_events_v1(jsonb), public.admin_get_audit_event_v1(uuid) from public, anon, authenticated, service_role;
grant execute on function private.admin_list_audit_events_bridge_v1(jsonb), private.admin_get_audit_event_bridge_v1(uuid),
  public.admin_list_audit_events_v1(jsonb), public.admin_get_audit_event_v1(uuid) to authenticated;

comment on function public.admin_list_audit_events_v1(jsonb) is 'Admin audit, bounded keyset reads; current Auth email, Europe/Rome date bounds.';
notify pgrst, 'reload schema';
commit;

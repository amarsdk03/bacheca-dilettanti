-- Phase 04A: internal audit primitives. No public RPC or scheduler dependency.
-- Apply after admin_authorization_foundation. Verified with synthetic PGlite
-- only until the deferred Supabase integration/release gate is completed.
begin;

do $$
begin
  if pg_catalog.to_regprocedure('private.require_admin_context_v1()') is null then
    raise exception 'ADMIN_AUDIT_AUTHORIZATION_REQUIRED';
  end if;
end;
$$;

-- Used by a table CHECK as well as internal inserts. NULL must reject, never
-- silently satisfy a CHECK. Shape checks precede iteration/casts deliberately.
create function private.admin_audit_payload_valid_v1(
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

create table private.admin_audit_event_v1 (
  event_uuid uuid primary key default pg_catalog.gen_random_uuid(),
  occurred_at timestamptz not null default pg_catalog.statement_timestamp() check (pg_catalog.isfinite(occurred_at)),
  correlation_uuid uuid not null,
  -- Deliberately no FKs: account/resource deletion cannot erase audit identity.
  actor_auth_user_uuid uuid,
  actor_utente_uuid uuid,
  action text not null,
  resource_type text not null,
  resource_uuid uuid,
  outcome text not null,
  reason text,
  failure_code text,
  changes jsonb not null default '{}',
  details jsonb not null default '{}',
  constraint admin_audit_payload_v1 check (
    private.admin_audit_payload_valid_v1(action,outcome,reason,failure_code,changes,details) is true),
  constraint admin_audit_actor_v1 check (
    (actor_utente_uuid is null or actor_auth_user_uuid is not null)
    and (outcome collate "C" <> 'success' or (actor_auth_user_uuid is not null and actor_utente_uuid is not null))),
  constraint admin_audit_resource_v1 check (
    case when action collate "C" in ('auth.login','auth.logout','auth.access_denied')
      then resource_type collate "C" = 'session' and (outcome collate "C" = 'failure' or resource_uuid is not null)
    when action collate "C" = 'announcement.export'
      then resource_type collate "C" = 'announcement_export' and resource_uuid is null
    else resource_type collate "C" = 'announcement' and (outcome collate "C" = 'failure' or resource_uuid is not null) end)
);
alter table private.admin_audit_event_v1 owner to postgres;
alter table private.admin_audit_event_v1 enable row level security;
revoke all on table private.admin_audit_event_v1 from public, anon, authenticated, service_role;

create index admin_audit_event_time_v1 on private.admin_audit_event_v1 (occurred_at desc, event_uuid desc);
create index admin_audit_event_actor_time_v1 on private.admin_audit_event_v1
  (actor_utente_uuid, occurred_at desc, event_uuid desc) where actor_utente_uuid is not null;
create index admin_audit_event_correlation_v1 on private.admin_audit_event_v1 (correlation_uuid);

-- INTERNAL ONLY: actor IDs must come from the caller's verified context.
-- A functional procedure calls require_admin_context_v1 ONCE, then passes its
-- result here inside the SAME transaction. This primitive does not reauthorize
-- or accept input directly from a browser. Auth/failure server ingress is 04B.
create function private.append_admin_audit_event_v1(
  p_actor_auth_user_uuid uuid, p_actor_utente_uuid uuid, p_action text,
  p_resource_type text, p_resource_uuid uuid, p_outcome text, p_correlation_uuid uuid,
  p_reason text default null, p_failure_code text default null,
  p_changes jsonb default '{}', p_details jsonb default '{}'
)
returns uuid language plpgsql volatile security invoker set search_path = '' as $$
declare v_event_uuid uuid;
begin
  insert into private.admin_audit_event_v1 (
    actor_auth_user_uuid,actor_utente_uuid,action,resource_type,resource_uuid,
    outcome,correlation_uuid,reason,failure_code,changes,details
  ) values (
    p_actor_auth_user_uuid,p_actor_utente_uuid,p_action,p_resource_type,p_resource_uuid,
    p_outcome,p_correlation_uuid,p_reason,p_failure_code,p_changes,p_details
  ) returning event_uuid into v_event_uuid;
  return v_event_uuid;
end;
$$;

-- Pure arithmetic helper permits deterministic leap-year/month boundary tests.
-- No external caller can use it to pick a deletion cutoff.
create function private.admin_audit_retention_cutoff_v1(p_reference timestamptz)
returns timestamptz language sql immutable strict security invoker set search_path = '' as $$
  select ((p_reference at time zone 'UTC') - interval '12 months') at time zone 'UTC';
$$;

create function private.purge_admin_audit_events_v1()
returns bigint language plpgsql volatile security invoker set search_path = '' set timezone = 'UTC' as $$
declare v_deleted bigint;
begin
  delete from private.admin_audit_event_v1
    where occurred_at < private.admin_audit_retention_cutoff_v1(pg_catalog.transaction_timestamp());
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

alter function private.admin_audit_payload_valid_v1(text,text,text,text,jsonb,jsonb) owner to postgres;
alter function private.append_admin_audit_event_v1(uuid,uuid,text,text,uuid,text,uuid,text,text,jsonb,jsonb) owner to postgres;
alter function private.admin_audit_retention_cutoff_v1(timestamptz) owner to postgres;
alter function private.purge_admin_audit_events_v1() owner to postgres;
revoke all on function private.admin_audit_payload_valid_v1(text,text,text,text,jsonb,jsonb),
  private.append_admin_audit_event_v1(uuid,uuid,text,text,uuid,text,uuid,text,text,jsonb,jsonb),
  private.admin_audit_retention_cutoff_v1(timestamptz), private.purge_admin_audit_events_v1()
  from public, anon, authenticated, service_role;

comment on table private.admin_audit_event_v1 is
  'Private Admin audit. No direct API access. UTC instants; retained for 12 calendar months. Actor identifiers survive account deletion; correlation is not unique.';
comment on function private.append_admin_audit_event_v1(uuid,uuid,text,text,uuid,text,uuid,text,text,jsonb,jsonb) is
  'Internal INVOKER primitive only. Caller derives actor from verified server/DB context. Success shares the mutation transaction; failure uses a new transaction after rollback. Never grant to API roles.';
comment on function private.purge_admin_audit_events_v1() is
  'Reserved maintenance, no arguments. Deletes strictly older than 12 calendar months in UTC. Scheduling is separate; never grant to dashboard/API roles.';
commit;

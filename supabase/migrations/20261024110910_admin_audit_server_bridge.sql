-- Phase 04B. Backend attestations only; never authorizes an Admin operation.
-- The server verifies the human session with its separate authenticated client.
begin;
do $$
begin
  if pg_catalog.to_regprocedure('private.append_admin_audit_event_v1(uuid,uuid,text,text,uuid,text,uuid,text,text,jsonb,jsonb)') is null then
    raise exception 'ADMIN_AUDIT_FOUNDATION_REQUIRED';
  end if;
end;
$$;

create function private.record_admin_server_audit_v1(
  p_action text, p_outcome text, p_correlation_uuid uuid,
  p_actor_auth_user_uuid uuid default null, p_actor_utente_uuid uuid default null,
  p_resource_uuid uuid default null, p_failure_code text default null
)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare v_resource_type text;
begin
  -- current_user is the definer, NOT the external caller. Check the original
  -- SQL role too, so an authenticated caller cannot enter through another RPC.
  if pg_catalog.current_setting('role',true) is distinct from 'service_role'
    or ((select auth.jwt()) ->> 'role') is distinct from 'service_role' then
    raise exception using errcode='42501', message='ADMIN_SERVER_AUDIT_BACKEND_REQUIRED';
  end if;
  if p_outcome is null or p_outcome collate "C" not in ('success','failure')
    or (p_outcome collate "C" = 'success' and
      (p_action is null or p_action collate "C" not in ('auth.login','auth.logout'))) then
    raise exception using errcode='22023', message='ADMIN_SERVER_AUDIT_EVENT_INVALID';
  end if;
  v_resource_type := case when p_action collate "C" in ('auth.login','auth.logout','auth.access_denied')
    then 'session' when p_action collate "C" = 'announcement.export'
    then 'announcement_export' else 'announcement' end;
  -- No payload/reason/timestamp arguments, and no human authorization bypass.
  -- Identity is attested by trusted backend code, not inferred from a service
  -- JWT. In particular logout may already have removed the original session.
  return private.append_admin_audit_event_v1(p_actor_auth_user_uuid,p_actor_utente_uuid,
    p_action,v_resource_type,p_resource_uuid,p_outcome,p_correlation_uuid,
    null,p_failure_code,'{}'::jsonb,'{}'::jsonb);
end;
$$;
alter function private.record_admin_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text) owner to postgres;
revoke all on function private.record_admin_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)
  from public, anon, authenticated, service_role;
grant usage on schema private to service_role;
grant execute on function private.record_admin_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text) to service_role;

create function public.admin_record_server_audit_v1(
  p_action text, p_outcome text, p_correlation_uuid uuid,
  p_actor_auth_user_uuid uuid default null, p_actor_utente_uuid uuid default null,
  p_resource_uuid uuid default null, p_failure_code text default null
)
returns uuid language sql volatile security invoker set search_path = '' as $$
  select private.record_admin_server_audit_v1(p_action,p_outcome,p_correlation_uuid,
    p_actor_auth_user_uuid,p_actor_utente_uuid,p_resource_uuid,p_failure_code);
$$;
alter function public.admin_record_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text) owner to postgres;
revoke all on function public.admin_record_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function public.admin_record_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text) to service_role;
comment on function public.admin_record_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text) is
  'Backend-only audit attestation. Auth successes and bounded failures only. Server derives actor from verified user context; secret key is never human authorization. No mutation/export success or arbitrary payload.';
notify pgrst, 'reload schema';
commit;

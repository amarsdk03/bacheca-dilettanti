-- Run as postgres. Deferred activity triggers also run at Auth's COMMIT,
-- when the active role is supabase_auth_admin rather than the provisioner.
-- Keep private schema/table access restricted and elevate only trigger entry
-- points. Snapshot/refresh helpers retain SECURITY INVOKER and their ACLs.
begin;

alter function private.track_profile_activity() owner to postgres;
alter function private.track_profile_activity() security definer;
alter function private.track_profile_activity() set search_path = '';

alter function private.track_announcement_activity() owner to postgres;
alter function private.track_announcement_activity() security definer;
alter function private.track_announcement_activity() set search_path = '';

revoke all on function private.track_profile_activity(), private.track_announcement_activity()
  from public, anon, authenticated, service_role, supabase_auth_admin;

comment on function private.track_profile_activity() is
  'Internal deferred trigger. Runs as postgres so Auth commits can refresh activity without granting access to private to Auth or browser roles.';
comment on function private.track_announcement_activity() is
  'Internal deferred trigger. Runs as postgres so authenticated publication commits can update activity without granting access to private to browser roles.';

commit;

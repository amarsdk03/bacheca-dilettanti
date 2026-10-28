-- Manual operator template, NOT an automatic migration/seed.
-- Inspect the effective Auth settings/version in the SAME target first.
-- NULL durations mean explicitly verified "disabled", not "unknown".
-- Do not activate phase 03A on a real target before phase 03B integration checks.
begin;
do $policy$
declare
  v_configuration_reviewed boolean := true;
  v_timebox_seconds integer := null;
  v_inactivity_timeout_seconds integer := null;
  v_single_session_per_user boolean := false;
  v_other_auth_limits_present boolean := false;
begin
  if v_configuration_reviewed is distinct from true or v_single_session_per_user is null
    or v_other_auth_limits_present is null then
    raise exception 'ADMIN_AUTH_SETTINGS_REVIEW_REQUIRED';
  end if;
  if v_single_session_per_user or v_other_auth_limits_present then
    raise exception 'ADMIN_AUTH_SETTINGS_NOT_SUPPORTED_YET';
  end if;
  update private.admin_session_policy_v1 set
    timebox_seconds = v_timebox_seconds,
    inactivity_timeout_seconds = v_inactivity_timeout_seconds,
    single_session_per_user = v_single_session_per_user,
    unsupported_auth_settings = v_other_auth_limits_present,
    verified_at = pg_catalog.statement_timestamp()
    where singleton;
  if not found then raise exception 'ADMIN_SESSION_POLICY_MISSING'; end if;
end;
$policy$;
commit;

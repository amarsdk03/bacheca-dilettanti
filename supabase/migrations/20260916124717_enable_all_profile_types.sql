-- Profile availability is controlled by the application feature flag. Keep the
-- private writer capable of creating every schema-supported profile type so
-- disabling the flag does not require another database release.
do $migration$
declare
  v_function_definition text;
  v_updated_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    'private.save_owned_subprofile_core_v1(uuid,text,jsonb,jsonb)'::regprocedure
  )
  into v_function_definition;

  v_updated_definition := pg_catalog.regexp_replace(
    v_function_definition,
    E'[\\r\\n]+[[:blank:]]*if p_profile_type in \\(''professionisti-studi'', ''creators''\\) then[\\r\\n]+[[:blank:]]*raise exception using errcode = ''P0001'', message = ''PROFILE_TYPE_UNAVAILABLE'';[\\r\\n]+[[:blank:]]*end if;',
    '',
    'n'
  );

  if v_updated_definition = v_function_definition then
    raise exception 'Expected legacy profile availability guard was not found';
  end if;

  execute v_updated_definition;
end;
$migration$;

revoke all on function private.save_owned_subprofile_core_v1(uuid, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.save_owned_subprofile_core_v1(uuid, text, jsonb, jsonb)
  to service_role;

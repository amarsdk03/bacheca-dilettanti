-- Current IN02 baseline for nsytraextbndfyprwzts after the authorized exception.
-- READ ONLY: no Auth tokens, emails, row contents or simulated JWT claims.
-- Does not certify real Auth/PostgREST or browser acceptance.
begin transaction read only;
with target as (
  select u.utente_uuid, u.auth_user_uuid, u.tipologia_utente, u.registrato_il,
    a.email_confirmed_at is not null and nullif(pg_catalog.btrim(a.email), '') is not null
      and a.deleted_at is null and not coalesce(a.is_anonymous, false)
      and (a.banned_until is null or a.banned_until <= pg_catalog.statement_timestamp()) as auth_ready
  from public.utente u join auth.users a on a.id = u.auth_user_uuid
  where u.auth_user_uuid = '0b889a5b-a5a5-49ce-a8b7-c1c899f0e391'::uuid
)
select pg_catalog.jsonb_build_object(
  'step', 'IN02', 'captured_at', pg_catalog.statement_timestamp(),
  'transaction_read_only', pg_catalog.current_setting('transaction_read_only'),
  'target_mapping_unique', (select count(*) = 1 from target),
  'admin_identity_ready', exists(select 1 from target where auth_ready and tipologia_utente collate "C" = 'Admin'),
  'registration_preserved', exists(select 1 from target where registrato_il is not null),
  'existing_profiles_present', exists(select 1 from public.profilo p join target t on p.uuid_utente = t.utente_uuid),
  'existing_announcements_present', exists(select 1 from public.annuncio a join target t on a.creato_da = t.utente_uuid),
  'session_policy', (select to_jsonb(p) from private.admin_session_policy_v1 p where singleton),
  'policy_matches_reviewed_values', (select count(*) = 1 and bool_and(
    verified_at is not null and verified_at <= pg_catalog.statement_timestamp()
    and timebox_seconds is null and inactivity_timeout_seconds is null
    and not single_session_per_user and not unsupported_auth_settings)
    from private.admin_session_policy_v1),
  'exception_constraint_validated_and_bound', exists(
    select 1 from pg_catalog.pg_constraint c cross join target t
    where c.conrelid = 'public.utente'::regclass and c.conname = 'admin_account_not_registered_v1'
      and c.convalidated
      and pg_catalog.strpos(pg_catalog.pg_get_constraintdef(c.oid), t.auth_user_uuid::text) > 0
      and pg_catalog.strpos(pg_catalog.pg_get_constraintdef(c.oid), t.utente_uuid::text) > 0),
  'original_account_guard_restored', (select pg_catalog.md5(prosrc) = 'aedb904ab9c59bf6ed1058490287fee7'
    from pg_catalog.pg_proc where oid = 'private.protect_admin_account_v1()'::regprocedure),
  'ownership_guard_unchanged', (select pg_catalog.md5(prosrc) = 'e1507a1614a5ac01a12d1e643a82e25f'
    from pg_catalog.pg_proc where oid = 'private.reject_admin_personal_owner_v1()'::regprocedure),
  'web_guard_unchanged', (select pg_catalog.md5(prosrc) = '10d08422a67ebbcf2a2c67acc3befae2'
    from pg_catalog.pg_proc where oid = 'private.assert_not_admin_account_v1(uuid)'::regprocedure),
  'account_trigger_enabled', exists(select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.utente'::regclass and tgname = 'protect_admin_account_v1' and tgenabled = 'O'),
  'ordinary_role_write_denied', not pg_catalog.has_table_privilege('authenticated', 'public.utente', 'UPDATE')
    and not pg_catalog.has_column_privilege('authenticated', 'public.utente', 'tipologia_utente', 'UPDATE')
    and not pg_catalog.has_table_privilege('anon', 'public.utente', 'UPDATE')
    and not pg_catalog.has_column_privilege('anon', 'public.utente', 'tipologia_utente', 'UPDATE'),
  'trash_gate_disabled', (select count(*) = 1 and bool_and(not enabled) from private.admin_trash_release_v1)
) as report;
commit;

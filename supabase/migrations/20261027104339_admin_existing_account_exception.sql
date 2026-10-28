-- IN02: explicit one-time operator authorization, 2026-10-27.
-- This target-specific operation preserves the existing registration/content.
-- All future provisioning continues to use dashboard_admin_provision.sql.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '30s';
lock table public.utente in access exclusive mode;

do $exception$
declare
  v_auth_id constant uuid := '0b889a5b-a5a5-49ce-a8b7-c1c899f0e391';
  v_account public.utente%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_guard text;
  v_temporary_guard text;
  v_needle constant text := '  if new.tipologia_utente collate "C" = ''Admin'' and (';
  v_constraint_expression text;
  v_profiles bigint;
  v_announcements bigint;
  v_updated integer;
begin
  if current_user::text not in ('postgres', 'supabase_admin')
    or nullif(pg_catalog.current_setting('request.jwt.claims', true), '') is not null then
    raise exception 'ADMIN_EXCEPTION_OPERATOR_REQUIRED';
  end if;
  if not exists (select 1 from private.admin_session_policy_v1
    where singleton and verified_at is not null
      and verified_at <= pg_catalog.statement_timestamp()
      and not single_session_per_user and not unsupported_auth_settings) then
    raise exception 'ADMIN_EXCEPTION_VERIFIED_POLICY_REQUIRED';
  end if;
  perform 1 from auth.users a where a.id = v_auth_id
    and a.email_confirmed_at is not null and nullif(pg_catalog.btrim(a.email), '') is not null
    and a.deleted_at is null and not coalesce(a.is_anonymous, false)
    and (a.banned_until is null or a.banned_until <= pg_catalog.statement_timestamp())
    for update;
  if not found then raise exception 'ADMIN_AUTH_IDENTITY_NOT_READY'; end if;
  select * into v_account from public.utente where auth_user_uuid = v_auth_id for update;
  if not found then raise exception 'ADMIN_EXCEPTION_TARGET_MISSING'; end if;
  if v_account.tipologia_utente collate "C" is distinct from 'Utente'
    or v_account.registrato_il is null then
    raise exception 'ADMIN_EXCEPTION_TARGET_STATE_CHANGED_DO_NOT_REPLAY';
  end if;
  select pg_catalog.pg_get_expr(c.conbin, c.conrelid) into v_constraint_expression
    from pg_catalog.pg_constraint c where c.conrelid = 'public.utente'::regclass
      and c.conname = 'admin_account_not_registered_v1' and c.contype = 'c' and c.convalidated;
  if v_constraint_expression is null or
    pg_catalog.regexp_replace(pg_catalog.replace(v_constraint_expression, '::text', ''), '[[:space:]()]', '', 'g')
      is distinct from 'tipologia_utenteCOLLATE"C"ISDISTINCTFROM''Admin''ORregistrato_ilISNULL' then
    raise exception 'ADMIN_EXCEPTION_CONSTRAINT_REVIEW_REQUIRED';
  end if;
  if not exists (select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.utente'::regclass and tgname = 'protect_admin_account_v1'
      and tgenabled = 'O' and not tgisinternal) then
    raise exception 'ADMIN_EXCEPTION_GUARD_REQUIRED';
  end if;
  select pg_catalog.pg_get_functiondef(p.oid) into v_guard from pg_catalog.pg_proc p
    where p.oid = 'private.protect_admin_account_v1()'::regprocedure
      and pg_catalog.md5(pg_catalog.replace(p.prosrc, E'\r\n', E'\n')) = '66de6b1752d7a6bef7ba63ac954b338d';
  if v_guard is null or pg_catalog.strpos(v_guard, v_needle) = 0 then
    raise exception 'ADMIN_EXCEPTION_GUARD_REVIEW_REQUIRED';
  end if;

  v_before := to_jsonb(v_account);
  select count(*) into v_profiles from public.profilo where uuid_utente = v_account.utente_uuid;
  select count(*) into v_announcements from public.annuncio where creato_da = v_account.utente_uuid;

  -- The only lasting schema exception is bound to BOTH existing identity IDs.
  -- Explicit null-safe comparisons cannot exempt a missing/relinked identity.
  alter table public.utente drop constraint admin_account_not_registered_v1;
  execute pg_catalog.format(
    'alter table public.utente add constraint admin_account_not_registered_v1 check '
    || '(tipologia_utente collate "C" is distinct from ''Admin'' or registrato_il is null '
    || 'or (auth_user_uuid is not distinct from %L::uuid and utente_uuid is not distinct from %L::uuid))',
    v_auth_id, v_account.utente_uuid);

  -- Only this operator/identity pair can cross the ownership guard, inside this
  -- transaction. No trigger is disabled; the original body is restored below.
  v_temporary_guard := pg_catalog.replace(v_guard, v_needle, pg_catalog.format(
    '  if new.tipologia_utente collate "C" = ''Admin'' and not '
    || '(v_operator and new.auth_user_uuid is not distinct from %L::uuid '
    || 'and new.utente_uuid is not distinct from %L::uuid) and (',
    v_auth_id, v_account.utente_uuid));
  execute v_temporary_guard;
  update public.utente set tipologia_utente = 'Admin', ultima_modifica_il = pg_catalog.statement_timestamp()
    where utente_uuid = v_account.utente_uuid and auth_user_uuid = v_auth_id
      and tipologia_utente collate "C" = 'Utente';
  get diagnostics v_updated = row_count;
  if v_updated <> 1 then raise exception 'ADMIN_EXCEPTION_EXPECTED_ONE_ACCOUNT'; end if;
  execute v_guard;
  if pg_catalog.pg_get_functiondef('private.protect_admin_account_v1()'::regprocedure) is distinct from v_guard then
    raise exception 'ADMIN_EXCEPTION_GUARD_RESTORE_FAILED';
  end if;
  select to_jsonb(u) into v_after from public.utente u where u.utente_uuid = v_account.utente_uuid;
  if v_after ->> 'tipologia_utente' is distinct from 'Admin'
    or (v_after - array['tipologia_utente', 'ultima_modifica_il'])
      is distinct from (v_before - array['tipologia_utente', 'ultima_modifica_il'])
    or (select count(*) from public.profilo where uuid_utente = v_account.utente_uuid) <> v_profiles
    or (select count(*) from public.annuncio where creato_da = v_account.utente_uuid) <> v_announcements then
    raise exception 'ADMIN_EXCEPTION_DATA_PRESERVATION_FAILED';
  end if;
end;
$exception$;

comment on constraint admin_account_not_registered_v1 on public.utente is
  'Dedicated Admin by default. One operator-authorized existing identity pair grandfathered on 2026-10-27; original ownership/role triggers remain enforced.';
commit;

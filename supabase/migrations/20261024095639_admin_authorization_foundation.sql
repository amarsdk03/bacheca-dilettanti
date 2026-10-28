-- Phase 03A. Disabled by default until the actual Auth configuration is verified.
-- No Auth global settings or existing account data are changed here.
begin;

create table private.admin_session_policy_v1 (
  singleton boolean primary key default true check (singleton),
  verified_at timestamptz,
  timebox_seconds integer check (timebox_seconds > 0),
  inactivity_timeout_seconds integer check (inactivity_timeout_seconds > 0),
  single_session_per_user boolean not null default false,
  unsupported_auth_settings boolean not null default true
);
alter table private.admin_session_policy_v1 enable row level security;
revoke all on table private.admin_session_policy_v1 from public, anon, authenticated, service_role;
insert into private.admin_session_policy_v1 (singleton) values (true);
comment on table private.admin_session_policy_v1 is
  'Operator-verified mirror of effective Auth settings, not a replacement for them. NULL verified_at disables Admin. Single-session/tag/AAL policies require integration before activation.';

-- A dedicated Admin never acquires ordinary registration/profile ownership.
-- Fail on incompatible existing data rather than silently modifying accounts.
do $$
begin
  if exists (
    select 1 from public.utente u
    where u.tipologia_utente collate "C" = 'Admin'
      and (u.registrato_il is not null
        or exists (select 1 from public.profilo p where p.uuid_utente = u.utente_uuid)
        or exists (select 1 from public.annuncio a where a.creato_da = u.utente_uuid))
  ) then
    raise exception 'ADMIN_ACCOUNT_NOT_DEDICATED';
  end if;
end;
$$;
alter table public.utente add constraint admin_account_not_registered_v1
  check (tipologia_utente collate "C" is distinct from 'Admin' or registrato_il is null);

-- Reuse an existing unique btree lookup where present; otherwise add one.
-- A non-unique identity mapping cannot be used safely for authorization.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_index i join pg_catalog.pg_attribute a
      on a.attrelid = i.indrelid and a.attname = 'auth_user_uuid'
    where i.indrelid = 'public.utente'::regclass and i.indisunique and i.indisvalid
      and i.indpred is null and i.indexprs is null and i.indnkeyatts = 1 and i.indkey[0] = a.attnum
  ) then
    create unique index utente_admin_auth_lookup_v1 on public.utente (auth_user_uuid);
  end if;
end;
$$;

create function private.protect_admin_account_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_outer_role text := pg_catalog.current_setting('role', true);
  v_operator boolean;
  v_protected_change boolean;
begin
  -- current_user inside SECURITY DEFINER is NOT the caller. Inspect the outer
  -- SQL role and reject requests with JWT context, including service_role RPCs.
  v_operator := (case when v_outer_role is null or v_outer_role = 'none'
    then session_user::text else v_outer_role end) in ('postgres', 'supabase_admin')
    and nullif(pg_catalog.current_setting('request.jwt.claims', true), '') is null;
  if tg_op = 'INSERT' then
    v_protected_change := new.tipologia_utente collate "C" is distinct from 'Utente';
  else
    v_protected_change := new.tipologia_utente collate "C" is distinct from old.tipologia_utente collate "C"
      or (old.tipologia_utente collate "C" = 'Admin' and
        (new.auth_user_uuid is distinct from old.auth_user_uuid or new.utente_uuid is distinct from old.utente_uuid));
  end if;
  if v_protected_change and not v_operator then
    raise exception using errcode = '42501', message = 'ACCOUNT_ROLE_WRITE_FORBIDDEN';
  end if;
  if new.tipologia_utente collate "C" = 'Admin' and (
    exists (select 1 from public.profilo p where p.uuid_utente = new.utente_uuid)
    or exists (select 1 from public.annuncio a where a.creato_da = new.utente_uuid)
  ) then
    raise exception using errcode = '42501', message = 'ADMIN_ACCOUNT_NOT_DEDICATED';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_admin_account_v1() from public, anon, authenticated, service_role;
create trigger protect_admin_account_v1 before insert or update of
  tipologia_utente, auth_user_uuid, utente_uuid, registrato_il on public.utente
  for each row execute function private.protect_admin_account_v1();

create function private.reject_admin_personal_owner_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_owner uuid; v_kind text;
begin
  if tg_table_name = 'profilo' then v_owner := new.uuid_utente;
  else v_owner := new.creato_da;
  end if;
  -- Serialize ownership creation against role promotion without locking every
  -- row of a moderation/list operation. Only ownership writes run this trigger.
  select u.tipologia_utente into v_kind from public.utente u
    where u.utente_uuid = v_owner for share;
  if v_kind collate "C" = 'Admin' then
    raise exception using errcode = '42501', message = 'ADMIN_PERSONAL_ACCOUNT_FORBIDDEN';
  end if;
  return new;
end;
$$;
revoke all on function private.reject_admin_personal_owner_v1() from public, anon, authenticated, service_role;
create trigger reject_admin_profile_owner_v1 before insert or update of uuid_utente on public.profilo
  for each row execute function private.reject_admin_personal_owner_v1();
create trigger reject_admin_announcement_owner_v1 before insert or update of creato_da on public.annuncio
  for each row execute function private.reject_admin_personal_owner_v1();

-- No ordinary Data API write privileges on the account table, including grants
-- at column level. Do not change existing SELECT/ownership policies.
revoke insert, update on table public.utente from public, anon, authenticated;
do $$
declare v_columns text;
begin
  select pg_catalog.string_agg(pg_catalog.quote_ident(a.attname), ', ' order by a.attnum)
    into v_columns from pg_catalog.pg_attribute a
    where a.attrelid = 'public.utente'::regclass and a.attnum > 0 and not a.attisdropped;
  execute 'revoke insert (' || v_columns || '), update (' || v_columns || ') on public.utente from public, anon, authenticated';
end;
$$;

create function private.assert_not_admin_account_v1(p_auth_user_id uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from public.utente u where u.auth_user_uuid = p_auth_user_id
    and u.tipologia_utente collate "C" = 'Admin') then
    raise exception using errcode = '42501', message = 'ADMIN_PERSONAL_ACCOUNT_FORBIDDEN';
  end if;
end;
$$;
revoke all on function private.assert_not_admin_account_v1(uuid) from public, anon, authenticated, service_role;
grant execute on function private.assert_not_admin_account_v1(uuid) to service_role;

-- Preserve the latest function bodies and their ACLs, including all intervening
-- provisioning/publication wrappers. Abort on an unknown body/anchor.
do $guards$
declare v_signature text; v_definition text; v_position integer; v_guard text; v_anchor text; v_eol text;
begin
  foreach v_signature in array array[
    'private.provision_auth_user(uuid,text,jsonb)',
    'private.registered_internal_user_id(uuid)',
    'public.complete_registration_v1(uuid)',
    'public.publish_announcement_v2(uuid,jsonb,text,text,text)'
  ] loop
    select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(v_signature)) into v_definition;
    if v_definition is null then raise exception 'Missing required function: %', v_signature; end if;
    v_eol := E'\r\n';
    v_anchor := v_eol || 'begin' || v_eol;
    v_position := pg_catalog.strpos(v_definition, v_anchor);
    if v_position = 0 then
      v_eol := E'\n';
      v_anchor := v_eol || 'begin' || v_eol;
      v_position := pg_catalog.strpos(v_definition, v_anchor);
    end if;
    if v_position = 0 then raise exception 'Unknown function body: %', v_signature; end if;
    v_guard := case v_signature
      when 'private.provision_auth_user(uuid,text,jsonb)' then 'p_user_id'
      when 'private.registered_internal_user_id(uuid)' then 'p_auth_user_id'
      else '(select auth.uid())' end;
    v_definition := pg_catalog.overlay(v_definition,
      v_anchor || '  perform private.assert_not_admin_account_v1(' || v_guard || ');' || v_eol
      , v_position, pg_catalog.length(v_anchor));
    execute v_definition;
  end loop;
end;
$guards$;

create function private.require_admin_context_v1()
returns table (auth_user_uuid uuid, utente_uuid uuid)
language plpgsql stable security definer set search_path = '' set timezone = 'UTC' as $$
declare
  v_jwt jsonb := (select auth.jwt());
  v_auth_id uuid;
  v_session_id uuid;
  v_user_id uuid;
  v_now timestamptz := pg_catalog.statement_timestamp();
  v_policy private.admin_session_policy_v1%rowtype;
  v_session auth.sessions%rowtype;
  v_last_refresh timestamptz;
begin
  -- PostgREST must validate the JWT signature. Only its trusted claims are
  -- accepted here; metadata and request parameters are never authorization.
  if v_jwt ->> 'role' is distinct from 'authenticated'
    or coalesce(v_jwt ->> 'sub', '') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    or coalesce(v_jwt ->> 'session_id', '') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    or pg_catalog.jsonb_typeof(v_jwt -> 'exp') is distinct from 'number'
    or coalesce(v_jwt ->> 'exp', '') !~ '^[0-9]{1,12}$' then
    raise exception using errcode = '42501', message = 'ADMIN_ACCESS_DENIED';
  end if;
  if (v_jwt ->> 'exp')::numeric <= extract(epoch from v_now) then
    raise exception using errcode = '42501', message = 'ADMIN_ACCESS_DENIED';
  end if;
  if v_jwt ? 'nbf' then
    if pg_catalog.jsonb_typeof(v_jwt -> 'nbf') is distinct from 'number'
      or coalesce(v_jwt ->> 'nbf', '') !~ '^[0-9]{1,12}$' then
      raise exception using errcode = '42501', message = 'ADMIN_ACCESS_DENIED';
    end if;
    if (v_jwt ->> 'nbf')::numeric > extract(epoch from v_now) then
      raise exception using errcode = '42501', message = 'ADMIN_ACCESS_DENIED';
    end if;
  end if;
  v_auth_id := (v_jwt ->> 'sub')::uuid;
  v_session_id := (v_jwt ->> 'session_id')::uuid;
  if v_auth_id is distinct from (select auth.uid()) then
    raise exception using errcode = '42501', message = 'ADMIN_ACCESS_DENIED';
  end if;

  select u.utente_uuid into v_user_id
    from public.utente u join auth.users a on a.id = u.auth_user_uuid
    where u.auth_user_uuid = v_auth_id and u.tipologia_utente collate "C" = 'Admin'
      and a.email_confirmed_at is not null and nullif(pg_catalog.btrim(a.email), '') is not null
      and a.deleted_at is null and not coalesce(a.is_anonymous, false)
      and (a.banned_until is null or a.banned_until <= v_now);
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'ADMIN_ACCESS_DENIED';
  end if;
  select * into v_policy from private.admin_session_policy_v1 where singleton;
  if not found or v_policy.verified_at is null or v_policy.verified_at > v_now
    or v_policy.unsupported_auth_settings or v_policy.single_session_per_user then
    -- Phase 03B must verify the deployed Auth version/settings. Until supported,
    -- single-session, session-tag and low-AAL timeout settings cannot be ignored.
    raise exception using errcode = '42501', message = 'ADMIN_SESSION_POLICY_UNVERIFIED';
  end if;
  select * into v_session from auth.sessions s where s.id = v_session_id and s.user_id = v_auth_id;
  if not found or v_session.created_at is null
    or (v_session.not_after is not null and v_session.not_after <= v_now)
    or (v_policy.timebox_seconds is not null
      and v_session.created_at + pg_catalog.make_interval(secs => v_policy.timebox_seconds) <= v_now) then
    raise exception using errcode = '42501', message = 'ADMIN_ACCESS_DENIED';
  end if;
  if v_policy.inactivity_timeout_seconds is not null then
    v_last_refresh := v_session.refreshed_at;
    if v_last_refresh is null then
      -- Legacy Auth versions can retain refresh timestamps only on the tokens.
      -- Read timestamp metadata only, never a token value.
      select greatest(v_session.created_at, max(r.updated_at)) into v_last_refresh
        from auth.refresh_tokens r where r.session_id = v_session_id and not r.revoked;
    end if;
    if v_last_refresh + pg_catalog.make_interval(secs => v_policy.inactivity_timeout_seconds) <= v_now then
      raise exception using errcode = '42501', message = 'ADMIN_ACCESS_DENIED';
    end if;
  end if;
  return query select v_auth_id, v_user_id;
end;
$$;
revoke all on function private.require_admin_context_v1() from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;
grant execute on function private.require_admin_context_v1() to authenticated;

create function public.admin_get_context_v1()
returns table (auth_user_uuid uuid, utente_uuid uuid)
language sql stable security invoker set search_path = '' as $$
  select * from private.require_admin_context_v1();
$$;
revoke all on function public.admin_get_context_v1() from public, anon, authenticated, service_role;
grant execute on function public.admin_get_context_v1() to authenticated;

comment on function public.admin_get_context_v1() is
  'Minimal current Admin context. No actor parameters; role and session rechecked for each statement. No authorization cache across requests.';
notify pgrst, 'reload schema';
commit;

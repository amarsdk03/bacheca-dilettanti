-- Classify an email against both Supabase Auth and the application account.
-- This RPC is server-only because auth.users must never be exposed to clients.

create or replace function public.get_registration_email_identity_v1(
  p_email text
)
returns table (
  identity_status text,
  auth_user_uuid uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_normalized_email text;
  v_auth_match_count bigint;
  v_auth_user_id uuid;
  v_email_confirmed_at timestamptz;
  v_public_user_id uuid;
  v_public_auth_user_id uuid;
  v_public_email text;
  v_registered_at timestamptz;
begin
  v_normalized_email := pg_catalog.lower(pg_catalog.btrim(p_email));

  if v_normalized_email is null
    or pg_catalog.char_length(v_normalized_email) > 254
    or v_normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception using errcode = '22023', message = 'INVALID_EMAIL';
  end if;

  select pg_catalog.count(*)
  into v_auth_match_count
  from auth.users as auth_user
  where pg_catalog.lower(pg_catalog.btrim(auth_user.email::text)) = v_normalized_email;

  if v_auth_match_count > 1 then
    raise exception using errcode = '23505', message = 'DUPLICATE_AUTH_EMAIL';
  end if;

  select auth_user.id, auth_user.email_confirmed_at
  into v_auth_user_id, v_email_confirmed_at
  from auth.users as auth_user
  where pg_catalog.lower(pg_catalog.btrim(auth_user.email::text)) = v_normalized_email;

  if v_auth_user_id is null then
    if exists (
      select 1
      from public.utente as app_user
      where pg_catalog.lower(pg_catalog.btrim(app_user.indirizzo_email)) = v_normalized_email
    ) then
      raise exception using errcode = '28000', message = 'PUBLIC_USER_WITHOUT_AUTH_IDENTITY';
    end if;

    identity_status := 'new_email';
    auth_user_uuid := null;
    return next;
    return;
  end if;

  select
    app_user.utente_uuid,
    app_user.auth_user_uuid,
    app_user.indirizzo_email,
    app_user.registrato_il
  into
    v_public_user_id,
    v_public_auth_user_id,
    v_public_email,
    v_registered_at
  from public.utente as app_user
  where app_user.auth_user_uuid = v_auth_user_id;

  if v_public_user_id is null then
    select
      app_user.utente_uuid,
      app_user.auth_user_uuid,
      app_user.indirizzo_email,
      app_user.registrato_il
    into
      v_public_user_id,
      v_public_auth_user_id,
      v_public_email,
      v_registered_at
    from public.utente as app_user
    where pg_catalog.lower(pg_catalog.btrim(app_user.indirizzo_email)) = v_normalized_email;
  end if;

  if v_public_user_id is not null
    and v_public_auth_user_id is distinct from v_auth_user_id
  then
    raise exception using errcode = '28000', message = 'EMAIL_ACCOUNT_MISMATCH';
  end if;

  if v_public_email is not null
    and pg_catalog.lower(pg_catalog.btrim(v_public_email)) is distinct from v_normalized_email
  then
    raise exception using errcode = '28000', message = 'AUTH_PUBLIC_EMAIL_MISMATCH';
  end if;

  auth_user_uuid := v_auth_user_id;

  if v_registered_at is null then
    identity_status := 'recovery_required';
  elsif v_email_confirmed_at is null then
    identity_status := 'signup_pending';
  else
    identity_status := 'registered';
  end if;

  return next;
end;
$$;

comment on function public.get_registration_email_identity_v1(text) is
  'Server-only classification of a normalized email across auth.users and public.utente.';

revoke all on function public.get_registration_email_identity_v1(text)
  from public, anon, authenticated;
grant execute on function public.get_registration_email_identity_v1(text)
  to service_role;

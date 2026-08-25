-- Reconcile the Auth UUID with the application's internal user UUID.
-- Email OTP accounts created for publishing intentionally have no public.utente
-- row until their first successful publish. An official registration always
-- stores the internal public.utente.utente_uuid in profile and audit foreign keys.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

alter table public.utente
  add column if not exists registrato_il timestamptz;

comment on column public.utente.auth_user_uuid is
  'Required link to auth.users.id. Application foreign keys and audit columns use utente_uuid instead.';
comment on column public.utente.registrato_il is
  'Official registration completion time; NULL identifies an email-verified publishing-only account without an official profile.';

-- Historical provisioning created an owned base profile but did not stamp
-- registrato_il. An owned profile is the strongest available legacy signal of
-- a completed registration; publishing-only profiles have uuid_utente NULL.
update public.utente as app_user
set registrato_il = coalesce(
  owned_profile.creato_il,
  app_user.creato_il,
  now()
)
from public.profilo as owned_profile
where owned_profile.uuid_utente = app_user.utente_uuid
  and app_user.registrato_il is null;

do $$
begin
  if exists (
    select 1
    from public.utente
    where indirizzo_email is not null
    group by pg_catalog.lower(pg_catalog.btrim(indirizzo_email))
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'DUPLICATE_NORMALIZED_USER_EMAIL';
  end if;
end;
$$;

update public.utente
set indirizzo_email = pg_catalog.lower(pg_catalog.btrim(indirizzo_email))
where indirizzo_email is not null
  and indirizzo_email is distinct from pg_catalog.lower(pg_catalog.btrim(indirizzo_email));

alter table public.utente
  add constraint utente_indirizzo_email_normalized_check
  check (
    indirizzo_email is null
    or indirizzo_email = pg_catalog.lower(pg_catalog.btrim(indirizzo_email))
  );

create unique index if not exists utente_indirizzo_email_normalized_key
  on public.utente ((pg_catalog.lower(pg_catalog.btrim(indirizzo_email))))
  where indirizzo_email is not null;

-- Preserve the existing server RPC signatures. Their original implementations
-- already contain the profile-specific writes; move them behind wrappers that
-- translate an Auth UUID to the internal public.utente UUID.
alter function public.save_owned_subprofile(uuid, text, jsonb, jsonb)
  set schema private;
alter function private.save_owned_subprofile(uuid, text, jsonb, jsonb)
  rename to save_owned_subprofile_internal_v1;

alter function public.set_owned_primary_subprofile(uuid, text)
  set schema private;
alter function private.set_owned_primary_subprofile(uuid, text)
  rename to set_owned_primary_subprofile_internal_v1;

alter function public.delete_owned_subprofile(uuid, text)
  set schema private;
alter function private.delete_owned_subprofile(uuid, text)
  rename to delete_owned_subprofile_internal_v1;

revoke all on function private.save_owned_subprofile_internal_v1(uuid, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.set_owned_primary_subprofile_internal_v1(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function private.delete_owned_subprofile_internal_v1(uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function private.save_owned_subprofile_internal_v1(uuid, text, jsonb, jsonb)
  to service_role;
grant execute on function private.set_owned_primary_subprofile_internal_v1(uuid, text)
  to service_role;
grant execute on function private.delete_owned_subprofile_internal_v1(uuid, text)
  to service_role;

create or replace function private.registered_internal_user_id(
  p_auth_user_id uuid
)
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_internal_user_id uuid;
begin
  if p_auth_user_id is null then
    raise exception using errcode = '22023', message = 'AUTH_REQUIRED';
  end if;

  select app_user.utente_uuid
  into v_internal_user_id
  from public.utente as app_user
  where app_user.auth_user_uuid = p_auth_user_id
    and app_user.registrato_il is not null;

  if v_internal_user_id is null then
    raise exception using errcode = 'P0001', message = 'BASE_PROFILE_NOT_FOUND';
  end if;

  return v_internal_user_id;
end;
$$;

revoke all on function private.registered_internal_user_id(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.registered_internal_user_id(uuid)
  to service_role;

create or replace function public.save_owned_subprofile(
  p_user_id uuid,
  p_profile_type text,
  p_draft jsonb,
  p_locations jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_internal_user_id uuid;
begin
  v_internal_user_id := private.registered_internal_user_id(p_user_id);

  return private.save_owned_subprofile_internal_v1(
    v_internal_user_id,
    p_profile_type,
    p_draft,
    p_locations
  );
end;
$$;

create or replace function public.set_owned_primary_subprofile(
  p_user_id uuid,
  p_profile_type text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_internal_user_id uuid;
begin
  v_internal_user_id := private.registered_internal_user_id(p_user_id);

  perform private.set_owned_primary_subprofile_internal_v1(
    v_internal_user_id,
    p_profile_type
  );
end;
$$;

create or replace function public.delete_owned_subprofile(
  p_user_id uuid,
  p_profile_type text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_internal_user_id uuid;
begin
  v_internal_user_id := private.registered_internal_user_id(p_user_id);

  return private.delete_owned_subprofile_internal_v1(
    v_internal_user_id,
    p_profile_type
  );
end;
$$;

revoke all on function public.save_owned_subprofile(uuid, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.set_owned_primary_subprofile(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.delete_owned_subprofile(uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.save_owned_subprofile(uuid, text, jsonb, jsonb)
  to service_role;
grant execute on function public.set_owned_primary_subprofile(uuid, text)
  to service_role;
grant execute on function public.delete_owned_subprofile(uuid, text)
  to service_role;

create or replace function private.provision_auth_user(
  p_user_id uuid,
  p_email text,
  p_payload jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_internal_user_id uuid;
  v_existing_auth_user_id uuid;
  v_registered_at timestamptz;
  v_normalized_email text;
  v_primary_type text;
  v_profile jsonb;
begin
  v_normalized_email := lower(btrim(p_email));

  if p_user_id is null
    or v_normalized_email is null
    or char_length(v_normalized_email) not between 3 and 254 then
    raise exception using
      errcode = '22023',
      message = 'AUTH_USER_AND_EMAIL_REQUIRED';
  end if;

  if not exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = p_user_id
      and lower(pg_catalog.btrim(auth_user.email)) = v_normalized_email
  ) then
    raise exception using
      errcode = '42501',
      message = 'AUTH_IDENTITY_MISMATCH';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('utente-email:' || v_normalized_email, 0)
  );

  select
    app_user.utente_uuid,
    app_user.auth_user_uuid,
    app_user.registrato_il
  into
    v_internal_user_id,
    v_existing_auth_user_id,
    v_registered_at
  from public.utente as app_user
  where app_user.auth_user_uuid = p_user_id
  for update;

  if v_internal_user_id is not null
    and exists (
      select 1
      from public.utente as duplicate_email_user
      where lower(btrim(duplicate_email_user.indirizzo_email)) = v_normalized_email
        and duplicate_email_user.utente_uuid <> v_internal_user_id
    ) then
    raise exception using
      errcode = '28000',
      message = 'EMAIL_ACCOUNT_MISMATCH';
  end if;

  if v_internal_user_id is null then
    select
      app_user.utente_uuid,
      app_user.auth_user_uuid,
      app_user.registrato_il
    into
      v_internal_user_id,
      v_existing_auth_user_id,
      v_registered_at
    from public.utente as app_user
    where lower(btrim(app_user.indirizzo_email)) = v_normalized_email
    for update;

    if v_internal_user_id is not null
      and v_existing_auth_user_id is distinct from p_user_id then
      raise exception using
        errcode = '28000',
        message = 'EMAIL_ACCOUNT_MISMATCH';
    end if;
  end if;

  if v_internal_user_id is null then
    insert into public.utente (
      auth_user_uuid,
      indirizzo_email,
      tipologia_utente,
      registrato_il,
      creato_il,
      ultima_modifica_il
    )
    values (
      p_user_id,
      v_normalized_email,
      'Utente',
      null,
      now(),
      now()
    )
    returning utente_uuid into v_internal_user_id;
  else
    update public.utente
    set
      indirizzo_email = v_normalized_email,
      ultima_modifica_il = now()
    where utente_uuid = v_internal_user_id;
  end if;

  -- Accounts created without a validated registration intent remain
  -- unregistered and do not receive an official profile.
  if p_payload is null then
    return;
  end if;

  if v_registered_at is not null then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_ALREADY_REGISTERED';
  end if;

  if jsonb_typeof(p_payload) <> 'object'
    or p_payload ->> 'version' <> '1'
    or jsonb_typeof(p_payload -> 'profiles') <> 'array'
    or nullif(p_payload ->> 'primaryProfileType', '') is null then
    raise exception using errcode = '22023', message = 'INVALID_REGISTRATION_PAYLOAD';
  end if;

  v_primary_type := p_payload ->> 'primaryProfileType';

  insert into public.profilo (
    uuid_utente,
    creato_il,
    creato_da,
    ultima_modifica_il,
    ultima_modifica_da,
    nascosto,
    tipologia_principale
  )
  values (
    v_internal_user_id,
    now(),
    v_internal_user_id,
    now(),
    v_internal_user_id,
    false,
    v_primary_type
  )
  on conflict (uuid_utente) do update
  set
    ultima_modifica_il = now(),
    ultima_modifica_da = excluded.ultima_modifica_da,
    nascosto = false,
    tipologia_principale = excluded.tipologia_principale;

  for v_profile in
    select profile.value
    from jsonb_array_elements(p_payload -> 'profiles') as profile(value)
  loop
    perform private.save_owned_subprofile_internal_v1(
      v_internal_user_id,
      v_profile ->> 'type',
      v_profile -> 'draft',
      v_profile -> 'locations'
    );
  end loop;

  update public.utente
  set
    registrato_il = coalesce(registrato_il, now()),
    ultima_modifica_il = now()
  where utente_uuid = v_internal_user_id;
end;
$$;

revoke all on function private.provision_auth_user(uuid, text, jsonb)
  from public, anon, authenticated, service_role;

create or replace function private.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent_text text;
  v_intent_token uuid;
  v_payload jsonb;
begin
  if new.email is null then
    return new;
  end if;

  -- raw_user_meta_data is user-controlled. account_origin is deliberately not
  -- an authorization input: only a valid, server-created, email-bound intent
  -- may provision an official application user and profile.
  v_intent_text := new.raw_user_meta_data ->> 'registration_intent';
  if v_intent_text is null then
    return new;
  end if;

  if v_intent_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using errcode = '22023', message = 'INVALID_REGISTRATION_INTENT';
  end if;

  v_intent_token := v_intent_text::uuid;

  delete from private.registration_intent
  where token = v_intent_token
    and expires_at > now()
    and normalized_email = lower(btrim(new.email))
  returning payload into v_payload;

  if v_payload is null then
    raise exception using errcode = '22023', message = 'INVALID_REGISTRATION_INTENT';
  end if;

  perform private.provision_auth_user(new.id, new.email, v_payload);

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) - 'registration_intent'
  where id = new.id;

  return new;
end;
$$;

revoke all on function private.handle_auth_user_created()
  from public, anon, authenticated, service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_auth_user_created();

create or replace function private.handle_auth_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_normalized_email text;
begin
  if new.email is null or new.email is not distinct from old.email then
    return new;
  end if;

  v_normalized_email := lower(btrim(new.email));
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('utente-email:' || v_normalized_email, 0)
  );

  if exists (
    select 1
    from public.utente as duplicate_email_user
    where lower(btrim(duplicate_email_user.indirizzo_email)) = v_normalized_email
      and duplicate_email_user.auth_user_uuid <> new.id
  ) then
    raise exception using
      errcode = '28000',
      message = 'EMAIL_ACCOUNT_MISMATCH';
  end if;

  update public.utente
  set
    indirizzo_email = v_normalized_email,
    ultima_modifica_il = now()
  where auth_user_uuid = new.id;

  return new;
end;
$$;

revoke all on function private.handle_auth_user_email_updated()
  from public, anon, authenticated, service_role;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function private.handle_auth_user_email_updated();

create or replace function public.complete_registration_v1(
  p_token uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_user_id uuid;
  v_email text;
  v_email_confirmed_at timestamptz;
  v_is_anonymous boolean;
  v_registered_at timestamptz;
  v_payload jsonb;
begin
  v_auth_user_id := (select auth.uid());

  if v_auth_user_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  if p_token is null then
    raise exception using errcode = '22023', message = 'INVALID_REGISTRATION_INTENT';
  end if;

  select
    lower(btrim(auth_user.email)),
    auth_user.email_confirmed_at,
    auth_user.is_anonymous
  into
    v_email,
    v_email_confirmed_at,
    v_is_anonymous
  from auth.users as auth_user
  where auth_user.id = v_auth_user_id
  for update;

  if v_email is null or coalesce(v_is_anonymous, false) then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  if v_email_confirmed_at is null then
    raise exception using errcode = '42501', message = 'EMAIL_NOT_VERIFIED';
  end if;

  -- Keep the same lock order as publishing and Auth email synchronization:
  -- normalized email first, then the corresponding public.utente row.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('utente-email:' || v_email, 0)
  );

  select app_user.registrato_il
  into v_registered_at
  from public.utente as app_user
  where app_user.auth_user_uuid = v_auth_user_id
  for update;

  if v_registered_at is not null then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_ALREADY_REGISTERED';
  end if;

  delete from private.registration_intent
  where token = p_token
    and expires_at > now()
    and normalized_email = v_email
  returning payload into v_payload;

  if v_payload is null then
    raise exception using errcode = '22023', message = 'INVALID_REGISTRATION_INTENT';
  end if;

  perform private.provision_auth_user(v_auth_user_id, v_email, v_payload);
end;
$$;

comment on function public.complete_registration_v1(uuid) is
  'Completes an official registration for the current verified Auth user by consuming a server-created registration intent.';

revoke all on function public.complete_registration_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.complete_registration_v1(uuid)
  to authenticated;

-- Rebuild ownership policies around the stable mapping
-- auth.users.id -> utente.auth_user_uuid -> utente.utente_uuid.
drop policy if exists utente_select_own on public.utente;
create policy utente_select_own
  on public.utente
  for select
  to authenticated
  using (auth_user_uuid = (select auth.uid()));

drop policy if exists profilo_select_own on public.profilo;
create policy profilo_select_own
  on public.profilo
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.utente as owned_user
      where owned_user.utente_uuid = profilo.uuid_utente
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists profilo_giocatore_select_own on public.profilo_giocatore;
create policy profilo_giocatore_select_own
  on public.profilo_giocatore
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = profilo_giocatore.uuid_profilo
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists profilo_squadra_select_own on public.profilo_squadra;
create policy profilo_squadra_select_own
  on public.profilo_squadra
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = profilo_squadra.uuid_profilo
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists profilo_staff_sportivo_select_own on public.profilo_staff_sportivo;
create policy profilo_staff_sportivo_select_own
  on public.profilo_staff_sportivo
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = profilo_staff_sportivo.uuid_profilo
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists profilo_professionista_studente_select_own
  on public.profilo_professionista_studente;
create policy profilo_professionista_studente_select_own
  on public.profilo_professionista_studente
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = profilo_professionista_studente.uuid_profilo
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists profilo_arbitro_select_own on public.profilo_arbitro;
create policy profilo_arbitro_select_own
  on public.profilo_arbitro
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = profilo_arbitro.uuid_profilo
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists profilo_creator_select_own on public.profilo_creator;
create policy profilo_creator_select_own
  on public.profilo_creator
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = profilo_creator.uuid_profilo
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists profilo_torneo_evento_select_own on public.profilo_torneo_evento;
create policy profilo_torneo_evento_select_own
  on public.profilo_torneo_evento
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = profilo_torneo_evento.uuid_profilo
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists profilo_campi_impianti_select_own on public.profilo_campi_impianti;
create policy profilo_campi_impianti_select_own
  on public.profilo_campi_impianti
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = profilo_campi_impianti.uuid_profilo
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists localita_profilo_select_own on public.localita_profilo;
create policy localita_profilo_select_own
  on public.localita_profilo
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = localita_profilo.uuid_profilo
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists link_social_profilo_select_own on public.link_social_profilo;
create policy link_social_profilo_select_own
  on public.link_social_profilo
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = link_social_profilo.uuid_profilo
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists annuncio_select_owned on public.annuncio;
create policy annuncio_select_owned
  on public.annuncio
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.utente as owned_user
      where owned_user.utente_uuid = annuncio.creato_da
        and owned_user.auth_user_uuid = (select auth.uid())
    )
    or exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = annuncio.autore_annuncio
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists annuncio_update_owned on public.annuncio;
create policy annuncio_update_owned
  on public.annuncio
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.utente as owned_user
      where owned_user.utente_uuid = annuncio.creato_da
        and owned_user.auth_user_uuid = (select auth.uid())
    )
    or exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = annuncio.autore_annuncio
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.utente as owned_user
      where owned_user.utente_uuid = annuncio.creato_da
        and owned_user.auth_user_uuid = (select auth.uid())
    )
    or exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = annuncio.autore_annuncio
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

drop policy if exists annuncio_delete_owned on public.annuncio;
create policy annuncio_delete_owned
  on public.annuncio
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.utente as owned_user
      where owned_user.utente_uuid = annuncio.creato_da
        and owned_user.auth_user_uuid = (select auth.uid())
    )
    or exists (
      select 1
      from public.profilo as owned_profile
      join public.utente as owned_user
        on owned_user.utente_uuid = owned_profile.uuid_utente
      where owned_profile.uuid = annuncio.autore_annuncio
        and owned_user.auth_user_uuid = (select auth.uid())
    )
  );

create or replace function private.stamp_annuncio_visibility_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_auth_user_id uuid;
  v_internal_user_id uuid;
begin
  if new.nascosto is distinct from old.nascosto then
    v_auth_user_id := (select auth.uid());

    if v_auth_user_id is null then
      new.ultima_modifica_da := null;
    else
      select app_user.utente_uuid
      into v_internal_user_id
      from public.utente as app_user
      where app_user.auth_user_uuid = v_auth_user_id;

      if v_internal_user_id is null then
        raise exception using errcode = '42501', message = 'AUTH_USER_NOT_PROVISIONED';
      end if;

      new.ultima_modifica_da := v_internal_user_id;
    end if;

    new.ultima_modifica_il := now();
  end if;

  return new;
end;
$$;

revoke all on function private.stamp_annuncio_visibility_update()
  from public, anon, authenticated, service_role;

drop trigger if exists before_annuncio_visibility_update on public.annuncio;
create trigger before_annuncio_visibility_update
  before update of nascosto on public.annuncio
  for each row execute function private.stamp_annuncio_visibility_update();

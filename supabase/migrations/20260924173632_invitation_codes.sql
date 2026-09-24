-- Invitation codes belong to registered application users, not subprofiles.
alter table public.utente
  add column codice_invito text;

alter table public.utente
  add constraint utente_codice_invito_formato_check
  check (codice_invito is null or codice_invito ~ '^[0-9A-F]{16}$');

create unique index utente_codice_invito_key
  on public.utente (codice_invito)
  where codice_invito is not null;

create function private.keep_invitation_code_stable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.codice_invito is not null
    and new.codice_invito is distinct from old.codice_invito then
    raise exception using errcode = '22023', message = 'INVITATION_CODE_IMMUTABLE';
  end if;
  return new;
end;
$$;

revoke all on function private.keep_invitation_code_stable()
  from public, anon, authenticated, service_role;

create trigger before_invitation_code_changed
  before update of codice_invito on public.utente
  for each row execute function private.keep_invitation_code_stable();

create table public.invito (
  invito_uuid uuid primary key default pg_catalog.gen_random_uuid(),
  uuid_invitante uuid not null references public.utente (utente_uuid) on delete cascade,
  uuid_invitato uuid not null unique references public.utente (utente_uuid) on delete cascade,
  codice_invito text not null,
  registrato_il timestamptz not null,
  confermato_il timestamptz,
  considerato boolean not null default false,
  constraint invito_utenti_distinti_check check (uuid_invitante <> uuid_invitato),
  constraint invito_codice_formato_check check (codice_invito ~ '^[0-9A-F]{16}$'),
  constraint invito_considerato_confermato_check check (not considerato or confermato_il is not null)
);

create index invito_invitante_confermato_idx
  on public.invito (uuid_invitante, confermato_il)
  where confermato_il is not null;

alter table public.invito enable row level security;
revoke all on table public.invito from public, anon, authenticated;
revoke all on table public.invito from service_role;
grant select, update (considerato) on table public.invito to service_role;

create function private.ensure_invitation_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_attempt integer;
begin
  select codice_invito into v_code
  from public.utente
  where utente_uuid = p_user_id and registrato_il is not null
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'REGISTERED_USER_NOT_FOUND';
  end if;
  if v_code is not null then
    return v_code;
  end if;

  for v_attempt in 1..10 loop
    v_code := pg_catalog.upper(pg_catalog.substr(
      pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 16
    ));
    begin
      update public.utente set codice_invito = v_code where utente_uuid = p_user_id;
      return v_code;
    exception when unique_violation then
      -- Retry the extremely unlikely random-code collision.
    end;
  end loop;

  raise exception using errcode = '23505', message = 'INVITATION_CODE_EXHAUSTED';
end;
$$;

revoke all on function private.ensure_invitation_code(uuid)
  from public, anon, authenticated, service_role;

do $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select utente_uuid from public.utente where registrato_il is not null
  loop
    perform private.ensure_invitation_code(v_user_id);
  end loop;
end;
$$;

-- Preserve the existing registration validation and add an invitation check
-- before a server-only registration intent can be issued.
alter function public.prepare_registration(text, jsonb)
  rename to prepare_registration_core_v1;
revoke all on function public.prepare_registration_core_v1(text, jsonb)
  from public, anon, authenticated;

create function public.prepare_registration(p_email text, p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_code text;
begin
  v_code := nullif(pg_catalog.upper(pg_catalog.btrim(p_payload ->> 'inviteCode')), '');
  if v_code is not null and (
    v_code !~ '^[0-9A-F]{16}$'
    or not exists (
      select 1 from public.utente as inviter
      where inviter.codice_invito = v_code
        and inviter.registrato_il is not null
        and pg_catalog.lower(pg_catalog.btrim(inviter.indirizzo_email))
          is distinct from pg_catalog.lower(pg_catalog.btrim(p_email))
    )
  ) then
    raise exception using errcode = '22023', message = 'INVALID_INVITATION_CODE';
  end if;

  return public.prepare_registration_core_v1(p_email, p_payload);
end;
$$;

revoke all on function public.prepare_registration(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.prepare_registration(text, jsonb) to service_role;

-- Keep the consent and profile provisioning workflow intact, then record the
-- invitation in the same transaction as official registration.
alter function private.provision_auth_user(uuid, text, jsonb)
  rename to provision_auth_user_with_consents_v1;
revoke all on function private.provision_auth_user_with_consents_v1(uuid, text, jsonb)
  from public, anon, authenticated, service_role;

create function private.provision_auth_user(
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
  v_invited_id uuid;
  v_registered_at timestamptz;
  v_inviter_id uuid;
  v_confirmed_at timestamptz;
  v_code text;
begin
  perform private.provision_auth_user_with_consents_v1(p_user_id, p_email, p_payload);
  if p_payload is null then
    return;
  end if;

  select utente_uuid, registrato_il into v_invited_id, v_registered_at
  from public.utente where auth_user_uuid = p_user_id;
  perform private.ensure_invitation_code(v_invited_id);

  v_code := nullif(pg_catalog.upper(pg_catalog.btrim(p_payload ->> 'inviteCode')), '');
  if v_code is null then
    return;
  end if;

  select utente_uuid into v_inviter_id
  from public.utente
  where codice_invito = v_code and registrato_il is not null;

  if v_inviter_id is null or v_inviter_id = v_invited_id then
    raise exception using errcode = '22023', message = 'INVALID_INVITATION_CODE';
  end if;

  select email_confirmed_at into v_confirmed_at
  from auth.users where id = p_user_id;

  insert into public.invito (
    uuid_invitante, uuid_invitato, codice_invito, registrato_il, confermato_il
  ) values (
    v_inviter_id, v_invited_id, v_code, v_registered_at, v_confirmed_at
  );
end;
$$;

revoke all on function private.provision_auth_user(uuid, text, jsonb)
  from public, anon, authenticated, service_role;

create function private.confirm_registration_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null
    and old.email_confirmed_at is distinct from new.email_confirmed_at then
    update public.invito as invitation
    set confermato_il = new.email_confirmed_at
    from public.utente as invited
    where invitation.uuid_invitato = invited.utente_uuid
      and invited.auth_user_uuid = new.id
      and invitation.confermato_il is null;
  end if;
  return new;
end;
$$;

revoke all on function private.confirm_registration_invitation()
  from public, anon, authenticated, service_role;

create trigger on_auth_user_invitation_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function private.confirm_registration_invitation();

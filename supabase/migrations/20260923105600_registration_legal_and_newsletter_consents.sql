-- Persist the mandatory legal acceptance separately from the optional
-- newsletter preference. Existing accounts remain unsubscribed by default.

alter table public.utente
  add column if not exists consenso_newsletter boolean not null default false,
  add column if not exists consenso_newsletter_aggiornato_il timestamptz,
  add column if not exists informative_accettate_il timestamptz,
  add column if not exists versione_termini text,
  add column if not exists versione_privacy text,
  add column if not exists versione_cookie_policy text;

comment on column public.utente.consenso_newsletter is
  'Optional consent to receive platform news and newsletters.';
comment on column public.utente.consenso_newsletter_aggiornato_il is
  'Time of the latest newsletter consent choice.';
comment on column public.utente.informative_accettate_il is
  'Time when the mandatory legal documents were accepted during registration.';
comment on column public.utente.versione_termini is
  'Accepted Terms of Service version.';
comment on column public.utente.versione_privacy is
  'Accepted Privacy Policy version.';
comment on column public.utente.versione_cookie_policy is
  'Accepted Cookie Policy version.';

alter table public.utente
  add constraint utente_informative_accettate_complete_check
  check (
    (
      informative_accettate_il is null
      and versione_termini is null
      and versione_privacy is null
      and versione_cookie_policy is null
    )
    or (
      informative_accettate_il is not null
      and versione_termini is not null
      and versione_privacy is not null
      and versione_cookie_policy is not null
      and char_length(btrim(versione_termini)) between 1 and 100
      and char_length(btrim(versione_privacy)) between 1 and 100
      and char_length(btrim(versione_cookie_policy)) between 1 and 100
    )
  );

-- Keep the established provisioning function intact and wrap it so both the
-- Auth trigger and complete_registration_v1 record the same validated choices.
alter function private.provision_auth_user(uuid, text, jsonb)
  rename to provision_auth_user_core_v1;

revoke all on function private.provision_auth_user_core_v1(uuid, text, jsonb)
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
  v_consents jsonb;
begin
  if p_payload is not null then
    v_consents := p_payload -> 'consents';

    if jsonb_typeof(v_consents) is distinct from 'object'
      or v_consents -> 'legalAccepted' is distinct from 'true'::jsonb
      or jsonb_typeof(v_consents -> 'newsletterSubscribed') is distinct from 'boolean'
      or v_consents ->> 'termsVersion' is distinct from '2026-09-23'
      or v_consents ->> 'privacyVersion' is distinct from '2026-09-23'
      or v_consents ->> 'cookiePolicyVersion' is distinct from '2026-09-23' then
      raise exception using
        errcode = '22023',
        message = 'INVALID_REGISTRATION_CONSENTS';
    end if;
  end if;

  perform private.provision_auth_user_core_v1(p_user_id, p_email, p_payload);

  if p_payload is not null then
    update public.utente
    set
      consenso_newsletter = (v_consents ->> 'newsletterSubscribed')::boolean,
      consenso_newsletter_aggiornato_il = now(),
      informative_accettate_il = now(),
      versione_termini = v_consents ->> 'termsVersion',
      versione_privacy = v_consents ->> 'privacyVersion',
      versione_cookie_policy = v_consents ->> 'cookiePolicyVersion',
      ultima_modifica_il = now()
    where auth_user_uuid = p_user_id
      and registrato_il is not null;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'REGISTERED_USER_NOT_FOUND';
    end if;
  end if;
end;
$$;

revoke all on function private.provision_auth_user(uuid, text, jsonb)
  from public, anon, authenticated, service_role;

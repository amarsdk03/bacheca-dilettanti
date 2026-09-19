-- Restore profile social links and keep requests to upload player highlights private.

alter table public.profilo_giocatore
  add column if not exists richiede_caricamento_highlights boolean;

update public.profilo_giocatore
set richiede_caricamento_highlights = false
where richiede_caricamento_highlights is null;

alter table public.profilo_giocatore
  alter column richiede_caricamento_highlights set default false,
  alter column richiede_caricamento_highlights set not null;

comment on column public.profilo_giocatore.richiede_caricamento_highlights is
  'Private support request: the player owns highlight videos but cannot publish them online.';

-- Canonicalize the managed platform names before enforcing one link per
-- profile/subprofile/platform. Keep the newest row when legacy duplicates exist.
update public.link_social_profilo
set piattaforma = pg_catalog.lower(pg_catalog.btrim(piattaforma))
where piattaforma is not null
  and pg_catalog.lower(pg_catalog.btrim(piattaforma)) in (
    'instagram', 'facebook', 'youtube', 'linkedin'
  )
  and piattaforma is distinct from pg_catalog.lower(pg_catalog.btrim(piattaforma));

delete from public.link_social_profilo as older
using public.link_social_profilo as newer
where older.uuid_profilo = newer.uuid_profilo
  and older.sottoprofilo is not null
  and older.sottoprofilo = newer.sottoprofilo
  and older.piattaforma = newer.piattaforma
  and older.piattaforma in ('instagram', 'facebook', 'youtube', 'linkedin')
  and older.id < newer.id;

create unique index if not exists link_social_profilo_managed_platform_uidx
  on public.link_social_profilo (uuid_profilo, sottoprofilo, piattaforma)
  where sottoprofilo is not null
    and piattaforma in ('instagram', 'facebook', 'youtube', 'linkedin');

create or replace function private.sync_profile_social_links_v1(
  p_profile_id uuid,
  p_profile_type text,
  p_social_links jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_subprofile_id bigint;
  v_platform text;
  v_link text;
begin
  if p_profile_id is null
    or p_profile_type not in (
      'giocatore',
      'squadra',
      'staff-sportivo',
      'professionisti-studi',
      'arbitro',
      'creators',
      'torneo-evento',
      'campi-impianti-sportivi'
    ) then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_PAYLOAD';
  end if;

  if p_social_links is null then
    p_social_links := '{}'::jsonb;
  end if;
  if pg_catalog.jsonb_typeof(p_social_links) <> 'object'
    or exists (
      select 1
      from pg_catalog.jsonb_object_keys(p_social_links) as link_key(name)
      where link_key.name not in ('instagram', 'facebook', 'youtube', 'linkedin')
    ) then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_SOCIAL_LINKS';
  end if;

  perform 1
  from public.profilo
  where uuid = p_profile_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;

  case p_profile_type
    when 'giocatore' then
      select id into v_subprofile_id
      from public.profilo_giocatore
      where uuid_profilo = p_profile_id;
    when 'squadra' then
      select id into v_subprofile_id
      from public.profilo_squadra
      where uuid_profilo = p_profile_id;
    when 'staff-sportivo' then
      select id into v_subprofile_id
      from public.profilo_staff_sportivo
      where uuid_profilo = p_profile_id;
    when 'professionisti-studi' then
      select id into v_subprofile_id
      from public.profilo_professionista_studente
      where uuid_profilo = p_profile_id;
    when 'arbitro' then
      select id into v_subprofile_id
      from public.profilo_arbitro
      where uuid_profilo = p_profile_id;
    when 'creators' then
      select id into v_subprofile_id
      from public.profilo_creator
      where uuid_profilo = p_profile_id;
    when 'torneo-evento' then
      select id into v_subprofile_id
      from public.profilo_torneo_evento
      where uuid_profilo = p_profile_id;
    when 'campi-impianti-sportivi' then
      select id into v_subprofile_id
      from public.profilo_campi_impianti
      where uuid_profilo = p_profile_id;
  end case;

  if v_subprofile_id is null then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;

  delete from public.link_social_profilo
  where uuid_profilo = p_profile_id
    and sottoprofilo = p_profile_type
    and piattaforma in ('instagram', 'facebook', 'youtube', 'linkedin');

  foreach v_platform in array array['instagram', 'facebook', 'youtube', 'linkedin']
  loop
    if p_social_links ? v_platform
      and pg_catalog.jsonb_typeof(p_social_links -> v_platform) not in ('string', 'null') then
      raise exception using errcode = '22023', message = 'INVALID_PROFILE_SOCIAL_LINKS';
    end if;

    v_link := nullif(pg_catalog.btrim(p_social_links ->> v_platform), '');
    if v_link is not null and (
      pg_catalog.char_length(v_link) > 2048
      or v_link !~* '^https?://[^[:space:]]+$'
    ) then
      raise exception using errcode = '22023', message = 'INVALID_PROFILE_SOCIAL_LINKS';
    end if;

    if v_link is not null then
      insert into public.link_social_profilo (
        uuid_profilo,
        id_sottoprofilo,
        sottoprofilo,
        piattaforma,
        sublink
      ) values (
        p_profile_id,
        v_subprofile_id,
        p_profile_type,
        v_platform,
        v_link
      );
    end if;
  end loop;
end;
$$;

revoke all on function private.sync_profile_social_links_v1(uuid, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.sync_profile_social_links_v1(uuid, text, jsonb)
  to service_role;

create or replace function private.save_player_highlights_request_for_profile_v1(
  p_profile_id uuid,
  p_profile_type text,
  p_requested boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_profile_type <> 'giocatore' then
    if coalesce(p_requested, false) then
      raise exception using errcode = '22023', message = 'INVALID_PROFILE_PAYLOAD';
    end if;
    return;
  end if;

  if p_profile_id is null then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_PAYLOAD';
  end if;

  update public.profilo_giocatore
  set richiede_caricamento_highlights = coalesce(p_requested, false)
  where uuid_profilo = p_profile_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;

  if coalesce(p_requested, false) then
    delete from public.media_profilo
    where uuid_profilo = p_profile_id
      and formato_media = 'video_highlights';
  end if;
end;
$$;

revoke all on function private.save_player_highlights_request_for_profile_v1(uuid, text, boolean)
  from public, anon, authenticated, service_role;
grant execute on function private.save_player_highlights_request_for_profile_v1(uuid, text, boolean)
  to service_role;

-- Save profile data first through the established core writer, then persist the
-- highlights sidecar fields in the same transaction.
create or replace function private.save_owned_subprofile_internal_v1(
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
  v_profile_id uuid;
  v_result jsonb;
  v_highlights_requested boolean := false;
begin
  v_result := private.save_owned_subprofile_core_v1(
    p_user_id,
    p_profile_type,
    p_draft,
    p_locations
  );

  if p_profile_type = 'giocatore' then
    if p_draft ? 'richiede_caricamento_highlights'
      and pg_catalog.jsonb_typeof(p_draft -> 'richiede_caricamento_highlights') <> 'boolean' then
      raise exception using errcode = '22023', message = 'INVALID_PROFILE_PAYLOAD';
    end if;
    v_highlights_requested := coalesce(
      (p_draft ->> 'richiede_caricamento_highlights')::boolean,
      false
    );

    select uuid
    into v_profile_id
    from public.profilo
    where uuid_utente = p_user_id;

    perform private.save_player_highlights_for_profile_v1(
      v_profile_id,
      p_profile_type,
      p_draft
    );
    perform private.save_player_highlights_request_for_profile_v1(
      v_profile_id,
      p_profile_type,
      v_highlights_requested
    );
  end if;

  return v_result;
end;
$$;

revoke all on function private.save_owned_subprofile_internal_v1(uuid, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.save_owned_subprofile_internal_v1(uuid, text, jsonb, jsonb)
  to service_role;

create or replace function public.save_owned_profile_social_links_v1(
  p_user_id uuid,
  p_profile_type text,
  p_social_links jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_internal_user_id uuid;
  v_profile_id uuid;
begin
  v_internal_user_id := private.registered_internal_user_id(p_user_id);

  select uuid
  into v_profile_id
  from public.profilo
  where uuid_utente = v_internal_user_id;

  perform private.sync_profile_social_links_v1(
    v_profile_id,
    p_profile_type,
    p_social_links
  );
end;
$$;

revoke all on function public.save_owned_profile_social_links_v1(uuid, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.save_owned_profile_social_links_v1(uuid, text, jsonb)
  to service_role;

-- Preserve the existing provisioning body and enrich completed registrations
-- with the profile-owned social links submitted in the registration intent.
alter function private.provision_auth_user(uuid, text, jsonb)
  rename to provision_auth_user_core_v2;

revoke all on function private.provision_auth_user_core_v2(uuid, text, jsonb)
  from public, anon, authenticated, service_role;

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
  v_profile_id uuid;
  v_profile jsonb;
begin
  perform private.provision_auth_user_core_v2(p_user_id, p_email, p_payload);

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    return;
  end if;

  select utente_uuid
  into v_internal_user_id
  from public.utente
  where auth_user_uuid = p_user_id
    and registrato_il is not null;

  select uuid
  into v_profile_id
  from public.profilo
  where uuid_utente = v_internal_user_id;

  if v_profile_id is null then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;

  for v_profile in
    select profile.value
    from pg_catalog.jsonb_array_elements(p_payload -> 'profiles') as profile(value)
  loop
    perform private.sync_profile_social_links_v1(
      v_profile_id,
      v_profile ->> 'type',
      v_profile -> 'socialLinks'
    );
  end loop;
end;
$$;

revoke all on function private.provision_auth_user(uuid, text, jsonb)
  from public, anon, authenticated, service_role;

-- The publish core intentionally knows nothing about profile sidecars. Strip
-- social links before delegating, then write them only after a fresh success.
create or replace function public.publish_announcement_v2(
  p_submission_id uuid,
  p_payload jsonb,
  p_terms_version text,
  p_privacy_version text,
  p_visibility text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_profile_id uuid;
  v_has_anonymous_profile boolean;
  v_is_retry boolean;
  v_profile_type text;
  v_draft jsonb;
  v_social_links jsonb;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_PUBLISH_PAYLOAD';
  end if;

  v_profile_type := p_payload ->> 'profile_type';
  v_social_links := p_payload -> 'profile_social_links';
  if v_social_links is not null
    and v_social_links <> 'null'::jsonb
    and pg_catalog.jsonb_typeof(v_social_links) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_SOCIAL_LINKS';
  end if;

  v_result := private.publish_announcement_core_v2(
    p_submission_id,
    p_payload - 'profile_social_links',
    p_terms_version,
    p_privacy_version,
    p_visibility
  );

  if v_result ->> 'status' <> 'success' then
    return v_result;
  end if;

  v_is_retry := coalesce((v_result ->> 'idempotent')::boolean, false);
  if v_is_retry then
    return v_result;
  end if;

  select announcement.autore_annuncio
  into v_profile_id
  from private.announcement_submission as submission
  join public.annuncio as announcement
    on announcement.uuid = submission.announcement_id
  where submission.submission_id = p_submission_id;

  if v_profile_id is null then
    raise exception using errcode = '55000', message = 'PUBLISH_RECEIPT_NOT_FOUND';
  end if;

  v_has_anonymous_profile := (
    p_payload -> 'profile_draft' is not null
    and p_payload -> 'profile_draft' <> 'null'::jsonb
  );
  if v_has_anonymous_profile then
    v_draft := p_payload -> 'profile_draft';
  elsif p_payload -> 'profile_update' is not null
    and p_payload -> 'profile_update' <> 'null'::jsonb then
    v_draft := p_payload -> 'profile_update' -> 'draft';
  else
    v_draft := null;
  end if;

  if v_draft is null or pg_catalog.jsonb_typeof(v_draft) <> 'object' then
    if v_social_links is not null and v_social_links <> 'null'::jsonb then
      raise exception using errcode = '22023', message = 'INVALID_PROFILE_SOCIAL_LINKS';
    end if;
    return v_result;
  end if;

  if v_has_anonymous_profile and v_profile_type = 'giocatore' then
    perform private.save_player_highlights_for_profile_v1(
      v_profile_id,
      v_profile_type,
      v_draft
    );
    perform private.save_player_highlights_request_for_profile_v1(
      v_profile_id,
      v_profile_type,
      coalesce((v_draft ->> 'richiede_caricamento_highlights')::boolean, false)
    );
  end if;

  if v_social_links is not null and v_social_links <> 'null'::jsonb then
    perform private.sync_profile_social_links_v1(
      v_profile_id,
      v_profile_type,
      v_social_links
    );
  end if;

  return v_result;
end;
$$;

revoke all on function public.publish_announcement_v2(uuid, jsonb, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.publish_announcement_v2(uuid, jsonb, text, text, text)
  to authenticated;

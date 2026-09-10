-- Persist the publication refactor while keeping the original publishing logic
-- as a private implementation detail behind the existing public RPC signature.

alter table public.profilo_giocatore
  add column if not exists categorie_ricercate text[];

alter table public.annuncio_giocatore
  add column if not exists categorie_ricercate text[];

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'immagini_annunci',
  'immagini_annunci',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.save_player_categories_v2(
  p_internal_user_id uuid,
  p_profile_type text,
  p_draft jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_profile_type <> 'giocatore' then
    return;
  end if;

  if not private.publish_text_array_is_valid(p_draft -> 'categorie_ricercate') then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_PAYLOAD';
  end if;

  update public.profilo_giocatore as player
  set categorie_ricercate = array(
    select pg_catalog.jsonb_array_elements_text(
      coalesce(p_draft -> 'categorie_ricercate', '[]'::jsonb)
    )
  )
  from public.profilo as owned_profile
  where owned_profile.uuid_utente = p_internal_user_id
    and player.uuid_profilo = owned_profile.uuid;

  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;
end;
$$;

revoke all on function private.save_player_categories_v2(uuid, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.save_player_categories_v2(uuid, text, jsonb)
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
  v_result jsonb;
begin
  v_internal_user_id := private.registered_internal_user_id(p_user_id);
  v_result := private.save_owned_subprofile_internal_v1(
    v_internal_user_id,
    p_profile_type,
    p_draft,
    p_locations
  );
  perform private.save_player_categories_v2(
    v_internal_user_id,
    p_profile_type,
    p_draft
  );
  return v_result;
end;
$$;

revoke all on function public.save_owned_subprofile(uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_owned_subprofile(uuid, text, jsonb, jsonb)
  to service_role;

alter function public.publish_announcement_v1(uuid, jsonb, text, text)
  rename to publish_announcement_core_v1;

revoke all on function public.publish_announcement_core_v1(uuid, jsonb, text, text)
  from public, anon, authenticated, service_role;

create or replace function public.publish_announcement_v1(
  p_submission_id uuid,
  p_payload jsonb,
  p_terms_version text,
  p_privacy_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_user_id uuid;
  v_internal_user_id uuid;
  v_profile_update jsonb;
  v_premium jsonb;
  v_core_payload jsonb;
  v_result jsonb;
  v_announcement_id uuid;
  v_profile_type text;
  v_image_path text;
  v_image_mime text;
  v_generic_link text;
  v_video_highlights text;
  v_current_year integer := extract(year from pg_catalog.current_date)::integer;
begin
  v_auth_user_id := (select auth.uid());
  if v_auth_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  if p_payload is null
    or pg_catalog.jsonb_typeof(p_payload) <> 'object'
    or pg_catalog.pg_column_size(p_payload) > 256000
    or not private.publish_object_has_only_keys(
      p_payload,
      array[
        'profile_type', 'announcement_type', 'profile_draft',
        'profile_locations', 'profile_update', 'detail',
        'announcement_locations', 'contacts', 'premium'
      ],
      array[
        'profile_type', 'announcement_type', 'profile_draft',
        'profile_locations', 'profile_update', 'detail',
        'announcement_locations', 'contacts', 'premium'
      ]
    ) then
    raise exception using errcode = '22023', message = 'INVALID_PUBLISH_PAYLOAD';
  end if;

  v_profile_type := p_payload ->> 'profile_type';
  v_profile_update := p_payload -> 'profile_update';
  v_premium := p_payload -> 'premium';
  v_core_payload := p_payload - 'profile_update' - 'premium';

  if pg_catalog.jsonb_typeof(v_premium) <> 'object'
    or not private.publish_object_has_only_keys(
      v_premium,
      array['generic_link', 'video_highlights', 'image_path', 'image_mime'],
      array['generic_link', 'video_highlights', 'image_path', 'image_mime']
    ) then
    raise exception using errcode = '22023', message = 'INVALID_PUBLISH_PAYLOAD';
  end if;

  v_generic_link := nullif(pg_catalog.btrim(v_premium ->> 'generic_link'), '');
  v_video_highlights := nullif(pg_catalog.btrim(v_premium ->> 'video_highlights'), '');
  v_image_path := nullif(pg_catalog.btrim(v_premium ->> 'image_path'), '');
  v_image_mime := nullif(pg_catalog.btrim(v_premium ->> 'image_mime'), '');

  if not private.publish_text_is_valid(v_generic_link, false, 2048)
    or not private.publish_text_is_valid(v_video_highlights, false, 2048)
    or (v_generic_link is not null and v_generic_link !~* '^https?://')
    or (v_video_highlights is not null and v_video_highlights !~* '^https?://')
    or (v_profile_type <> 'giocatore' and v_video_highlights is not null)
    or ((v_image_path is null) <> (v_image_mime is null))
    or (
      v_image_path is not null
      and (
        v_image_mime not in ('image/png', 'image/jpeg', 'image/webp')
        or v_image_path not like v_auth_user_id::text || '/' || p_submission_id::text || '/%'
        or pg_catalog.char_length(v_image_path) > 300
      )
    ) then
    raise exception using errcode = '22023', message = 'INVALID_PUBLISH_PAYLOAD';
  end if;

  if v_profile_type = 'torneo-evento' and (
    (
      nullif(p_payload -> 'detail' ->> 'annate_ammesse_da', '') is not null
      and not case
        when p_payload -> 'detail' ->> 'annate_ammesse_da' ~ '^[0-9]{4}$'
          then (p_payload -> 'detail' ->> 'annate_ammesse_da')::integer between 1900 and v_current_year
        else false
      end
    )
    or (
      nullif(p_payload -> 'detail' ->> 'annate_ammesse_a', '') is not null
      and not case
        when p_payload -> 'detail' ->> 'annate_ammesse_a' ~ '^[0-9]{4}$'
          then (p_payload -> 'detail' ->> 'annate_ammesse_a')::integer between 1900 and v_current_year
        else false
      end
    )
  ) then
    raise exception using errcode = '22023', message = 'INVALID_PUBLISH_PAYLOAD';
  end if;

  -- Delegate retries to the original function before applying profile changes.
  if exists (
    select 1
    from private.announcement_submission
    where submission_id = p_submission_id
  ) then
    return public.publish_announcement_core_v1(
      p_submission_id,
      v_core_payload,
      p_terms_version,
      p_privacy_version
    );
  end if;

  v_result := public.publish_announcement_core_v1(
    p_submission_id,
    v_core_payload,
    p_terms_version,
    p_privacy_version
  );

  if v_result ->> 'status' <> 'success' or (v_result ->> 'idempotent')::boolean then
    return v_result;
  end if;

  v_announcement_id := (v_result ->> 'announcementId')::uuid;

  if v_profile_update is not null and v_profile_update <> 'null'::jsonb then
    if pg_catalog.jsonb_typeof(v_profile_update) <> 'object'
      or not private.publish_object_has_only_keys(
        v_profile_update,
        array['profile_type', 'draft', 'locations'],
        array['profile_type', 'draft', 'locations']
      )
      or v_profile_update ->> 'profile_type' is distinct from v_profile_type then
      raise exception using errcode = '22023', message = 'INVALID_PUBLISH_PAYLOAD';
    end if;

    select app_user.utente_uuid
    into v_internal_user_id
    from public.utente as app_user
    where app_user.auth_user_uuid = v_auth_user_id
      and app_user.registrato_il is not null
    for update;

    if v_internal_user_id is null then
      raise exception using errcode = '42501', message = 'PROFILE_UPDATE_NOT_ALLOWED';
    end if;

    perform private.save_owned_subprofile_internal_v1(
      v_internal_user_id,
      v_profile_type,
      v_profile_update -> 'draft',
      v_profile_update -> 'locations'
    );
    perform private.save_player_categories_v2(
      v_internal_user_id,
      v_profile_type,
      v_profile_update -> 'draft'
    );
  end if;

  if v_profile_type = 'giocatore' then
    if not private.publish_text_array_is_valid(p_payload -> 'detail' -> 'categorie_ricercate') then
      raise exception using errcode = '22023', message = 'INVALID_PUBLISH_PAYLOAD';
    end if;

    update public.annuncio_giocatore
    set categorie_ricercate = array(
      select pg_catalog.jsonb_array_elements_text(
        coalesce(p_payload -> 'detail' -> 'categorie_ricercate', '[]'::jsonb)
      )
    )
    where uuid_annuncio = v_announcement_id;

    if p_payload -> 'profile_draft' is not null
      and p_payload -> 'profile_draft' <> 'null'::jsonb then
      if not private.publish_text_array_is_valid(p_payload -> 'profile_draft' -> 'categorie_ricercate') then
        raise exception using errcode = '22023', message = 'INVALID_PUBLISH_PAYLOAD';
      end if;
      update public.profilo_giocatore as player
      set categorie_ricercate = array(
        select pg_catalog.jsonb_array_elements_text(
          coalesce(p_payload -> 'profile_draft' -> 'categorie_ricercate', '[]'::jsonb)
        )
      )
      from public.annuncio as created_announcement
      where created_announcement.uuid = v_announcement_id
        and player.uuid_profilo = created_announcement.autore_annuncio;
    end if;
  end if;

  if v_generic_link is not null then
    insert into public.link_social_annuncio (uuid_annuncio, piattaforma, sublink)
    values (v_announcement_id, 'link_annuncio', v_generic_link);
  end if;

  if v_video_highlights is not null then
    insert into public.link_social_annuncio (uuid_annuncio, piattaforma, sublink)
    values (v_announcement_id, 'video_highlights', v_video_highlights);
  end if;

  if v_image_path is not null then
    insert into public.media_annuncio (uuid_annuncio, formato_media, link_media)
    values (v_announcement_id, v_image_mime, v_image_path);
  end if;

  return v_result;
end;
$$;

revoke all on function public.publish_announcement_v1(uuid, jsonb, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.publish_announcement_v1(uuid, jsonb, text, text)
  to authenticated;

-- Registration provisioning calls the private v1 writer directly, so keep the
-- category synchronization inside the same registration transaction too.
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
  v_normalized_email := pg_catalog.lower(pg_catalog.btrim(p_email));

  if p_user_id is null
    or v_normalized_email is null
    or pg_catalog.char_length(v_normalized_email) not between 3 and 254 then
    raise exception using errcode = '22023', message = 'AUTH_USER_AND_EMAIL_REQUIRED';
  end if;

  if not exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = p_user_id
      and pg_catalog.lower(pg_catalog.btrim(auth_user.email)) = v_normalized_email
  ) then
    raise exception using errcode = '42501', message = 'AUTH_IDENTITY_MISMATCH';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('utente-email:' || v_normalized_email, 0)
  );

  select app_user.utente_uuid, app_user.auth_user_uuid, app_user.registrato_il
  into v_internal_user_id, v_existing_auth_user_id, v_registered_at
  from public.utente as app_user
  where app_user.auth_user_uuid = p_user_id
  for update;

  if v_internal_user_id is not null
    and exists (
      select 1
      from public.utente as duplicate_email_user
      where pg_catalog.lower(pg_catalog.btrim(duplicate_email_user.indirizzo_email)) = v_normalized_email
        and duplicate_email_user.utente_uuid <> v_internal_user_id
    ) then
    raise exception using errcode = '28000', message = 'EMAIL_ACCOUNT_MISMATCH';
  end if;

  if v_internal_user_id is null then
    select app_user.utente_uuid, app_user.auth_user_uuid, app_user.registrato_il
    into v_internal_user_id, v_existing_auth_user_id, v_registered_at
    from public.utente as app_user
    where pg_catalog.lower(pg_catalog.btrim(app_user.indirizzo_email)) = v_normalized_email
    for update;

    if v_internal_user_id is not null
      and v_existing_auth_user_id is distinct from p_user_id then
      raise exception using errcode = '28000', message = 'EMAIL_ACCOUNT_MISMATCH';
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
    ) values (
      p_user_id,
      v_normalized_email,
      'Utente',
      null,
      now(),
      now()
    ) returning utente_uuid into v_internal_user_id;
  else
    update public.utente
    set indirizzo_email = v_normalized_email, ultima_modifica_il = now()
    where utente_uuid = v_internal_user_id;
  end if;

  if p_payload is null then
    return;
  end if;

  if v_registered_at is not null then
    raise exception using errcode = 'P0001', message = 'ACCOUNT_ALREADY_REGISTERED';
  end if;

  if pg_catalog.jsonb_typeof(p_payload) <> 'object'
    or p_payload ->> 'version' <> '1'
    or pg_catalog.jsonb_typeof(p_payload -> 'profiles') <> 'array'
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
  ) values (
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
    from pg_catalog.jsonb_array_elements(p_payload -> 'profiles') as profile(value)
  loop
    perform private.save_owned_subprofile_internal_v1(
      v_internal_user_id,
      v_profile ->> 'type',
      v_profile -> 'draft',
      v_profile -> 'locations'
    );
    perform private.save_player_categories_v2(
      v_internal_user_id,
      v_profile ->> 'type',
      v_profile -> 'draft'
    );
  end loop;

  update public.utente
  set registrato_il = coalesce(registrato_il, now()), ultima_modifica_il = now()
  where utente_uuid = v_internal_user_id;
end;
$$;

revoke all on function private.provision_auth_user(uuid, text, jsonb)
  from public, anon, authenticated, service_role;

-- Keep the same required profile fields across registration, profile editing,
-- and announcement publication. Validate the persisted row so no caller can
-- bypass the rules by omitting fields from its input payload.
begin;

create or replace function private.assert_required_subprofile_fields_v1(
  p_profile_id uuid,
  p_profile_type text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_draft jsonb;
  v_sports_present boolean;
  v_main_roles_present boolean;
  v_professional_roles_present boolean;
begin
  case p_profile_type
    when 'giocatore' then
      select pg_catalog.to_jsonb(player) into v_draft
      from public.profilo_giocatore as player
      where player.uuid_profilo = p_profile_id and player.nascosto = false;
    when 'squadra' then
      select pg_catalog.to_jsonb(team) into v_draft
      from public.profilo_squadra as team
      where team.uuid_profilo = p_profile_id and team.nascosto = false;
    when 'staff-sportivo' then
      select pg_catalog.to_jsonb(staff) into v_draft
      from public.profilo_staff_sportivo as staff
      where staff.uuid_profilo = p_profile_id and staff.nascosto = false;
    when 'arbitro' then
      select pg_catalog.to_jsonb(referee) into v_draft
      from public.profilo_arbitro as referee
      where referee.uuid_profilo = p_profile_id and referee.nascosto = false;
    when 'torneo-evento' then
      select pg_catalog.to_jsonb(tournament) into v_draft
      from public.profilo_torneo_evento as tournament
      where tournament.uuid_profilo = p_profile_id and tournament.nascosto = false;
    when 'campi-impianti-sportivi' then
      select pg_catalog.to_jsonb(facility) into v_draft
      from public.profilo_campi_impianti as facility
      where facility.uuid_profilo = p_profile_id and facility.nascosto = false;
    when 'professionisti-studi' then
      select pg_catalog.to_jsonb(professional) into v_draft
      from public.profilo_professionista_studente as professional
      where professional.uuid_profilo = p_profile_id and professional.nascosto = false;
    when 'creators' then
      select pg_catalog.to_jsonb(creator) into v_draft
      from public.profilo_creator as creator
      where creator.uuid_profilo = p_profile_id and creator.nascosto = false;
    else
      raise exception using errcode = '22023', message = 'UNSUPPORTED_PROFILE_TYPE';
  end case;

  if v_draft is null or not exists (
    select 1
    from public.localita_profilo as location
    where location.uuid_profilo = p_profile_id
      and location.sottoprofilo = p_profile_type
      and nullif(pg_catalog.btrim(location.regione), '') is not null
  ) then
    raise exception using errcode = '22023', message = 'PROFILE_REQUIRED_FIELDS_MISSING';
  end if;

  v_sports_present := case
    when pg_catalog.jsonb_typeof(v_draft -> 'tipologie_sport') = 'array'
      then pg_catalog.jsonb_array_length(v_draft -> 'tipologie_sport') > 0
    else false
  end;
  v_main_roles_present := case
    when pg_catalog.jsonb_typeof(v_draft -> 'ruoli_sport' -> 'principali') = 'array'
      then pg_catalog.jsonb_array_length(v_draft -> 'ruoli_sport' -> 'principali') > 0
    else false
  end;
  v_professional_roles_present := case
    when pg_catalog.jsonb_typeof(v_draft -> 'figure_professionali') = 'array'
      then pg_catalog.jsonb_array_length(v_draft -> 'figure_professionali') > 0
    else false
  end;

  if (
    p_profile_type = 'giocatore'
    and (
      nullif(pg_catalog.btrim(v_draft ->> 'nome'), '') is null
      or not v_sports_present
      or not v_main_roles_present
    )
  ) or (
    p_profile_type = 'squadra'
    and (
      nullif(pg_catalog.btrim(v_draft ->> 'nome_societa'), '') is null
      or not v_sports_present
    )
  ) or (
    p_profile_type = 'staff-sportivo'
    and (
      nullif(pg_catalog.btrim(v_draft ->> 'nome'), '') is null
      or not v_professional_roles_present
    )
  ) or (
    p_profile_type = 'arbitro'
    and nullif(pg_catalog.btrim(v_draft ->> 'nome'), '') is null
  ) or (
    p_profile_type = 'torneo-evento'
    and (
      nullif(pg_catalog.btrim(v_draft ->> 'nome_organizzazione'), '') is null
      or not v_sports_present
    )
  ) or (
    p_profile_type = 'campi-impianti-sportivi'
    and (
      nullif(pg_catalog.btrim(v_draft ->> 'nome_organizzazione'), '') is null
      or nullif(pg_catalog.btrim(v_draft ->> 'sede_principale'), '') is null
      or not v_sports_present
    )
  ) then
    raise exception using errcode = '22023', message = 'PROFILE_REQUIRED_FIELDS_MISSING';
  end if;
end;
$$;

revoke all on function private.assert_required_subprofile_fields_v1(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function private.assert_required_subprofile_fields_v1(uuid, text)
  to service_role;

create or replace function public.save_owned_subprofile_with_social_links_v1(
  p_user_id uuid,
  p_profile_type text,
  p_draft jsonb,
  p_locations jsonb,
  p_social_links jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_profile_id uuid;
begin
  v_result := public.save_owned_subprofile(
    p_user_id,
    p_profile_type,
    p_draft,
    p_locations
  );

  select profile.uuid into v_profile_id
  from public.profilo as profile
  where profile.uuid_utente = private.registered_internal_user_id(p_user_id);

  perform private.assert_required_subprofile_fields_v1(v_profile_id, p_profile_type);

  perform public.save_owned_profile_social_links_v1(
    p_user_id,
    p_profile_type,
    p_social_links
  );

  return v_result;
end;
$$;

revoke all on function public.save_owned_subprofile_with_social_links_v1(uuid, text, jsonb, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.save_owned_subprofile_with_social_links_v1(uuid, text, jsonb, jsonb, jsonb)
  to service_role;

-- The current announcement wrapper follows below. It checks the persisted
-- subprofile after the core publisher and any profile_update have completed.

-- CURRENT_DATE is SQL syntax and cannot be qualified with pg_catalog.
-- Recreate the publish wrapper so PostgreSQL does not parse pg_catalog as a table alias.

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
  v_profile_id uuid;
  v_profile_type text;
  v_image_path text;
  v_image_mime text;
  v_generic_link text;
  v_video_highlights text;
  v_current_year integer := extract(year from current_date)::integer;
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

  select announcement.autore_annuncio into v_profile_id
  from public.annuncio as announcement
  where announcement.uuid = v_announcement_id;

  perform private.assert_required_subprofile_fields_v1(v_profile_id, v_profile_type);

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

notify pgrst, 'reload schema';

commit;

-- Player profile fields remain nullable for historical rows. New saves are
-- checked through the two existing transactional write paths below.
begin;

alter table public.profilo_giocatore
  add column categoria_attuale text,
  add column genere text,
  add column nazionalita text;

comment on column public.profilo_giocatore.categoria_attuale is
  'One current category, independent of historical categorie_ricercate.';
comment on column public.profilo_giocatore.nazionalita is
  'ISO 3166-1 alpha-2 country code.';

update public.profilo_giocatore
set disponibilita = 'svincolato'
where disponibilita = 'disponibile-subito';

update public.profilo_giocatore
set piede_principale = 'Ambidestro'
where piede_principale = 'Ambipiede';

create or replace function private.save_player_step04_fields_v1(
  p_profile_id uuid,
  p_draft jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_availability text;
  v_category text;
begin
  if p_draft is null or pg_catalog.jsonb_typeof(p_draft) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_PLAYER_PROFILE';
  end if;
  v_availability := p_draft ->> 'disponibilita';
  v_category := nullif(pg_catalog.btrim(p_draft ->> 'categoria_attuale'), '');
  if coalesce(p_draft ->> 'genere' not in ('Maschio', 'Femmina'), true)
    or coalesce(p_draft ->> 'anno_nascita' !~ '^[0-9]{4}$', true)
    or coalesce(v_availability not in ('svincolato', 'sotto-contratto'), true)
    or (v_category is not null and pg_catalog.length(v_category) > 120)
    or (nullif(pg_catalog.btrim(p_draft ->> 'nazionalita'), '') is not null
      and p_draft ->> 'nazionalita' !~ '^[A-Z]{2}$') then
    raise exception using errcode = '22023', message = 'INVALID_PLAYER_PROFILE';
  end if;
  update public.profilo_giocatore
  set categoria_attuale = case when v_availability = 'svincolato' then null else v_category end,
      genere = p_draft ->> 'genere',
      nazionalita = nullif(pg_catalog.btrim(p_draft ->> 'nazionalita'), '')
  where uuid_profilo = p_profile_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;
end;
$$;

revoke all on function private.save_player_step04_fields_v1(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.save_player_step04_fields_v1(uuid, jsonb)
  to service_role;


-- Preserve existing writer behavior and extend both paths transactionally.
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

  if p_profile_type = 'giocatore' then
    perform private.save_player_step04_fields_v1(v_profile_id, p_draft);
  end if;

  return v_result;
end;
$$;

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

  if p_visibility is distinct from 'gratuito' then
    raise exception using errcode = '22023', message = 'PRIORITY_PUBLICATION_DISABLED';
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

  if v_profile_type = 'giocatore' then
    perform private.save_player_step04_fields_v1(v_profile_id, v_draft);
  end if;

  return v_result;
end;
$$;

commit;

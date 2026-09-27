begin;

alter table public.profilo_staff_sportivo
  add column disponibile_remoto boolean not null default false,
  add column lista_esperienze jsonb not null default '[]'::jsonb,
  add column qualifiche_licenze jsonb not null default '[]'::jsonb;

alter table public.annuncio_staff_sportivo
  add column disponibile_remoto boolean not null default false,
  add column qualifiche_licenze jsonb not null default '[]'::jsonb;

comment on column public.profilo_staff_sportivo.storico_esperienze is
  'Voci storiche precedenti allo Step 10: restano leggibili tra le qualifiche senza attribuzione automatica di uno stato.';

create or replace function private.save_staff_step10_fields_v1(p_profile_id uuid, p_draft jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_draft is null or pg_catalog.jsonb_typeof(p_draft) <> 'object'
    or pg_catalog.jsonb_typeof(p_draft -> 'disponibile_remoto') <> 'boolean'
    or pg_catalog.jsonb_typeof(p_draft -> 'lista_esperienze') <> 'array'
    or pg_catalog.jsonb_typeof(p_draft -> 'qualifiche_licenze') <> 'array'
    or pg_catalog.jsonb_array_length(p_draft -> 'lista_esperienze') > 30
    or pg_catalog.jsonb_array_length(p_draft -> 'qualifiche_licenze') > 30
    or exists (
      select 1 from pg_catalog.jsonb_array_elements(p_draft -> 'qualifiche_licenze') as qualification(item)
      where pg_catalog.jsonb_typeof(qualification.item) <> 'object'
        or qualification.item ->> 'stato' not in ('in-corso', 'conseguito')
        or qualification.item ->> 'stato' is null
    ) then
    raise exception using errcode = '22023', message = 'INVALID_STAFF_QUALIFICATIONS';
  end if;

  update public.profilo_staff_sportivo
  set disponibile_remoto = (p_draft ->> 'disponibile_remoto')::boolean,
      lista_esperienze = p_draft -> 'lista_esperienze',
      qualifiche_licenze = p_draft -> 'qualifiche_licenze'
  where uuid_profilo = p_profile_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;
end;
$$;

revoke all on function private.save_staff_step10_fields_v1(uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function private.save_staff_step10_fields_v1(uuid, jsonb) to service_role;

-- The existing owned-profile and publication wrappers below call this helper
-- after their core writes, so all profile and announcement fields commit together.

create or replace function private.snapshot_staff_step10_v1(p_submission_id uuid, p_profile_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.annuncio_staff_sportivo as target
  set disponibile_remoto = staff.disponibile_remoto,
      lista_esperienze = staff.lista_esperienze,
      qualifiche_licenze =
        (case when pg_catalog.jsonb_typeof(staff.storico_esperienze) = 'array'
          then staff.storico_esperienze else '[]'::jsonb end)
        || staff.qualifiche_licenze
  from private.announcement_submission as submission,
       public.annuncio as announcement,
       public.profilo_staff_sportivo as staff
  where submission.submission_id = p_submission_id
    and announcement.uuid = submission.announcement_id
    and target.uuid_annuncio = announcement.uuid
    and announcement.autore_annuncio = p_profile_id
    and staff.uuid_profilo = p_profile_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'STAFF_ANNOUNCEMENT_NOT_FOUND';
  end if;
end;
$$;

revoke all on function private.snapshot_staff_step10_v1(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function private.snapshot_staff_step10_v1(uuid, uuid) to service_role;

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
  elsif p_profile_type = 'squadra' then
    perform private.save_team_step05_fields_v1(v_profile_id, p_draft);
  elsif p_profile_type = 'staff-sportivo' then
    select uuid into v_profile_id from public.profilo where uuid_utente = p_user_id;
    perform private.save_staff_step10_fields_v1(v_profile_id, p_draft);
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

  if p_payload ->> 'announcement_type' = 'annuncio_squadra_cerca_giocatore' then
    perform private.save_team_player_year_range_step06_v1(
      p_submission_id,
      p_payload -> 'detail'
    );
  end if;

  if p_payload ->> 'announcement_type' = 'annuncio_squadra_cerca_staff' then
    perform private.save_team_staff_search_step07_v1(
      p_submission_id,
      p_payload -> 'detail'
    );
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
    if v_profile_type = 'staff-sportivo' then
      perform private.snapshot_staff_step10_v1(p_submission_id, v_profile_id);
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
  elsif v_profile_type = 'squadra' then
    perform private.save_team_step05_fields_v1(v_profile_id, v_draft);
  elsif v_profile_type = 'staff-sportivo' then
    perform private.save_staff_step10_fields_v1(v_profile_id, v_draft);
  end if;

  if v_profile_type = 'staff-sportivo' then
    perform private.snapshot_staff_step10_v1(p_submission_id, v_profile_id);
  end if;

  return v_result;
end;
$$;

commit;

begin;

-- Keep annate_ricercate for historical selections, including non-contiguous lists.
alter table public.annuncio_squadra_cerca_giocatore
  add column annata_da smallint,
  add column annata_a smallint,
  add constraint annuncio_squadra_cerca_giocatore_annate_intervallo_check
  check (
    (annata_da is null and annata_a is null)
    or (annata_da is not null and annata_a is not null
      and annata_da between 1900 and 9999 and annata_a between annata_da and 9999)
  );

create or replace function private.save_team_player_year_range_step06_v1(
  p_submission_id uuid,
  p_detail jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_from text;
  v_to text;
begin
  if p_detail is null or pg_catalog.jsonb_typeof(p_detail) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_TEAM_PLAYER_YEARS';
  end if;

  -- A client still using the old payload leaves its exact historical array to the core writer.
  if not (p_detail ? 'annata_da' or p_detail ? 'annata_a') then
    return;
  end if;

  if not (p_detail ? 'annata_da' and p_detail ? 'annata_a')
    or pg_catalog.jsonb_typeof(p_detail -> 'annata_da') not in ('string', 'null')
    or pg_catalog.jsonb_typeof(p_detail -> 'annata_a') not in ('string', 'null')
    or coalesce(p_detail -> 'annate_ricercate', '[]'::jsonb) <> '[]'::jsonb then
    raise exception using errcode = '22023', message = 'INVALID_TEAM_PLAYER_YEARS';
  end if;

  v_from := nullif(pg_catalog.btrim(p_detail ->> 'annata_da'), '');
  v_to := nullif(pg_catalog.btrim(p_detail ->> 'annata_a'), '');
  if (v_from is null) <> (v_to is null)
    or (v_from is not null and (
      v_from !~ '^[0-9]{4}$'
      or v_to !~ '^[0-9]{4}$'
      or v_from::integer < 1900
      or v_to::integer > extract(year from current_date)
      or v_from::integer > v_to::integer
    )) then
    raise exception using errcode = '22023', message = 'INVALID_TEAM_PLAYER_YEARS';
  end if;

  update public.annuncio_squadra_cerca_giocatore as detail
  set annata_da = v_from::smallint,
      annata_a = v_to::smallint
  from private.announcement_submission as submission
  where submission.submission_id = p_submission_id
    and detail.uuid_annuncio = submission.announcement_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'ANNOUNCEMENT_NOT_FOUND';
  end if;
end;
$$;

revoke all on function private.save_team_player_year_range_step06_v1(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.save_team_player_year_range_step06_v1(uuid, jsonb)
  to service_role;

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
  elsif v_profile_type = 'squadra' then
    perform private.save_team_step05_fields_v1(v_profile_id, v_draft);
  end if;

  return v_result;
end;
$$;

commit;

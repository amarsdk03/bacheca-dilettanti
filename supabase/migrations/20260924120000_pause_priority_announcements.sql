-- Temporarily accept only free announcements while preserving existing priority checkouts.
begin;

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

  return v_result;
end;
$$;

revoke all on function public.publish_announcement_v2(uuid, jsonb, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.publish_announcement_v2(uuid, jsonb, text, text, text)
  to authenticated;

commit;


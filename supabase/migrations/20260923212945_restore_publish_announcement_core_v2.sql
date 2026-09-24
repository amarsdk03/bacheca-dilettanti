-- The public v2 RPC delegates to this function. Restore the implementation
-- originally introduced by 20260911120000 and moved to private by
-- 20260912120000, without changing the later public wrapper.
begin;

create or replace function private.publish_announcement_core_v2(
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
  v_announcement_id uuid;
  v_existing_visibility text;
  v_existing_paid_at timestamptz;
  v_is_retry boolean;
  v_legacy_payload jsonb;
begin
  if p_visibility is null
    or p_visibility not in ('gratuito', 'prioritario')
    or p_payload is null
    or pg_catalog.jsonb_typeof(p_payload) <> 'object'
    or not private.publish_object_has_only_keys(
      p_payload,
      array[
        'profile_type', 'announcement_type', 'profile_draft',
        'profile_locations', 'profile_update', 'detail',
        'announcement_locations', 'contacts', 'extras'
      ],
      array[
        'profile_type', 'announcement_type', 'profile_draft',
        'profile_locations', 'profile_update', 'detail',
        'announcement_locations', 'contacts', 'extras'
      ]
    )
    or pg_catalog.jsonb_typeof(p_payload -> 'extras') <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_PUBLISH_PAYLOAD';
  end if;

  v_legacy_payload := (p_payload - 'extras')
    || pg_catalog.jsonb_build_object('premium', p_payload -> 'extras');

  v_result := public.publish_announcement_v1(
    p_submission_id,
    v_legacy_payload,
    p_terms_version,
    p_privacy_version
  );

  if v_result ->> 'status' <> 'success' then
    return v_result;
  end if;

  v_announcement_id := (v_result ->> 'announcementId')::uuid;
  v_is_retry := coalesce((v_result ->> 'idempotent')::boolean, false);

  select requested_visibility, paid_at
  into v_existing_visibility, v_existing_paid_at
  from private.announcement_submission
  where submission_id = p_submission_id
    and announcement_id = v_announcement_id
  for update;

  if not found then
    raise exception using errcode = '55000', message = 'PUBLISH_RECEIPT_NOT_FOUND';
  end if;

  if v_is_retry and v_existing_visibility is distinct from p_visibility then
    raise exception using errcode = '22023', message = 'SUBMISSION_VISIBILITY_CONFLICT';
  end if;

  if not v_is_retry then
    update private.announcement_submission
    set
      requested_visibility = p_visibility,
      requested_announcement_id = v_announcement_id,
      anonymous_at_publish = case
        when p_visibility = 'prioritario' then false
        else anonymous_at_publish
      end
    where submission_id = p_submission_id;

    if p_visibility = 'prioritario' then
      update public.annuncio
      set
        livello_annuncio = 'prioritario',
        stato_annuncio = 'in_attesa_pagamento',
        info_stato_annuncio = 'Bozza salvata. Completa il pagamento per inviarla in revisione.',
        nascosto = true,
        privato = true,
        priorita_attiva = false,
        priorita_inizio_il = null,
        priorita_fine_il = null,
        ultima_modifica_il = pg_catalog.statement_timestamp()
      where uuid = v_announcement_id;
    end if;
  end if;

  return v_result || pg_catalog.jsonb_build_object(
    'paymentRequired', p_visibility = 'prioritario' and v_existing_paid_at is null
  );
end;
$$;

revoke all on function private.publish_announcement_core_v2(uuid, jsonb, text, text, text)
  from public, anon, authenticated, service_role;

-- Publication links to the same Terms and Privacy pages used by registration.
-- Update the existing v1 core's version gate while preserving its publishing
-- logic and the exact versions stored in each submission receipt.
do $migration$
declare
  v_definition text;
  v_old_terms constant text := 'p_terms_version is distinct from ''2026-08-24''';
  v_old_privacy constant text := 'p_privacy_version is distinct from ''2026-08-24''';
  v_new_terms constant text := 'p_terms_version is distinct from ''2026-09-23''';
  v_new_privacy constant text := 'p_privacy_version is distinct from ''2026-09-23''';
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.publish_announcement_core_v1(uuid,jsonb,text,text)')
  ) into v_definition;

  if v_definition is null then
    raise exception 'Missing public.publish_announcement_core_v1(uuid,jsonb,text,text)';
  end if;

  if pg_catalog.strpos(v_definition, v_new_terms) > 0
    and pg_catalog.strpos(v_definition, v_new_privacy) > 0 then
    return;
  end if;

  if pg_catalog.length(v_definition) - pg_catalog.length(
    pg_catalog.replace(v_definition, v_old_terms, '')
  ) <> pg_catalog.length(v_old_terms)
    or pg_catalog.length(v_definition) - pg_catalog.length(
      pg_catalog.replace(v_definition, v_old_privacy, '')
    ) <> pg_catalog.length(v_old_privacy) then
    raise exception 'Unexpected publication consent version gate';
  end if;

  execute pg_catalog.replace(
    pg_catalog.replace(v_definition, v_old_terms, v_new_terms),
    v_old_privacy,
    v_new_privacy
  );
end;
$migration$;

revoke all on function public.publish_announcement_core_v1(uuid, jsonb, text, text)
  from public, anon, authenticated, service_role;

commit;

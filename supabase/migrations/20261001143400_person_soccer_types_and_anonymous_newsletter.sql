begin;

alter table public.profilo_staff_sportivo
  add column tipologie_sport text[] not null default '{}'::text[];
alter table public.profilo_arbitro
  add column tipologie_sport text[] not null default '{}'::text[];

alter table private.announcement_submission
  add column newsletter_subscribed boolean,
  add column newsletter_choice_at timestamptz;

-- These helpers run after the older profile writers, in the same transaction.
do $migration$
declare
  v_definition text;
  v_previous text;
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.save_staff_step10_fields_v1(uuid,jsonb)')) into v_definition;
  if v_definition is null then raise exception 'Missing staff profile writer'; end if;
  v_previous := v_definition;
  v_definition := pg_catalog.replace(v_definition,
    'qualifiche_licenze = p_draft -> ''qualifiche_licenze''',
    'qualifiche_licenze = p_draft -> ''qualifiche_licenze'', tipologie_sport = array(select pg_catalog.jsonb_array_elements_text(coalesce(p_draft -> ''tipologie_sport'', ''[]''::jsonb)))');
  if v_definition is not distinct from v_previous then raise exception 'Staff profile writer insertion point not found'; end if;
  execute v_definition;

  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.save_profile_career_sections_v1(uuid,text,jsonb)')) into v_definition;
  if v_definition is null then raise exception 'Missing referee profile writer'; end if;
  v_previous := v_definition;
  v_definition := pg_catalog.regexp_replace(v_definition,
    'update public[.]profilo_arbitro[[:space:]]+set[[:space:]]+lista_esperienze[[:space:]]*=',
    'update public.profilo_arbitro set tipologie_sport = array(select pg_catalog.jsonb_array_elements_text(coalesce(p_draft -> ''tipologie_sport'', ''[]''::jsonb))), lista_esperienze =');
  if v_definition is not distinct from v_previous then raise exception 'Referee profile writer insertion point not found'; end if;
  execute v_definition;

  -- The invitation wrapper delegates to the consent-aware provisioner first.
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.provision_auth_user(uuid,text,jsonb)')) into v_definition;
  if v_definition is null then raise exception 'Missing registration provisioner'; end if;
  v_previous := v_definition;
  v_definition := pg_catalog.replace(v_definition,
    'perform private.provision_auth_user_with_consents_v1(p_user_id, p_email, p_payload);',
    'perform private.provision_auth_user_with_consents_v1(p_user_id, p_email, p_payload);'
    || E'\n\n  if p_payload is not null then\n'
    || E'    update public.profilo_staff_sportivo as staff\n'
    || E'    set tipologie_sport = array(select pg_catalog.jsonb_array_elements_text(coalesce(profile.value -> ''draft'' -> ''tipologie_sport'', ''[]''::jsonb)))\n'
    || E'    from public.profilo as base, public.utente as owner, pg_catalog.jsonb_array_elements(p_payload -> ''profiles'') as profile(value)\n'
    || E'    where owner.auth_user_uuid = p_user_id and base.uuid_utente = owner.utente_uuid\n'
    || E'      and staff.uuid_profilo = base.uuid and profile.value ->> ''type'' = ''staff-sportivo'';\n'
    || E'    update public.profilo_arbitro as referee\n'
    || E'    set tipologie_sport = array(select pg_catalog.jsonb_array_elements_text(coalesce(profile.value -> ''draft'' -> ''tipologie_sport'', ''[]''::jsonb)))\n'
    || E'    from public.profilo as base, public.utente as owner, pg_catalog.jsonb_array_elements(p_payload -> ''profiles'') as profile(value)\n'
    || E'    where owner.auth_user_uuid = p_user_id and base.uuid_utente = owner.utente_uuid\n'
    || E'      and referee.uuid_profilo = base.uuid and profile.value ->> ''type'' = ''arbitro'';\n'
    || E'  end if;');
  if v_definition is not distinct from v_previous then raise exception 'Registration provisioner insertion point not found'; end if;
  execute v_definition;

  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.publish_announcement_v2(uuid,jsonb,text,text,text)')) into v_definition;
  if v_definition is null then raise exception 'Missing publication wrapper'; end if;
  v_previous := v_definition;
  v_definition := pg_catalog.replace(v_definition,
    'v_profile_type := p_payload ->> ''profile_type'';',
    E'if p_payload ? ''newsletter_subscribed'' and pg_catalog.jsonb_typeof(p_payload -> ''newsletter_subscribed'') <> ''boolean'' then\n'
    || E'    raise exception using errcode = ''22023'', message = ''INVALID_NEWSLETTER_CONSENT'';\n'
    || E'  end if;\n\n  v_profile_type := p_payload ->> ''profile_type'';');
  if v_definition is not distinct from v_previous then raise exception 'Publication consent validator insertion point not found'; end if;
  v_previous := v_definition;
  v_definition := pg_catalog.replace(v_definition,
    'p_payload - ''profile_social_links'',',
    'p_payload - ''profile_social_links'' - ''newsletter_subscribed'',');
  if v_definition is not distinct from v_previous then raise exception 'Publication consent payload insertion point not found'; end if;
  v_previous := v_definition;
  v_definition := pg_catalog.replace(v_definition,
    'if v_is_retry then return v_result; end if;',
    E'if v_is_retry then return v_result; end if;\n\n'
    || E'  if exists (select 1 from private.announcement_submission where submission_id = p_submission_id and anonymous_at_publish) then\n'
    || E'    update public.utente as owner\n'
    || E'    set consenso_newsletter = coalesce((p_payload ->> ''newsletter_subscribed'')::boolean, false),\n'
    || E'        consenso_newsletter_aggiornato_il = pg_catalog.statement_timestamp(),\n'
    || E'        ultima_modifica_il = pg_catalog.statement_timestamp()\n'
    || E'    from private.announcement_submission as receipt\n'
    || E'    where receipt.submission_id = p_submission_id and owner.utente_uuid = receipt.utente_id\n'
    || E'      and owner.auth_user_uuid = (select auth.uid()) and owner.registrato_il is null;\n'
    || E'    if not found then raise exception using errcode = ''55000'', message = ''ANONYMOUS_CONSENT_OWNER_NOT_FOUND''; end if;\n'
    || E'    update private.announcement_submission\n'
    || E'    set newsletter_subscribed = coalesce((p_payload ->> ''newsletter_subscribed'')::boolean, false),\n'
    || E'        newsletter_choice_at = pg_catalog.statement_timestamp()\n'
    || E'    where submission_id = p_submission_id;\n'
    || E'  end if;');
  if v_definition is not distinct from v_previous then raise exception 'Publication consent persistence insertion point not found'; end if;
  execute v_definition;
end;
$migration$;

revoke all on function private.save_staff_step10_fields_v1(uuid,jsonb) from public, anon, authenticated, service_role;
grant execute on function private.save_staff_step10_fields_v1(uuid,jsonb) to service_role;
revoke all on function private.save_profile_career_sections_v1(uuid,text,jsonb) from public, anon, authenticated, service_role;
grant execute on function private.save_profile_career_sections_v1(uuid,text,jsonb) to service_role;
revoke all on function private.provision_auth_user(uuid,text,jsonb) from public, anon, authenticated, service_role;
grant execute on function private.provision_auth_user(uuid,text,jsonb) to service_role;
revoke all on function public.publish_announcement_v2(uuid,jsonb,text,text,text) from public, anon, authenticated, service_role;
grant execute on function public.publish_announcement_v2(uuid,jsonb,text,text,text) to authenticated;

notify pgrst, 'reload schema';

commit;

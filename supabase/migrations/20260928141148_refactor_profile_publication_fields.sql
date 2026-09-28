begin;

update public.profilo_giocatore set genere = 'Uomo' where genere = 'Maschio';
update public.profilo_giocatore set genere = 'Donna' where genere = 'Femmina';
update public.profilo_arbitro set disponibilita = null where disponibilita = 'sotto-contratto';

alter table public.profilo_arbitro
  add column lista_esperienze jsonb not null default '[]'::jsonb,
  add column qualifiche_licenze jsonb not null default '[]'::jsonb;
alter table public.profilo_professionista_studente
  add column lista_esperienze jsonb not null default '[]'::jsonb,
  add column qualifiche_licenze jsonb not null default '[]'::jsonb;
alter table public.annuncio_arbitro
  add column qualifiche_licenze jsonb not null default '[]'::jsonb;
alter table public.annuncio_professionista_studente
  add column qualifiche_licenze jsonb not null default '[]'::jsonb;

update public.profilo_arbitro
set lista_esperienze = case when pg_catalog.jsonb_typeof(storico_esperienze) = 'array' then storico_esperienze else '[]'::jsonb end,
    storico_esperienze = '[]'::jsonb;
update public.profilo_professionista_studente
set lista_esperienze = case when pg_catalog.jsonb_typeof(storico_esperienze) = 'array' then storico_esperienze else '[]'::jsonb end,
    storico_esperienze = '[]'::jsonb;

create or replace function private.save_player_step04_fields_v1(p_profile_id uuid, p_draft jsonb)
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
  if coalesce(p_draft ->> 'genere' not in ('Uomo', 'Donna'), true)
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
  if not found then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;
end;
$$;

create or replace function private.save_profile_career_sections_v1(
  p_profile_id uuid,
  p_profile_type text,
  p_draft jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_profile_type not in ('arbitro', 'professionisti-studi')
    or p_draft is null
    or pg_catalog.jsonb_typeof(p_draft) <> 'object'
    or pg_catalog.jsonb_typeof(p_draft -> 'lista_esperienze') <> 'array'
    or pg_catalog.jsonb_typeof(p_draft -> 'qualifiche_licenze') <> 'array'
    or pg_catalog.jsonb_array_length(p_draft -> 'lista_esperienze') > 30
    or pg_catalog.jsonb_array_length(p_draft -> 'qualifiche_licenze') > 30
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_draft -> 'qualifiche_licenze') as qualification(item)
      where pg_catalog.jsonb_typeof(qualification.item) <> 'object'
        or qualification.item ->> 'stato' not in ('in-corso', 'conseguito')
        or qualification.item ->> 'stato' is null
    ) then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_QUALIFICATIONS';
  end if;

  if p_profile_type = 'arbitro' then
    if nullif(pg_catalog.btrim(p_draft ->> 'disponibilita'), '') = 'sotto-contratto' then
      raise exception using errcode = '22023', message = 'INVALID_REFEREE_AVAILABILITY';
    end if;
    update public.profilo_arbitro
    set lista_esperienze = p_draft -> 'lista_esperienze',
        qualifiche_licenze = p_draft -> 'qualifiche_licenze',
        storico_esperienze = '[]'::jsonb
    where uuid_profilo = p_profile_id;
  else
    update public.profilo_professionista_studente
    set lista_esperienze = p_draft -> 'lista_esperienze',
        qualifiche_licenze = p_draft -> 'qualifiche_licenze',
        storico_esperienze = '[]'::jsonb
    where uuid_profilo = p_profile_id;
  end if;
  if not found then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;
end;
$$;

create or replace function private.snapshot_referee_career_sections_v1(p_submission_id uuid, p_profile_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.annuncio_arbitro as target
  set lista_esperienze = referee.lista_esperienze,
      qualifiche_licenze = referee.qualifiche_licenze,
      disponibilita_occupazione = referee.disponibilita
  from private.announcement_submission as submission,
       public.annuncio as announcement,
       public.profilo_arbitro as referee
  where submission.submission_id = p_submission_id
    and announcement.uuid = submission.announcement_id
    and target.uuid_annuncio = announcement.uuid
    and announcement.autore_annuncio = p_profile_id
    and referee.uuid_profilo = p_profile_id;
  if not found then raise exception using errcode = 'P0001', message = 'REFEREE_ANNOUNCEMENT_NOT_FOUND'; end if;
end;
$$;

drop index if exists public.link_social_profilo_managed_platform_uidx;
create unique index link_social_profilo_managed_platform_uidx
  on public.link_social_profilo (uuid_profilo, sottoprofilo, piattaforma)
  where sottoprofilo is not null
    and piattaforma in ('website', 'instagram', 'facebook', 'youtube', 'linkedin');

create or replace function private.sync_profile_social_links_v1(p_profile_id uuid, p_profile_type text, p_social_links jsonb)
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
  if p_profile_id is null or p_profile_type not in (
    'giocatore', 'squadra', 'staff-sportivo', 'professionisti-studi',
    'arbitro', 'creators', 'torneo-evento', 'campi-impianti-sportivi'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_PAYLOAD';
  end if;
  if p_social_links is null then p_social_links := '{}'::jsonb; end if;
  if pg_catalog.jsonb_typeof(p_social_links) <> 'object' or exists (
    select 1 from pg_catalog.jsonb_object_keys(p_social_links) as link_key(name)
    where link_key.name not in ('website', 'instagram', 'facebook', 'youtube', 'linkedin')
  ) then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_SOCIAL_LINKS';
  end if;

  perform 1 from public.profilo where uuid = p_profile_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;
  case p_profile_type
    when 'giocatore' then select id into v_subprofile_id from public.profilo_giocatore where uuid_profilo = p_profile_id;
    when 'squadra' then select id into v_subprofile_id from public.profilo_squadra where uuid_profilo = p_profile_id;
    when 'staff-sportivo' then select id into v_subprofile_id from public.profilo_staff_sportivo where uuid_profilo = p_profile_id;
    when 'professionisti-studi' then select id into v_subprofile_id from public.profilo_professionista_studente where uuid_profilo = p_profile_id;
    when 'arbitro' then select id into v_subprofile_id from public.profilo_arbitro where uuid_profilo = p_profile_id;
    when 'creators' then select id into v_subprofile_id from public.profilo_creator where uuid_profilo = p_profile_id;
    when 'torneo-evento' then select id into v_subprofile_id from public.profilo_torneo_evento where uuid_profilo = p_profile_id;
    when 'campi-impianti-sportivi' then select id into v_subprofile_id from public.profilo_campi_impianti where uuid_profilo = p_profile_id;
  end case;
  if v_subprofile_id is null then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;

  delete from public.link_social_profilo
  where uuid_profilo = p_profile_id and sottoprofilo = p_profile_type
    and piattaforma in ('website', 'instagram', 'facebook', 'youtube', 'linkedin');
  foreach v_platform in array array['website', 'instagram', 'facebook', 'youtube', 'linkedin'] loop
    if p_social_links ? v_platform and pg_catalog.jsonb_typeof(p_social_links -> v_platform) not in ('string', 'null') then
      raise exception using errcode = '22023', message = 'INVALID_PROFILE_SOCIAL_LINKS';
    end if;
    v_link := nullif(pg_catalog.btrim(p_social_links ->> v_platform), '');
    if v_link is not null and (pg_catalog.char_length(v_link) > 2048 or v_link !~* '^https?://[^[:space:]]+$') then
      raise exception using errcode = '22023', message = 'INVALID_PROFILE_SOCIAL_LINKS';
    end if;
    if v_link is not null then
      insert into public.link_social_profilo (uuid_profilo, id_sottoprofilo, sottoprofilo, piattaforma, sublink)
      values (p_profile_id, v_subprofile_id, p_profile_type, v_platform, v_link);
    end if;
  end loop;
end;
$$;

do $migration$
declare
  v_definition text;
  v_anchor text;
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.assert_required_subprofile_fields_v1(uuid,text)')) into v_definition;
  if v_definition is null then raise exception 'Missing required-fields validator'; end if;
  v_definition := pg_catalog.replace(v_definition, $old$not in ('Maschio', 'Femmina')$old$, $new$not in ('Uomo', 'Donna')$new$);
  v_anchor := $anchor$  ) then
    raise exception using errcode = '22023', message = 'PROFILE_REQUIRED_FIELDS_MISSING';$anchor$;
  if pg_catalog.strpos(v_definition, v_anchor) = 0 then raise exception 'Required-fields insertion point not found'; end if;
  v_definition := pg_catalog.replace(v_definition, v_anchor, $replacement$  ) or (
    p_profile_type = 'creators'
    and nullif(pg_catalog.btrim(v_draft ->> 'nome_creator'), '') is null
  ) then
    raise exception using errcode = '22023', message = 'PROFILE_REQUIRED_FIELDS_MISSING';$replacement$);
  execute v_definition;
end;
$migration$;

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
  v_result := private.save_owned_subprofile_core_v1(p_user_id, p_profile_type, p_draft, p_locations);

  select uuid into v_profile_id from public.profilo where uuid_utente = p_user_id;
  if v_profile_id is null then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;

  if p_profile_type = 'giocatore' then
    if p_draft ? 'richiede_caricamento_highlights'
      and pg_catalog.jsonb_typeof(p_draft -> 'richiede_caricamento_highlights') <> 'boolean' then
      raise exception using errcode = '22023', message = 'INVALID_PROFILE_PAYLOAD';
    end if;
    v_highlights_requested := coalesce((p_draft ->> 'richiede_caricamento_highlights')::boolean, false);
    perform private.save_player_highlights_for_profile_v1(v_profile_id, p_profile_type, p_draft);
    perform private.save_player_highlights_request_for_profile_v1(v_profile_id, p_profile_type, v_highlights_requested);
    perform private.save_player_step04_fields_v1(v_profile_id, p_draft);
  elsif p_profile_type = 'squadra' then
    perform private.save_team_step05_fields_v1(v_profile_id, p_draft);
  elsif p_profile_type = 'staff-sportivo' then
    perform private.save_staff_step10_fields_v1(v_profile_id, p_draft);
  elsif p_profile_type in ('arbitro', 'professionisti-studi') then
    perform private.save_profile_career_sections_v1(v_profile_id, p_profile_type, p_draft);
  elsif p_profile_type = 'campi-impianti-sportivi' then
    perform private.save_facility_step13_address_v1(v_profile_id, p_draft);
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
  if (select auth.uid()) is null then raise exception using errcode = '28000', message = 'AUTH_REQUIRED'; end if;
  if p_visibility is distinct from 'gratuito' then raise exception using errcode = '22023', message = 'PRIORITY_PUBLICATION_DISABLED'; end if;
  if p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_PUBLISH_PAYLOAD';
  end if;

  v_profile_type := p_payload ->> 'profile_type';
  v_social_links := p_payload -> 'profile_social_links';
  if v_social_links is not null and v_social_links <> 'null'::jsonb
    and pg_catalog.jsonb_typeof(v_social_links) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_SOCIAL_LINKS';
  end if;

  if p_payload ->> 'announcement_type' = 'annuncio_torneo_evento'
    and not private.tournament_step12_detail_is_valid(p_payload -> 'detail') then
    raise exception using errcode = '22023', message = 'INVALID_TOURNAMENT_ANNOUNCEMENT_DETAIL';
  end if;

  v_result := private.publish_announcement_core_v2(
    p_submission_id,
    p_payload - 'profile_social_links',
    p_terms_version,
    p_privacy_version,
    p_visibility
  );
  if v_result ->> 'status' <> 'success' then return v_result; end if;
  v_is_retry := coalesce((v_result ->> 'idempotent')::boolean, false);
  if v_is_retry then return v_result; end if;

  select announcement.autore_annuncio into v_profile_id
  from private.announcement_submission as submission
  join public.annuncio as announcement on announcement.uuid = submission.announcement_id
  where submission.submission_id = p_submission_id;
  if v_profile_id is null then raise exception using errcode = '55000', message = 'PUBLISH_RECEIPT_NOT_FOUND'; end if;

  if p_payload ->> 'announcement_type' = 'annuncio_campo_impianto' then
    perform private.save_facility_announcement_fields_v1(
      (v_result ->> 'announcementId')::uuid,
      p_payload -> 'detail'
    );
  end if;

  if p_payload ->> 'announcement_type' = 'annuncio_squadra_cerca_giocatore' then
    perform private.save_team_player_year_range_step06_v1(p_submission_id, p_payload -> 'detail');
  end if;
  if p_payload ->> 'announcement_type' = 'annuncio_squadra_cerca_staff' then
    perform private.save_team_staff_search_step07_v1(p_submission_id, p_payload -> 'detail');
  end if;

  v_has_anonymous_profile := p_payload -> 'profile_draft' is not null
    and p_payload -> 'profile_draft' <> 'null'::jsonb;
  if v_has_anonymous_profile then
    v_draft := p_payload -> 'profile_draft';
  elsif p_payload -> 'profile_update' is not null and p_payload -> 'profile_update' <> 'null'::jsonb then
    v_draft := p_payload -> 'profile_update' -> 'draft';
  else
    v_draft := null;
  end if;

  if v_profile_type = 'campi-impianti-sportivi'
    and v_draft is not null
    and pg_catalog.jsonb_typeof(v_draft) = 'object' then
    perform private.save_facility_step13_address_v1(v_profile_id, v_draft);
  end if;

  if v_draft is null or pg_catalog.jsonb_typeof(v_draft) <> 'object' then
    if v_social_links is not null and v_social_links <> 'null'::jsonb then
      raise exception using errcode = '22023', message = 'INVALID_PROFILE_SOCIAL_LINKS';
    end if;
    if v_profile_type = 'staff-sportivo' then
      perform private.snapshot_staff_step10_v1(p_submission_id, v_profile_id);
    elsif v_profile_type = 'arbitro' then
      perform private.snapshot_referee_career_sections_v1(p_submission_id, v_profile_id);
    end if;
    return v_result;
  end if;

  if v_has_anonymous_profile and v_profile_type = 'giocatore' then
    perform private.save_player_highlights_for_profile_v1(v_profile_id, v_profile_type, v_draft);
    perform private.save_player_highlights_request_for_profile_v1(
      v_profile_id, v_profile_type,
      coalesce((v_draft ->> 'richiede_caricamento_highlights')::boolean, false)
    );
  end if;
  if v_social_links is not null and v_social_links <> 'null'::jsonb then
    perform private.sync_profile_social_links_v1(v_profile_id, v_profile_type, v_social_links);
  end if;

  if v_profile_type = 'giocatore' then
    perform private.save_player_step04_fields_v1(v_profile_id, v_draft);
  elsif v_profile_type = 'squadra' then
    perform private.save_team_step05_fields_v1(v_profile_id, v_draft);
  elsif v_profile_type = 'staff-sportivo' then
    perform private.save_staff_step10_fields_v1(v_profile_id, v_draft);
  elsif v_profile_type in ('arbitro', 'professionisti-studi') then
    perform private.save_profile_career_sections_v1(v_profile_id, v_profile_type, v_draft);
  end if;

  if v_profile_type = 'staff-sportivo' then
    perform private.snapshot_staff_step10_v1(p_submission_id, v_profile_id);
  elsif v_profile_type = 'arbitro' then
    perform private.snapshot_referee_career_sections_v1(p_submission_id, v_profile_id);
  end if;
  return v_result;
end;
$$;

revoke all on function private.save_profile_career_sections_v1(uuid, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function private.save_profile_career_sections_v1(uuid, text, jsonb) to service_role;
revoke all on function private.snapshot_referee_career_sections_v1(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function private.snapshot_referee_career_sections_v1(uuid, uuid) to service_role;
revoke all on function private.sync_profile_social_links_v1(uuid, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function private.sync_profile_social_links_v1(uuid, text, jsonb) to service_role;
revoke all on function public.publish_announcement_v2(uuid, jsonb, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.publish_announcement_v2(uuid, jsonb, text, text, text) to authenticated;

do $migration$
declare
  v_definition text;
  v_previous_definition text;
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.create_anonymous_publish_profile(text,jsonb,jsonb)')) into v_definition;
  if v_definition is null then raise exception 'Missing anonymous profile helper'; end if;

  v_previous_definition := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    $pattern$'campi-impianti-sportivi'[[:space:]]*\)$pattern$,
    $replacement$'campi-impianti-sportivi',
    'creators'
  )$replacement$
  );
  if v_definition is not distinct from v_previous_definition then raise exception 'Anonymous profile type insertion point not found'; end if;

  v_previous_definition := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    $pattern$when 'torneo-evento' then[[:space:]]*not private\.publish_text_is_valid\(p_draft ->> 'nome_organizzazione', true, 160\)$pattern$,
    $replacement$when 'creators' then
      not private.publish_text_is_valid(p_draft ->> 'nome_creator', true, 160)
    when 'torneo-evento' then
      not private.publish_text_is_valid(p_draft ->> 'nome_organizzazione', true, 160)$replacement$
  );
  if v_definition is not distinct from v_previous_definition then raise exception 'Anonymous creator validation insertion point not found'; end if;

  v_previous_definition := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    $pattern$when 'torneo-evento' then[[:space:]]*insert into public\.profilo_torneo_evento$pattern$,
    $creator$when 'creators' then
      insert into public.profilo_creator (
        uuid_profilo, sport_principale, nome_creator,
        tipologia_contenuti, presentazione, nascosto
      ) values (
        v_profile_id,
        p_draft ->> 'sport_principale',
        p_draft ->> 'nome_creator',
        p_draft ->> 'tipologia_contenuti',
        p_draft ->> 'presentazione',
        false
      ) returning id into v_subprofile_id;

    when 'torneo-evento' then
      insert into public.profilo_torneo_evento$creator$
  );
  if v_definition is not distinct from v_previous_definition then raise exception 'Anonymous creator writer insertion point not found'; end if;
  execute v_definition;
end;
$migration$;

do $migration$
declare
  v_definition text;
  v_previous_definition text;
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.publish_announcement_core_v1(uuid,jsonb,text,text)')) into v_definition;
  if v_definition is null then raise exception 'Missing publication core'; end if;

  v_previous_definition := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    $pattern$'campi-impianti-sportivi'[[:space:]]*\)$pattern$,
    $replacement$'campi-impianti-sportivi',
    'creators'
  )$replacement$
  );
  if v_definition is not distinct from v_previous_definition then raise exception 'Publication profile type insertion point not found'; end if;

  v_previous_definition := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    $pattern$[[:space:]]+or[[:space:]]+\(v_profile_type[[:space:]]*=[[:space:]]*'campi-impianti-sportivi'[[:space:]]+and[[:space:]]+v_announcement_type[[:space:]]*=[[:space:]]*'annuncio_campo_impianto'\)$pattern$,
    $replacement$
    or (v_profile_type = 'campi-impianti-sportivi' and v_announcement_type = 'annuncio_campo_impianto')
    or (v_profile_type = 'creators' and v_announcement_type = 'annuncio_creators')$replacement$
  );
  if v_definition is not distinct from v_previous_definition then raise exception 'Creator announcement mapping insertion point not found'; end if;

  v_previous_definition := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    $pattern$when 'annuncio_torneo_evento' then[[:space:]]*not private\.publish_text_is_valid\(v_detail ->> 'nome_evento', true, 160\)$pattern$,
    $replacement$when 'annuncio_creators' then
      not private.publish_text_is_valid(v_detail ->> 'titolo_post', true, 160)
      or not private.publish_text_is_valid(v_detail ->> 'descrizione_post', false, 5000)
    when 'annuncio_torneo_evento' then
      not private.publish_text_is_valid(v_detail ->> 'nome_evento', true, 160)$replacement$
  );
  if v_definition is not distinct from v_previous_definition then raise exception 'Creator detail validation insertion point not found'; end if;

  v_previous_definition := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    $pattern$when 'torneo-evento' then[[:space:]]*perform 1$pattern$,
    $creator$when 'creators' then
      perform 1
      from public.profilo_creator
      where uuid_profilo = v_profile_id
        and nascosto = false
        and nullif(pg_catalog.btrim(nome_creator), '') is not null
      for share;
      if not found then
        raise exception using errcode = 'P0001', message = 'PROFILE_NOT_ENABLED';
      end if;
    when 'torneo-evento' then
      perform 1$creator$
  );
  if v_definition is not distinct from v_previous_definition then raise exception 'Creator profile check insertion point not found'; end if;

  v_previous_definition := v_definition;
  v_definition := pg_catalog.regexp_replace(
    v_definition,
    $pattern$when 'annuncio_torneo_evento' then[[:space:]]*insert into public\.annuncio_torneo_evento$pattern$,
    $creator$when 'annuncio_creators' then
      insert into public.annuncio_creator (
        uuid_annuncio, titolo_post, descrizione_post
      ) values (
        v_announcement_id,
        v_detail ->> 'titolo_post',
        v_detail ->> 'descrizione_post'
      );

    when 'annuncio_torneo_evento' then
      insert into public.annuncio_torneo_evento$creator$
  );
  if v_definition is not distinct from v_previous_definition then raise exception 'Creator announcement writer insertion point not found'; end if;
  execute v_definition;
end;
$migration$;

notify pgrst, 'reload schema';

commit;

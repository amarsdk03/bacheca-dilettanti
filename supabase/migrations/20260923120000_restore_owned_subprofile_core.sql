-- Repair deployments where the profile sidecar wrapper was installed without
-- its base writer. The body is the established dashboard writer, including the
-- later removal of the temporary profile-type availability restriction.

create or replace function private.save_owned_subprofile_core_v1(
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
  v_subprofile_id bigint;
  v_profile_count integer;
  v_exists boolean;
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'AUTH_REQUIRED';
  end if;
  if p_profile_type not in ('giocatore', 'squadra', 'staff-sportivo', 'arbitro', 'torneo-evento', 'campi-impianti-sportivi', 'professionisti-studi', 'creators') then
    raise exception using errcode = '22023', message = 'UNSUPPORTED_PROFILE_TYPE';
  end if;
  if p_draft is null or jsonb_typeof(p_draft) <> 'object' or p_locations is null or jsonb_typeof(p_locations) <> 'array' then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_PAYLOAD';
  end if;
  if exists (select 1 from jsonb_array_elements(p_locations) as location(value) where jsonb_typeof(location.value) <> 'object' or nullif(btrim(location.value ->> 'regione'), '') is null) then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_LOCATIONS';
  end if;

  select profilo.uuid into v_profile_id from public.profilo where profilo.uuid_utente = p_user_id for update;
  if v_profile_id is null then
    raise exception using errcode = 'P0001', message = 'BASE_PROFILE_NOT_FOUND';
  end if;

  case p_profile_type
    when 'giocatore' then select id into v_subprofile_id from public.profilo_giocatore where uuid_profilo = v_profile_id;
    when 'squadra' then select id into v_subprofile_id from public.profilo_squadra where uuid_profilo = v_profile_id;
    when 'staff-sportivo' then select id into v_subprofile_id from public.profilo_staff_sportivo where uuid_profilo = v_profile_id;
    when 'arbitro' then select id into v_subprofile_id from public.profilo_arbitro where uuid_profilo = v_profile_id;
    when 'torneo-evento' then select id into v_subprofile_id from public.profilo_torneo_evento where uuid_profilo = v_profile_id;
    when 'campi-impianti-sportivi' then select id into v_subprofile_id from public.profilo_campi_impianti where uuid_profilo = v_profile_id;
    when 'professionisti-studi' then select id into v_subprofile_id from public.profilo_professionista_studente where uuid_profilo = v_profile_id;
    when 'creators' then select id into v_subprofile_id from public.profilo_creator where uuid_profilo = v_profile_id;
  end case;
  v_exists := v_subprofile_id is not null;
  if not v_exists then
    select (select count(*) from public.profilo_giocatore where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_squadra where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_staff_sportivo where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_arbitro where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_torneo_evento where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_campi_impianti where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_professionista_studente where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_creator where uuid_profilo = v_profile_id)
    into v_profile_count;
    if v_profile_count >= 5 then raise exception using errcode = 'P0001', message = 'PROFILE_LIMIT_REACHED'; end if;
  end if;

  case p_profile_type
    when 'giocatore' then
      insert into public.profilo_giocatore (uuid_profilo, sport_principale, nome, cognome, anno_nascita, mese_nascita, giorno_nascita, disponibilita, presentazione, tipologie_sport, ruoli_sport, piede_principale, altezza, peso, storico_carriera, nascosto)
      values (v_profile_id, p_draft ->> 'sport_principale', p_draft ->> 'nome', p_draft ->> 'cognome', p_draft ->> 'anno_nascita', p_draft ->> 'mese_nascita', p_draft ->> 'giorno_nascita', p_draft ->> 'disponibilita', p_draft ->> 'presentazione', array(select jsonb_array_elements_text(coalesce(p_draft -> 'tipologie_sport', '[]'::jsonb))), p_draft -> 'ruoli_sport', p_draft ->> 'piede_principale', p_draft ->> 'altezza', p_draft ->> 'peso', p_draft -> 'storico_carriera', false)
      on conflict (uuid_profilo) do update set sport_principale = excluded.sport_principale, nome = excluded.nome, cognome = excluded.cognome, anno_nascita = excluded.anno_nascita, mese_nascita = excluded.mese_nascita, giorno_nascita = excluded.giorno_nascita, disponibilita = excluded.disponibilita, presentazione = excluded.presentazione, tipologie_sport = excluded.tipologie_sport, ruoli_sport = excluded.ruoli_sport, piede_principale = excluded.piede_principale, altezza = excluded.altezza, peso = excluded.peso, storico_carriera = excluded.storico_carriera returning id into v_subprofile_id;
    when 'squadra' then
      insert into public.profilo_squadra (uuid_profilo, sport_principale, nome_societa, tipologie_sport, sede_principale, presentazione, nascosto)
      values (v_profile_id, p_draft ->> 'sport_principale', p_draft ->> 'nome_societa', array(select jsonb_array_elements_text(coalesce(p_draft -> 'tipologie_sport', '[]'::jsonb))), p_draft ->> 'sede_principale', p_draft ->> 'presentazione', false)
      on conflict (uuid_profilo) do update set sport_principale = excluded.sport_principale, nome_societa = excluded.nome_societa, tipologie_sport = excluded.tipologie_sport, sede_principale = excluded.sede_principale, presentazione = excluded.presentazione returning id into v_subprofile_id;
    when 'staff-sportivo' then
      insert into public.profilo_staff_sportivo (uuid_profilo, sport_principale, nome, cognome, anno_nascita, mese_nascita, giorno_nascita, disponibilita, presentazione, figure_professionali, storico_esperienze, nascosto)
      values (v_profile_id, p_draft ->> 'sport_principale', p_draft ->> 'nome', p_draft ->> 'cognome', p_draft ->> 'anno_nascita', p_draft ->> 'mese_nascita', p_draft ->> 'giorno_nascita', p_draft ->> 'disponibilita', p_draft ->> 'presentazione', array(select jsonb_array_elements_text(coalesce(p_draft -> 'figure_professionali', '[]'::jsonb))), p_draft -> 'storico_esperienze', false)
      on conflict (uuid_profilo) do update set sport_principale = excluded.sport_principale, nome = excluded.nome, cognome = excluded.cognome, anno_nascita = excluded.anno_nascita, mese_nascita = excluded.mese_nascita, giorno_nascita = excluded.giorno_nascita, disponibilita = excluded.disponibilita, presentazione = excluded.presentazione, figure_professionali = excluded.figure_professionali, storico_esperienze = excluded.storico_esperienze returning id into v_subprofile_id;
    when 'arbitro' then
      insert into public.profilo_arbitro (uuid_profilo, sport_principale, nome, cognome, anno_nascita, mese_nascita, giorno_nascita, disponibilita, presentazione, storico_esperienze, nascosto)
      values (v_profile_id, p_draft ->> 'sport_principale', p_draft ->> 'nome', p_draft ->> 'cognome', p_draft ->> 'anno_nascita', p_draft ->> 'mese_nascita', p_draft ->> 'giorno_nascita', p_draft ->> 'disponibilita', p_draft ->> 'presentazione', p_draft -> 'storico_esperienze', false)
      on conflict (uuid_profilo) do update set sport_principale = excluded.sport_principale, nome = excluded.nome, cognome = excluded.cognome, anno_nascita = excluded.anno_nascita, mese_nascita = excluded.mese_nascita, giorno_nascita = excluded.giorno_nascita, disponibilita = excluded.disponibilita, presentazione = excluded.presentazione, storico_esperienze = excluded.storico_esperienze returning id into v_subprofile_id;
    when 'torneo-evento' then
      insert into public.profilo_torneo_evento (uuid_profilo, sport_principale, nome_organizzazione, tipologie_sport, sede_principale, presentazione, nascosto)
      values (v_profile_id, p_draft ->> 'sport_principale', p_draft ->> 'nome_organizzazione', array(select jsonb_array_elements_text(coalesce(p_draft -> 'tipologie_sport', '[]'::jsonb))), p_draft ->> 'sede_principale', p_draft ->> 'presentazione', false)
      on conflict (uuid_profilo) do update set sport_principale = excluded.sport_principale, nome_organizzazione = excluded.nome_organizzazione, tipologie_sport = excluded.tipologie_sport, sede_principale = excluded.sede_principale, presentazione = excluded.presentazione returning id into v_subprofile_id;
    when 'campi-impianti-sportivi' then
      insert into public.profilo_campi_impianti (uuid_profilo, sport_principale, nome_organizzazione, tipologie_sport, sede_principale, presentazione, orari, costo_partenza, servizi_inclusi, info_aggiuntive, nascosto)
      values (v_profile_id, p_draft ->> 'sport_principale', p_draft ->> 'nome_organizzazione', array(select jsonb_array_elements_text(coalesce(p_draft -> 'tipologie_sport', '[]'::jsonb))), p_draft ->> 'sede_principale', p_draft ->> 'presentazione', p_draft -> 'orari', nullif(p_draft ->> 'costo_partenza', '')::numeric(10, 2), p_draft ->> 'servizi_inclusi', p_draft ->> 'info_aggiuntive', false)
      on conflict (uuid_profilo) do update set sport_principale = excluded.sport_principale, nome_organizzazione = excluded.nome_organizzazione, tipologie_sport = excluded.tipologie_sport, sede_principale = excluded.sede_principale, presentazione = excluded.presentazione, orari = excluded.orari, costo_partenza = excluded.costo_partenza, servizi_inclusi = excluded.servizi_inclusi, info_aggiuntive = excluded.info_aggiuntive returning id into v_subprofile_id;
    when 'professionisti-studi' then
      insert into public.profilo_professionista_studente (uuid_profilo, sport_principale, nome, cognome, anno_nascita, mese_nascita, giorno_nascita, disponibilita, presentazione, figure_professionali, specializzazioni, presentazione_servizi, storico_esperienze, tipologie_sport, automunito, nascosto)
      values (v_profile_id, p_draft ->> 'sport_principale', p_draft ->> 'nome', p_draft ->> 'cognome', p_draft ->> 'anno_nascita', p_draft ->> 'mese_nascita', p_draft ->> 'giorno_nascita', p_draft ->> 'disponibilita', p_draft ->> 'presentazione', array(select jsonb_array_elements_text(coalesce(p_draft -> 'figure_professionali', '[]'::jsonb))), p_draft ->> 'specializzazioni', p_draft ->> 'presentazione_servizi', p_draft -> 'storico_esperienze', array(select jsonb_array_elements_text(coalesce(p_draft -> 'tipologie_sport', '[]'::jsonb))), p_draft ->> 'automunito', false)
      on conflict (uuid_profilo) do update set sport_principale = excluded.sport_principale, nome = excluded.nome, cognome = excluded.cognome, anno_nascita = excluded.anno_nascita, mese_nascita = excluded.mese_nascita, giorno_nascita = excluded.giorno_nascita, disponibilita = excluded.disponibilita, presentazione = excluded.presentazione, figure_professionali = excluded.figure_professionali, specializzazioni = excluded.specializzazioni, presentazione_servizi = excluded.presentazione_servizi, storico_esperienze = excluded.storico_esperienze, tipologie_sport = excluded.tipologie_sport, automunito = excluded.automunito returning id into v_subprofile_id;
    when 'creators' then
      insert into public.profilo_creator (uuid_profilo, sport_principale, nome_creator, tipologia_contenuti, presentazione, nascosto)
      values (v_profile_id, p_draft ->> 'sport_principale', p_draft ->> 'nome_creator', p_draft ->> 'tipologia_contenuti', p_draft ->> 'presentazione', false)
      on conflict (uuid_profilo) do update set sport_principale = excluded.sport_principale, nome_creator = excluded.nome_creator, tipologia_contenuti = excluded.tipologia_contenuti, presentazione = excluded.presentazione returning id into v_subprofile_id;
  end case;

  delete from public.localita_profilo where uuid_profilo = v_profile_id and sottoprofilo = p_profile_type;
  insert into public.localita_profilo (uuid_profilo, sottoprofilo, id_sottoprofilo, regione, citta)
  select v_profile_id, p_profile_type, v_subprofile_id, location.value ->> 'regione', location.value ->> 'citta' from jsonb_array_elements(p_locations) as location(value);
  update public.profilo set tipologia_principale = coalesce(tipologia_principale, p_profile_type), ultima_modifica_il = now(), ultima_modifica_da = p_user_id where uuid = v_profile_id;
  return jsonb_build_object('profileType', p_profile_type, 'subprofileId', v_subprofile_id, 'created', not v_exists);
end;
$$;

revoke all on function private.save_owned_subprofile_core_v1(uuid, text, jsonb, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.save_owned_subprofile_core_v1(uuid, text, jsonb, jsonb)
  to service_role;

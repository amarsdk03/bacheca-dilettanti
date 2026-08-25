-- Connect the authenticated profile dashboard to the existing profile and
-- announcement schema. Profile writes stay behind server-only RPCs, while
-- announcement reads and the two supported mutations are enforced by RLS.

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
  v_profile_id uuid;
  v_subprofile_id bigint;
  v_profile_count integer;
  v_exists boolean;
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'AUTH_REQUIRED';
  end if;

  if p_profile_type not in (
    'giocatore',
    'squadra',
    'staff-sportivo',
    'arbitro',
    'torneo-evento',
    'campi-impianti-sportivi',
    'professionisti-studi',
    'creators'
  ) then
    raise exception using errcode = '22023', message = 'UNSUPPORTED_PROFILE_TYPE';
  end if;

  if p_draft is null or jsonb_typeof(p_draft) <> 'object'
    or p_locations is null or jsonb_typeof(p_locations) <> 'array' then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_PAYLOAD';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_locations) as location(value)
    where jsonb_typeof(location.value) <> 'object'
      or nullif(btrim(location.value ->> 'regione'), '') is null
  ) then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_LOCATIONS';
  end if;

  select profilo.uuid
  into v_profile_id
  from public.profilo
  where profilo.uuid_utente = p_user_id
  for update;

  if v_profile_id is null then
    raise exception using errcode = 'P0001', message = 'BASE_PROFILE_NOT_FOUND';
  end if;

  case p_profile_type
    when 'giocatore' then
      select id into v_subprofile_id
      from public.profilo_giocatore
      where uuid_profilo = v_profile_id;
    when 'squadra' then
      select id into v_subprofile_id
      from public.profilo_squadra
      where uuid_profilo = v_profile_id;
    when 'staff-sportivo' then
      select id into v_subprofile_id
      from public.profilo_staff_sportivo
      where uuid_profilo = v_profile_id;
    when 'arbitro' then
      select id into v_subprofile_id
      from public.profilo_arbitro
      where uuid_profilo = v_profile_id;
    when 'torneo-evento' then
      select id into v_subprofile_id
      from public.profilo_torneo_evento
      where uuid_profilo = v_profile_id;
    when 'campi-impianti-sportivi' then
      select id into v_subprofile_id
      from public.profilo_campi_impianti
      where uuid_profilo = v_profile_id;
    when 'professionisti-studi' then
      select id into v_subprofile_id
      from public.profilo_professionista_studente
      where uuid_profilo = v_profile_id;
    when 'creators' then
      select id into v_subprofile_id
      from public.profilo_creator
      where uuid_profilo = v_profile_id;
  end case;

  v_exists := v_subprofile_id is not null;

  if not v_exists then
    if p_profile_type in ('professionisti-studi', 'creators') then
      raise exception using errcode = 'P0001', message = 'PROFILE_TYPE_UNAVAILABLE';
    end if;

    select
      (select count(*) from public.profilo_giocatore where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_squadra where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_staff_sportivo where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_arbitro where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_torneo_evento where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_campi_impianti where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_professionista_studente where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_creator where uuid_profilo = v_profile_id)
    into v_profile_count;

    if v_profile_count >= 5 then
      raise exception using errcode = 'P0001', message = 'PROFILE_LIMIT_REACHED';
    end if;
  end if;

  case p_profile_type
    when 'giocatore' then
      insert into public.profilo_giocatore (
        uuid_profilo, sport_principale, nome, cognome, anno_nascita,
        mese_nascita, giorno_nascita, disponibilita, presentazione,
        tipologie_sport, ruoli_sport, piede_principale, altezza, peso,
        storico_carriera, nascosto
      ) values (
        v_profile_id,
        p_draft ->> 'sport_principale',
        p_draft ->> 'nome',
        p_draft ->> 'cognome',
        p_draft ->> 'anno_nascita',
        p_draft ->> 'mese_nascita',
        p_draft ->> 'giorno_nascita',
        p_draft ->> 'disponibilita',
        p_draft ->> 'presentazione',
        array(select jsonb_array_elements_text(coalesce(p_draft -> 'tipologie_sport', '[]'::jsonb))),
        p_draft -> 'ruoli_sport',
        p_draft ->> 'piede_principale',
        p_draft ->> 'altezza',
        p_draft ->> 'peso',
        p_draft -> 'storico_carriera',
        false
      )
      on conflict (uuid_profilo) do update set
        sport_principale = excluded.sport_principale,
        nome = excluded.nome,
        cognome = excluded.cognome,
        anno_nascita = excluded.anno_nascita,
        mese_nascita = excluded.mese_nascita,
        giorno_nascita = excluded.giorno_nascita,
        disponibilita = excluded.disponibilita,
        presentazione = excluded.presentazione,
        tipologie_sport = excluded.tipologie_sport,
        ruoli_sport = excluded.ruoli_sport,
        piede_principale = excluded.piede_principale,
        altezza = excluded.altezza,
        peso = excluded.peso,
        storico_carriera = excluded.storico_carriera
      returning id into v_subprofile_id;

    when 'squadra' then
      insert into public.profilo_squadra (
        uuid_profilo, sport_principale, nome_societa, tipologie_sport,
        sede_principale, presentazione, nascosto
      ) values (
        v_profile_id,
        p_draft ->> 'sport_principale',
        p_draft ->> 'nome_societa',
        array(select jsonb_array_elements_text(coalesce(p_draft -> 'tipologie_sport', '[]'::jsonb))),
        p_draft ->> 'sede_principale',
        p_draft ->> 'presentazione',
        false
      )
      on conflict (uuid_profilo) do update set
        sport_principale = excluded.sport_principale,
        nome_societa = excluded.nome_societa,
        tipologie_sport = excluded.tipologie_sport,
        sede_principale = excluded.sede_principale,
        presentazione = excluded.presentazione
      returning id into v_subprofile_id;

    when 'staff-sportivo' then
      insert into public.profilo_staff_sportivo (
        uuid_profilo, sport_principale, nome, cognome, anno_nascita,
        mese_nascita, giorno_nascita, disponibilita, presentazione,
        figure_professionali, storico_esperienze, nascosto
      ) values (
        v_profile_id,
        p_draft ->> 'sport_principale',
        p_draft ->> 'nome',
        p_draft ->> 'cognome',
        p_draft ->> 'anno_nascita',
        p_draft ->> 'mese_nascita',
        p_draft ->> 'giorno_nascita',
        p_draft ->> 'disponibilita',
        p_draft ->> 'presentazione',
        array(select jsonb_array_elements_text(coalesce(p_draft -> 'figure_professionali', '[]'::jsonb))),
        p_draft -> 'storico_esperienze',
        false
      )
      on conflict (uuid_profilo) do update set
        sport_principale = excluded.sport_principale,
        nome = excluded.nome,
        cognome = excluded.cognome,
        anno_nascita = excluded.anno_nascita,
        mese_nascita = excluded.mese_nascita,
        giorno_nascita = excluded.giorno_nascita,
        disponibilita = excluded.disponibilita,
        presentazione = excluded.presentazione,
        figure_professionali = excluded.figure_professionali,
        storico_esperienze = excluded.storico_esperienze
      returning id into v_subprofile_id;

    when 'arbitro' then
      insert into public.profilo_arbitro (
        uuid_profilo, sport_principale, nome, cognome, anno_nascita,
        mese_nascita, giorno_nascita, disponibilita, presentazione,
        storico_esperienze, nascosto
      ) values (
        v_profile_id,
        p_draft ->> 'sport_principale',
        p_draft ->> 'nome',
        p_draft ->> 'cognome',
        p_draft ->> 'anno_nascita',
        p_draft ->> 'mese_nascita',
        p_draft ->> 'giorno_nascita',
        p_draft ->> 'disponibilita',
        p_draft ->> 'presentazione',
        p_draft -> 'storico_esperienze',
        false
      )
      on conflict (uuid_profilo) do update set
        sport_principale = excluded.sport_principale,
        nome = excluded.nome,
        cognome = excluded.cognome,
        anno_nascita = excluded.anno_nascita,
        mese_nascita = excluded.mese_nascita,
        giorno_nascita = excluded.giorno_nascita,
        disponibilita = excluded.disponibilita,
        presentazione = excluded.presentazione,
        storico_esperienze = excluded.storico_esperienze
      returning id into v_subprofile_id;

    when 'torneo-evento' then
      insert into public.profilo_torneo_evento (
        uuid_profilo, sport_principale, nome_organizzazione,
        tipologie_sport, sede_principale, presentazione, nascosto
      ) values (
        v_profile_id,
        p_draft ->> 'sport_principale',
        p_draft ->> 'nome_organizzazione',
        array(select jsonb_array_elements_text(coalesce(p_draft -> 'tipologie_sport', '[]'::jsonb))),
        p_draft ->> 'sede_principale',
        p_draft ->> 'presentazione',
        false
      )
      on conflict (uuid_profilo) do update set
        sport_principale = excluded.sport_principale,
        nome_organizzazione = excluded.nome_organizzazione,
        tipologie_sport = excluded.tipologie_sport,
        sede_principale = excluded.sede_principale,
        presentazione = excluded.presentazione
      returning id into v_subprofile_id;

    when 'campi-impianti-sportivi' then
      insert into public.profilo_campi_impianti (
        uuid_profilo, sport_principale, nome_organizzazione,
        tipologie_sport, sede_principale, presentazione, orari,
        costo_partenza, servizi_inclusi, info_aggiuntive, nascosto
      ) values (
        v_profile_id,
        p_draft ->> 'sport_principale',
        p_draft ->> 'nome_organizzazione',
        array(select jsonb_array_elements_text(coalesce(p_draft -> 'tipologie_sport', '[]'::jsonb))),
        p_draft ->> 'sede_principale',
        p_draft ->> 'presentazione',
        p_draft -> 'orari',
        nullif(p_draft ->> 'costo_partenza', '')::numeric(10, 2),
        p_draft ->> 'servizi_inclusi',
        p_draft ->> 'info_aggiuntive',
        false
      )
      on conflict (uuid_profilo) do update set
        sport_principale = excluded.sport_principale,
        nome_organizzazione = excluded.nome_organizzazione,
        tipologie_sport = excluded.tipologie_sport,
        sede_principale = excluded.sede_principale,
        presentazione = excluded.presentazione,
        orari = excluded.orari,
        costo_partenza = excluded.costo_partenza,
        servizi_inclusi = excluded.servizi_inclusi,
        info_aggiuntive = excluded.info_aggiuntive
      returning id into v_subprofile_id;

    when 'professionisti-studi' then
      insert into public.profilo_professionista_studente (
        uuid_profilo, sport_principale, nome, cognome, anno_nascita,
        mese_nascita, giorno_nascita, disponibilita, presentazione,
        figure_professionali, specializzazioni, presentazione_servizi,
        storico_esperienze, tipologie_sport, automunito, nascosto
      ) values (
        v_profile_id,
        p_draft ->> 'sport_principale',
        p_draft ->> 'nome',
        p_draft ->> 'cognome',
        p_draft ->> 'anno_nascita',
        p_draft ->> 'mese_nascita',
        p_draft ->> 'giorno_nascita',
        p_draft ->> 'disponibilita',
        p_draft ->> 'presentazione',
        array(select jsonb_array_elements_text(coalesce(p_draft -> 'figure_professionali', '[]'::jsonb))),
        p_draft ->> 'specializzazioni',
        p_draft ->> 'presentazione_servizi',
        p_draft -> 'storico_esperienze',
        array(select jsonb_array_elements_text(coalesce(p_draft -> 'tipologie_sport', '[]'::jsonb))),
        p_draft ->> 'automunito',
        false
      )
      on conflict (uuid_profilo) do update set
        sport_principale = excluded.sport_principale,
        nome = excluded.nome,
        cognome = excluded.cognome,
        anno_nascita = excluded.anno_nascita,
        mese_nascita = excluded.mese_nascita,
        giorno_nascita = excluded.giorno_nascita,
        disponibilita = excluded.disponibilita,
        presentazione = excluded.presentazione,
        figure_professionali = excluded.figure_professionali,
        specializzazioni = excluded.specializzazioni,
        presentazione_servizi = excluded.presentazione_servizi,
        storico_esperienze = excluded.storico_esperienze,
        tipologie_sport = excluded.tipologie_sport,
        automunito = excluded.automunito
      returning id into v_subprofile_id;

    when 'creators' then
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
      )
      on conflict (uuid_profilo) do update set
        sport_principale = excluded.sport_principale,
        nome_creator = excluded.nome_creator,
        tipologia_contenuti = excluded.tipologia_contenuti,
        presentazione = excluded.presentazione
      returning id into v_subprofile_id;
  end case;

  delete from public.localita_profilo
  where uuid_profilo = v_profile_id
    and sottoprofilo = p_profile_type;

  insert into public.localita_profilo (
    uuid_profilo,
    sottoprofilo,
    id_sottoprofilo,
    regione,
    citta
  )
  select
    v_profile_id,
    p_profile_type,
    v_subprofile_id,
    location.value ->> 'regione',
    location.value ->> 'citta'
  from jsonb_array_elements(p_locations) as location(value);

  update public.profilo
  set
    tipologia_principale = coalesce(tipologia_principale, p_profile_type),
    ultima_modifica_il = now(),
    ultima_modifica_da = p_user_id
  where uuid = v_profile_id;

  return jsonb_build_object(
    'profileType', p_profile_type,
    'subprofileId', v_subprofile_id,
    'created', not v_exists
  );
end;
$$;

revoke all on function public.save_owned_subprofile(uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_owned_subprofile(uuid, text, jsonb, jsonb)
  to service_role;

create or replace function public.set_owned_primary_subprofile(
  p_user_id uuid,
  p_profile_type text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_exists boolean;
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'AUTH_REQUIRED';
  end if;

  if p_profile_type not in (
    'giocatore', 'squadra', 'staff-sportivo', 'arbitro',
    'torneo-evento', 'campi-impianti-sportivi',
    'professionisti-studi', 'creators'
  ) then
    raise exception using errcode = '22023', message = 'UNSUPPORTED_PROFILE_TYPE';
  end if;

  select profilo.uuid
  into v_profile_id
  from public.profilo
  where profilo.uuid_utente = p_user_id
  for update;

  if v_profile_id is null then
    raise exception using errcode = 'P0001', message = 'BASE_PROFILE_NOT_FOUND';
  end if;

  v_exists := case p_profile_type
    when 'giocatore' then exists(select 1 from public.profilo_giocatore where uuid_profilo = v_profile_id)
    when 'squadra' then exists(select 1 from public.profilo_squadra where uuid_profilo = v_profile_id)
    when 'staff-sportivo' then exists(select 1 from public.profilo_staff_sportivo where uuid_profilo = v_profile_id)
    when 'arbitro' then exists(select 1 from public.profilo_arbitro where uuid_profilo = v_profile_id)
    when 'torneo-evento' then exists(select 1 from public.profilo_torneo_evento where uuid_profilo = v_profile_id)
    when 'campi-impianti-sportivi' then exists(select 1 from public.profilo_campi_impianti where uuid_profilo = v_profile_id)
    when 'professionisti-studi' then exists(select 1 from public.profilo_professionista_studente where uuid_profilo = v_profile_id)
    when 'creators' then exists(select 1 from public.profilo_creator where uuid_profilo = v_profile_id)
  end;

  if not v_exists then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;

  update public.profilo
  set
    tipologia_principale = p_profile_type,
    ultima_modifica_il = now(),
    ultima_modifica_da = p_user_id
  where uuid = v_profile_id;
end;
$$;

revoke all on function public.set_owned_primary_subprofile(uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_owned_primary_subprofile(uuid, text)
  to service_role;

create or replace function public.delete_owned_subprofile(
  p_user_id uuid,
  p_profile_type text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_profile_count integer;
  v_exists boolean;
  v_was_primary boolean;
  v_next_primary text;
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'AUTH_REQUIRED';
  end if;

  if p_profile_type not in (
    'giocatore', 'squadra', 'staff-sportivo', 'arbitro',
    'torneo-evento', 'campi-impianti-sportivi',
    'professionisti-studi', 'creators'
  ) then
    raise exception using errcode = '22023', message = 'UNSUPPORTED_PROFILE_TYPE';
  end if;

  select
    profilo.uuid,
    profilo.tipologia_principale = p_profile_type
  into v_profile_id, v_was_primary
  from public.profilo
  where profilo.uuid_utente = p_user_id
  for update;

  if v_profile_id is null then
    raise exception using errcode = 'P0001', message = 'BASE_PROFILE_NOT_FOUND';
  end if;

  v_exists := case p_profile_type
    when 'giocatore' then exists(select 1 from public.profilo_giocatore where uuid_profilo = v_profile_id)
    when 'squadra' then exists(select 1 from public.profilo_squadra where uuid_profilo = v_profile_id)
    when 'staff-sportivo' then exists(select 1 from public.profilo_staff_sportivo where uuid_profilo = v_profile_id)
    when 'arbitro' then exists(select 1 from public.profilo_arbitro where uuid_profilo = v_profile_id)
    when 'torneo-evento' then exists(select 1 from public.profilo_torneo_evento where uuid_profilo = v_profile_id)
    when 'campi-impianti-sportivi' then exists(select 1 from public.profilo_campi_impianti where uuid_profilo = v_profile_id)
    when 'professionisti-studi' then exists(select 1 from public.profilo_professionista_studente where uuid_profilo = v_profile_id)
    when 'creators' then exists(select 1 from public.profilo_creator where uuid_profilo = v_profile_id)
  end;

  if not v_exists then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;

  select
    (select count(*) from public.profilo_giocatore where uuid_profilo = v_profile_id)
    + (select count(*) from public.profilo_squadra where uuid_profilo = v_profile_id)
    + (select count(*) from public.profilo_staff_sportivo where uuid_profilo = v_profile_id)
    + (select count(*) from public.profilo_arbitro where uuid_profilo = v_profile_id)
    + (select count(*) from public.profilo_torneo_evento where uuid_profilo = v_profile_id)
    + (select count(*) from public.profilo_campi_impianti where uuid_profilo = v_profile_id)
    + (select count(*) from public.profilo_professionista_studente where uuid_profilo = v_profile_id)
    + (select count(*) from public.profilo_creator where uuid_profilo = v_profile_id)
  into v_profile_count;

  if v_profile_count <= 1 then
    raise exception using errcode = 'P0001', message = 'LAST_PROFILE_REQUIRED';
  end if;

  delete from public.localita_profilo
  where uuid_profilo = v_profile_id
    and sottoprofilo = p_profile_type;

  case p_profile_type
    when 'giocatore' then delete from public.profilo_giocatore where uuid_profilo = v_profile_id;
    when 'squadra' then delete from public.profilo_squadra where uuid_profilo = v_profile_id;
    when 'staff-sportivo' then delete from public.profilo_staff_sportivo where uuid_profilo = v_profile_id;
    when 'arbitro' then delete from public.profilo_arbitro where uuid_profilo = v_profile_id;
    when 'torneo-evento' then delete from public.profilo_torneo_evento where uuid_profilo = v_profile_id;
    when 'campi-impianti-sportivi' then delete from public.profilo_campi_impianti where uuid_profilo = v_profile_id;
    when 'professionisti-studi' then delete from public.profilo_professionista_studente where uuid_profilo = v_profile_id;
    when 'creators' then delete from public.profilo_creator where uuid_profilo = v_profile_id;
  end case;

  if coalesce(v_was_primary, false) then
    v_next_primary := case
      when exists(select 1 from public.profilo_giocatore where uuid_profilo = v_profile_id) then 'giocatore'
      when exists(select 1 from public.profilo_squadra where uuid_profilo = v_profile_id) then 'squadra'
      when exists(select 1 from public.profilo_staff_sportivo where uuid_profilo = v_profile_id) then 'staff-sportivo'
      when exists(select 1 from public.profilo_arbitro where uuid_profilo = v_profile_id) then 'arbitro'
      when exists(select 1 from public.profilo_torneo_evento where uuid_profilo = v_profile_id) then 'torneo-evento'
      when exists(select 1 from public.profilo_campi_impianti where uuid_profilo = v_profile_id) then 'campi-impianti-sportivi'
      when exists(select 1 from public.profilo_professionista_studente where uuid_profilo = v_profile_id) then 'professionisti-studi'
      when exists(select 1 from public.profilo_creator where uuid_profilo = v_profile_id) then 'creators'
    end;
  else
    select tipologia_principale into v_next_primary
    from public.profilo
    where uuid = v_profile_id;
  end if;

  update public.profilo
  set
    tipologia_principale = v_next_primary,
    ultima_modifica_il = now(),
    ultima_modifica_da = p_user_id
  where uuid = v_profile_id;

  return v_next_primary;
end;
$$;

revoke all on function public.delete_owned_subprofile(uuid, text)
  from public, anon, authenticated;
grant execute on function public.delete_owned_subprofile(uuid, text)
  to service_role;

-- Announcements are not writable from /pubblica-annuncio yet. Authenticated
-- users can only read their own rows, toggle `nascosto`, or delete a row.
revoke all on table public.annuncio from anon, authenticated;
revoke all on table public.annuncio_generico from anon, authenticated;
revoke all on table public.annuncio_giocatore from anon, authenticated;
revoke all on table public.annuncio_squadra_cerca_giocatore from anon, authenticated;
revoke all on table public.annuncio_squadra_cerca_staff from anon, authenticated;
revoke all on table public.annuncio_squadra_cerca_partita from anon, authenticated;
revoke all on table public.annuncio_squadra_cerca_sponsor from anon, authenticated;
revoke all on table public.annuncio_staff_sportivo from anon, authenticated;
revoke all on table public.annuncio_arbitro from anon, authenticated;
revoke all on table public.annuncio_torneo_evento from anon, authenticated;
revoke all on table public.annuncio_campo_impianto from anon, authenticated;
revoke all on table public.annuncio_professionista_studente from anon, authenticated;
revoke all on table public.annuncio_creator from anon, authenticated;
revoke all on table public.localita_annuncio from anon, authenticated;
revoke all on table public.media_annuncio from anon, authenticated;
revoke all on table public.link_social_annuncio from anon, authenticated;

grant select on table public.annuncio to authenticated;
grant select on table public.annuncio_generico to authenticated;
grant select on table public.annuncio_giocatore to authenticated;
grant select on table public.annuncio_squadra_cerca_giocatore to authenticated;
grant select on table public.annuncio_squadra_cerca_staff to authenticated;
grant select on table public.annuncio_squadra_cerca_partita to authenticated;
grant select on table public.annuncio_squadra_cerca_sponsor to authenticated;
grant select on table public.annuncio_staff_sportivo to authenticated;
grant select on table public.annuncio_arbitro to authenticated;
grant select on table public.annuncio_torneo_evento to authenticated;
grant select on table public.annuncio_campo_impianto to authenticated;
grant select on table public.annuncio_professionista_studente to authenticated;
grant select on table public.annuncio_creator to authenticated;
grant select on table public.localita_annuncio to authenticated;
grant select on table public.media_annuncio to authenticated;
grant select on table public.link_social_annuncio to authenticated;
grant update (nascosto) on table public.annuncio to authenticated;
grant delete on table public.annuncio to authenticated;

create policy annuncio_select_owned
  on public.annuncio
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (
      creato_da = (select auth.uid())
      or exists (
        select 1
        from public.profilo
        where profilo.uuid = annuncio.autore_annuncio
          and profilo.uuid_utente = (select auth.uid())
      )
    )
  );

create policy annuncio_update_owned
  on public.annuncio
  for update
  to authenticated
  using (
    (select auth.uid()) is not null
    and (
      creato_da = (select auth.uid())
      or exists (
        select 1
        from public.profilo
        where profilo.uuid = annuncio.autore_annuncio
          and profilo.uuid_utente = (select auth.uid())
      )
    )
  )
  with check (
    (select auth.uid()) is not null
    and (
      creato_da = (select auth.uid())
      or exists (
        select 1
        from public.profilo
        where profilo.uuid = annuncio.autore_annuncio
          and profilo.uuid_utente = (select auth.uid())
      )
    )
  );

create policy annuncio_delete_owned
  on public.annuncio
  for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and (
      creato_da = (select auth.uid())
      or exists (
        select 1
        from public.profilo
        where profilo.uuid = annuncio.autore_annuncio
          and profilo.uuid_utente = (select auth.uid())
      )
    )
  );

create policy annuncio_generico_select_owned on public.annuncio_generico
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = annuncio_generico.uuid_annuncio));
create policy annuncio_giocatore_select_owned on public.annuncio_giocatore
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = annuncio_giocatore.uuid_annuncio));
create policy annuncio_squadra_cerca_giocatore_select_owned on public.annuncio_squadra_cerca_giocatore
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = annuncio_squadra_cerca_giocatore.uuid_annuncio));
create policy annuncio_squadra_cerca_staff_select_owned on public.annuncio_squadra_cerca_staff
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = annuncio_squadra_cerca_staff.uuid_annuncio));
create policy annuncio_squadra_cerca_partita_select_owned on public.annuncio_squadra_cerca_partita
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = annuncio_squadra_cerca_partita.uuid_annuncio));
create policy annuncio_squadra_cerca_sponsor_select_owned on public.annuncio_squadra_cerca_sponsor
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = annuncio_squadra_cerca_sponsor.uuid_annuncio));
create policy annuncio_staff_sportivo_select_owned on public.annuncio_staff_sportivo
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = annuncio_staff_sportivo.uuid_annuncio));
create policy annuncio_arbitro_select_owned on public.annuncio_arbitro
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = annuncio_arbitro.uuid_annuncio));
create policy annuncio_torneo_evento_select_owned on public.annuncio_torneo_evento
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = annuncio_torneo_evento.uuid_annuncio));
create policy annuncio_campo_impianto_select_owned on public.annuncio_campo_impianto
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = annuncio_campo_impianto.uuid_annuncio));
create policy annuncio_professionista_studente_select_owned on public.annuncio_professionista_studente
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = annuncio_professionista_studente.uuid_annuncio));
create policy annuncio_creator_select_owned on public.annuncio_creator
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = annuncio_creator.uuid_annuncio));
create policy localita_annuncio_select_owned on public.localita_annuncio
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = localita_annuncio.uuid_annuncio));
create policy media_annuncio_select_owned on public.media_annuncio
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = media_annuncio.uuid_annuncio));
create policy link_social_annuncio_select_owned on public.link_social_annuncio
  for select to authenticated
  using (exists(select 1 from public.annuncio where annuncio.uuid = link_social_annuncio.uuid_annuncio));

create or replace function private.stamp_annuncio_visibility_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.nascosto is distinct from old.nascosto then
    new.ultima_modifica_il := now();
    new.ultima_modifica_da := (select auth.uid());
  end if;
  return new;
end;
$$;

revoke all on function private.stamp_annuncio_visibility_update()
  from public, anon, authenticated, service_role;

create trigger before_annuncio_visibility_update
  before update of nascosto on public.annuncio
  for each row execute function private.stamp_annuncio_visibility_update();

create index if not exists annuncio_creato_da_creato_il_idx
  on public.annuncio (creato_da, creato_il desc);
create index if not exists annuncio_autore_annuncio_creato_il_idx
  on public.annuncio (autore_annuncio, creato_il desc);
create index if not exists annuncio_ultima_modifica_da_idx
  on public.annuncio (ultima_modifica_da);
create index if not exists localita_annuncio_uuid_annuncio_idx
  on public.localita_annuncio (uuid_annuncio);
create index if not exists media_annuncio_uuid_annuncio_idx
  on public.media_annuncio (uuid_annuncio);
create index if not exists link_social_annuncio_uuid_annuncio_idx
  on public.link_social_annuncio (uuid_annuncio);

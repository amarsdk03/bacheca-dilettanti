-- Check persisted profile fields before publication, including registered
-- profiles that are published without a profile draft in the request.
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
  v_player_birth_year_valid boolean;
  v_team_single_sport boolean;
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
  v_player_birth_year_valid := case
    when (v_draft ->> 'anno_nascita') ~ '^[0-9]{4}$'
      then (v_draft ->> 'anno_nascita')::integer between 1900 and pg_catalog.date_part('year', current_date)::integer
    else false
  end;
  v_team_single_sport := case
    when pg_catalog.jsonb_typeof(v_draft -> 'tipologie_sport') = 'array'
      then pg_catalog.jsonb_array_length(v_draft -> 'tipologie_sport') = 1
        and nullif(pg_catalog.btrim(v_draft -> 'tipologie_sport' ->> 0), '') is not null
    else false
  end;

  if (
    p_profile_type = 'giocatore'
    and (
      nullif(pg_catalog.btrim(v_draft ->> 'nome'), '') is null
      or not v_sports_present
      or not v_main_roles_present
      or coalesce(v_draft ->> 'genere' not in ('Maschio', 'Femmina'), true)
      or not v_player_birth_year_valid
      or coalesce(v_draft ->> 'disponibilita' not in ('svincolato', 'sotto-contratto'), true)
    )
  ) or (
    p_profile_type = 'squadra'
    and (
      nullif(pg_catalog.btrim(v_draft ->> 'nome_societa'), '') is null
      or not v_team_single_sport
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
      or not v_sports_present
      or not private.facility_step13_location_is_valid(p_profile_id)
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

commit;

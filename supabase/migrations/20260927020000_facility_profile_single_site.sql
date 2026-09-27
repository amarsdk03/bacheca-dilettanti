begin;

alter table public.profilo_campi_impianti
  add column if not exists indirizzo text;

comment on column public.profilo_campi_impianti.indirizzo is
  'Optional structured facility address. Legacy sede_principale remains historical free text.';

create or replace function private.facility_step13_location_is_valid(p_profile_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*) = 1
    and coalesce(bool_and(
      nullif(pg_catalog.btrim(location.regione), '') is not null
      and nullif(pg_catalog.btrim(location.citta), '') is not null
    ), false)
  from public.localita_profilo as location
  where location.uuid_profilo = p_profile_id
    and location.sottoprofilo = 'campi-impianti-sportivi'
$$;

create or replace function private.save_facility_step13_address_v1(p_profile_id uuid, p_draft jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if pg_catalog.jsonb_typeof(p_draft) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'INVALID_FACILITY_PROFILE';
  end if;
  if not (p_draft ? 'indirizzo') then
    return;
  end if;
  if pg_catalog.jsonb_typeof(p_draft -> 'indirizzo') not in ('string', 'null')
    or pg_catalog.length(coalesce(p_draft ->> 'indirizzo', '')) > 160 then
    raise exception using errcode = '22023', message = 'INVALID_FACILITY_PROFILE';
  end if;

  update public.profilo_campi_impianti
  set indirizzo = nullif(pg_catalog.btrim(p_draft ->> 'indirizzo'), '')
  where uuid_profilo = p_profile_id and nascosto = false;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND';
  end if;
end;
$$;

revoke all on function private.facility_step13_location_is_valid(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.save_facility_step13_address_v1(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function private.facility_step13_location_is_valid(uuid)
  to service_role;
grant execute on function private.save_facility_step13_address_v1(uuid, jsonb)
  to service_role;

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

  if (
    p_profile_type = 'giocatore'
    and (
      nullif(pg_catalog.btrim(v_draft ->> 'nome'), '') is null
      or not v_sports_present
      or not v_main_roles_present
    )
  ) or (
    p_profile_type = 'squadra'
    and (
      nullif(pg_catalog.btrim(v_draft ->> 'nome_societa'), '') is null
      or not v_sports_present
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

do $migration$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.create_anonymous_publish_profile(text,jsonb,jsonb)'))
    into v_definition;
  v_old := 'or not private.publish_text_is_valid(p_draft ->> ''sede_principale'', true, 160)';
  v_new := 'or not private.publish_text_is_valid(p_draft ->> ''indirizzo'', false, 160)';
  if v_definition is null or pg_catalog.strpos(v_definition, v_old) = 0 then
    raise exception 'Facility anonymous-profile insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_old, v_new);

  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.save_owned_subprofile_internal_v1(uuid,text,jsonb,jsonb)'))
    into v_definition;
  v_old := 'return v_result;';
  v_new := E'  if p_profile_type = ''campi-impianti-sportivi'' then\n    select uuid into v_profile_id from public.profilo where uuid_utente = p_user_id;\n    perform private.save_facility_step13_address_v1(v_profile_id, p_draft);\n  end if;\n\n  return v_result;';
  if v_definition is null or pg_catalog.strpos(v_definition, v_old) = 0 then
    raise exception 'Facility owned-profile insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_old, v_new);

  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.publish_announcement_v2(uuid,jsonb,text,text,text)'))
    into v_definition;
  v_old := 'if v_draft is null or pg_catalog.jsonb_typeof(v_draft) <> ''object'' then';
  v_new := E'  if v_profile_type = ''campi-impianti-sportivi'' and v_draft is not null\n    and pg_catalog.jsonb_typeof(v_draft) = ''object'' then\n    perform private.save_facility_step13_address_v1(v_profile_id, v_draft);\n  end if;\n\n' || v_old;
  if v_definition is null or pg_catalog.strpos(v_definition, v_old) = 0 then
    raise exception 'Facility publication insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_old, v_new);
end;
$migration$;

notify pgrst, 'reload schema';

commit;

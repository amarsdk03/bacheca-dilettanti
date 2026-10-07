-- Shared profile fields: preserve schema compatibility, retire obsolete UI data.
begin;

alter table public.profilo_servizi_consulenze
  add column sede_professionista text,
  add column contatto_email text,
  add column contatto_telefono text;
alter table public.profilo_creator add column contatto_email text;

-- Business profiles do not collect personal birth dates anymore.
drop trigger if exists validate_profile_birth_date_v1 on public.profilo_servizi_consulenze;
update public.profilo_servizi_consulenze
set nome = nullif(pg_catalog.btrim(pg_catalog.concat_ws(' ', nullif(pg_catalog.btrim(nome), ''), nullif(pg_catalog.btrim(cognome), ''))), ''),
    cognome = null, anno_nascita = null, mese_nascita = null, giorno_nascita = null,
    automunito = null, figure_professionali = '{}'::text[],
    lista_esperienze = '[]'::jsonb, qualifiche_licenze = '[]'::jsonb,
    storico_esperienze = '[]'::jsonb;

create or replace function private.team_category_is_valid_v1(p_value text)
returns boolean language sql immutable security invoker set search_path = ''
as $$
  select coalesce(p_value in (
    'Calcio a 11 maschile::FIGC — Serie A',
    'Calcio a 11 maschile::FIGC — Serie B',
    'Calcio a 11 maschile::FIGC — Serie C',
    'Calcio a 11 maschile::FIGC-LND — Serie D',
    'Calcio a 11 maschile::FIGC-LND — Eccellenza',
    'Calcio a 11 maschile::FIGC-LND — Promozione',
    'Calcio a 11 maschile::FIGC-LND — Prima Categoria',
    'Calcio a 11 maschile::FIGC-LND — Seconda Categoria',
    'Calcio a 11 maschile::FIGC-LND — Terza Categoria',
    'Calcio a 11 maschile::FIGC-LND — Amatori',
    'Calcio a 11 maschile::CSI — Open Eccellenza',
    'Calcio a 11 maschile::CSI — Open A',
    'Calcio a 11 maschile::CSI — Open B',
    'Calcio a 11 maschile::CSI — Master',
    'Calcio a 11 maschile::UISP — Serie A1',
    'Calcio a 11 maschile::UISP — Serie A2',
    'Calcio a 11 maschile::Altra categoria',
    'Calcio a 8 maschile::Lega Calcio a 8 — Serie A',
    'Calcio a 8 maschile::Lega Calcio a 8 — Serie A2',
    'Calcio a 8 maschile::Lega Calcio a 8 — Serie B',
    'Calcio a 8 maschile::UISP',
    'Calcio a 8 maschile::AICS',
    'Calcio a 8 maschile::ASI',
    'Calcio a 8 maschile::Altra categoria',
    'Calcio a 7 maschile::FIGC-LND — Amatori',
    'Calcio a 7 maschile::CSI — Open / Amatori',
    'Calcio a 7 maschile::CSI — Open Eccellenza',
    'Calcio a 7 maschile::CSI — Open A',
    'Calcio a 7 maschile::CSI — Open B',
    'Calcio a 7 maschile::CSI — Open C',
    'Calcio a 7 maschile::CSI — Open Serie A',
    'Calcio a 7 maschile::CSI — Open Serie B',
    'Calcio a 7 maschile::CSI — Open Serie C',
    'Calcio a 7 maschile::CSI — Open Golden League',
    'Calcio a 7 maschile::CSI — Open Silver League',
    'Calcio a 7 maschile::CSI — Open Bronze League',
    'Calcio a 7 maschile::CSI — Master Senior',
    'Calcio a 7 maschile::Altra categoria',
    'Calcio a 5 maschile::FIGC-LND — Serie A',
    'Calcio a 5 maschile::FIGC-LND — Serie A2 Élite',
    'Calcio a 5 maschile::FIGC-LND — Serie A2',
    'Calcio a 5 maschile::FIGC-LND — Serie B',
    'Calcio a 5 maschile::FIGC-LND — Serie C1',
    'Calcio a 5 maschile::FIGC-LND — Serie C2',
    'Calcio a 5 maschile::FIGC-LND — Serie C regionale',
    'Calcio a 5 maschile::FIGC-LND — Serie D',
    'Calcio a 5 maschile::CSI — Open',
    'Calcio a 5 maschile::Altra categoria',
    'Calcio a 11 femminile::FIGC — Serie A Women',
    'Calcio a 11 femminile::FIGC — Serie B',
    'Calcio a 11 femminile::FIGC-LND — Serie C',
    'Calcio a 11 femminile::FIGC-LND — Eccellenza',
    'Calcio a 11 femminile::FIGC-LND — Promozione',
    'Calcio a 11 femminile::Altra categoria',
    'Calcio a 8 femminile::UISP — Top League',
    'Calcio a 8 femminile::UISP — Fun League',
    'Calcio a 8 femminile::UISP',
    'Calcio a 8 femminile::Altra categoria',
    'Calcio a 7 femminile::CSI — Open',
    'Calcio a 7 femminile::CSI — Open Eccellenza',
    'Calcio a 7 femminile::CSI — Open A',
    'Calcio a 7 femminile::CSI — Open B',
    'Calcio a 7 femminile::Altra categoria',
    'Calcio a 5 femminile::FIGC-LND — Serie A',
    'Calcio a 5 femminile::FIGC-LND — Serie B',
    'Calcio a 5 femminile::FIGC-LND — Serie C / Campionato regionale',
    'Calcio a 5 femminile::FIGC-LND — Serie D',
    'Calcio a 5 femminile::Altra categoria'
  ), false);
$$;

-- Map only explicit equivalents. Unknown and youth categories become empty;
-- existing test profiles remain readable and must be completed before saving/publishing.
with mapping(old_value, new_value) as (values
  ('Calcio 11 (Maschile)::Serie C', 'Calcio a 11 maschile::FIGC — Serie C'),
  ('Calcio 11 (Maschile)::Serie D', 'Calcio a 11 maschile::FIGC-LND — Serie D'),
  ('Calcio 11 (Maschile)::Eccellenza', 'Calcio a 11 maschile::FIGC-LND — Eccellenza'),
  ('Calcio 11 (Maschile)::Promozione', 'Calcio a 11 maschile::FIGC-LND — Promozione'),
  ('Calcio 11 (Maschile)::Prima Categoria', 'Calcio a 11 maschile::FIGC-LND — Prima Categoria'),
  ('Calcio 11 (Maschile)::Seconda Categoria', 'Calcio a 11 maschile::FIGC-LND — Seconda Categoria'),
  ('Calcio 11 (Maschile)::Terza Categoria', 'Calcio a 11 maschile::FIGC-LND — Terza Categoria'),
  ('Calcio 7 (Maschile)::Open Eccellenza', 'Calcio a 7 maschile::CSI — Open Eccellenza'),
  ('Calcio 7 (Maschile)::Open Serie A', 'Calcio a 7 maschile::CSI — Open Serie A'),
  ('Calcio 7 (Maschile)::Open Serie B', 'Calcio a 7 maschile::CSI — Open Serie B'),
  ('Calcio 7 (Maschile)::Open A', 'Calcio a 7 maschile::CSI — Open A'),
  ('Calcio 7 (Maschile)::Open B', 'Calcio a 7 maschile::CSI — Open B'),
  ('Calcio 7 (Maschile)::Open C', 'Calcio a 7 maschile::CSI — Open C'),
  ('Calcio 5 (Maschile)::Serie A', 'Calcio a 5 maschile::FIGC-LND — Serie A'),
  ('Calcio 5 (Maschile)::Serie A2 Élite', 'Calcio a 5 maschile::FIGC-LND — Serie A2 Élite'),
  ('Calcio 5 (Maschile)::Serie A2', 'Calcio a 5 maschile::FIGC-LND — Serie A2'),
  ('Calcio 5 (Maschile)::Serie B', 'Calcio a 5 maschile::FIGC-LND — Serie B'),
  ('Calcio 5 (Maschile)::Serie C1', 'Calcio a 5 maschile::FIGC-LND — Serie C1'),
  ('Calcio 5 (Maschile)::Serie C2', 'Calcio a 5 maschile::FIGC-LND — Serie C2'),
  ('Calcio 5 (Maschile)::Serie D', 'Calcio a 5 maschile::FIGC-LND — Serie D'),
  ('Calcio 11 (Femminile)::Serie A Femminile', 'Calcio a 11 femminile::FIGC — Serie A Women'),
  ('Calcio 11 (Femminile)::Serie B Femminile', 'Calcio a 11 femminile::FIGC — Serie B'),
  ('Calcio 11 (Femminile)::Serie C Femminile', 'Calcio a 11 femminile::FIGC-LND — Serie C'),
  ('Calcio 11 (Femminile)::Eccellenza Femminile', 'Calcio a 11 femminile::FIGC-LND — Eccellenza'),
  ('Calcio 7 (Femminile)::Open Eccellenza', 'Calcio a 7 femminile::CSI — Open Eccellenza'),
  ('Calcio 5 (Femminile)::Serie A', 'Calcio a 5 femminile::FIGC-LND — Serie A'),
  ('Calcio 5 (Femminile)::Serie B', 'Calcio a 5 femminile::FIGC-LND — Serie B'),
  ('Calcio 5 (Femminile)::Serie C', 'Calcio a 5 femminile::FIGC-LND — Serie C / Campionato regionale'),
  ('Calcio 5 (Femminile)::Serie D', 'Calcio a 5 femminile::FIGC-LND — Serie D'),
  ('Serie C', 'Calcio a 11 maschile::FIGC — Serie C'),
  ('Serie D', 'Calcio a 11 maschile::FIGC-LND — Serie D'),
  ('Eccellenza', 'Calcio a 11 maschile::FIGC-LND — Eccellenza'),
  ('Promozione', 'Calcio a 11 maschile::FIGC-LND — Promozione'),
  ('Prima Categoria', 'Calcio a 11 maschile::FIGC-LND — Prima Categoria'),
  ('Seconda Categoria', 'Calcio a 11 maschile::FIGC-LND — Seconda Categoria'),
  ('Terza Categoria', 'Calcio a 11 maschile::FIGC-LND — Terza Categoria'),
  ('Open A', 'Calcio a 7 maschile::CSI — Open A'),
  ('Open B', 'Calcio a 7 maschile::CSI — Open B'),
  ('Open C', 'Calcio a 7 maschile::CSI — Open C'),
  ('Serie A2 Élite', 'Calcio a 5 maschile::FIGC-LND — Serie A2 Élite'),
  ('Serie A2', 'Calcio a 5 maschile::FIGC-LND — Serie A2'),
  ('Serie C1', 'Calcio a 5 maschile::FIGC-LND — Serie C1'),
  ('Serie C2', 'Calcio a 5 maschile::FIGC-LND — Serie C2'),
  ('Serie A Femminile', 'Calcio a 11 femminile::FIGC — Serie A Women'),
  ('Serie B Femminile', 'Calcio a 11 femminile::FIGC — Serie B'),
  ('Serie C Femminile', 'Calcio a 11 femminile::FIGC-LND — Serie C'),
  ('Eccellenza Femminile', 'Calcio a 11 femminile::FIGC-LND — Eccellenza'),
  ('Calcio 11 (Maschile)::Serie A', 'Calcio a 11 maschile::FIGC — Serie A'),
  ('Calcio 11 (Maschile)::Serie B', 'Calcio a 11 maschile::FIGC — Serie B'),
  ('Calcio 11 (Femminile)::Serie A', 'Calcio a 11 femminile::FIGC — Serie A Women'),
  ('Calcio 11 (Femminile)::Serie B', 'Calcio a 11 femminile::FIGC — Serie B')
)
update public.profilo_squadra as team
set categoria_attuale = case
  when private.team_category_is_valid_v1(team.categoria_attuale) then team.categoria_attuale
  else (select new_value from mapping where old_value = team.categoria_attuale)
end;

-- Check new requirements after all profile sidecars have been persisted.
-- Do not check category during the core's initial anonymous-profile INSERT:
-- its category is written later, inside the same publication transaction.
create or replace function private.assert_updated_profile_fields_v1(p_profile_id uuid, p_profile_type text)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_name text;
  v_email text;
  v_phone text;
  v_category text;
begin
  if p_profile_type = 'squadra' then
    select categoria_attuale into v_category from public.profilo_squadra
    where uuid_profilo = p_profile_id and nascosto = false;
    if not found or not private.team_category_is_valid_v1(v_category) then
      raise exception using errcode = '22023', message = 'TEAM_FIRST_TEAM_CATEGORY_REQUIRED';
    end if;
    return;
  elsif p_profile_type = 'servizi-consulenze' then
    select nome, contatto_email, contatto_telefono into v_name, v_email, v_phone
    from public.profilo_servizi_consulenze where uuid_profilo = p_profile_id and nascosto = false;
    if not found or nullif(pg_catalog.btrim(v_name), '') is null then
      raise exception using errcode = '22023', message = 'PROFESSIONAL_NAME_REQUIRED';
    end if;
    if nullif(pg_catalog.btrim(v_email), '') is null and nullif(pg_catalog.btrim(v_phone), '') is null then
      raise exception using errcode = '22023', message = 'PROFESSIONAL_CONTACT_REQUIRED';
    end if;
  elsif p_profile_type = 'creators' then
    select contatto_email into v_email from public.profilo_creator
    where uuid_profilo = p_profile_id and nascosto = false;
  else
    return;
  end if;
  if nullif(pg_catalog.btrim(v_email), '') is not null and (
    pg_catalog.char_length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ) then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_EMAIL';
  end if;
  if nullif(pg_catalog.btrim(v_phone), '') is not null and (
    pg_catalog.char_length(v_phone) > 40 or v_phone !~ '^[+0-9().[:space:]-]+$'
    or pg_catalog.char_length(pg_catalog.regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 6 and 20
  ) then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_PHONE';
  end if;
end;
$$;

create or replace function private.save_profile_business_fields_v1(p_profile_id uuid, p_profile_type text, p_draft jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if p_profile_type not in ('servizi-consulenze', 'creators') then return; end if;
  if p_draft is null or pg_catalog.jsonb_typeof(p_draft) <> 'object'
    or (p_draft ? 'contatto_email' and pg_catalog.jsonb_typeof(p_draft -> 'contatto_email') not in ('string', 'null'))
    or (p_profile_type = 'servizi-consulenze' and (
      (p_draft ? 'contatto_telefono' and pg_catalog.jsonb_typeof(p_draft -> 'contatto_telefono') not in ('string', 'null'))
      or (p_draft ? 'sede_professionista' and pg_catalog.jsonb_typeof(p_draft -> 'sede_professionista') not in ('string', 'null'))
      or pg_catalog.char_length(coalesce(p_draft ->> 'sede_professionista', '')) > 160
      or not private.publish_text_is_valid(p_draft ->> 'nome', true, 160)
    )) then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE_PAYLOAD';
  end if;
  if p_profile_type = 'servizi-consulenze' then
    update public.profilo_servizi_consulenze
    set nome = nullif(pg_catalog.btrim(p_draft ->> 'nome'), ''), cognome = null,
        anno_nascita = null, mese_nascita = null, giorno_nascita = null, automunito = null,
        figure_professionali = '{}'::text[], lista_esperienze = '[]'::jsonb,
        qualifiche_licenze = '[]'::jsonb, storico_esperienze = '[]'::jsonb,
        sede_professionista = nullif(pg_catalog.btrim(p_draft ->> 'sede_professionista'), ''),
        contatto_email = pg_catalog.lower(nullif(pg_catalog.btrim(p_draft ->> 'contatto_email'), '')),
        contatto_telefono = nullif(pg_catalog.btrim(p_draft ->> 'contatto_telefono'), '')
    where uuid_profilo = p_profile_id;
  else
    update public.profilo_creator
    set contatto_email = pg_catalog.lower(nullif(pg_catalog.btrim(p_draft ->> 'contatto_email'), ''))
    where uuid_profilo = p_profile_id;
  end if;
  if not found then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;
  perform private.assert_updated_profile_fields_v1(p_profile_id, p_profile_type);
end;
$$;

create or replace function private.save_team_step05_fields_v1(p_profile_id uuid, p_draft jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if p_draft is null or pg_catalog.jsonb_typeof(p_draft) <> 'object'
    or pg_catalog.jsonb_typeof(p_draft -> 'tipologie_sport') is distinct from 'array' then
    raise exception using errcode = '22023', message = 'INVALID_TEAM_PROFILE';
  end if;
  if pg_catalog.jsonb_array_length(p_draft -> 'tipologie_sport') <> 1
    or nullif(pg_catalog.btrim(p_draft -> 'tipologie_sport' ->> 0), '') is null
    or not private.team_category_is_valid_v1(p_draft ->> 'categoria_attuale') then
    raise exception using errcode = '22023', message = 'TEAM_FIRST_TEAM_CATEGORY_REQUIRED';
  end if;
  update public.profilo_squadra set categoria_attuale = p_draft ->> 'categoria_attuale' where uuid_profilo = p_profile_id;
  if not found then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;
end;
$$;

create or replace function private.finalize_updated_profile_fields_v1(p_result jsonb, p_payload jsonb)
returns void language plpgsql security invoker set search_path = ''
as $$
declare v_profile_id uuid;
begin
  if p_result ->> 'status' is distinct from 'success'
    or coalesce((p_result ->> 'idempotent')::boolean, false) then return; end if;
  select autore_annuncio into v_profile_id from public.annuncio where uuid = (p_result ->> 'announcementId')::uuid;
  if v_profile_id is null then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_FOUND'; end if;
  perform private.assert_updated_profile_fields_v1(v_profile_id, p_payload ->> 'profile_type');
end;
$$;

-- Extend the current installed functions, retaining all earlier identity,
-- access, location, idempotency and profile-snapshot changes.
do $migration$
declare
  v_definition text;
  v_old text;
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.save_owned_subprofile_internal_v1(uuid,text,jsonb,jsonb)')) into v_definition;
  v_old := $$elsif p_profile_type in ('arbitro', 'servizi-consulenze') then$$;
  if v_definition is null or pg_catalog.strpos(v_definition, v_old) = 0 then
    raise exception 'Business profile writer insertion point not found';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, $$elsif p_profile_type = 'arbitro' then$$);
  v_old := '  return v_result;';
  if pg_catalog.strpos(v_definition, v_old) = 0 then raise exception 'Business profile sidecar insertion point not found'; end if;
  execute pg_catalog.replace(v_definition, v_old,
    '  perform private.save_profile_business_fields_v1(v_profile_id, p_profile_type, p_draft);' || chr(10) || v_old);

  -- The core accepts an existing professional profile; new mandatory contacts
  -- are checked after profile_update, allowing incomplete test profiles to be completed atomically.
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.publish_announcement_core_v1(uuid,jsonb,text,text)')) into v_definition;
  v_old := $$perform 1 from public.profilo_servizi_consulenze
      where uuid_profilo = v_profile_id and nascosto = false
        and nullif(pg_catalog.btrim(nome), '') is not null
        and coalesce(pg_catalog.cardinality(figure_professionali), 0) > 0$$;
  if v_definition is null or pg_catalog.strpos(v_definition, v_old) = 0 then
    raise exception 'Professional publication guard insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_old, $$perform 1 from public.profilo_servizi_consulenze
      where uuid_profilo = v_profile_id and nascosto = false$$);

  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.publish_announcement_v2(uuid,jsonb,text,text,text)')) into v_definition;
  v_old := $$elsif v_profile_type in ('arbitro', 'servizi-consulenze') then$$;
  if v_definition is null or pg_catalog.strpos(v_definition, v_old) = 0 then
    raise exception 'Business profile publication sidecar insertion point not found';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old,
    $$elsif v_profile_type in ('servizi-consulenze', 'creators') then
    perform private.save_profile_business_fields_v1(v_profile_id, v_profile_type, v_draft);
  elsif v_profile_type = 'arbitro' then$$);
  v_old := '  return v_result;';
  if v_definition is null or pg_catalog.strpos(v_definition, v_old) = 0 then
    raise exception 'Updated profile publication finalizer insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_old,
    '  perform private.finalize_updated_profile_fields_v1(v_result, p_payload);' || chr(10) || v_old);
end;
$migration$;

revoke all on function private.team_category_is_valid_v1(text) from public, anon, authenticated, service_role;
revoke all on function private.assert_updated_profile_fields_v1(uuid, text) from public, anon, authenticated, service_role;
revoke all on function private.save_profile_business_fields_v1(uuid, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function private.finalize_updated_profile_fields_v1(jsonb, jsonb) from public, anon, authenticated, service_role;
grant execute on function private.team_category_is_valid_v1(text) to service_role;
grant execute on function private.assert_updated_profile_fields_v1(uuid, text) to service_role;
grant execute on function private.save_profile_business_fields_v1(uuid, text, jsonb) to service_role;
grant execute on function private.finalize_updated_profile_fields_v1(jsonb, jsonb) to service_role;

notify pgrst, 'reload schema';
commit;

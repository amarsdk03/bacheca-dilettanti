begin;
set local lock_timeout = '10s';

create function private.professional_regions_are_valid_v1(p_regions text[])
returns boolean language sql immutable security invoker set search_path = ''
as $$
  select case when coalesce(pg_catalog.array_ndims(p_regions), 1) <> 1 then false
  else coalesce(
    p_regions is not null
    and pg_catalog.cardinality(p_regions) <= 20
    and pg_catalog.array_position(p_regions, null) is null
    and p_regions <@ array[
      'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
      'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
      'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
      'Trentino-Alto Adige', 'Umbria', 'Valle d''Aosta', 'Veneto'
    ]::text[]
    and pg_catalog.cardinality(p_regions) = (
      select count(distinct region) from pg_catalog.unnest(p_regions) as selected(region)
    ), false
  ) end;
$$;

alter table public.restricted_profile_access
  add column allowed_regions text[] not null default '{}'::text[],
  add constraint restricted_profile_allowed_regions_valid
    check (private.professional_regions_are_valid_v1(allowed_regions)),
  add constraint restricted_profile_regions_scope
    check (profile_type = 'servizi-consulenze' or pg_catalog.cardinality(allowed_regions) = 0);

-- Authorizations stay server-only; never grant clients permission to edit them.
alter table public.restricted_profile_access enable row level security;
revoke all on public.restricted_profile_access from public, anon, authenticated;
grant select, insert, update, delete on public.restricted_profile_access to service_role;

create function private.lock_professional_regions_v1(p_profile_id uuid)
returns text[] language plpgsql security invoker set search_path = ''
as $$
declare
  v_regions text[];
begin
  -- Hold the grant until the whole profile/publication transaction finishes.
  -- A concurrent revocation either runs first, or prunes the committed locations.
  select access.allowed_regions into v_regions
  from public.restricted_profile_access as access
  where access.profile_id = p_profile_id and access.profile_type = 'servizi-consulenze'
  for share;
  if not found then
    raise exception using errcode = '42501', message = 'PROFILE_ACCESS_DENIED';
  end if;
  if pg_catalog.cardinality(v_regions) = 0 then
    raise exception using errcode = '22023', message = 'PROFESSIONAL_REGIONS_REQUIRED';
  end if;
  return v_regions;
end;
$$;

create function private.assert_professional_profile_regions_v1(p_profile_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$
declare
  v_regions text[] := private.lock_professional_regions_v1(p_profile_id);
begin
  if not exists (
    select 1 from public.localita_profilo
    where uuid_profilo = p_profile_id and sottoprofilo = 'servizi-consulenze'
  ) or exists (
    select 1 from public.localita_profilo
    where uuid_profilo = p_profile_id and sottoprofilo = 'servizi-consulenze'
      and not (regione = any(v_regions))
  ) then
    raise exception using errcode = '22023', message = 'PROFESSIONAL_PROFILE_AREA_NOT_ALLOWED';
  end if;
end;
$$;

create function private.guard_professional_location_v1()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_type text;
  v_regions text[];
begin
  if tg_table_name = 'localita_profilo' then
    if new.sottoprofilo is distinct from 'servizi-consulenze' then return new; end if;
    v_profile_id := new.uuid_profilo;
  else
    select autore_annuncio, tipologia_annuncio into v_profile_id, v_type
    from public.annuncio where uuid = new.uuid_annuncio;
    if v_type is distinct from 'annuncio_servizi_consulenze' then return new; end if;
  end if;
  v_regions := private.lock_professional_regions_v1(v_profile_id);
  if not (new.regione = any(v_regions)) then
    raise exception using errcode = '22023', message = case tg_table_name
      when 'localita_profilo' then 'PROFESSIONAL_PROFILE_AREA_NOT_ALLOWED'
      else 'PROFESSIONAL_ANNOUNCEMENT_AREA_NOT_ALLOWED'
    end;
  end if;
  return new;
end;
$$;

create trigger guard_professional_profile_location
  before insert or update on public.localita_profilo
  for each row execute function private.guard_professional_location_v1();
create trigger guard_professional_announcement_location
  before insert or update on public.localita_annuncio
  for each row execute function private.guard_professional_location_v1();

create function private.prune_revoked_professional_regions_v1()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if new.profile_type = 'servizi-consulenze' then
    delete from public.localita_profilo
    where uuid_profilo = new.profile_id and sottoprofilo = 'servizi-consulenze'
      and not (regione = any(new.allowed_regions));
    delete from public.localita_annuncio as location
    using public.annuncio as announcement
    where location.uuid_annuncio = announcement.uuid
      and announcement.autore_annuncio = new.profile_id
      and announcement.tipologia_annuncio = 'annuncio_servizi_consulenze'
      and not (location.regione = any(new.allowed_regions));
  end if;
  return new;
end;
$$;

create trigger prune_revoked_professional_regions
  after insert or update of allowed_regions on public.restricted_profile_access
  for each row execute function private.prune_revoked_professional_regions_v1();

-- The future admin dashboard uses one atomic call and must select >= 1 region.
-- An empty list remains valid in the table for pending access / full suspension.
create function public.admin_configure_professional_access_v1(
  p_profile_id uuid,
  p_allowed_regions text[]
)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  if not private.professional_regions_are_valid_v1(p_allowed_regions)
    or pg_catalog.cardinality(p_allowed_regions) = 0 then
    raise exception using errcode = '22023', message = 'INVALID_PROFESSIONAL_REGIONS';
  end if;
  perform 1 from public.profilo where uuid = p_profile_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'BASE_PROFILE_NOT_FOUND';
  end if;
  insert into public.restricted_profile_access (profile_id, profile_type, allowed_regions)
  values (p_profile_id, 'servizi-consulenze', p_allowed_regions)
  on conflict (profile_id, profile_type) do update set allowed_regions = excluded.allowed_regions;
end;
$$;

do $patch$
declare
  v_definition text;
  v_old text;
  v_new text;
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(
    'private.save_owned_subprofile_internal_v1(uuid,text,jsonb,jsonb)'
  )) into v_definition;
  v_old := '  return v_result;';
  if v_definition is null or pg_catalog.strpos(v_definition, v_old) = 0 then
    raise exception 'Professional profile region guard insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_old,
    '  if p_profile_type = ''servizi-consulenze'' then' || chr(10) ||
    '    perform private.assert_professional_profile_regions_v1(v_profile_id);' || chr(10) ||
    '  end if;' || chr(10) || v_old);

  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure(
    'private.finalize_announcement_fields_v1(jsonb,jsonb)'
  )) into v_definition;
  v_old := $$select 1 from public.localita_profilo as area
          where area.uuid_profilo = announcement.autore_annuncio
            and area.sottoprofilo = 'servizi-consulenze' and area.regione = location.regione$$;
  v_new := $$select 1 from public.restricted_profile_access as access
          where access.profile_id = announcement.autore_annuncio
            and access.profile_type = 'servizi-consulenze'
            and location.regione = any(access.allowed_regions)$$;
  if v_definition is null or pg_catalog.strpos(v_definition, v_old) = 0 then
    raise exception 'Professional publication region guard insertion point not found';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_old, v_new);
  v_old := $$  elsif v_type = 'annuncio_servizi_consulenze' then$$;
  if pg_catalog.strpos(v_definition, v_old) = 0 then
    raise exception 'Professional publication profile guard insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_old, v_old || chr(10) ||
    '    perform private.assert_professional_profile_regions_v1(' || chr(10) ||
    '      (select autore_annuncio from public.annuncio where uuid = v_id)' || chr(10) ||
    '    );');
end;
$patch$;

-- Do not infer admin entitlements from existing user selections. Reconcile the
-- test data against the new empty grants; content rows themselves are retained.
delete from public.localita_profilo as location
where location.sottoprofilo = 'servizi-consulenze' and not exists (
  select 1 from public.restricted_profile_access as access
  where access.profile_id = location.uuid_profilo and access.profile_type = 'servizi-consulenze'
    and location.regione = any(access.allowed_regions)
);
delete from public.localita_annuncio as location
using public.annuncio as announcement
where location.uuid_annuncio = announcement.uuid
  and announcement.tipologia_annuncio = 'annuncio_servizi_consulenze'
  and not exists (
    select 1 from public.restricted_profile_access as access
    where access.profile_id = announcement.autore_annuncio and access.profile_type = 'servizi-consulenze'
      and location.regione = any(access.allowed_regions)
  );

revoke all on function private.professional_regions_are_valid_v1(text[]) from public, anon, authenticated;
revoke all on function private.lock_professional_regions_v1(uuid) from public, anon, authenticated;
revoke all on function private.assert_professional_profile_regions_v1(uuid) from public, anon, authenticated;
revoke all on function private.guard_professional_location_v1() from public, anon, authenticated;
revoke all on function private.prune_revoked_professional_regions_v1() from public, anon, authenticated;
revoke all on function public.admin_configure_professional_access_v1(uuid,text[]) from public, anon, authenticated;
grant execute on function private.professional_regions_are_valid_v1(text[]) to service_role;
grant execute on function private.lock_professional_regions_v1(uuid) to service_role;
grant execute on function private.assert_professional_profile_regions_v1(uuid) to service_role;
grant execute on function private.guard_professional_location_v1() to service_role;
grant execute on function private.prune_revoked_professional_regions_v1() to service_role;
grant execute on function public.admin_configure_professional_access_v1(uuid,text[]) to service_role;

notify pgrst, 'reload schema';
commit;

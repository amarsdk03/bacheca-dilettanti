begin;

set local lock_timeout = '10s';

-- The external admin dashboard will use a server-side service-role client to
-- grant access. This table is deliberately unreadable to browser roles.
create table public.restricted_profile_access (
  profile_id uuid not null references public.profilo(uuid) on delete cascade,
  profile_type text not null check (profile_type in ('servizi-consulenze', 'creators')),
  enabled_at timestamptz not null default now(),
  primary key (profile_id, profile_type)
);
alter table public.restricted_profile_access enable row level security;
revoke all on table public.restricted_profile_access from public, anon, authenticated;
grant select, insert, update, delete on table public.restricted_profile_access to service_role;

-- Preserve access for registered owners of existing special subprofiles.
insert into public.restricted_profile_access (profile_id, profile_type)
select base.uuid, 'servizi-consulenze'
from public.profilo as base
join public.utente as owner on owner.utente_uuid = base.uuid_utente
join public.profilo_servizi_consulenze as detail on detail.uuid_profilo = base.uuid
where owner.registrato_il is not null
on conflict do nothing;

insert into public.restricted_profile_access (profile_id, profile_type)
select base.uuid, 'creators'
from public.profilo as base
join public.utente as owner on owner.utente_uuid = base.uuid_utente
join public.profilo_creator as detail on detail.uuid_profilo = base.uuid
where owner.registrato_il is not null
on conflict do nothing;

create function private.assert_restricted_profile_access_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_type text;
begin
  if tg_table_name = 'restricted_profile_access' then
    v_profile_id := new.profile_id;
    v_type := new.profile_type;
  elsif tg_table_name = 'profilo_servizi_consulenze' then
    v_profile_id := new.uuid_profilo;
    v_type := 'servizi-consulenze';
  elsif tg_table_name = 'profilo_creator' then
    v_profile_id := new.uuid_profilo;
    v_type := 'creators';
  else
    select author.autore_annuncio into v_profile_id
    from public.annuncio as author
    where author.uuid = new.uuid_annuncio;
    v_type := case tg_table_name
      when 'annuncio_servizi_consulenze' then 'servizi-consulenze'
      when 'annuncio_creator' then 'creators'
    end;
  end if;

  if v_profile_id is null or v_type is null then
    raise exception using errcode = '42501', message = 'PROFILE_ACCESS_DENIED';
  end if;
  if not exists (
    select 1 from public.profilo as base
    join public.utente as owner on owner.utente_uuid = base.uuid_utente
    where base.uuid = v_profile_id and owner.registrato_il is not null
  ) then
    raise exception using errcode = '42501', message = 'PROFILE_ACCESS_DENIED';
  end if;
  if tg_table_name <> 'restricted_profile_access' and not exists (
    select 1 from public.restricted_profile_access as access
    where access.profile_id = v_profile_id and access.profile_type = v_type
  ) then
    raise exception using errcode = '42501', message = 'PROFILE_ACCESS_DENIED';
  end if;
  return new;
end;
$$;

revoke all on function private.assert_restricted_profile_access_v1() from public, anon, authenticated;

create trigger restricted_access_grant_guard
  before insert or update on public.restricted_profile_access
  for each row execute function private.assert_restricted_profile_access_v1();
create trigger restricted_service_profile_guard
  before insert on public.profilo_servizi_consulenze
  for each row execute function private.assert_restricted_profile_access_v1();
create trigger restricted_creator_profile_guard
  before insert on public.profilo_creator
  for each row execute function private.assert_restricted_profile_access_v1();
create trigger restricted_service_announcement_guard
  before insert on public.annuncio_servizi_consulenze
  for each row execute function private.assert_restricted_profile_access_v1();
create trigger restricted_creator_announcement_guard
  before insert on public.annuncio_creator
  for each row execute function private.assert_restricted_profile_access_v1();

-- A pending registration cannot turn the admin-only categories into a normal
-- self-service selection, even if an old or handcrafted client submits them.
create function private.reject_restricted_registration_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.payload ->> 'primaryProfileType' in ('servizi-consulenze', 'creators')
    or (case when pg_catalog.jsonb_typeof(new.payload -> 'selectedProfileTypes') = 'array'
      then exists (select 1 from pg_catalog.jsonb_array_elements_text(new.payload -> 'selectedProfileTypes') as item(value)
        where item.value in ('servizi-consulenze', 'creators')) else false end)
    or (case when pg_catalog.jsonb_typeof(new.payload -> 'profiles') = 'array'
      then exists (select 1 from pg_catalog.jsonb_array_elements(new.payload -> 'profiles') as item(value)
        where item.value ->> 'type' in ('servizi-consulenze', 'creators')) else false end) then
    raise exception using errcode = '42501', message = 'PROFILE_TYPE_RESTRICTED';
  end if;
  return new;
end;
$$;
revoke all on function private.reject_restricted_registration_v1() from public, anon, authenticated;
delete from private.registration_intent
where payload ->> 'primaryProfileType' in ('servizi-consulenze', 'creators')
  or (case when pg_catalog.jsonb_typeof(payload -> 'selectedProfileTypes') = 'array'
    then (payload -> 'selectedProfileTypes') ?| array['servizi-consulenze', 'creators'] else false end)
  or (case when pg_catalog.jsonb_typeof(payload -> 'profiles') = 'array'
    then exists (select 1 from pg_catalog.jsonb_array_elements(payload -> 'profiles') as item(value)
      where item.value ->> 'type' in ('servizi-consulenze', 'creators')) else false end);
create trigger reject_restricted_registration
  before insert or update on private.registration_intent
  for each row execute function private.reject_restricted_registration_v1();

-- The existing writer counts all eight categories. Keep the five-slot limit
-- for ordinary categories, while allowing either special category in addition.
do $patch_profile_count$
declare
  v_definition text;
  v_previous text;
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.save_owned_subprofile_core_v1(uuid,text,jsonb,jsonb)')) into v_definition;
  if v_definition is null then raise exception 'Missing subprofile writer'; end if;
  v_previous := v_definition;
  v_definition := pg_catalog.regexp_replace(v_definition,
    $pattern$if[[:space:]]+v_profile_count[[:space:]]*>=[[:space:]]*5[[:space:]]+then$pattern$,
    $replacement$if p_profile_type not in ('servizi-consulenze', 'creators')
      and v_profile_count
        - (select count(*) from public.profilo_servizi_consulenze where uuid_profilo = v_profile_id)
        - (select count(*) from public.profilo_creator where uuid_profilo = v_profile_id) >= 5 then$replacement$,
    'i');
  if v_definition is not distinct from v_previous then raise exception 'Subprofile count insertion point not found'; end if;
  execute v_definition;
end;
$patch_profile_count$;

-- Deleting a special profile revokes its grant in the same transaction.
-- An account must retain at least one ordinary subprofile.
create or replace function public.delete_owned_subprofile(p_user_id uuid, p_profile_type text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_internal_user_id uuid;
  v_profile_id uuid;
  v_ordinary_count integer;
  v_next_primary text;
begin
  v_internal_user_id := private.registered_internal_user_id(p_user_id);
  select base.uuid into v_profile_id from public.profilo as base
  where base.uuid_utente = v_internal_user_id for update;
  if v_profile_id is null then raise exception using errcode = 'P0001', message = 'BASE_PROFILE_NOT_FOUND'; end if;

  if p_profile_type not in ('servizi-consulenze', 'creators') then
    select
      (select count(*) from public.profilo_giocatore where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_squadra where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_staff_sportivo where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_arbitro where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_torneo_evento where uuid_profilo = v_profile_id)
      + (select count(*) from public.profilo_campi_impianti where uuid_profilo = v_profile_id)
    into v_ordinary_count;
    if v_ordinary_count <= 1 then raise exception using errcode = 'P0001', message = 'LAST_PROFILE_REQUIRED'; end if;
  end if;

  v_next_primary := private.delete_owned_subprofile_internal_v1(v_internal_user_id, p_profile_type);
  if p_profile_type in ('servizi-consulenze', 'creators') then
    delete from public.restricted_profile_access
    where profile_id = v_profile_id and profile_type = p_profile_type;
  end if;
  return v_next_primary;
end;
$$;
revoke all on function public.delete_owned_subprofile(uuid,text) from public, anon, authenticated;
grant execute on function public.delete_owned_subprofile(uuid,text) to service_role;

-- Stable server-side contract for the separate admin dashboard. Disabling
-- removes the live subprofile, but deliberately leaves published ads intact.
create function public.admin_set_restricted_profile_access_v1(
  p_profile_id uuid,
  p_profile_type text,
  p_enabled boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_internal_user_id uuid;
  v_exists boolean;
begin
  if p_profile_type not in ('servizi-consulenze', 'creators') or p_enabled is null then
    raise exception using errcode = '22023', message = 'INVALID_RESTRICTED_PROFILE_ACCESS';
  end if;
  select base.uuid_utente into v_internal_user_id
  from public.profilo as base
  where base.uuid = p_profile_id
  for update;
  if v_internal_user_id is null then raise exception using errcode = 'P0001', message = 'BASE_PROFILE_NOT_FOUND'; end if;

  if p_enabled then
    insert into public.restricted_profile_access (profile_id, profile_type)
    values (p_profile_id, p_profile_type)
    on conflict do nothing;
  else
    v_exists := case p_profile_type
      when 'servizi-consulenze' then exists(select 1 from public.profilo_servizi_consulenze where uuid_profilo = p_profile_id)
      when 'creators' then exists(select 1 from public.profilo_creator where uuid_profilo = p_profile_id)
    end;
    if v_exists then
      perform private.delete_owned_subprofile_internal_v1(v_internal_user_id, p_profile_type);
    end if;
    delete from public.restricted_profile_access
    where profile_id = p_profile_id and profile_type = p_profile_type;
  end if;
end;
$$;
revoke all on function public.admin_set_restricted_profile_access_v1(uuid,text,boolean)
  from public, anon, authenticated;
grant execute on function public.admin_set_restricted_profile_access_v1(uuid,text,boolean)
  to service_role;

-- Complete the existing announcement core's service branch. Creator support
-- was added earlier; the old service form was never connected to this core.
do $patch_service_publication$
declare
  v_definition text;
  v_previous text;
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.publish_announcement_core_v1(uuid,jsonb,text,text)')) into v_definition;
  if v_definition is null then raise exception 'Missing publication core'; end if;

  v_previous := v_definition;
  v_definition := pg_catalog.regexp_replace(v_definition,
    $pattern$'creators'[[:space:]]*\)[[:space:]]+then$pattern$,
    $replacement$'creators', 'servizi-consulenze') then$replacement$);
  if v_definition is not distinct from v_previous then raise exception 'Service publication type insertion point not found'; end if;

  v_previous := v_definition;
  v_definition := pg_catalog.regexp_replace(v_definition,
    $pattern$or[[:space:]]+\(v_profile_type[[:space:]]*=[[:space:]]*'creators'[[:space:]]+and[[:space:]]+v_announcement_type[[:space:]]*=[[:space:]]*'annuncio_creators'\)$pattern$,
    $replacement$or (v_profile_type = 'creators' and v_announcement_type = 'annuncio_creators')
    or (v_profile_type = 'servizi-consulenze' and v_announcement_type = 'annuncio_servizi_consulenze')$replacement$);
  if v_definition is not distinct from v_previous then raise exception 'Service announcement mapping insertion point not found'; end if;

  v_previous := v_definition;
  v_definition := pg_catalog.regexp_replace(v_definition,
    $pattern$when 'annuncio_creators' then[[:space:]]+not private\.publish_text_is_valid$pattern$,
    $replacement$when 'annuncio_servizi_consulenze' then
      not case when pg_catalog.jsonb_typeof(v_detail -> 'figura_professionale') = 'array'
        then pg_catalog.jsonb_array_length(v_detail -> 'figura_professionale') > 0
        else false end
      or not private.publish_text_array_is_valid(v_detail -> 'figura_professionale')
      or not private.publish_text_is_valid(v_detail ->> 'specializzazione', false, 160)
      or not private.publish_text_is_valid(v_detail ->> 'presentazione_servizi', true, 5000)
      or not private.publish_text_is_valid(v_detail ->> 'descrizione_aggiuntiva', false, 5000)
      or not private.publish_text_array_is_valid(coalesce(v_detail -> 'tipologie_sport', '[]'::jsonb))
    when 'annuncio_creators' then
      not private.publish_text_is_valid$replacement$);
  if v_definition is not distinct from v_previous then raise exception 'Service detail validation insertion point not found'; end if;

  v_previous := v_definition;
  v_definition := pg_catalog.regexp_replace(v_definition,
    $pattern$when 'creators' then[[:space:]]+perform 1$pattern$,
    $replacement$when 'servizi-consulenze' then
      perform 1 from public.profilo_servizi_consulenze
      where uuid_profilo = v_profile_id and nascosto = false
        and nullif(pg_catalog.btrim(nome), '') is not null
        and coalesce(pg_catalog.cardinality(figure_professionali), 0) > 0
      for share;
      if not found then raise exception using errcode = 'P0001', message = 'PROFILE_NOT_ENABLED'; end if;
    when 'creators' then
      perform 1$replacement$);
  if v_definition is not distinct from v_previous then raise exception 'Service profile check insertion point not found'; end if;

  v_previous := v_definition;
  v_definition := pg_catalog.regexp_replace(v_definition,
    $pattern$when 'annuncio_creators' then[[:space:]]+insert into public\.annuncio_creator$pattern$,
    $replacement$when 'annuncio_servizi_consulenze' then
      insert into public.annuncio_servizi_consulenze (
        uuid_annuncio, figura_professionale, specializzazione,
        presentazione_servizi, tipologie_sport, descrizione_aggiuntiva
      ) values (
        v_announcement_id,
        array(select pg_catalog.jsonb_array_elements_text(v_detail -> 'figura_professionale')),
        v_detail ->> 'specializzazione',
        v_detail ->> 'presentazione_servizi',
        v_detail -> 'tipologie_sport',
        v_detail ->> 'descrizione_aggiuntiva'
      );
    when 'annuncio_creators' then
      insert into public.annuncio_creator$replacement$);
  if v_definition is not distinct from v_previous then raise exception 'Service announcement writer insertion point not found'; end if;
  execute v_definition;
end;
$patch_service_publication$;

revoke all on function public.publish_announcement_core_v1(uuid,jsonb,text,text) from public, anon, authenticated, service_role;
notify pgrst, 'reload schema';

commit;

begin;

-- JSON ->> returns text. Check a full calendar date before the typed INSERT.
create or replace function private.publish_iso_date_is_valid_v1(p_value text)
returns boolean
language plpgsql
stable
strict
security invoker
set search_path = ''
as $$
declare
  v_date date;
begin
  if p_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or pg_catalog.left(p_value, 4) = '0000' then
    return false;
  end if;

  begin
    v_date := p_value::date;
  exception when invalid_datetime_format or datetime_field_overflow then
    return false;
  end;

  return pg_catalog.to_char(v_date, 'YYYY-MM-DD') = p_value;
end;
$$;

revoke all on function private.publish_iso_date_is_valid_v1(text)
  from public, anon, authenticated, service_role;

-- Preserve the deployed core, including consent gates and later hotfixes.
do $migration$
declare
  v_definition text;
  v_change record;
  v_count integer;
begin
  if exists (
    select 1
    from (values
      ('annuncio_squadra_cerca_staff', 'periodo_dal', 'date'),
      ('annuncio_squadra_cerca_staff', 'periodo_al', 'date'),
      ('annuncio_squadra_cerca_partita', 'periodo_dal', 'date'),
      ('annuncio_squadra_cerca_partita', 'periodo_al', 'date')
    ) as expected(table_name, column_name, data_type)
    left join information_schema.columns as actual
      on actual.table_schema = 'public'
      and actual.table_name = expected.table_name
      and actual.column_name = expected.column_name
    where actual.data_type is distinct from expected.data_type
  ) then
    raise exception 'Unexpected publication date/time column types';
  end if;

  if exists (
    select 1
    from (values ('orario_dalle'), ('orario_alle')) as expected(column_name)
    left join information_schema.columns as actual
      on actual.table_schema = 'public'
      and actual.table_name = 'annuncio_squadra_cerca_partita'
      and actual.column_name = expected.column_name
    where actual.data_type is null
      or actual.data_type not in ('time without time zone', 'text', 'character varying')
  ) then
    raise exception 'Unexpected publication match-time column types';
  end if;

  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.publish_announcement_core_v1(uuid,jsonb,text,text)')
  ) into v_definition;
  if v_definition is null then
    raise exception 'Missing public.publish_announcement_core_v1(uuid,jsonb,text,text)';
  end if;

  for v_change in
    select * from (values
      (
        'pg_catalog.btrim(v_detail ->> ''periodo_dal'') !~ ''^[0-9]{4}-[0-9]{2}-[0-9]{2}$''',
        'not private.publish_iso_date_is_valid_v1(pg_catalog.btrim(v_detail ->> ''periodo_dal''))',
        2,
        null::text
      ),
      (
        'pg_catalog.btrim(v_detail ->> ''periodo_al'') !~ ''^[0-9]{4}-[0-9]{2}-[0-9]{2}$''',
        'not private.publish_iso_date_is_valid_v1(pg_catalog.btrim(v_detail ->> ''periodo_al''))',
        2,
        null::text
      ),
      (
        'nullif(pg_catalog.btrim(v_detail ->> ''periodo_dal''), ''''),',
        'nullif(pg_catalog.btrim(v_detail ->> ''periodo_dal''), '''')::date,',
        2,
        null::text
      ),
      (
        'nullif(pg_catalog.btrim(v_detail ->> ''periodo_al''), ''''),',
        'nullif(pg_catalog.btrim(v_detail ->> ''periodo_al''), '''')::date,',
        2,
        null::text
      ),
      (
        'nullif(pg_catalog.btrim(v_detail ->> ''orario_dalle''), ''''),',
        'nullif(pg_catalog.btrim(v_detail ->> ''orario_dalle''), '''')::time,',
        1,
        'orario_dalle'
      ),
      (
        'nullif(pg_catalog.btrim(v_detail ->> ''orario_alle''), ''''),',
        'nullif(pg_catalog.btrim(v_detail ->> ''orario_alle''), '''')::time,',
        1,
        'orario_alle'
      )
    ) as changes(old_text, new_text, expected_count, time_column)
    where changes.time_column is null or exists (
      select 1
      from information_schema.columns as actual
      where actual.table_schema = 'public'
        and actual.table_name = 'annuncio_squadra_cerca_partita'
        and actual.column_name = changes.time_column
        and actual.data_type = 'time without time zone'
    )
  loop
    v_count := (pg_catalog.length(v_definition) - pg_catalog.length(
      pg_catalog.replace(v_definition, v_change.old_text, '')
    )) / pg_catalog.length(v_change.old_text);
    if v_count <> v_change.expected_count then
      raise exception 'Unexpected publication core body for %: found %, expected %',
        v_change.old_text, v_count, v_change.expected_count;
    end if;
    v_definition := pg_catalog.replace(v_definition, v_change.old_text, v_change.new_text);
  end loop;

  execute v_definition;
end;
$migration$;

revoke all on function public.publish_announcement_core_v1(uuid, jsonb, text, text)
  from public, anon, authenticated, service_role;

-- The v1 wrapper updates the profile after the core creates its announcement.
-- Refresh only fields copied from that profile into the announcement snapshot.
create or replace function private.sync_published_profile_snapshot_v1(
  p_announcement_id uuid,
  p_profile_type text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  case p_profile_type
    when 'giocatore' then
      update public.annuncio_giocatore as detail
      set tipologie_sport = player.tipologie_sport,
        ruoli_principali = array(
          select pg_catalog.jsonb_array_elements_text(
            coalesce(player.ruoli_sport -> 'principali', '[]'::jsonb)
          )
        ),
        ruoli_secondari = array(
          select pg_catalog.jsonb_array_elements_text(
            coalesce(player.ruoli_sport -> 'specifici', '[]'::jsonb)
          )
        )
      from public.annuncio as announcement
      join public.profilo_giocatore as player
        on player.uuid_profilo = announcement.autore_annuncio
      where announcement.uuid = p_announcement_id
        and detail.uuid_annuncio = announcement.uuid;
    when 'squadra' then
      update public.annuncio_squadra_cerca_giocatore as detail
      set tipologie_sport = team.tipologie_sport
      from public.annuncio as announcement
      join public.profilo_squadra as team
        on team.uuid_profilo = announcement.autore_annuncio
      where announcement.uuid = p_announcement_id
        and detail.uuid_annuncio = announcement.uuid;
      -- The other three team announcement tables have no copied profile fields.
      return;
    when 'staff-sportivo' then
      update public.annuncio_staff_sportivo as detail
      set figure_professionali = staff.figure_professionali,
        lista_esperienze = staff.storico_esperienze,
        disponibilita_occupazione = staff.disponibilita
      from public.annuncio as announcement
      join public.profilo_staff_sportivo as staff
        on staff.uuid_profilo = announcement.autore_annuncio
      where announcement.uuid = p_announcement_id
        and detail.uuid_annuncio = announcement.uuid;
    when 'arbitro' then
      update public.annuncio_arbitro as detail
      set lista_esperienze = referee.storico_esperienze,
        disponibilita_occupazione = referee.disponibilita
      from public.annuncio as announcement
      join public.profilo_arbitro as referee
        on referee.uuid_profilo = announcement.autore_annuncio
      where announcement.uuid = p_announcement_id
        and detail.uuid_annuncio = announcement.uuid;
    else
      return;
  end case;

  if not found then
    raise exception using errcode = '55000', message = 'PUBLISH_PROFILE_SNAPSHOT_NOT_FOUND';
  end if;
end;
$$;

revoke all on function private.sync_published_profile_snapshot_v1(uuid, text)
  from public, anon, authenticated, service_role;

do $migration$
declare
  v_definition text;
  v_old constant text := '    perform private.save_player_categories_v2(';
  v_new constant text := '    perform private.sync_published_profile_snapshot_v1(v_announcement_id, v_profile_type);' || E'\n'
    || '    perform private.save_player_categories_v2(';
  v_count integer;
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.publish_announcement_v1(uuid,jsonb,text,text)')
  ) into v_definition;
  if v_definition is null then
    raise exception 'Missing public.publish_announcement_v1(uuid,jsonb,text,text)';
  end if;

  v_count := (pg_catalog.length(v_definition) - pg_catalog.length(
    pg_catalog.replace(v_definition, v_old, '')
  )) / pg_catalog.length(v_old);
  if v_count <> 1 then
    raise exception 'Unexpected publication wrapper body for profile synchronization';
  end if;
  execute pg_catalog.replace(v_definition, v_old, v_new);
end;
$migration$;

revoke all on function public.publish_announcement_v1(uuid, jsonb, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.publish_announcement_v1(uuid, jsonb, text, text)
  to authenticated;

notify pgrst, 'reload schema';

commit;

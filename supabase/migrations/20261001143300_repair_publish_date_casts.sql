begin;

-- The JSON extraction operator returns text, including for an empty optional date.
-- Repair installations whose published core predates the typed-field migration.
do $migration$
declare
  v_definition text;
  v_change record;
  v_old_count integer;
  v_new_count integer;
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.publish_announcement_core_v1(uuid,jsonb,text,text)')
  ) into v_definition;
  if v_definition is null then
    raise exception 'Missing publication core';
  end if;

  for v_change in
    select * from (values
      ('nullif(pg_catalog.btrim(v_detail ->> ''periodo_dal''), ''''),',
       'nullif(pg_catalog.btrim(v_detail ->> ''periodo_dal''), '''')::date,', 2, null::text),
      ('nullif(pg_catalog.btrim(v_detail ->> ''periodo_al''), ''''),',
       'nullif(pg_catalog.btrim(v_detail ->> ''periodo_al''), '''')::date,', 2, null::text),
      ('nullif(pg_catalog.btrim(v_detail ->> ''orario_dalle''), ''''),',
       'nullif(pg_catalog.btrim(v_detail ->> ''orario_dalle''), '''')::time,', 1, 'orario_dalle'),
      ('nullif(pg_catalog.btrim(v_detail ->> ''orario_alle''), ''''),',
       'nullif(pg_catalog.btrim(v_detail ->> ''orario_alle''), '''')::time,', 1, 'orario_alle')
    ) as changes(old_text, new_text, expected_count, time_column)
    where changes.time_column is null or exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'annuncio_squadra_cerca_partita'
        and column_name = changes.time_column
        and data_type = 'time without time zone'
    )
  loop
    v_old_count := (pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_change.old_text, ''))) / pg_catalog.length(v_change.old_text);
    v_new_count := (pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_change.new_text, ''))) / pg_catalog.length(v_change.new_text);
    if v_old_count + v_new_count <> v_change.expected_count then
      raise exception 'Unexpected publication core date expression: %', v_change.old_text;
    end if;
    v_definition := pg_catalog.replace(v_definition, v_change.old_text, v_change.new_text);
  end loop;

  execute v_definition;
end;
$migration$;

revoke all on function public.publish_announcement_core_v1(uuid, jsonb, text, text)
  from public, anon, authenticated, service_role;

commit;

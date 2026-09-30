begin;

alter table public.annuncio
  add column titolo_annuncio text;

alter table public.annuncio
  add constraint annuncio_titolo_annuncio_max_length
  check (
    titolo_annuncio is null
    or pg_catalog.char_length(pg_catalog.btrim(titolo_annuncio)) <= 50
  );

-- Keep the v2 publication payload strict while accepting and persisting the
-- shared title. The legacy v1 writer does not know about this payload key.
do $migration$
declare
  v_definition text;
  v_previous_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('private.publish_announcement_core_v2(uuid,jsonb,text,text,text)')
  ) into v_definition;

  if v_definition is null then
    raise exception 'Missing private.publish_announcement_core_v2(uuid,jsonb,text,text,text)';
  end if;

  v_previous_definition := v_definition;
  v_definition := pg_catalog.replace(
    v_definition,
    '''profile_locations'', ''profile_update'', ''detail''',
    '''profile_locations'', ''profile_update'', ''announcement_title'', ''detail'''
  );
  if v_definition is not distinct from v_previous_definition then
    raise exception 'Publication payload title insertion point not found';
  end if;

  v_previous_definition := v_definition;
  v_definition := pg_catalog.replace(
    v_definition,
    'or pg_catalog.jsonb_typeof(p_payload -> ''extras'') <> ''object'' then',
    'or pg_catalog.jsonb_typeof(p_payload -> ''extras'') <> ''object'''
      || ' or pg_catalog.jsonb_typeof(p_payload -> ''announcement_title'') is distinct from ''string'''
      || ' or pg_catalog.char_length(pg_catalog.btrim(p_payload ->> ''announcement_title'')) > 50 then'
  );
  if v_definition is not distinct from v_previous_definition then
    raise exception 'Publication title validation insertion point not found';
  end if;

  v_previous_definition := v_definition;
  v_definition := pg_catalog.replace(
    v_definition,
    'v_legacy_payload := (p_payload - ''extras'')',
    'v_legacy_payload := (p_payload - ''extras'' - ''announcement_title'')'
  );
  if v_definition is not distinct from v_previous_definition then
    raise exception 'Legacy publication payload conversion point not found';
  end if;

  v_previous_definition := v_definition;
  v_definition := pg_catalog.replace(
    v_definition,
    'v_is_retry := coalesce((v_result ->> ''idempotent'')::boolean, false);',
    'v_is_retry := coalesce((v_result ->> ''idempotent'')::boolean, false);'
      || E'\n\n  if not v_is_retry then\n'
      || '    update public.annuncio'
      || E'\n    set titolo_annuncio = nullif(pg_catalog.btrim(p_payload ->> ''announcement_title''), '''')'
      || E'\n    where uuid = v_announcement_id;\n'
      || '  end if;'
  );
  if v_definition is not distinct from v_previous_definition then
    raise exception 'Publication title persistence insertion point not found';
  end if;

  execute v_definition;
end;
$migration$;

notify pgrst, 'reload schema';

commit;

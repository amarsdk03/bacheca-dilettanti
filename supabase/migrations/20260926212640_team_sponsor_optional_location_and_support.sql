begin;

-- Sponsor searches do not require or persist an announcement location.
-- The server also validates the sponsorship offer and sends an empty location array.
do $migration$
declare
  v_definition text;
  v_change record;
  v_updated constant text[] := array[
    'or (v_announcement_type <> ''annuncio_squadra_cerca_sponsor'' and not private.publish_locations_are_valid(p_payload -> ''announcement_locations''))',
    'not private.publish_text_is_valid(v_detail ->> ''supporto_cercato'', false, 5000)',
    'where v_announcement_type <> ''annuncio_squadra_cerca_sponsor'''
  ];
begin
  select pg_catalog.pg_get_functiondef(
    pg_catalog.to_regprocedure('public.publish_announcement_core_v1(uuid,jsonb,text,text)')
  ) into v_definition;
  if v_definition is null then
    raise exception 'Missing public.publish_announcement_core_v1(uuid,jsonb,text,text)';
  end if;

  if pg_catalog.strpos(v_definition, v_updated[1]) > 0
    and pg_catalog.strpos(v_definition, v_updated[2]) > 0
    and pg_catalog.strpos(v_definition, v_updated[3]) > 0 then
    return;
  end if;

  for v_change in
    select * from (values
      (
        'or not private.publish_locations_are_valid(p_payload -> ''announcement_locations'')',
        v_updated[1]
      ),
      (
        'not private.publish_text_is_valid(v_detail ->> ''supporto_cercato'', true, 5000)',
        v_updated[2]
      ),
      (
        'from pg_catalog.jsonb_array_elements(p_payload -> ''announcement_locations'') as location(value);',
        'from pg_catalog.jsonb_array_elements(p_payload -> ''announcement_locations'') as location(value) ' || v_updated[3] || ';'
      )
    ) as changes(old_text, new_text)
  loop
    if pg_catalog.strpos(v_definition, v_change.old_text) = 0
      or pg_catalog.length(v_definition) - pg_catalog.length(pg_catalog.replace(v_definition, v_change.old_text, ''))
        <> pg_catalog.length(v_change.old_text) then
      raise exception 'Unexpected sponsor publication core body for %', v_change.old_text;
    end if;
    v_definition := pg_catalog.replace(v_definition, v_change.old_text, v_change.new_text);
  end loop;

  execute v_definition;
end;
$migration$;

commit;

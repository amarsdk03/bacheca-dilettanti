begin;
set local lock_timeout = '10s';

-- Upload assistance is suspended, including requests made before this release.
update public.profilo_giocatore set richiede_caricamento_highlights = false
where richiede_caricamento_highlights;
alter table public.profilo_giocatore add constraint player_highlights_assistance_suspended
  check (not richiede_caricamento_highlights);

-- Keep the existing JSON interface; referee history no longer references teams.
create function private.referee_experiences_v1(p_value jsonb, p_clear boolean default false)
returns jsonb language sql immutable security invoker set search_path = '' as $$
  select coalesce(pg_catalog.jsonb_agg(
    (item - 'squadraProfiloId' - 'squadraIstanzaId')
      || case when p_clear then '{"titolo":"","ente":""}'::jsonb else '{}'::jsonb end
    order by position), '[]'::jsonb)
  from pg_catalog.jsonb_array_elements(p_value) with ordinality as entries(item, position);
$$;
revoke all on function private.referee_experiences_v1(jsonb,boolean) from public, anon, authenticated, service_role;
grant execute on function private.referee_experiences_v1(jsonb,boolean) to service_role;

update public.profilo_arbitro
set lista_esperienze = private.referee_experiences_v1(lista_esperienze, true);
update public.annuncio_arbitro
set lista_esperienze = private.referee_experiences_v1(lista_esperienze, true);

-- Extend the installed functions in place, preserving ownership checks and grants.
do $migration$
declare v_definition text; v_anchor text;
begin
  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.save_profile_career_sections_v1(uuid,text,jsonb)')) into v_definition;
  v_anchor := 'set lista_esperienze = p_draft -> ''lista_esperienze'',';
  if v_definition is null or pg_catalog.strpos(v_definition, v_anchor) = 0 then
    raise exception 'Referee history writer insertion point not found';
  end if;
  -- This helper also contains a legacy professional branch; change only the first (referee) branch.
  execute pg_catalog.overlay(v_definition,
    'set lista_esperienze = private.referee_experiences_v1(p_draft -> ''lista_esperienze''),',
    pg_catalog.strpos(v_definition, v_anchor), pg_catalog.length(v_anchor));

  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('private.assert_updated_profile_fields_v1(uuid,text)')) into v_definition;
  v_anchor := 'if not found or not private.team_category_is_valid_v1(v_category) then';
  if v_definition is null or pg_catalog.strpos(v_definition, v_anchor) = 0 then
    raise exception 'Team category validation insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_anchor,
    $check$if not found or not private.team_category_is_valid_v1(v_category)
      or not exists (
        select 1 from public.profilo_squadra as team
        where team.uuid_profilo = p_profile_id and not team.nascosto
          and pg_catalog.cardinality(team.tipologie_sport) = 1
          and pg_catalog.split_part(v_category, '::', 1) in (
            pg_catalog.replace(team.tipologie_sport[1], 'Calcio ', 'Calcio a ') || ' maschile',
            pg_catalog.replace(team.tipologie_sport[1], 'Calcio ', 'Calcio a ') || ' femminile'
          )
      ) then$check$);

  select pg_catalog.pg_get_functiondef(pg_catalog.to_regprocedure('public.publish_announcement_core_v1(uuid,jsonb,text,text)')) into v_definition;
  v_definition := pg_catalog.replace(v_definition, chr(13) || chr(10), chr(10));
  v_anchor := 'when ''annuncio_giocatore'' then' || chr(10) || '      not private.publish_text_is_valid';
  if v_definition is null or pg_catalog.strpos(v_definition, v_anchor) = 0 then
    raise exception 'Player announcement validation insertion point not found';
  end if;
  v_definition := pg_catalog.replace(v_definition, v_anchor,
    'when ''annuncio_giocatore'' then' || chr(10) ||
    '      not private.publish_text_array_is_valid(v_detail -> ''categorie_ricercate'', true)' || chr(10) ||
    '      or not private.publish_text_is_valid');
  v_anchor := 'v_detail ->> ''descrizione_aggiuntiva'', true, 5000)';
  if pg_catalog.strpos(v_definition, v_anchor) = 0 then
    raise exception 'Additional announcement information validation insertion point not found';
  end if;
  execute pg_catalog.replace(v_definition, v_anchor,
    'v_detail ->> ''descrizione_aggiuntiva'', false, 5000)');
end;
$migration$;

commit;

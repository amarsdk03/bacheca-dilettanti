begin;

-- Keep stored selections on the current labels. Preserve order and all
-- unrecognized historical values; only these four aliases are certain.
do $migration$
declare
  v_table text;
begin
  foreach v_table in array array[
    'annuncio_arbitro',
    'annuncio_campo_impianto',
    'annuncio_giocatore',
    'annuncio_squadra_cerca_giocatore',
    'annuncio_staff_sportivo',
    'annuncio_torneo_evento',
    'profilo_campi_impianti',
    'profilo_giocatore',
    'profilo_professionista_studente',
    'profilo_squadra',
    'profilo_torneo_evento'
  ] loop
    execute pg_catalog.format($statement$
      update public.%I as selection
      set tipologie_sport = array_replace(
        array_replace(
          array_replace(
            array_replace(selection.tipologie_sport, 'Calcio a 11', 'Calcio 11'),
            'Calcio a 8', 'Calcio 8'
          ),
          'Calcio a 7', 'Calcio 7'
        ),
        'Calcio a 5', 'Calcio 5'
      )
      where selection.tipologie_sport && array[
        'Calcio a 11', 'Calcio a 8', 'Calcio a 7', 'Calcio a 5'
      ]::text[]
    $statement$, v_table);
  end loop;
end;
$migration$;

-- The retired professional-announcement table stores this dedicated selection
-- as JSON instead of text[]. Normalize string arrays only; keep all other JSON
-- shapes and values untouched.
update public.annuncio_professionista_studente as announcement
set tipologie_sport = coalesce((
  select pg_catalog.jsonb_agg(
    case
      when pg_catalog.jsonb_typeof(selection.value) <> 'string' then selection.value
      else pg_catalog.to_jsonb(case selection.value #>> '{}'
        when 'Calcio a 11' then 'Calcio 11'
        when 'Calcio a 8' then 'Calcio 8'
        when 'Calcio a 7' then 'Calcio 7'
        when 'Calcio a 5' then 'Calcio 5'
        else selection.value #>> '{}'
      end)
    end
    order by selection.position
  )
  from pg_catalog.jsonb_array_elements(announcement.tipologie_sport)
    with ordinality as selection(value, position)
), '[]'::jsonb)
where pg_catalog.jsonb_typeof(announcement.tipologie_sport) = 'array'
  and exists (
    select 1
    from pg_catalog.jsonb_array_elements(announcement.tipologie_sport) as selection(value)
    where selection.value in (
      '"Calcio a 11"'::jsonb,
      '"Calcio a 8"'::jsonb,
      '"Calcio a 7"'::jsonb,
      '"Calcio a 5"'::jsonb
    )
  );

-- `Centrale` was the selectable midfielder-specific role. The prior role
-- migration also left one casing variant in some rows. Collapse both aliases
-- into the current label, preserving first-seen order and removing duplicates.
update public.profilo_giocatore as player
set ruoli_sport = pg_catalog.jsonb_set(
  player.ruoli_sport,
  '{specifici}',
  coalesce((
    select pg_catalog.jsonb_agg(normalized.role order by normalized.first_position)
    from (
      select mapped.role, min(legacy.position) as first_position
      from pg_catalog.jsonb_array_elements_text(player.ruoli_sport -> 'specifici')
        with ordinality as legacy(role, position)
      cross join lateral (
        values (
          case legacy.role
            when 'Centrale' then 'Centrocampista Centrale'
            when 'Centrocampista centrale' then 'Centrocampista Centrale'
            else legacy.role
          end
        )
      ) as mapped(role)
      group by mapped.role
    ) as normalized
  ), '[]'::jsonb)
)
where pg_catalog.jsonb_typeof(player.ruoli_sport -> 'specifici') = 'array'
  and (player.ruoli_sport -> 'specifici') ?| array[
    'Centrale', 'Centrocampista centrale'
  ];

do $migration$
declare
  v_table text;
begin
  foreach v_table in array array[
    'annuncio_giocatore',
    'annuncio_squadra_cerca_giocatore'
  ] loop
    execute pg_catalog.format($statement$
      update public.%I as announcement
      set ruoli_secondari = coalesce((
        select pg_catalog.array_agg(normalized.role order by normalized.first_position)
        from (
          select mapped.role, min(legacy.position) as first_position
          from unnest(announcement.ruoli_secondari) with ordinality as legacy(role, position)
          cross join lateral (
            values (
              case legacy.role
                when 'Centrale' then 'Centrocampista Centrale'
                when 'Centrocampista centrale' then 'Centrocampista Centrale'
                else legacy.role
              end
            )
          ) as mapped(role)
          group by mapped.role
        ) as normalized
      ), array[]::text[])
      where announcement.ruoli_secondari && array[
        'Centrale', 'Centrocampista centrale'
      ]::text[]
    $statement$, v_table);
  end loop;
end;
$migration$;

commit;

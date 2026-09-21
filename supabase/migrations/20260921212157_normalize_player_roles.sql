-- Keep the stored taxonomy aligned with the player-role catalog used by the app.
-- Each update preserves the first occurrence and its relative order when two
-- legacy labels converge on the same canonical role.

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
            when 'Libero' then 'Difensore centrale'
            when 'Esterno sinistro a tutta fascia' then 'Esterno sinistro'
            when 'Centrocampista sinistro' then 'Esterno sinistro'
            when 'Centrocampista centrale' then 'Centrale'
            when 'Centrocampista destro' then 'Esterno destro'
            when 'Esterno destro a tutta fascia' then 'Esterno destro'
            when 'Attaccante sinistro / Seconda punta sinistra' then 'Ala sinistra'
            when 'Attaccante destro / Seconda punta destra' then 'Ala destra'
            when 'Centravanti' then 'Punta centrale'
            when 'Seconda punta' then 'Seconda Punta'
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
    'Libero',
    'Esterno sinistro a tutta fascia',
    'Centrocampista sinistro',
    'Centrocampista centrale',
    'Centrocampista destro',
    'Esterno destro a tutta fascia',
    'Attaccante sinistro / Seconda punta sinistra',
    'Attaccante destro / Seconda punta destra',
    'Centravanti',
    'Seconda punta'
  ];

update public.annuncio_giocatore as announcement
set ruoli_secondari = coalesce((
  select pg_catalog.array_agg(normalized.role order by normalized.first_position)
  from (
    select mapped.role, min(legacy.position) as first_position
    from unnest(announcement.ruoli_secondari) with ordinality as legacy(role, position)
    cross join lateral (
      values (
        case legacy.role
          when 'Libero' then 'Difensore centrale'
          when 'Esterno sinistro a tutta fascia' then 'Esterno sinistro'
          when 'Centrocampista sinistro' then 'Esterno sinistro'
          when 'Centrocampista centrale' then 'Centrale'
          when 'Centrocampista destro' then 'Esterno destro'
          when 'Esterno destro a tutta fascia' then 'Esterno destro'
          when 'Attaccante sinistro / Seconda punta sinistra' then 'Ala sinistra'
          when 'Attaccante destro / Seconda punta destra' then 'Ala destra'
          when 'Centravanti' then 'Punta centrale'
          when 'Seconda punta' then 'Seconda Punta'
          else legacy.role
        end
      )
    ) as mapped(role)
    group by mapped.role
  ) as normalized
), array[]::text[])
where announcement.ruoli_secondari && array[
  'Libero',
  'Esterno sinistro a tutta fascia',
  'Centrocampista sinistro',
  'Centrocampista centrale',
  'Centrocampista destro',
  'Esterno destro a tutta fascia',
  'Attaccante sinistro / Seconda punta sinistra',
  'Attaccante destro / Seconda punta destra',
  'Centravanti',
  'Seconda punta'
]::text[];

update public.annuncio_squadra_cerca_giocatore as announcement
set ruoli_secondari = coalesce((
  select pg_catalog.array_agg(normalized.role order by normalized.first_position)
  from (
    select mapped.role, min(legacy.position) as first_position
    from unnest(announcement.ruoli_secondari) with ordinality as legacy(role, position)
    cross join lateral (
      values (
        case legacy.role
          when 'Libero' then 'Difensore centrale'
          when 'Esterno sinistro a tutta fascia' then 'Esterno sinistro'
          when 'Centrocampista sinistro' then 'Esterno sinistro'
          when 'Centrocampista centrale' then 'Centrale'
          when 'Centrocampista destro' then 'Esterno destro'
          when 'Esterno destro a tutta fascia' then 'Esterno destro'
          when 'Attaccante sinistro / Seconda punta sinistra' then 'Ala sinistra'
          when 'Attaccante destro / Seconda punta destra' then 'Ala destra'
          when 'Centravanti' then 'Punta centrale'
          when 'Seconda punta' then 'Seconda Punta'
          else legacy.role
        end
      )
    ) as mapped(role)
    group by mapped.role
  ) as normalized
), array[]::text[])
where announcement.ruoli_secondari && array[
  'Libero',
  'Esterno sinistro a tutta fascia',
  'Centrocampista sinistro',
  'Centrocampista centrale',
  'Centrocampista destro',
  'Esterno destro a tutta fascia',
  'Attaccante sinistro / Seconda punta sinistra',
  'Attaccante destro / Seconda punta destra',
  'Centravanti',
  'Seconda punta'
]::text[];

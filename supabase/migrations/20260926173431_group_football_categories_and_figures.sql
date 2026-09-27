begin;

-- Only labels whose previous catalogue identified a definite new group.
create temporary table step02_category_map (old_value text primary key, new_value text not null) on commit drop;
insert into step02_category_map (old_value, new_value) values
  ('Serie C', 'Calcio 11 (Maschile)::Serie C'),
  ('Serie D', 'Calcio 11 (Maschile)::Serie D'),
  ('Eccellenza', 'Calcio 11 (Maschile)::Eccellenza'),
  ('Promozione', 'Calcio 11 (Maschile)::Promozione'),
  ('Prima Categoria', 'Calcio 11 (Maschile)::Prima Categoria'),
  ('Seconda Categoria', 'Calcio 11 (Maschile)::Seconda Categoria'),
  ('Terza Categoria', 'Calcio 11 (Maschile)::Terza Categoria'),
  ('Primavera 1', 'Calcio 11 (Maschile)::Primavera 1'),
  ('Primavera 2', 'Calcio 11 (Maschile)::Primavera 2'),
  ('Primavera 3', 'Calcio 11 (Maschile)::Primavera 3'),
  ('Primavera 4', 'Calcio 11 (Maschile)::Primavera 4'),
  ('Serie A Femminile', 'Calcio 11 (Femminile)::Serie A Femminile'),
  ('Serie B Femminile', 'Calcio 11 (Femminile)::Serie B Femminile'),
  ('Serie C Femminile', 'Calcio 11 (Femminile)::Serie C Femminile'),
  ('Eccellenza Femminile', 'Calcio 11 (Femminile)::Eccellenza Femminile'),
  ('Serie A2 Élite', 'Calcio 5 (Maschile)::Serie A2 Élite'),
  ('Serie A2', 'Calcio 5 (Maschile)::Serie A2');

do $migration$
declare
  v_table text;
  v_column text;
  v_map text;
begin
  foreach v_table in array array[
    'profilo_giocatore', 'annuncio_giocatore',
    'annuncio_squadra_cerca_partita', 'annuncio_staff_sportivo', 'annuncio_arbitro'
  ] loop
    v_column := case when v_table = 'annuncio_squadra_cerca_partita' then 'categorie_avversario' else 'categorie_ricercate' end;
    execute pg_catalog.format($statement$
      update public.%I as target
      set %I = array(
        select item.value from (
          select coalesce(mapping.new_value, element.value) as value, min(element.position) as position
          from unnest(target.%I) with ordinality as element(value, position)
          left join pg_temp.step02_category_map as mapping on mapping.old_value = element.value
          group by 1
        ) as item order by item.position
      )
      where target.%I && array(select old_value from pg_temp.step02_category_map)
    $statement$, v_table, v_column, v_column, v_column);
  end loop;
end
$migration$;

create temporary table step02_figure_map (old_value text primary key, new_value text not null) on commit drop;
insert into step02_figure_map (old_value, new_value) values
  ('Fisioterapia/Medicina sportiva', 'Fisioterapia / Medicina sportiva'),
  ('Commerciale/Business', 'Commerciale / Business');

do $migration$
declare
  v_table text;
begin
  foreach v_table in array array[
    'profilo_staff_sportivo', 'profilo_professionista_studente', 'annuncio_staff_sportivo'
  ] loop
    execute pg_catalog.format($statement$
      update public.%I as target
      set figure_professionali = array(
        select item.value from (
          select coalesce(mapping.new_value, element.value) as value, min(element.position) as position
          from unnest(target.figure_professionali) with ordinality as element(value, position)
          left join pg_temp.step02_figure_map as mapping on mapping.old_value = element.value
          group by 1
        ) as item order by item.position
      )
      where target.figure_professionali && array(select old_value from pg_temp.step02_figure_map)
    $statement$, v_table);
  end loop;
end
$migration$;

update public.annuncio_squadra_cerca_staff
set figura_ricercata = case figura_ricercata
  when 'Fisioterapia/Medicina sportiva' then 'Fisioterapia / Medicina sportiva'
  when 'Commerciale/Business' then 'Commerciale / Business'
end
where figura_ricercata in ('Fisioterapia/Medicina sportiva', 'Commerciale/Business');

commit;

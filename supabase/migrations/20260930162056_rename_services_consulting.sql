begin;

set local lock_timeout = '10s';

-- Keep the existing rows, grants, RLS settings, and foreign-key dependencies.
alter table public.profilo_professionista_studente rename to profilo_servizi_consulenze;
alter table public.annuncio_professionista_studente rename to annuncio_servizi_consulenze;
alter sequence if exists public.profilo_professionisti_studenti_id_seq
  rename to profilo_servizi_consulenze_id_seq;

-- PostgreSQL does not rename the names of policies, indexes, and constraints
-- when their table is renamed. Align those database identifiers as well.
do $rename_objects$
declare
  v_table regclass;
  v_old_name text;
  v_new_name text;
  v_object record;
begin
  foreach v_table in array array[
    'public.profilo_servizi_consulenze'::regclass,
    'public.annuncio_servizi_consulenze'::regclass
  ] loop
    for v_object in
      select conname as name
      from pg_catalog.pg_constraint
      where conrelid = v_table
    loop
      v_old_name := v_object.name;
      v_new_name := pg_catalog.replace(
        pg_catalog.replace(v_old_name, 'profilo_professionisti_studenti', 'profilo_servizi_consulenze'),
        'profilo_professionista_studente', 'profilo_servizi_consulenze'
      );
      v_new_name := pg_catalog.replace(v_new_name, 'annuncio_professionista_studente', 'annuncio_servizi_consulenze');
      if v_new_name <> v_old_name then
        execute pg_catalog.format('alter table %s rename constraint %I to %I', v_table, v_old_name, v_new_name);
      end if;
    end loop;

    for v_object in
      select polname as name
      from pg_catalog.pg_policy
      where polrelid = v_table
    loop
      v_old_name := v_object.name;
      v_new_name := pg_catalog.replace(v_old_name, 'profilo_professionista_studente', 'profilo_servizi_consulenze');
      v_new_name := pg_catalog.replace(v_new_name, 'annuncio_professionista_studente', 'annuncio_servizi_consulenze');
      if v_new_name <> v_old_name then
        execute pg_catalog.format('alter policy %I on %s rename to %I', v_old_name, v_table, v_new_name);
      end if;
    end loop;

    for v_object in
      select indexrelid::regclass as relation, indexrelid::regclass::text as name
      from pg_catalog.pg_index
      where indrelid = v_table
    loop
      v_old_name := pg_catalog.split_part(v_object.name, '.', 2);
      if v_old_name = '' then v_old_name := v_object.name; end if;
      v_new_name := pg_catalog.replace(
        pg_catalog.replace(v_old_name, 'profilo_professionisti_studenti', 'profilo_servizi_consulenze'),
        'profilo_professionista_studente', 'profilo_servizi_consulenze'
      );
      v_new_name := pg_catalog.replace(v_new_name, 'annuncio_professionista_studente', 'annuncio_servizi_consulenze');
      if v_new_name <> v_old_name then
        execute pg_catalog.format('alter index %s rename to %I', v_object.relation, v_new_name);
      end if;
    end loop;
  end loop;
end;
$rename_objects$;

alter table public.profilo drop constraint profilo_tipologia_principale_check;
alter table public.localita_profilo drop constraint localita_profilo_sottoprofilo_check;
alter table public.media_profilo drop constraint media_profilo_sottoprofilo_check;

-- Update all persisted discriminators before restoring strict checks.
update public.profilo
set tipologia_principale = 'servizi-consulenze'
where tipologia_principale = 'professionisti-studi';

update public.localita_profilo
set sottoprofilo = 'servizi-consulenze'
where sottoprofilo = 'professionisti-studi';

update public.media_profilo
set sottoprofilo = 'servizi-consulenze'
where sottoprofilo = 'professionisti-studi';

update public.link_social_profilo
set sottoprofilo = 'servizi-consulenze'
where sottoprofilo = 'professionisti-studi';

update public.annuncio
set tipologia_annuncio = 'annuncio_servizi_consulenze'
where tipologia_annuncio in ('annuncio_professionisti_studi', 'annuncio_professionista_studente');

-- Registration intents last fifteen minutes. Preserve in-flight registrations
-- by changing only their category identifiers, never user-entered draft text.
do $registration_intents$
declare
  v_intent record;
  v_payload jsonb;
  v_values jsonb;
begin
  for v_intent in
    select token, payload
    from private.registration_intent
    where payload::text like '%professionisti-studi%'
  loop
    v_payload := v_intent.payload;
    if v_payload ->> 'primaryProfileType' = 'professionisti-studi' then
      v_payload := pg_catalog.jsonb_set(v_payload, '{primaryProfileType}', '"servizi-consulenze"'::jsonb);
    end if;
    if pg_catalog.jsonb_typeof(v_payload -> 'selectedProfileTypes') = 'array' then
      select pg_catalog.jsonb_agg(
        case when item.value = '"professionisti-studi"'::jsonb
          then '"servizi-consulenze"'::jsonb else item.value end
        order by item.ordinality
      ) into v_values
      from pg_catalog.jsonb_array_elements(v_payload -> 'selectedProfileTypes') with ordinality as item(value, ordinality);
      v_payload := pg_catalog.jsonb_set(v_payload, '{selectedProfileTypes}', coalesce(v_values, '[]'::jsonb));
    end if;
    if pg_catalog.jsonb_typeof(v_payload -> 'profiles') = 'array' then
      select pg_catalog.jsonb_agg(
        case when item.value ->> 'type' = 'professionisti-studi'
          then pg_catalog.jsonb_set(item.value, '{type}', '"servizi-consulenze"'::jsonb)
          else item.value end
        order by item.ordinality
      ) into v_values
      from pg_catalog.jsonb_array_elements(v_payload -> 'profiles') with ordinality as item(value, ordinality);
      v_payload := pg_catalog.jsonb_set(v_payload, '{profiles}', coalesce(v_values, '[]'::jsonb));
    end if;
    update private.registration_intent set payload = v_payload where token = v_intent.token;
  end loop;
end;
$registration_intents$;

alter table public.profilo add constraint profilo_tipologia_principale_check check (
  tipologia_principale is null or tipologia_principale in (
    'giocatore', 'squadra', 'staff-sportivo', 'servizi-consulenze',
    'arbitro', 'creators', 'torneo-evento', 'campi-impianti-sportivi'
  )
);

alter table public.localita_profilo add constraint localita_profilo_sottoprofilo_check check (
  (sottoprofilo is null and id_sottoprofilo is null)
  or (
    sottoprofilo in (
      'giocatore', 'squadra', 'staff-sportivo', 'servizi-consulenze',
      'arbitro', 'creators', 'torneo-evento', 'campi-impianti-sportivi'
    )
    and id_sottoprofilo is not null
  )
);

alter table public.media_profilo add constraint media_profilo_sottoprofilo_check check (
  sottoprofilo is null or sottoprofilo in (
    'giocatore', 'squadra', 'staff-sportivo', 'servizi-consulenze',
    'arbitro', 'creators', 'torneo-evento', 'campi-impianti-sportivi'
  )
);

-- PL/pgSQL bodies store relation names and category strings as text. Refresh
-- only active public/private functions that still contain the old identifiers.
do $refresh_functions$
declare
  v_function record;
  v_definition text;
begin
  for v_function in
    select procedure.oid, pg_catalog.pg_get_functiondef(procedure.oid) as definition
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'private')
      and procedure.prokind = 'f'
  loop
    v_definition := v_function.definition;
    v_definition := pg_catalog.replace(v_definition, 'profilo_professionisti_studenti', 'profilo_servizi_consulenze');
    v_definition := pg_catalog.replace(v_definition, 'profilo_professionista_studente', 'profilo_servizi_consulenze');
    v_definition := pg_catalog.replace(v_definition, 'annuncio_professionista_studente', 'annuncio_servizi_consulenze');
    v_definition := pg_catalog.replace(v_definition, 'annuncio_professionisti_studi', 'annuncio_servizi_consulenze');
    v_definition := pg_catalog.replace(v_definition, 'professionisti-studi', 'servizi-consulenze');
    if v_definition <> v_function.definition then execute v_definition; end if;
  end loop;
end;
$refresh_functions$;

notify pgrst, 'reload schema';

commit;

-- 07A. Read-only Admin list; no table grants or changes to public/owner policies.
begin;

do $$
declare v_table text; v_column text; v_columns text[];
begin
  if pg_catalog.to_regprocedure('private.require_admin_context_v1()') is null then
    raise exception 'ADMIN_AUTHORIZATION_FOUNDATION_REQUIRED';
  end if;
  for v_table, v_columns in select * from (values
    ('annuncio', array['uuid','creato_da','autore_annuncio','titolo_annuncio','tipologia_annuncio','stato_annuncio','nascosto','privato','creato_il','ultima_modifica_il']),
    ('profilo', array['uuid','uuid_utente','nascosto']),
    ('profilo_giocatore', array['id','uuid_profilo','nascosto','nominativo_anonimo','nome','cognome']),
    ('profilo_squadra', array['id','uuid_profilo','nascosto','nominativo_anonimo','nome_societa']),
    ('profilo_staff_sportivo', array['id','uuid_profilo','nascosto','nominativo_anonimo','nome','cognome']),
    ('profilo_arbitro', array['id','uuid_profilo','nascosto','nominativo_anonimo','nome','cognome']),
    ('profilo_servizi_consulenze', array['id','uuid_profilo','nascosto','nome']),
    ('profilo_creator', array['id','uuid_profilo','nascosto','nome_creator']),
    ('profilo_torneo_evento', array['id','uuid_profilo','nascosto','nome_organizzazione']),
    ('profilo_campi_impianti', array['id','uuid_profilo','nascosto','nome_organizzazione'])
  ) as required(table_name, column_names) loop
    foreach v_column in array v_columns loop
      if not exists (select 1 from pg_catalog.pg_attribute
        where attrelid = pg_catalog.to_regclass('public.' || v_table)
          and attname = v_column and attnum > 0 and not attisdropped) then
        raise exception 'ADMIN_ANNOUNCEMENT_SCHEMA_REQUIRED: %.%', v_table, v_column;
      end if;
    end loop;
  end loop;
end;
$$;

create index annuncio_admin_order_v1_idx on public.annuncio (creato_il desc nulls last, uuid desc);

create function private.list_admin_announcements_v1(p_query jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' set timezone = 'UTC' as $$
declare
  v_search text := ''; v_status text; v_type text; v_visibility text := 'all';
  v_limit integer := 30; v_filters jsonb; v_cursor jsonb; v_cursor_id uuid;
  v_cursor_date timestamptz; v_cursor_present boolean := false; v_result jsonb;
begin
  -- The original role survives SECURITY DEFINER; a technical key is not a user.
  if pg_catalog.current_setting('role', true) is distinct from 'authenticated' then
    raise exception using errcode='42501', message='ADMIN_ACCESS_DENIED';
  end if;
  perform private.require_admin_context_v1();

  if p_query is null or pg_catalog.jsonb_typeof(p_query) is distinct from 'object' then
    raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
  end if;
  if exists (select 1 from pg_catalog.jsonb_object_keys(p_query) k where k not in ('search','status','type','visibility','limit','cursor'))
    or (p_query ? 'search' and pg_catalog.jsonb_typeof(p_query->'search') is distinct from 'string')
    or (p_query ? 'visibility' and pg_catalog.jsonb_typeof(p_query->'visibility') is distinct from 'string')
    or (p_query ? 'status' and pg_catalog.jsonb_typeof(p_query->'status') not in ('string','null'))
    or (p_query ? 'type' and pg_catalog.jsonb_typeof(p_query->'type') not in ('string','null')) then
    raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
  end if;
  -- Same whitespace set as ECMAScript String.trim(), independent of DB locale.
  v_search := pg_catalog.btrim(coalesce(p_query->>'search',''),
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF');
  if pg_catalog.length(v_search) > 200 then
    raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
  end if;
  if v_search ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then v_search := pg_catalog.lower(v_search); end if;
  v_status := p_query->>'status'; v_type := p_query->>'type';
  v_visibility := coalesce(p_query->>'visibility','all');
  if (v_status is not null and v_status collate "C" not in ('pubblicato','in_revisione','rifiutato','in_attesa_pagamento'))
    or (v_type is not null and v_type collate "C" not in (
      'annuncio_giocatore','annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff',
      'annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor','annuncio_staff_sportivo',
      'annuncio_arbitro','annuncio_torneo_evento','annuncio_campo_impianto','annuncio_servizi_consulenze','annuncio_creators'))
    or v_visibility collate "C" not in ('all','shown','hidden','unknown') then
    raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
  end if;
  if p_query ? 'limit' then
    if pg_catalog.jsonb_typeof(p_query->'limit') is distinct from 'number' or (p_query->>'limit') !~ '^[0-9]{1,2}$' then
      raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
    end if;
    v_limit := (p_query->>'limit')::integer;
    if v_limit < 1 or v_limit > 30 then
      raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
    end if;
  end if;
  v_filters := pg_catalog.jsonb_build_object('search',v_search,'status',v_status,'type',v_type,'visibility',v_visibility);
  v_cursor := p_query->'cursor';
  if v_cursor is not null and v_cursor <> 'null'::jsonb then
    if pg_catalog.jsonb_typeof(v_cursor) is distinct from 'object' then
      raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
    end if;
    if (select count(*) from pg_catalog.jsonb_object_keys(v_cursor)) <> 4
      or not (v_cursor ?& array['v','createdAt','id','filters'])
      or v_cursor->'v' is distinct from '1'::jsonb or v_cursor->'filters' is distinct from v_filters
      or pg_catalog.jsonb_typeof(v_cursor->'id') is distinct from 'string'
      or (v_cursor->>'id') !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
      or pg_catalog.jsonb_typeof(v_cursor->'createdAt') not in ('string','null') then
      raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
    end if;
    v_cursor_present := true; v_cursor_id := (v_cursor->>'id')::uuid;
    if v_cursor->>'createdAt' is not null then
      if (v_cursor->>'createdAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6}Z$' then
        raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
      end if;
      begin
        v_cursor_date := (v_cursor->>'createdAt')::timestamptz;
      exception when invalid_datetime_format or datetime_field_overflow then
        raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
      end;
      if pg_catalog.to_char(v_cursor_date,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') <> v_cursor->>'createdAt' then
        raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
      end if;
    end if;
  end if;

  with candidates as materialized (
    select a.* from public.annuncio a
    where (v_status is null or a.stato_annuncio collate "C" = v_status)
      and (v_type is null or a.tipologia_annuncio collate "C" = v_type)
      and (v_visibility = 'all' or (v_visibility = 'shown' and a.nascosto is false)
        or (v_visibility = 'hidden' and a.nascosto is true) or (v_visibility = 'unknown' and a.nascosto is null))
      and (v_search = '' or case when v_search ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
        then a.uuid = v_search::uuid else a.titolo_annuncio ilike
          '%' || pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(v_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\' end)
      and (not v_cursor_present or
        (v_cursor_date is null and a.creato_il is null and a.uuid < v_cursor_id) or
        (v_cursor_date is not null and (a.creato_il < v_cursor_date or a.creato_il is null or
          (a.creato_il = v_cursor_date and a.uuid < v_cursor_id))))
    order by a.creato_il desc nulls last, a.uuid desc limit v_limit + 1
  ), page as materialized (
    select * from candidates order by creato_il desc nulls last, uuid desc limit v_limit
  ), enriched as (
    select a.creato_il, a.uuid, pg_catalog.jsonb_build_object(
      'id',a.uuid,'title',a.titolo_annuncio,'type',a.tipologia_annuncio,'status',a.stato_annuncio,
      'hidden',a.nascosto,'private',a.privato,'creatorId',a.creato_da,
      'createdAt',pg_catalog.to_char(a.creato_il,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'updatedAt',pg_catalog.to_char(a.ultima_modifica_il,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'rowFingerprint',pg_catalog.md5(pg_catalog.to_jsonb(a)::text),
      'author',pg_catalog.jsonb_build_object('profileId',a.autore_annuncio,'userId',p.uuid_utente,
        'displayName',coalesce(nullif(pg_catalog.btrim(display.name),''),'Profilo non disponibile'),
        'anonymous',display.anonymous,'available',nullif(pg_catalog.btrim(display.name),'') is not null)
    ) as item
    from page a
    left join public.profilo p on p.uuid = a.autore_annuncio and p.nascosto is false
    left join lateral (
      select names.name, names.anonymous from (
        select g.id, case when g.nominativo_anonimo is true then 'Giocatore' when g.nominativo_anonimo is false then pg_catalog.btrim(concat_ws(' ',g.nome,g.cognome)) end as name,
          g.nominativo_anonimo as anonymous from public.profilo_giocatore g where g.uuid_profilo=p.uuid and g.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_giocatore'
        union all
        select s.id, case when s.nominativo_anonimo is true then 'Squadra' when s.nominativo_anonimo is false then s.nome_societa end, s.nominativo_anonimo
          from public.profilo_squadra s where s.uuid_profilo=p.uuid and s.nascosto is false and a.tipologia_annuncio collate "C" in ('annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff','annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor')
        union all
        select s.id, case when s.nominativo_anonimo is true then 'Staff sportivo' when s.nominativo_anonimo is false then pg_catalog.btrim(concat_ws(' ',s.nome,s.cognome)) end, s.nominativo_anonimo
          from public.profilo_staff_sportivo s where s.uuid_profilo=p.uuid and s.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_staff_sportivo'
        union all
        select r.id, case when r.nominativo_anonimo is true then 'Arbitro' when r.nominativo_anonimo is false then pg_catalog.btrim(concat_ws(' ',r.nome,r.cognome)) end, r.nominativo_anonimo
          from public.profilo_arbitro r where r.uuid_profilo=p.uuid and r.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_arbitro'
        union all
        select s.id, s.nome, false from public.profilo_servizi_consulenze s where s.uuid_profilo=p.uuid and s.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_servizi_consulenze'
        union all
        select c.id, c.nome_creator, false from public.profilo_creator c where c.uuid_profilo=p.uuid and c.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_creators'
        union all
        select e.id, e.nome_organizzazione, false from public.profilo_torneo_evento e where e.uuid_profilo=p.uuid and e.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_torneo_evento'
        union all
        select c.id, c.nome_organizzazione, false from public.profilo_campi_impianti c where c.uuid_profilo=p.uuid and c.nascosto is false and a.tipologia_annuncio collate "C"='annuncio_campo_impianto'
      ) names order by names.id limit 1
    ) display on true
  )
  select pg_catalog.jsonb_build_object(
    'items',coalesce((select pg_catalog.jsonb_agg(item order by creato_il desc nulls last, uuid desc) from enriched),'[]'::jsonb),
    'hasMore',(select count(*) > v_limit from candidates),
    'nextCursor',case when (select count(*) > v_limit from candidates) then (
      select pg_catalog.jsonb_build_object('v',1,'id',uuid,'createdAt',pg_catalog.to_char(creato_il,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'filters',v_filters)
      from page order by creato_il asc nulls first, uuid asc limit 1
    ) else null end
  ) into v_result;
  return v_result;
end;
$$;
alter function private.list_admin_announcements_v1(jsonb) owner to postgres;
revoke all on function private.list_admin_announcements_v1(jsonb) from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;
grant execute on function private.list_admin_announcements_v1(jsonb) to authenticated;

create function public.admin_list_announcements_v1(p_query jsonb default '{}'::jsonb)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.list_admin_announcements_v1(p_query);
$$;
alter function public.admin_list_announcements_v1(jsonb) owner to postgres;
revoke all on function public.admin_list_announcements_v1(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.admin_list_announcements_v1(jsonb) to authenticated;
comment on function public.admin_list_announcements_v1(jsonb) is
  'Admin-only bounded list. Current human authorization inside the private bridge. Public/anonymous author name only; no Auth IDs, contacts, media or detail payloads. Cursor is pagination, never authorization. Base-row fingerprint only.';
notify pgrst, 'reload schema';
commit;

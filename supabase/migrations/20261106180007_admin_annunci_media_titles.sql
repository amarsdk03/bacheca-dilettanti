-- Admin Annunci: recognize stored images and display the Web's automatic titles.
-- Apply before deploying Admin. No stored announcement content or Storage policy changes.
begin;

create function private.admin_announcement_image_path_valid_v1(p_value text, p_mime text)
returns boolean language sql immutable security invoker set search_path='' as $$
  select coalesce(length(p_value) = case p_mime when 'image/jpeg' then 142 when 'image/png' then 142 when 'image/webp' then 143 end
    and p_value ~ ('^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/[0-9a-f]{64}\.' ||
    case p_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' end || '$'), false);
$$;

-- Presentation parity with Web announcement-content.ts: whitespace, placeholders, limits.
create function private.admin_announcement_title_text_v1(p_value text, p_limit integer)
returns text language sql immutable security invoker set search_path='' as $$
  select case when v is null or v ~* '^vedi (il )?profilo[.!]?$' then null else left(v,p_limit) end
  from (select nullif(btrim(regexp_replace(p_value,'\s+',' ','g')),'') v) normalized;
$$;

-- Ordered, distinct arrays, including the legacy role/figure aliases used on Web.
create function private.admin_announcement_title_values_v1(p_values jsonb,p_kind text)
returns text[] language plpgsql immutable security invoker set search_path='' as $$
declare result text[]:='{}'; entry jsonb; v text;
  aliases jsonb:='{"Libero":"Difensore centrale","Esterno sinistro a tutta fascia":"Esterno sinistro","Centrocampista sinistro":"Esterno sinistro","Centrale":"Centrocampista Centrale","Centrocampista centrale":"Centrocampista Centrale","Centrocampista destro":"Esterno destro","Esterno destro a tutta fascia":"Esterno destro","Attaccante sinistro / Seconda punta sinistra":"Ala sinistra","Attaccante destro / Seconda punta destra":"Ala destra","Centravanti":"Punta centrale","Seconda punta":"Seconda Punta"}';
begin
  if jsonb_typeof(p_values) is distinct from 'array' then return result; end if;
  for entry in select value from jsonb_array_elements(p_values) loop
    if jsonb_typeof(entry) is distinct from 'string' then continue; end if;
    v:=private.admin_announcement_title_text_v1(entry#>>'{}',160);
    if v is null then continue; end if;
    if p_kind='primary' and not(v=any(array['Portiere','Difensore','Centrocampista','Attaccante'])) then continue;
    elsif p_kind='specific' then
      v:=coalesce(aliases->>v,v);
      if not(v=any(array['Terzino destro','Difensore centrale','Terzino sinistro','Mediano','Esterno sinistro','Centrocampista Centrale','Esterno destro','Trequartista','Ala sinistra','Seconda Punta','Ala destra','Punta centrale'])) then continue; end if;
    elsif p_kind='figure' then
      v:=case v when 'Fisioterapia/Medicina sportiva' then 'Fisioterapia / Medicina sportiva'
        when 'Commerciale/Business' then 'Commerciale / Business' else v end;
    end if;
    if not(v=any(result)) then result:=array_append(result,v); end if;
  end loop;
  return result;
end $$;

create function private.admin_announcement_display_title_v1(p_type text,p_title text,p_detail jsonb)
returns text language plpgsql immutable security invoker set search_path='' as $$
declare custom_title text; primary_roles text[]; specific_roles text[]; figures text[]; role text;
begin
  custom_title:=private.admin_announcement_title_text_v1(p_title,50);
  if custom_title is not null then return custom_title; end if;
  case p_type
    when 'annuncio_giocatore', 'annuncio_staff_sportivo', 'annuncio_arbitro' then return 'Ricerca opportunità';
    when 'annuncio_squadra_cerca_giocatore' then
      primary_roles:=private.admin_announcement_title_values_v1(p_detail->'ruoli_principali','primary');
      specific_roles:=private.admin_announcement_title_values_v1(p_detail->'ruoli_secondari','specific');
      if cardinality(primary_roles)=1 and cardinality(specific_roles)=1 then role:=specific_roles[1];
      elsif cardinality(primary_roles)+cardinality(specific_roles)=1 then role:=coalesce(primary_roles[1],specific_roles[1]); end if;
      return case when role is not null then 'Ricerca '||role else 'Ricerca giocatori' end;
    when 'annuncio_squadra_cerca_staff' then
      figures:=private.admin_announcement_title_values_v1(p_detail->'figure_ricercate','figure');
      return case when cardinality(figures)=1 then 'Ricerca '||figures[1] else 'Ricerca staff sportivo' end;
    when 'annuncio_squadra_cerca_partita' then return 'Ricerca partite/amichevoli';
    when 'annuncio_squadra_cerca_sponsor' then return 'Ricerca sponsor';
    when 'annuncio_torneo_evento' then return coalesce(private.admin_announcement_title_text_v1(p_detail->>'nome_evento',160),'Ricerca opportunità');
    when 'annuncio_campo_impianto' then return 'CAMPO DISPONIBILE';
    when 'annuncio_servizi_consulenze' then
      figures:=private.admin_announcement_title_values_v1(p_detail->'figura_professionale','plain');
      return case when cardinality(figures)>0 then 'Servizi di '||figures[1] else 'Servizi e professionisti' end;
    when 'annuncio_creators' then return 'Contenuto creator';
    else return 'Annuncio senza titolo';
  end case;
end $$;

-- Called only inside the already authorized list, AFTER its bounded page CTE.
-- No raw detail is exposed and no children/media/contacts are scanned for titles.
create function private.admin_announcement_list_title_v1(p_id uuid,p_type text,p_title text)
returns text language plpgsql stable security invoker set search_path='' as $$
declare detail jsonb;
begin
  if private.admin_announcement_title_text_v1(p_title,50) is null then
    case p_type
      when 'annuncio_squadra_cerca_giocatore' then
        select jsonb_build_object('ruoli_principali',d.ruoli_principali,'ruoli_secondari',d.ruoli_secondari) into detail from public.annuncio_squadra_cerca_giocatore d where d.uuid_annuncio=p_id;
      when 'annuncio_squadra_cerca_staff' then
        select jsonb_build_object('figure_ricercate',d.figure_ricercate) into detail from public.annuncio_squadra_cerca_staff d where d.uuid_annuncio=p_id;
      when 'annuncio_torneo_evento' then
        select jsonb_build_object('nome_evento',d.nome_evento) into detail from public.annuncio_torneo_evento d where d.uuid_annuncio=p_id;
      when 'annuncio_servizi_consulenze' then
        select jsonb_build_object('figura_professionale',d.figura_professionale) into detail from public.annuncio_servizi_consulenze d where d.uuid_annuncio=p_id;
      else null;
    end case;
  end if;
  return private.admin_announcement_display_title_v1(p_type,p_title,detail);
end $$;


create or replace function private.admin_review_issues_v1(p_detail jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare issues jsonb:=p_detail->'issues'; row jsonb; field text; kind text; value jsonb;
  s text; days text[]; invalid boolean;
begin
  for row in select x.value from jsonb_array_elements(p_detail->'contacts') x loop
    s:=btrim(row->>'value');
    if not coalesce(case row->>'kind'
      when 'email' then private.admin_utf16_length_v1(s)<=254 and s ~ '^[^@\s?&#]+@[^@\s?&#]+\.[^@\s?&#]+$'
      when 'telefono' then length(s)<=40 and s ~ '^[+0-9().\s-]+$' and length(regexp_replace(s,'[^0-9]','','g')) between 6 and 20
      else false end,false) then issues:=issues||'"INVALID_CONTACT"'::jsonb; end if;
  end loop;
  for row in select x.value from jsonb_array_elements(p_detail->'links') x loop
    if not private.admin_review_url_valid_v1(row->>'value') then issues:=issues||'"UNSAFE_LINK"'::jsonb; end if;
  end loop;
  for row in select x.value from jsonb_array_elements(p_detail->'media') x loop
    if not private.admin_announcement_image_path_valid_v1(row->>'value',row->>'mimeType')
      and not private.admin_review_url_valid_v1(row->>'value') then issues:=issues||'"UNSAFE_MEDIA"'::jsonb; end if;
  end loop;
  for field,kind in select f.key,f.value from jsonb_each_text(coalesce(private.admin_announcement_detail_spec_v1(p_detail#>>'{summary,type}'),'{}')) f loop
    value:=p_detail#>array['content','fields',field]; invalid:=false;
    if value='null'::jsonb then continue; end if;
    if kind='text' then invalid:=char_length(value#>>'{}')>5000;
    elsif kind='history' then
      for row in select x.value from jsonb_array_elements(value) x loop
        invalid:=invalid or coalesce((row->>'periodoDa')<>'' and (row->>'periodoDa') !~ '^(19|20)[0-9]{2}$',false)
          or coalesce((row->>'periodoA')<>'' and (row->>'periodoA')<>'oggi' and (row->>'periodoA') !~ '^(19|20)[0-9]{2}$',false)
          or coalesce((row->>'stato')<>'' and (row->>'stato') not in ('non-specificare','in-corso','conseguito'),false);
      end loop;
    elsif kind='schedule' then
      days:=array[]::text[];
      for row in select x.value from jsonb_array_elements(value) x loop
        s:=row->>'giorno';
        invalid:=invalid or s is null or s not in ('lunedi','martedi','mercoledi','giovedi','venerdi','sabato','domenica')
          or s=any(days) or row->>'attivo' is null
          or coalesce((row->>'dalle')<>'' and (row->>'dalle') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$',false)
          or coalesce((row->>'alle')<>'' and (row->>'alle') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$',false);
        days:=array_append(days,s);
      end loop;
    end if;
    if invalid then issues:=issues||jsonb_build_array('INVALID_FIELD:'||field); end if;
  end loop;
  return (select coalesce(jsonb_agg(distinct v),'[]') from jsonb_array_elements(issues) v);
end $$;

create or replace function private.admin_moderation_capabilities_v1(p_snapshot jsonb,p_detail jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare b jsonb:=p_snapshot->'base'; status text:=b->>'stato_annuncio'; complete boolean;
  operation text; reason text; caps jsonb:='{}';
begin
  complete:=(p_detail->>'complete')::boolean;
  foreach operation in array array['approve','reject','hide','show','trash','restore'] loop
    reason:=null;
    if operation in ('trash','restore') and not coalesce((select enabled from private.admin_trash_release_v1 where singleton),false) then reason:='TRASH_NOT_ENABLED';
    elsif operation='trash' and b->>'eliminato_il' is not null then reason:='ALREADY_TRASHED';
    elsif operation='restore' and b->>'eliminato_il' is null then reason:='NOT_TRASHED';
    elsif operation not in ('trash','restore') and b->>'eliminato_il' is not null then reason:='IN_TRASH';
    elsif operation in ('approve','reject') and status is distinct from 'in_revisione' then reason:='REVIEW_REQUIRED';
    elsif operation='hide' and b->'nascosto'='true'::jsonb then reason:='ALREADY_HIDDEN';
    elsif operation='show' and b->'nascosto' is distinct from 'true'::jsonb then reason:='NOT_HIDDEN';
    elsif operation='show' and (status is null or status not in ('in_revisione','pubblicato','rifiutato')) then reason:='PAYMENT_OR_STATE_PENDING';
    elsif operation in ('approve','show') then
      if not complete then reason:='INCOMPLETE_CONTENT';
      elsif b->>'tipologia_annuncio'='annuncio_servizi_consulenze' and jsonb_array_length(p_snapshot->'locations')=0 then reason:='REGIONS_REQUIRED';
      elsif b->>'tipologia_annuncio'='annuncio_servizi_consulenze' and exists (
        select 1 from jsonb_array_elements(p_snapshot->'locations') location
        where not exists(select 1 from public.restricted_profile_access access
          where access.profile_id=(b->>'autore_annuncio')::uuid and access.profile_type='servizi-consulenze'
            and location->>'regione'=any(access.allowed_regions))
      ) then reason:='REGIONS_NOT_ALLOWED';
      elsif operation='approve' and b->>'livello_annuncio'='prioritario' and not exists (
        select 1 from private.announcement_submission s where s.announcement_id=(b->>'uuid')::uuid
          and s.requested_visibility='prioritario' and s.paid_at is not null and s.refund_required_at is null and s.refunded_at is null
      ) then reason:='PAYMENT_REQUIRED';
      end if;
    end if;
    caps:=caps||jsonb_build_object(operation,jsonb_build_object('allowed',reason is null,'reason',reason));
  end loop;
  return caps;
end $$;

create or replace function private.project_admin_announcement_v1(v_snapshot jsonb)
returns jsonb language plpgsql stable security invoker set search_path='' set timezone='UTC' as $$
declare result jsonb; b jsonb; v_type text; v_spec jsonb; v_fields jsonb:='{}'; v_issues jsonb:='[]';
  v_key text; v_kind text; v_projected jsonb; v_name_field text; v_collection text; v_rows jsonb; v_limit integer;
  v_collections jsonb:='{}'; v_row jsonb; v_item jsonb; v_count integer;
begin
  b:=v_snapshot->'base'; v_type:=b->>'tipologia_annuncio'; v_spec:=private.admin_announcement_detail_spec_v1(v_type);
  if v_spec is null then v_issues:=v_issues||'"UNSUPPORTED_TYPE"'::jsonb;
  elsif v_snapshot->'detail'='null'::jsonb then v_issues:=v_issues||'"DETAIL_MISSING"'::jsonb;
  end if;
  for v_key,v_kind in select key,value from pg_catalog.jsonb_each_text(coalesce(v_spec,'{}')) loop
    v_name_field:=case when v_type='annuncio_staff_sportivo' and v_key='lista_esperienze' then 'titolo' else 'ente' end;
    v_projected:=private.admin_announcement_field_v1(v_snapshot->'detail'->v_key,v_kind,v_name_field);
    v_fields:=v_fields||pg_catalog.jsonb_build_object(v_key,v_projected->'value');
    if (v_projected->>'invalid')::boolean then v_issues:=v_issues||pg_catalog.jsonb_build_array('INVALID_FIELD:'||v_key); end if;
  end loop;
  foreach v_collection in array array['locations','contacts','links','media'] loop
    v_rows:='[]'; v_count:=0; v_limit:=case when v_collection='locations' then 100 else 30 end;
    for v_row in select value from pg_catalog.jsonb_array_elements(v_snapshot->v_collection) loop
      v_count:=v_count+1;
      if v_count>v_limit then v_issues:=v_issues||pg_catalog.jsonb_build_array('COLLECTION_TRUNCATED:'||v_collection); exit; end if;
      v_item:=pg_catalog.jsonb_build_object('id',v_row->>'id');
      if v_collection='locations' then v_item:=v_item||pg_catalog.jsonb_build_object('region',v_row->'regione','city',v_row->'citta');
      elsif v_collection='contacts' then v_item:=v_item||pg_catalog.jsonb_build_object('kind',v_row->'tipo','value',v_row->'valore','referent',v_row->'referente');
      elsif v_collection='links' then v_item:=v_item||pg_catalog.jsonb_build_object('platform',v_row->'piattaforma','value',v_row->'sublink');
      else v_item:=v_item||pg_catalog.jsonb_build_object('mimeType',v_row->'formato_media','value',v_row->'link_media'); end if;
      v_rows:=v_rows||pg_catalog.jsonb_build_array(v_item);
    end loop;
    v_collections:=v_collections||pg_catalog.jsonb_build_object(v_collection,v_rows);
  end loop;
  result:=v_collections||pg_catalog.jsonb_build_object(
    'summary',pg_catalog.jsonb_build_object('id',b->'uuid','title',b->'titolo_annuncio',
      'displayTitle',private.admin_announcement_display_title_v1(v_type,b->>'titolo_annuncio',v_snapshot->'detail'),
      'type',v_type,'status',b->'stato_annuncio',
      'trashed',b->>'eliminato_il' is not null,'hidden',b->'nascosto','private',b->'privato','creatorId',b->'creato_da',
      'createdAt',pg_catalog.to_char((b->>'creato_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'updatedAt',pg_catalog.to_char((b->>'ultima_modifica_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'rowFingerprint',pg_catalog.md5(b::text),'author',private.admin_announcement_author_v1((b->>'autore_annuncio')::uuid,v_type)),
    'trash',jsonb_build_object('deletedAt',pg_catalog.to_char((b->>'eliminato_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'deletedBy',b->'eliminato_da'),'metadata',pg_catalog.jsonb_build_object('moderationInfo',b->'info_stato_annuncio','level',b->'livello_annuncio','priorityActive',b->'priorita_attiva',
      'priorityStartsAt',pg_catalog.to_char((b->>'priorita_inizio_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'priorityEndsAt',pg_catalog.to_char((b->>'priorita_fine_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'updatedById',b->'ultima_modifica_da'),
    'content',pg_catalog.jsonb_build_object('type',case when v_spec is null then 'unsupported' else v_type end,'fields',v_fields),
    'contentFingerprint','content-v1:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_snapshot::text,'UTF8')),'hex'),
    'complete',pg_catalog.jsonb_array_length(v_issues)=0,'issues',v_issues);
  v_issues:=private.admin_review_issues_v1(result);
  result:=result||jsonb_build_object('issues',v_issues,'complete',jsonb_array_length(v_issues)=0);
  return result||jsonb_build_object('moderation',jsonb_build_object('adminHidden',b->'oscurato_da_admin','capabilities',private.admin_moderation_capabilities_v1(v_snapshot,result)));
end;
$$;

create or replace function private.list_admin_announcements_v1(p_query jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' set timezone = 'UTC' as $$
declare
  v_search text := ''; v_status text; v_type text; v_visibility text := 'all'; v_trash text := 'exclude';
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
  if exists (select 1 from pg_catalog.jsonb_object_keys(p_query) k where k not in ('search','status','type','visibility','trash','limit','cursor'))
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
  v_trash:=coalesce(p_query->>'trash','exclude');
  if v_trash collate "C" not in ('exclude','only','all') or (p_query ? 'trash' and jsonb_typeof(p_query->'trash')<>'string') then raise exception using errcode='22023',message='ADMIN_ANNOUNCEMENT_QUERY_INVALID'; end if;
  if p_query ? 'limit' then
    if pg_catalog.jsonb_typeof(p_query->'limit') is distinct from 'number' or (p_query->>'limit') !~ '^[0-9]{1,2}$' then
      raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
    end if;
    v_limit := (p_query->>'limit')::integer;
    if v_limit < 1 or v_limit > 30 then
      raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
    end if;
  end if;
  v_filters := pg_catalog.jsonb_build_object('search',v_search,'status',v_status,'type',v_type,'visibility',v_visibility,'trash',v_trash);
  v_cursor := p_query->'cursor';
  if v_cursor is not null and v_cursor <> 'null'::jsonb then
    if pg_catalog.jsonb_typeof(v_cursor) is distinct from 'object' then
      raise exception using errcode='22023', message='ADMIN_ANNOUNCEMENT_QUERY_INVALID';
    end if;
    if (select count(*) from pg_catalog.jsonb_object_keys(v_cursor)) <> 4
      or not (v_cursor ?& array['v','createdAt','id','filters'])
      or v_cursor->'v' is distinct from '2'::jsonb or v_cursor->'filters' is distinct from v_filters
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
    where (v_trash='all' or (v_trash='exclude' and a.eliminato_il is null) or (v_trash='only' and a.eliminato_il is not null))
      and (v_status is null or a.stato_annuncio collate "C" = v_status)
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
      'id',a.uuid,'title',a.titolo_annuncio,
      'displayTitle',private.admin_announcement_list_title_v1(a.uuid,a.tipologia_annuncio,a.titolo_annuncio),
      'type',a.tipologia_annuncio,'status',a.stato_annuncio,
      'trashed',a.eliminato_il is not null,'hidden',a.nascosto,'private',a.privato,'creatorId',a.creato_da,
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
      select pg_catalog.jsonb_build_object('v',2,'id',uuid,'createdAt',pg_catalog.to_char(creato_il,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'filters',v_filters)
      from page order by creato_il asc nulls first, uuid asc limit 1
    ) else null end
  ) into v_result;
  return v_result;
end;
$$;

-- Helpers stay private and execute with the existing authorized RPC's invoker.
revoke all on function private.admin_announcement_image_path_valid_v1(text,text) from public,anon,authenticated,service_role;
revoke all on function private.admin_announcement_title_text_v1(text,integer) from public,anon,authenticated,service_role;
revoke all on function private.admin_announcement_title_values_v1(jsonb,text) from public,anon,authenticated,service_role;
revoke all on function private.admin_announcement_display_title_v1(text,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function private.admin_announcement_list_title_v1(uuid,text,text) from public,anon,authenticated,service_role;

commit;

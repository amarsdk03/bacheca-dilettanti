-- 07B: one authorized snapshot for the detail. No changes to table grants/RLS.
begin;

create function private.admin_announcement_detail_spec_v1(p_type text)
returns jsonb language sql immutable security invoker set search_path='' as $$
  select case p_type collate "C"
    when 'annuncio_giocatore' then '{"tipologie_sport":"strings","ruoli_principali":"strings","ruoli_secondari":"strings","categorie_ricercate":"strings","descrizione_aggiuntiva":"text"}'::jsonb
    when 'annuncio_squadra_cerca_giocatore' then '{"gruppo_squadra":"text","tipologie_sport":"strings","ruoli_principali":"strings","ruoli_secondari":"strings","annata_da":"number","annata_a":"number","annate_ricercate":"strings","stagione":"text","descrizione_aggiuntiva":"text"}'::jsonb
    when 'annuncio_squadra_cerca_staff' then '{"figura_ricercata":"text","figure_ricercate":"strings","settore":"text","compenso_mensile":"number","requisiti":"text","stagione":"text","periodo_dal":"text","periodo_al":"text","descrizione_aggiuntiva":"text"}'::jsonb
    when 'annuncio_squadra_cerca_partita' then '{"gruppo_squadra":"text","categorie_avversario":"strings","disponibilita_trasferta":"text","periodo_dal":"text","periodo_al":"text","orario_dalle":"text","orario_alle":"text","descrizione_aggiuntiva":"text"}'::jsonb
    when 'annuncio_squadra_cerca_sponsor' then '{"categoria_settore":"text","supporto_cercato":"text","offerta_fornita":"text","descrizione_aggiuntiva":"text"}'::jsonb
    when 'annuncio_staff_sportivo' then '{"figure_professionali":"strings","tipologie_sport":"strings","categorie_ricercate":"strings","disponibilita_occupazione":"text","disponibilita_spostamento":"text","disponibile_remoto":"boolean","descrizione_aggiuntiva":"text","lista_esperienze":"history","qualifiche_licenze":"history"}'::jsonb
    when 'annuncio_arbitro' then '{"tipologie_sport":"strings","categorie_ricercate":"strings","disponibilita_occupazione":"text","disponibilita_spostamento":"text","automunito":"text","descrizione_aggiuntiva":"text","lista_esperienze":"history","qualifiche_licenze":"history"}'::jsonb
    when 'annuncio_torneo_evento' then '{"nome_evento":"text","modalita_iscrizione":"text","annate_ammesse_da":"text","annate_ammesse_a":"text","numero_squadre":"number","costo_partecipazione":"number","tipo_partecipazione":"text","tipologie_sport":"strings","lista_premi_trofei":"prizes","descrizione_aggiuntiva":"text"}'::jsonb
    when 'annuncio_campo_impianto' then '{"tipologie_sport":"strings","orari":"schedule","costo_partenza":"number","servizi_inclusi":"text","indirizzo":"text","descrizione_aggiuntiva":"text"}'::jsonb
    when 'annuncio_servizi_consulenze' then '{"figura_professionale":"strings","specializzazione":"text","presentazione_servizi":"text","tipologie_sport":"strings","automunito":"text","lista_esperienze":"history","qualifiche_licenze":"history","descrizione_aggiuntiva":"text"}'::jsonb
    when 'annuncio_creators' then '{"titolo_post":"text","descrizione_post":"text","contenuto_post":"text","descrizione_aggiuntiva":"text"}'::jsonb
  end;
$$;

do $$
declare v_type text; v_table text; v_column text; v_columns text[];
begin
  if pg_catalog.to_regprocedure('private.require_admin_context_v1()') is null
    or pg_catalog.to_regprocedure('public.admin_list_announcements_v1(jsonb)') is null then
    raise exception 'ADMIN_ANNOUNCEMENT_LIST_REQUIRED';
  end if;
  foreach v_type in array array['annuncio_giocatore','annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff',
    'annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor','annuncio_staff_sportivo','annuncio_arbitro',
    'annuncio_torneo_evento','annuncio_campo_impianto','annuncio_servizi_consulenze','annuncio_creators'] loop
    v_table := case when v_type='annuncio_creators' then 'annuncio_creator' else v_type end;
    for v_column in select pg_catalog.jsonb_object_keys(private.admin_announcement_detail_spec_v1(v_type)) union all select 'uuid_annuncio' loop
      if not exists (select 1 from pg_catalog.pg_attribute where attrelid=pg_catalog.to_regclass('public.'||v_table)
        and attname=v_column and attnum>0 and not attisdropped) then
        raise exception 'ADMIN_ANNOUNCEMENT_DETAIL_SCHEMA_REQUIRED: %.%',v_table,v_column;
      end if;
    end loop;
    -- The source comparison must not silently pick one of duplicate detail rows.
    if not exists (select 1 from pg_catalog.pg_index i join pg_catalog.pg_attribute a
      on a.attrelid=i.indrelid and a.attnum=i.indkey[0]
      where i.indrelid=pg_catalog.to_regclass('public.'||v_table) and a.attname='uuid_annuncio'
        and i.indisunique and i.indisvalid and i.indnkeyatts=1 and i.indpred is null and i.indexprs is null) then
      raise exception 'ADMIN_ANNOUNCEMENT_DETAIL_UNIQUE_REQUIRED: %',v_table;
    end if;
  end loop;
  for v_table,v_columns in select * from (values
    ('annuncio',array['uuid','info_stato_annuncio','livello_annuncio','priorita_attiva','priorita_inizio_il','priorita_fine_il','ultima_modifica_da']),
    ('localita_annuncio',array['id','uuid_annuncio','regione','citta']),
    ('contatto_annuncio',array['id','uuid_annuncio','tipo','valore','referente']),
    ('link_social_annuncio',array['id','uuid_annuncio','piattaforma','sublink']),
    ('media_annuncio',array['id','uuid_annuncio','formato_media','link_media'])
  ) required(table_name,column_names) loop
    foreach v_column in array v_columns loop
      if not exists (select 1 from pg_catalog.pg_attribute where attrelid=pg_catalog.to_regclass('public.'||v_table)
        and attname=v_column and attnum>0 and not attisdropped) then
        raise exception 'ADMIN_ANNOUNCEMENT_DETAIL_SCHEMA_REQUIRED: %.%',v_table,v_column;
      end if;
    end loop;
  end loop;
end;
$$;

-- Internal only: raw source never leaves the privileged call. STABLE functions
-- share the calling statement's snapshot. Ordered arrays also cover omitted rows.
create function private.admin_announcement_snapshot_v1(p_id uuid)
returns jsonb language plpgsql stable security invoker set search_path='' set timezone='UTC' as $$
declare v_base jsonb; v_detail jsonb; v_type text; v_table text;
begin
  select pg_catalog.to_jsonb(a) into v_base from public.annuncio a where a.uuid=p_id;
  if v_base is null then return null; end if;
  v_type := v_base->>'tipologia_annuncio';
  if private.admin_announcement_detail_spec_v1(v_type) is not null then
    v_table := case when v_type='annuncio_creators' then 'annuncio_creator' else v_type end;
    -- Identifier comes only from the closed spec above, never directly from input.
    execute pg_catalog.format('select to_jsonb(d) from public.%I d where d.uuid_annuncio=$1',v_table) into v_detail using p_id;
  end if;
  return pg_catalog.jsonb_build_object('base',v_base,'detail',v_detail,
    'locations',coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(r) order by r.id) from public.localita_annuncio r where r.uuid_annuncio=p_id),'[]'::jsonb),
    'contacts',coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(r) order by r.id) from public.contatto_annuncio r where r.uuid_annuncio=p_id),'[]'::jsonb),
    'links',coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(r) order by r.id) from public.link_social_annuncio r where r.uuid_annuncio=p_id),'[]'::jsonb),
    'media',coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(r) order by r.id) from public.media_annuncio r where r.uuid_annuncio=p_id),'[]'::jsonb));
end;
$$;

-- Public-name rules match 07A; this helper itself has no API execution grant.
create function private.admin_announcement_author_v1(p_id uuid,p_type text)
returns jsonb language sql stable security invoker set search_path='' as $$
  select pg_catalog.jsonb_build_object('profileId',p_id,'userId',p.uuid_utente,
    'displayName',coalesce(nullif(pg_catalog.btrim(display.name),''),'Profilo non disponibile'),
    'anonymous',display.anonymous,'available',nullif(pg_catalog.btrim(display.name),'') is not null)
  from (values(1)) seed(n)
  left join public.profilo p on p.uuid=p_id and p.nascosto is false
  left join lateral (
    select names.name,names.anonymous from (
      select g.id,case when g.nominativo_anonimo is true then 'Giocatore' when g.nominativo_anonimo is false then pg_catalog.btrim(pg_catalog.concat_ws(' ',g.nome,g.cognome)) end as name,g.nominativo_anonimo as anonymous
        from public.profilo_giocatore g where g.uuid_profilo=p.uuid and g.nascosto is false and p_type collate "C"='annuncio_giocatore'
      union all
      select s.id,case when s.nominativo_anonimo is true then 'Squadra' when s.nominativo_anonimo is false then s.nome_societa end,s.nominativo_anonimo
        from public.profilo_squadra s where s.uuid_profilo=p.uuid and s.nascosto is false and p_type collate "C" in ('annuncio_squadra_cerca_giocatore','annuncio_squadra_cerca_staff','annuncio_squadra_cerca_partita','annuncio_squadra_cerca_sponsor')
      union all
      select s.id,case when s.nominativo_anonimo is true then 'Staff sportivo' when s.nominativo_anonimo is false then pg_catalog.btrim(pg_catalog.concat_ws(' ',s.nome,s.cognome)) end,s.nominativo_anonimo
        from public.profilo_staff_sportivo s where s.uuid_profilo=p.uuid and s.nascosto is false and p_type collate "C"='annuncio_staff_sportivo'
      union all
      select r.id,case when r.nominativo_anonimo is true then 'Arbitro' when r.nominativo_anonimo is false then pg_catalog.btrim(pg_catalog.concat_ws(' ',r.nome,r.cognome)) end,r.nominativo_anonimo
        from public.profilo_arbitro r where r.uuid_profilo=p.uuid and r.nascosto is false and p_type collate "C"='annuncio_arbitro'
      union all
      select s.id,s.nome,false from public.profilo_servizi_consulenze s where s.uuid_profilo=p.uuid and s.nascosto is false and p_type collate "C"='annuncio_servizi_consulenze'
      union all
      select c.id,c.nome_creator,false from public.profilo_creator c where c.uuid_profilo=p.uuid and c.nascosto is false and p_type collate "C"='annuncio_creators'
      union all
      select e.id,e.nome_organizzazione,false from public.profilo_torneo_evento e where e.uuid_profilo=p.uuid and e.nascosto is false and p_type collate "C"='annuncio_torneo_evento'
      union all
      select c.id,c.nome_organizzazione,false from public.profilo_campi_impianti c where c.uuid_profilo=p.uuid and c.nascosto is false and p_type collate "C"='annuncio_campo_impianto'
    ) names order by names.id limit 1
  ) display on true;
$$;

-- Shape projection occurs in SQL as well: direct RPC calls cannot retrieve
-- arbitrary nested properties or stale copies of linked anonymous team names.
create function private.admin_announcement_field_v1(p_value jsonb,p_kind text,p_name_field text)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_out jsonb := 'null'; v_bad boolean := false; v_entry jsonb; v_item jsonb;
  v_key text; v_keys text[]; v_max integer; v_count integer := 0; v_ref text; v_instance text; v_name text; v_original text; v_teams jsonb;
begin
  if p_value is null or p_value='null'::jsonb then return pg_catalog.jsonb_build_object('value',null,'invalid',false); end if;
  if p_kind in ('text','number','boolean') then
    if pg_catalog.jsonb_typeof(p_value) <> (case when p_kind='text' then 'string' else p_kind end) then v_bad:=true;
    else
      v_out:=p_value;
      if p_kind='text' and pg_catalog.length(p_value#>>'{}')>5000 then
        v_out:=pg_catalog.to_jsonb(pg_catalog.left(p_value#>>'{}',5000)); v_bad:=true;
      end if;
    end if;
  elsif pg_catalog.jsonb_typeof(p_value)<>'array' then v_bad:=true;
  else
    v_out:='[]';
    v_max:=case p_kind when 'strings' then 32 when 'history' then 60 when 'schedule' then 7 when 'prizes' then 20 else 0 end;
    if p_kind='history' then
      -- One set-based lookup for this history, not one PL/pgSQL query per entry.
      select coalesce(pg_catalog.jsonb_object_agg(e.n::text,coalesce(team.name,'Squadra')),'{}'::jsonb) into v_teams
      from pg_catalog.jsonb_array_elements(p_value) with ordinality e(item,n)
      left join lateral (
        select case when s.nominativo_anonimo is false then nullif(pg_catalog.btrim(s.nome_societa),'') else 'Squadra' end as name
        from public.profilo p join public.profilo_squadra s on s.uuid_profilo=p.uuid
        where p.uuid=(case when pg_catalog.jsonb_typeof(e.item->'squadraProfiloId')='string'
          and (e.item->>'squadraProfiloId') ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then (e.item->>'squadraProfiloId')::uuid end)
          and p.nascosto is false and p.uuid_utente is not null and s.nascosto is false
          and (nullif(e.item->>'squadraIstanzaId','') is null or s.id::text=e.item->>'squadraIstanzaId')
        order by s.id limit 1
      ) team on true where e.n<=v_max and pg_catalog.jsonb_typeof(e.item)='object';
    end if;
    for v_entry in select value from pg_catalog.jsonb_array_elements(p_value) loop
      v_count:=v_count+1;
      if v_count>v_max then v_bad:=true; exit; end if;
      if p_kind='strings' then
        if pg_catalog.jsonb_typeof(v_entry)='string' and pg_catalog.length(v_entry#>>'{}')<=160 then v_out:=v_out||pg_catalog.jsonb_build_array(v_entry);
        else v_bad:=true; end if;
        continue;
      end if;
      if pg_catalog.jsonb_typeof(v_entry)<>'object' then v_bad:=true; continue; end if;
      v_keys:=case p_kind
        when 'history' then array['id','titolo','ente','periodoDa','periodoA','descrizione','stato']
        when 'schedule' then array['giorno','attivo','dalle','alle']
        when 'prizes' then array['id','posto','titoloPremio'] end;
      v_item:='{}';
      if exists (select 1 from pg_catalog.jsonb_object_keys(v_entry) k where not(k=any(v_keys)) and not(p_kind='history' and k in ('squadraProfiloId','squadraIstanzaId'))) then v_bad:=true; end if;
      foreach v_key in array v_keys loop
        if v_entry->v_key is null or v_entry->v_key='null'::jsonb then v_item:=v_item||pg_catalog.jsonb_build_object(v_key,null);
        elsif pg_catalog.jsonb_typeof(v_entry->v_key)=(case when v_key='attivo' then 'boolean' else 'string' end)
          and pg_catalog.length(v_entry->>v_key)<=5000 then v_item:=v_item||pg_catalog.jsonb_build_object(v_key,v_entry->v_key);
        else v_item:=v_item||pg_catalog.jsonb_build_object(v_key,null); v_bad:=true; end if;
      end loop;
      if p_kind='history' then
        v_ref:=nullif(v_entry->>'squadraProfiloId',''); v_instance:=nullif(v_entry->>'squadraIstanzaId','');
        v_name:=null; v_original:=v_entry->>p_name_field;
        if v_ref is not null then
          if pg_catalog.jsonb_typeof(v_entry->'squadraProfiloId')='string' and v_ref ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
            if v_instance is not null and (v_instance !~ '^[0-9]{1,19}$' or pg_catalog.jsonb_typeof(v_entry->'squadraIstanzaId') not in ('number','string')) then v_bad:=true;
            else
              v_name:=v_teams->>v_count::text;
            end if;
            v_item:=v_item||pg_catalog.jsonb_build_object('squadraProfiloId',pg_catalog.lower(v_ref));
          else v_bad:=true; v_item:=v_item||pg_catalog.jsonb_build_object('squadraProfiloId',null); end if;
          v_name:=coalesce(v_name,'Squadra');
          v_item:=v_item||pg_catalog.jsonb_build_object(p_name_field,v_name);
          if v_entry->>'ente'=v_original then v_item:=v_item||pg_catalog.jsonb_build_object('ente',v_name); end if;
          if v_entry->>'titolo'=v_original then v_item:=v_item||pg_catalog.jsonb_build_object('titolo',v_name); end if;
        else v_item:=v_item||pg_catalog.jsonb_build_object('squadraProfiloId',null); end if;
        v_item:=v_item||pg_catalog.jsonb_build_object('squadraIstanzaId',case when v_instance ~ '^[0-9]{1,19}$' then v_instance else null end);
      end if;
      v_out:=v_out||pg_catalog.jsonb_build_array(v_item);
    end loop;
  end if;
  return pg_catalog.jsonb_build_object('value',v_out,'invalid',v_bad);
end;
$$;

create function private.get_admin_announcement_v1(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare v_snapshot jsonb; b jsonb; v_type text; v_spec jsonb; v_fields jsonb:='{}'; v_issues jsonb:='[]';
  v_key text; v_kind text; v_projected jsonb; v_name_field text; v_collection text; v_rows jsonb; v_limit integer;
  v_collections jsonb:='{}'; v_row jsonb; v_item jsonb; v_count integer;
begin
  if pg_catalog.current_setting('role',true) is distinct from 'authenticated' then
    raise exception using errcode='42501',message='ADMIN_ACCESS_DENIED';
  end if;
  perform private.require_admin_context_v1();
  if p_id is null then raise exception using errcode='22023',message='ADMIN_ANNOUNCEMENT_ID_INVALID'; end if;
  v_snapshot:=private.admin_announcement_snapshot_v1(p_id);
  if v_snapshot is null then return null; end if;
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
  return v_collections||pg_catalog.jsonb_build_object(
    'summary',pg_catalog.jsonb_build_object('id',b->'uuid','title',b->'titolo_annuncio','type',v_type,'status',b->'stato_annuncio',
      'hidden',b->'nascosto','private',b->'privato','creatorId',b->'creato_da',
      'createdAt',pg_catalog.to_char((b->>'creato_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'updatedAt',pg_catalog.to_char((b->>'ultima_modifica_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'rowFingerprint',pg_catalog.md5(b::text),'author',private.admin_announcement_author_v1((b->>'autore_annuncio')::uuid,v_type)),
    'metadata',pg_catalog.jsonb_build_object('moderationInfo',b->'info_stato_annuncio','level',b->'livello_annuncio','priorityActive',b->'priorita_attiva',
      'priorityStartsAt',pg_catalog.to_char((b->>'priorita_inizio_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'priorityEndsAt',pg_catalog.to_char((b->>'priorita_fine_il')::timestamptz,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'updatedById',b->'ultima_modifica_da'),
    'content',pg_catalog.jsonb_build_object('type',case when v_spec is null then 'unsupported' else v_type end,'fields',v_fields),
    'contentFingerprint','content-v1:'||pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_snapshot::text,'UTF8')),'hex'),
    'complete',pg_catalog.jsonb_array_length(v_issues)=0,'issues',v_issues);
end;
$$;

create function public.admin_get_announcement_v1(p_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
  select private.get_admin_announcement_v1(p_id);
$$;

alter function private.admin_announcement_detail_spec_v1(text) owner to postgres;
alter function private.admin_announcement_snapshot_v1(uuid) owner to postgres;
alter function private.admin_announcement_author_v1(uuid,text) owner to postgres;
alter function private.admin_announcement_field_v1(jsonb,text,text) owner to postgres;
alter function private.get_admin_announcement_v1(uuid) owner to postgres;
alter function public.admin_get_announcement_v1(uuid) owner to postgres;
revoke all on function private.admin_announcement_detail_spec_v1(text) from public,anon,authenticated,service_role;
revoke all on function private.admin_announcement_snapshot_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function private.admin_announcement_author_v1(uuid,text) from public,anon,authenticated,service_role;
revoke all on function private.admin_announcement_field_v1(jsonb,text,text) from public,anon,authenticated,service_role;
revoke all on function private.get_admin_announcement_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function public.admin_get_announcement_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function private.get_admin_announcement_v1(uuid) to authenticated;
grant execute on function public.admin_get_announcement_v1(uuid) to authenticated;
comment on function public.admin_get_announcement_v1(uuid) is
  'Admin-only projected detail. Current human session required; null means absent only after authorization. Full source fingerprint is a comparison, never authorization. No account/Auth payloads.';
notify pgrst,'reload schema';
commit;

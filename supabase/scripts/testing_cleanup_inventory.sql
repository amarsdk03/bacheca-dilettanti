-- One-off testing cleanup: read-only inventory. Export the inventory cell as JSON.
begin isolation level repeatable read read only;
set local statement_timeout='60s';
set local search_path=pg_catalog;
with relations as materialized (
  select c.oid,n.nspname,c.relname,c.relkind,c.relispartition,c.relrowsecurity,c.relforcerowsecurity,c.relacl,c.relowner
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where c.relkind in ('r','p') and (n.nspname in ('public','private') or (n.nspname='auth' and c.relname='users') or (n.nspname='storage' and c.relname in ('objects','buckets')))
), fingerprints as materialized (
  select r.nspname||'.'||r.relname as name,x.n::bigint as count,x.h as hash
  from relations r cross join lateral xmltable('/table/row' passing query_to_xml(format(
    'select count(*) n, md5(coalesce(string_agg(md5((%s)::text),'''' order by md5((%s)::text)),'''')) h from %I.%I t',
    case when r.nspname='auth' then 'jsonb_build_object(''id'',t.id,''email'',t.email,''deleted_at'',to_jsonb(t)->''deleted_at'')' else 'to_jsonb(t)' end,
    case when r.nspname='auth' then 'jsonb_build_object(''id'',t.id,''email'',t.email,''deleted_at'',to_jsonb(t)->''deleted_at'')' else 'to_jsonb(t)' end,
    r.nspname,r.relname),false,false,'') columns n text path 'n',h text path 'h') x
), schema_parts as (
  select 'relation:'||r.nspname||'.'||r.relname as key,
    jsonb_build_array(r.relkind,r.relispartition,r.relrowsecurity,r.relforcerowsecurity,r.relacl,r.relowner)::text as value from relations r
  union all select 'column:'||a.attrelid||':'||a.attnum,to_jsonb(a)::text||coalesce(pg_get_expr(d.adbin,d.adrelid),'')
    from pg_attribute a join relations r on r.oid=a.attrelid left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attnum>0 and not a.attisdropped
  union all select 'constraint:'||p.oid,pg_get_constraintdef(p.oid)||coalesce(p.convalidated::text,'') from pg_constraint p where p.conrelid in (select oid from relations) or p.confrelid in (select oid from relations)
  union all select 'trigger:'||t.oid,pg_get_triggerdef(t.oid)||t.tgenabled::text||pg_get_functiondef(t.tgfoid) from pg_trigger t where t.tgrelid in (select oid from relations) and not t.tgisinternal
  union all select 'policy:'||schemaname||'.'||tablename||'.'||policyname,to_jsonb(p)::text from pg_policies p where schemaname in ('public','private','storage')
), protected_profiles as (select autore_annuncio as id from public.annuncio where autore_annuncio is not null
  union select uuid_profilo from private.segnalazioni where uuid_profilo is not null)
select jsonb_build_object(
  'version',1,'capturedAt',statement_timestamp(),'database',current_database(),
  'schemaHash',(select md5(coalesce(string_agg(key||':'||value,'' order by key),'')) from schema_parts),
  'tables',(select coalesce(jsonb_agg(to_jsonb(f) order by name),'[]') from fingerprints f),
  'partitions',(select coalesce(jsonb_agg(nspname||'.'||relname order by nspname,relname),'[]') from relations where relkind='p' or relispartition),
  'admin',(select jsonb_build_object('id',a.id,'email',a.email,'kind',u.tipologia_utente,'userId',u.utente_uuid) from auth.users a join public.utente u on u.auth_user_uuid=a.id where a.id='0b889a5b-a5a5-49ce-a8b7-c1c899f0e391' and lower(a.email)='bachecadilettanti@gmail.com'),
  'reports',(select coalesce(jsonb_agg(id order by id),'[]') from private.segnalazioni),
  'announcements',(select coalesce(jsonb_agg(uuid order by uuid),'[]') from public.annuncio),
  'keepProfiles',(select coalesce(jsonb_agg(id order by id),'[]') from protected_profiles),
  'deleteAuthIds',(select coalesce(jsonb_agg(id order by id),'[]') from auth.users where id<>'0b889a5b-a5a5-49ce-a8b7-c1c899f0e391'),
  'deleteProfiles',(select coalesce(jsonb_agg(uuid order by uuid),'[]') from public.profilo where uuid not in (select id from protected_profiles)),
  'channels',(select coalesce(jsonb_agg(x.value::jsonb),'[]'::jsonb)
  from pg_class rc join pg_namespace rn on rn.oid=rc.relnamespace
  cross join lateral xmltable('/table/row' passing query_to_xml(format('select (%s)::text as value from %I.%I t','jsonb_build_object(''id'',t.id,''key'',t.channel_key,''name'',t.name,''url'',t.url,''region'',t.region,''active'',t.active)',rn.nspname,rc.relname),false,false,'') columns value text path 'value') x
  where rn.nspname||'.'||rc.relname='private.distribution_channel_v1' and rc.relkind in ('r','p') and x.value<>'null'),
  'paymentBlockers',(select coalesce(jsonb_agg(x.value::jsonb),'[]'::jsonb)
  from pg_class rc join pg_namespace rn on rn.oid=rc.relnamespace
  cross join lateral xmltable('/table/row' passing query_to_xml(format('select (%s)::text as value from %I.%I t','case when exists(select 1 from public.annuncio a where a.uuid=(to_jsonb(t)->>''announcement_id'')::uuid and (coalesce((to_jsonb(a)->>''priorita_attiva'')::boolean,false) or a.stato_annuncio=''in_attesa_pagamento'' or to_jsonb(a)->>''livello_annuncio''=''prioritario'')) then jsonb_build_object(''submissionId'',t.submission_id,''announcementId'',to_jsonb(t)->>''announcement_id'') else null end',rn.nspname,rc.relname),false,false,'') columns value text path 'value') x
  where rn.nspname||'.'||rc.relname='private.announcement_submission' and rc.relkind in ('r','p') and x.value<>'null'),
  'references', jsonb_build_array() ||
    (select coalesce(jsonb_agg(jsonb_build_object('bucket','immagini_profili','url',to_jsonb(p)->>'link_foto_profilo','keep',p.uuid in (select id from protected_profiles))),'[]') from public.profilo p where nullif(to_jsonb(p)->>'link_foto_profilo','') is not null) ||
    (select coalesce(jsonb_agg(x.value::jsonb),'[]'::jsonb)
  from pg_class rc join pg_namespace rn on rn.oid=rc.relnamespace
  cross join lateral xmltable('/table/row' passing query_to_xml(format('select (%s)::text as value from %I.%I t','jsonb_build_object(''bucket'',''immagini_annunci'',''url'',to_jsonb(t)->>''link_media'',''path'',to_jsonb(t)->>''storage_path'',''keep'',true)',rn.nspname,rc.relname),false,false,'') columns value text path 'value') x
  where rn.nspname||'.'||rc.relname='public.media_annuncio' and rc.relkind in ('r','p') and x.value<>'null') ||
    (select coalesce(jsonb_agg(x.value::jsonb),'[]'::jsonb)
  from pg_class rc join pg_namespace rn on rn.oid=rc.relnamespace
  cross join lateral xmltable('/table/row' passing query_to_xml(format('select (%s)::text as value from %I.%I t','jsonb_build_object(''bucket'',''immagini_profili'',''url'',to_jsonb(t)->>''link_media'',''path'',to_jsonb(t)->>''storage_path'',''keep'',(t.uuid_profilo in (select autore_annuncio as id from public.annuncio where autore_annuncio is not null
  union select uuid_profilo from private.segnalazioni where uuid_profilo is not null)))',rn.nspname,rc.relname),false,false,'') columns value text path 'value') x
  where rn.nspname||'.'||rc.relname='public.media_profilo' and rc.relkind in ('r','p') and x.value<>'null'),
  'objects',(select coalesce(jsonb_agg(x.value::jsonb),'[]'::jsonb)
  from pg_class rc join pg_namespace rn on rn.oid=rc.relnamespace
  cross join lateral xmltable('/table/row' passing query_to_xml(format('select (%s)::text as value from %I.%I t','jsonb_build_object(''id'',t.id,''bucket'',t.bucket_id,''name'',t.name,''owner'',coalesce(to_jsonb(t)->>''owner_id'',to_jsonb(t)->>''owner''),''updatedAt'',to_jsonb(t)->>''updated_at'',''metadata'',to_jsonb(t)->''metadata'')',rn.nspname,rc.relname),false,false,'') columns value text path 'value') x
  where rn.nspname||'.'||rc.relname='storage.objects' and rc.relkind in ('r','p') and x.value<>'null'),
  'foreignKeys',(select coalesce(jsonb_agg(jsonb_build_object('table',p.conrelid::regclass::text,'name',p.conname,'definition',pg_get_constraintdef(p.oid)) order by p.oid),'[]') from pg_constraint p where p.contype='f' and (p.confrelid in ('public.utente'::regclass,'auth.users'::regclass,'public.profilo'::regclass,'public.annuncio'::regclass))),
  'managedAuthTables',(select coalesce(jsonb_agg(jsonb_build_object('table',relname,'estimatedRows',s.n_live_tup) order by relname),'[]') from pg_stat_user_tables s where schemaname='auth')
) as inventory;
commit;

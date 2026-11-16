import {ADMIN_ID, ADMIN_EMAIL, RESET, KEEP, PROTECTED_PROFILES, CLEANUP_SCOPE, validateInventory, classifyStorage} from "./policy.mjs";

export const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const jsonSql = value => `convert_from(decode('${Buffer.from(JSON.stringify(value)).toString("base64")}','base64'),'UTF8')::jsonb`;
const names = values => values.map(literal).join(",");
const relationFilter = `(n.nspname in ('public','private') or (n.nspname='auth' and c.relname='users') or (n.nspname='storage' and c.relname in ('objects','buckets')))`;
const optionalJson = (table, expression) => `(select coalesce(jsonb_agg(x.value::jsonb),'[]'::jsonb)
  from pg_class rc join pg_namespace rn on rn.oid=rc.relnamespace
  cross join lateral xmltable('/table/row' passing query_to_xml(format('select (%s)::text as value from %I.%I t',${literal(expression)},rn.nspname,rc.relname),false,false,'') columns value text path 'value') x
  where rn.nspname||'.'||rc.relname=${literal(table)} and rc.relkind in ('r','p') and x.value<>'null')`;

// Pure SELECT, usable in a READ ONLY transaction. XMLTABLE only decodes SELECT
// results; it does not install helpers or expose raw account/password records.
export const inventorySelect = `with relations as materialized (
  select c.oid,n.nspname,c.relname,c.relkind,c.relispartition,c.relrowsecurity,c.relforcerowsecurity,c.relacl,c.relowner
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where c.relkind in ('r','p') and ${relationFilter}
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
), protected_profiles as (${PROTECTED_PROFILES})
select jsonb_build_object(
  'version',1,'capturedAt',statement_timestamp(),'database',current_database(),
  'schemaHash',(select md5(coalesce(string_agg(key||':'||value,'' order by key),'')) from schema_parts),
  'tables',(select coalesce(jsonb_agg(to_jsonb(f) order by name),'[]') from fingerprints f),
  'partitions',(select coalesce(jsonb_agg(nspname||'.'||relname order by nspname,relname),'[]') from relations where relkind='p' or relispartition),
  'admin',(select jsonb_build_object('id',a.id,'email',a.email,'kind',u.tipologia_utente,'userId',u.utente_uuid) from auth.users a join public.utente u on u.auth_user_uuid=a.id where a.id='${ADMIN_ID}' and lower(a.email)='${ADMIN_EMAIL}'),
  'reports',(select coalesce(jsonb_agg(id order by id),'[]') from private.segnalazioni),
  'announcements',(select coalesce(jsonb_agg(uuid order by uuid),'[]') from public.annuncio),
  'keepProfiles',(select coalesce(jsonb_agg(id order by id),'[]') from protected_profiles),
  'deleteAuthIds',(select coalesce(jsonb_agg(id order by id),'[]') from auth.users where id<>'${ADMIN_ID}'),
  'deleteProfiles',(select coalesce(jsonb_agg(uuid order by uuid),'[]') from public.profilo where uuid not in (select id from protected_profiles)),
  'channels',${optionalJson("private.distribution_channel_v1", "jsonb_build_object('id',t.id,'key',t.channel_key,'name',t.name,'url',t.url,'region',t.region,'active',t.active)")},
  'paymentBlockers',${optionalJson("private.announcement_submission", `case when exists(select 1 from public.annuncio a where a.uuid=(to_jsonb(t)->>'announcement_id')::uuid and (coalesce((to_jsonb(a)->>'priorita_attiva')::boolean,false) or a.stato_annuncio='in_attesa_pagamento' or to_jsonb(a)->>'livello_annuncio'='prioritario')) then jsonb_build_object('submissionId',t.submission_id,'announcementId',to_jsonb(t)->>'announcement_id') else null end`)},
  'references', jsonb_build_array() ||
    (select coalesce(jsonb_agg(jsonb_build_object('bucket','immagini_profili','url',to_jsonb(p)->>'link_foto_profilo','keep',p.uuid in (select id from protected_profiles))),'[]') from public.profilo p where nullif(to_jsonb(p)->>'link_foto_profilo','') is not null) ||
    ${optionalJson("public.media_annuncio", "jsonb_build_object('bucket','immagini_annunci','url',to_jsonb(t)->>'link_media','path',to_jsonb(t)->>'storage_path','keep',true)")} ||
    ${optionalJson("public.media_profilo", `jsonb_build_object('bucket','immagini_profili','url',to_jsonb(t)->>'link_media','path',to_jsonb(t)->>'storage_path','keep',(t.uuid_profilo in (${PROTECTED_PROFILES})))`)},
  'objects',${optionalJson("storage.objects", "jsonb_build_object('id',t.id,'bucket',t.bucket_id,'name',t.name,'owner',coalesce(to_jsonb(t)->>'owner_id',to_jsonb(t)->>'owner'),'updatedAt',to_jsonb(t)->>'updated_at','metadata',to_jsonb(t)->'metadata')")},
  'foreignKeys',(select coalesce(jsonb_agg(jsonb_build_object('table',p.conrelid::regclass::text,'name',p.conname,'definition',pg_get_constraintdef(p.oid)) order by p.oid),'[]') from pg_constraint p where p.contype='f' and (p.confrelid in ('public.utente'::regclass,'auth.users'::regclass,'public.profilo'::regclass,'public.annuncio'::regclass))),
  'managedAuthTables',(select coalesce(jsonb_agg(jsonb_build_object('table',relname,'estimatedRows',s.n_live_tup) order by relname),'[]') from pg_stat_user_tables s where schemaname='auth')
) as inventory`;

export const inventorySql = `-- One-off testing cleanup: read-only inventory. Export the inventory cell as JSON.
begin isolation level repeatable read read only;
set local statement_timeout='60s';
set local search_path=pg_catalog;
${inventorySelect};
commit;
`;

export function cleanupSql(input, backups) {
  const manifest = validateInventory(input), storage = classifyStorage(manifest);
  if ((!backups?.database?.sha256 && backups?.database?.skippedByOperator!==true) || storage.remove.length && !backups?.storage?.length && backups?.storagePending!==true) throw new Error("Mancano le copie di sicurezza richieste o la rinuncia esplicita al backup database.");
  const payload = {...manifest, backups,cleanupScope:CLEANUP_SCOPE};
  const actions = Object.entries(KEEP).map(([table, predicate]) => `(${literal(table)},${literal(predicate)})`).join(",\n");
  return `-- DESTRUCTIVE: ${CLEANUP_SCOPE}. Deletes ALL announcements, profiles and reports.
-- SQL Editor: run the complete file as postgres, without an application JWT.
-- No migrations, permanent helpers, blanket trigger disabling or Storage deletion.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
set local search_path=pg_catalog;
create temporary table cleanup_expected(data jsonb) on commit drop;
insert into cleanup_expected values(${jsonSql(payload)});
do $check$ begin
  if current_user not in ('postgres','supabase_admin') or nullif(current_setting('request.jwt.claims',true),'') is not null then raise exception 'CLEANUP_OPERATOR_REQUIRED'; end if;
end $check$;
-- Fail quickly if application writers are active. Locks also protect references
-- that are validated again immediately before the deletion transaction.
do $lock$ declare r record; begin
  for r in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and ${relationFilter} order by n.nspname,c.relname loop
    execute format('lock table %I.%I in access exclusive mode',r.nspname,r.relname);
  end loop;
  if to_regclass('auth.sessions') is not null then lock table auth.sessions in access exclusive mode; end if;
  if to_regclass('auth.refresh_tokens') is not null then lock table auth.refresh_tokens in access exclusive mode; end if;
end $lock$;
create temporary table cleanup_before on commit drop as ${inventorySelect};
do $check$ declare expected jsonb; actual jsonb; begin
  select data-array['backups','cleanupScope','capturedAt','managedAuthTables'] into expected from pg_temp.cleanup_expected;
  select inventory-array['capturedAt','managedAuthTables'] into actual from pg_temp.cleanup_before;
  if actual is distinct from expected then raise exception 'CLEANUP_INVENTORY_CHANGED: eseguire nuovamente inventario e preparazione'; end if;
  if jsonb_array_length(actual->'channels')<>18 then raise exception 'CLEANUP_PROTECTED_COUNTS_CHANGED'; end if;
  if not actual->'admin' @> jsonb_build_object('id','${ADMIN_ID}','kind','Admin') or lower(actual#>>'{admin,email}')<>'${ADMIN_EMAIL}' then raise exception 'CLEANUP_ADMIN_CHANGED'; end if;
end $check$;
create temporary table cleanup_rules(name text primary key,predicate text) on commit drop;
insert into cleanup_rules values ${actions};
create temporary table cleanup_reset(name text primary key) on commit drop;
insert into cleanup_reset values ${RESET.map(t=>`(${literal(t)})`).join(",")};
create temporary table cleanup_users on commit drop as select utente_uuid as id from public.utente where auth_user_uuid<>'${ADMIN_ID}';
create temporary table cleanup_auth on commit drop as select id from auth.users where id<>'${ADMIN_ID}';
create temporary table cleanup_profiles(id uuid) on commit drop;
create temporary table cleanup_groups(id uuid) on commit drop;
create temporary table cleanup_log(step text,affected bigint) on commit drop;
create temporary table cleanup_snapshots(name text primary key,hash text,predicate text) on commit drop;
-- Hash the exact expected remaining rows (Admin and configuration). All
-- content rules select no rows and must still select no rows after deletion.
create function pg_temp.cleanup_hash(tab text,predicate text,p_normalize boolean) returns text language plpgsql as $fn$
declare expression text:='to_jsonb(t)'; f record; result text; begin
  if p_normalize then
    for f in select a.attname,c.confrelid from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
      where c.conrelid=to_regclass(tab) and c.contype='f' and cardinality(c.conkey)=1 and c.confrelid in ('public.utente'::regclass,'auth.users'::regclass) loop
      expression:=expression||format(' || case when t.%I in (select id from pg_temp.%I) then jsonb_build_object(%L,null) else ''{}''::jsonb end',f.attname,case when f.confrelid='public.utente'::regclass then 'cleanup_users' else 'cleanup_auth' end,f.attname);
    end loop;
  end if;
  execute format('select md5(coalesce(string_agg(md5((%s)::text),'''' order by md5((%s)::text)),'''')) from %s t where %s',expression,expression,tab::regclass,predicate) into result;
  return result;
end $fn$;
do $snapshot$ declare r record; begin
  for r in select * from pg_temp.cleanup_rules where to_regclass(name) is not null loop
    insert into pg_temp.cleanup_snapshots values(r.name,pg_temp.cleanup_hash(r.name,r.predicate,true),r.predicate);
  end loop;
  for r in select * from (values
    ('auth.users','id=''${ADMIN_ID}'''),
    ('auth.sessions','user_id=''${ADMIN_ID}'''),
    ('auth.refresh_tokens','session_id in (select id from auth.sessions where user_id=''${ADMIN_ID}'')'),
    ('storage.buckets','true')
  ) x(name,predicate) where to_regclass(name) is not null loop
    insert into pg_temp.cleanup_snapshots values(r.name,pg_temp.cleanup_hash(r.name,r.predicate,false),r.predicate);
  end loop;
end $snapshot$;
-- Unexpected application tables or composite account FKs require manual review.
do $review$ declare r record; begin
  for r in select n.nspname||'.'||c.relname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind in ('r','p') loop
    if not exists(select 1 from pg_temp.cleanup_rules where name=r.name) and not exists(select 1 from pg_temp.cleanup_reset where name=r.name) then raise exception 'CLEANUP_UNCLASSIFIED_TABLE: %',r.name; end if;
  end loop;
  if exists(select 1 from pg_constraint c where c.contype='f' and c.confrelid in ('public.utente'::regclass,'auth.users'::regclass) and cardinality(c.conkey)<>1 and c.conrelid in (select to_regclass(name) from pg_temp.cleanup_rules)) then raise exception 'CLEANUP_COMPOSITE_ACCOUNT_REFERENCE'; end if;
end $review$;
-- Unfreeze rows inside this transaction before deleting their children. The
-- postgres-only restore path keeps both parent and child guards enabled.
set constraints all immediate;
do $unfreeze$ begin
  if exists(select 1 from pg_attribute where attrelid='public.annuncio'::regclass and attname='eliminato_il' and not attisdropped) then
    update public.annuncio set eliminato_il=null,eliminato_da=null where eliminato_il is not null;
  end if;
end $unfreeze$;
do $reset$ declare tab text; n bigint; begin
  foreach tab in array array[${names(RESET)}] loop
    if to_regclass(tab) is not null then execute format('delete from %s',tab::regclass); get diagnostics n=row_count; insert into pg_temp.cleanup_log values(tab,n); end if;
  end loop;
end $reset$;
-- Delete content and its dependencies, leaving only account/configuration rows.
do $profiles$ declare r record; n bigint; begin
  for r in select * from pg_temp.cleanup_rules where name not in ('public.utente','public.profilo','private.regional_publication') and to_regclass(name) is not null order by name loop
    execute format('delete from %s where not (%s)',r.name::regclass,r.predicate); get diagnostics n=row_count; insert into pg_temp.cleanup_log values(r.name,n);
  end loop;
  delete from public.profilo where uuid not in (select id from pg_temp.cleanup_profiles); get diagnostics n=row_count; insert into pg_temp.cleanup_log values('public.profilo',n);
  if to_regclass('private.regional_publication') is not null then delete from private.regional_publication where id not in (select id from pg_temp.cleanup_groups); get diagnostics n=row_count; insert into pg_temp.cleanup_log values('private.regional_publication',n); end if;
end $profiles$;
do $detach$ declare f record; n bigint; begin
  for f in select c.conrelid as tab,a.attname,c.confrelid,a.attnotnull from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
    where c.contype='f' and cardinality(c.conkey)=1 and c.confrelid in ('public.utente'::regclass,'auth.users'::regclass)
      and c.conrelid in (select to_regclass(name) from pg_temp.cleanup_rules where name<>'public.utente') loop
    if f.attnotnull then
      execute format('select count(*) from %s where %I in (select id from pg_temp.%I)',f.tab::regclass,f.attname,case when f.confrelid='public.utente'::regclass then 'cleanup_users' else 'cleanup_auth' end) into n;
      if n>0 then raise exception 'CLEANUP_REQUIRED_ACCOUNT_REFERENCE: %.%',f.tab::regclass,f.attname; end if;
    else
      execute format('update %s set %I=null where %I in (select id from pg_temp.%I)',f.tab::regclass,f.attname,f.attname,case when f.confrelid='public.utente'::regclass then 'cleanup_users' else 'cleanup_auth' end);
    end if;
  end loop;
end $detach$;
-- Preserve object IDs, paths, URLs and bytes. Transfer ownership
-- only, including files scheduled for later Storage API removal, so Auth
-- deletion cannot erase retained uploads or leave deleted owners behind.
create temporary table cleanup_storage on commit drop as select null::text as hash;
do $storage$ declare expr text:='to_jsonb(t)-array[''owner'',''owner_id'',''updated_at'']'; before_hash text; after_hash text; col text; begin
  if to_regclass('storage.objects') is not null then
    execute format('select md5(coalesce(string_agg(md5((%s)::text),'''' order by md5((%s)::text)),'''')) from storage.objects t',expr,expr) into before_hash;
    foreach col in array array['owner','owner_id'] loop
      if exists(select 1 from pg_attribute where attrelid='storage.objects'::regclass and attname=col and attnum>0 and not attisdropped) then
        execute format('update storage.objects set %I=%L where %I::text in (select id::text from pg_temp.cleanup_auth)',col,'${ADMIN_ID}',col);
      end if;
    end loop;
    execute format('select md5(coalesce(string_agg(md5((%s)::text),'''' order by md5((%s)::text)),'''')) from storage.objects t',expr,expr) into after_hash;
    if after_hash is distinct from before_hash then raise exception 'CLEANUP_STORAGE_CONTENT_CHANGED'; end if;
    update pg_temp.cleanup_storage set hash=after_hash;
  end if;
end $storage$;
-- Revoke removed accounts' refresh sessions; do not touch Admin's sessions.
do $sessions$ begin
  if to_regclass('auth.refresh_tokens') is not null and to_regclass('auth.sessions') is not null then
    delete from auth.refresh_tokens where session_id in (select id from auth.sessions where user_id in (select id from pg_temp.cleanup_auth));
  end if;
  if to_regclass('auth.sessions') is not null then delete from auth.sessions where user_id in (select id from pg_temp.cleanup_auth); end if;
end $sessions$;
delete from public.utente where utente_uuid in (select id from pg_temp.cleanup_users);
delete from auth.users where id in (select id from pg_temp.cleanup_auth);
-- Any resettable notifications/audit rows generated by deletion triggers are
-- removed too; anti-duplicate markers of retained ads are preserved separately.
do $reset$ declare tab text; begin
  foreach tab in array array[${names(RESET)}] loop if to_regclass(tab) is not null then execute format('delete from %s',tab::regclass); end if; end loop;
end $reset$;
set constraints all immediate;
do $verify$ declare r record; n bigint; begin
  for r in select * from pg_temp.cleanup_snapshots loop
    if pg_temp.cleanup_hash(r.name,r.predicate,false) is distinct from r.hash then raise exception 'CLEANUP_PROTECTED_DATA_CHANGED: %',r.name; end if;
  end loop;
  for r in select * from pg_temp.cleanup_reset where to_regclass(name) is not null loop
    execute format('select count(*) from %s',r.name::regclass) into n;
    if n<>0 then raise exception 'CLEANUP_RESET_INCOMPLETE: %',r.name; end if;
  end loop;
  for r in select * from pg_temp.cleanup_rules where to_regclass(name) is not null loop
    execute format('select count(*) from %s where not (%s)',r.name::regclass,r.predicate) into n;
    if n<>0 then raise exception 'CLEANUP_REMAINING_ROWS: %',r.name; end if;
  end loop;
  if (select count(*) from auth.users)<>1 or (select count(*) from public.utente)<>1 then raise exception 'CLEANUP_ACCOUNT_COUNT'; end if;
  if exists(select 1 from public.annuncio) or exists(select 1 from public.profilo) or exists(select 1 from private.segnalazioni) or (select count(*) from private.distribution_channel_v1)<>18 then raise exception 'CLEANUP_FINAL_COUNTS'; end if;
end $verify$;
-- Recompute the catalog fingerprint: no lasting schema/trigger/RLS changes.
create temporary table cleanup_after on commit drop as ${inventorySelect};
do $verify$ begin
  if (select inventory->>'schemaHash' from pg_temp.cleanup_after) is distinct from (select inventory->>'schemaHash' from pg_temp.cleanup_before) then raise exception 'CLEANUP_SCHEMA_CHANGED'; end if;
end $verify$;
select jsonb_build_object('status','ready_to_commit','deletedAccounts',(select count(*) from pg_temp.cleanup_auth),
  'cleanupScope','${CLEANUP_SCOPE}',
  'announcements',(select count(*) from public.annuncio),'reports',(select count(*) from private.segnalazioni),
  'channels',(select count(*) from private.distribution_channel_v1),'tables',(select jsonb_agg(to_jsonb(l)) from pg_temp.cleanup_log l),
  'storageRemovalViaApi',${jsonSql(storage.remove)}) as cleanup_result;
drop function pg_temp.cleanup_hash(text,text,boolean);
commit;
`;
}

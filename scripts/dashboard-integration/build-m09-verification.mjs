import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildM08Verification } from './build-m08-verification.mjs';
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
export const m09Manifest=JSON.parse(read('scripts/dashboard-integration/m09-definition-fingerprints.json'));
const literal=v=>v===null?'null':typeof v==='boolean'||typeof v==='number'?String(v):`'${String(v).replaceAll("'","''")}'`;
export function buildM09Verification(){
  const source=read('supabase/scripts/dashboard_admin_verify_m08.sql');
  const hash=s=>createHash('sha256').update(s).digest('hex');
  if(source!==buildM08Verification()||hash(source)!==m09Manifest.m08VerifierSha256||hash(read(m09Manifest.source))!==m09Manifest.sourceSha256)throw new Error('M09_SOURCES_REQUIRE_REVIEW');
  const start=source.indexOf('\nwith ')+6,end=source.lastIndexOf("\nselect jsonb_build_object('step','M08'"),finish=source.lastIndexOf('\nrollback;');
  if(start<6||end<start||finish<end)throw new Error('M09_SOURCE_FORMAT_REQUIRE_REVIEW');
  let cumulative=source.slice(start,end);
  const count='(select count(*)=4 from pg_index i join audit_table t on t.oid=i.indrelid)';
  if(cumulative.split(count).length!==2)throw new Error('M09_AUDIT_INDEX_SCOPE_REQUIRE_REVIEW');
  cumulative=cumulative.replace(count,"(select count(*)=4 from pg_index i join audit_table t on t.oid=i.indrelid where i.indexrelid is distinct from to_regclass('private.admin_audit_event_auth_time_v1'))");
  const routineStart=cumulative.indexOf('m08_unchanged_routines as ('),routineEnd=cumulative.indexOf('m08_checks as (',routineStart);
  if(routineStart<0||routineEnd<routineStart)throw new Error('M09_ROUTINE_SCOPE_REQUIRE_REVIEW');
  const routineBlock=cumulative.slice(routineStart,routineEnd);
  if(routineBlock.split('from m08_function_expected e').length!==2)throw new Error('M09_ROUTINE_EXCLUSIONS_REQUIRE_REVIEW');
  cumulative=cumulative.slice(0,routineStart)+routineBlock.replace('from m08_function_expected e','from m09_function_expected e')+cumulative.slice(routineEnd);
  const functionStart=source.indexOf('m08_named_routines as materialized ('),functionEnd=source.indexOf('m08_unchanged_routines as (',functionStart);
  if(functionStart<0||functionEnd<functionStart)throw new Error('M09_FUNCTION_CHECKS_REQUIRE_REVIEW');
  const functions=source.slice(functionStart,functionEnd).replaceAll('m08_','m09_').trim().replace(/,$/,'');
  const columns=['identity','schema_name','name','args','before_md5','after_md5','acl_md5','is_definer','settings','volatility','is_strict','returns_set','default_args','return_type','language','api_role'];
  const rows=m09Manifest.functions.map(f=>'('+columns.map(c=>literal(c==='settings'?JSON.stringify(f[c]):f[c])).join(',')+')').join(',\n');
  const oldReport=source.slice(end+1,finish).trim().replace(/;$/,'');
  return `-- M09: catalog-only verification before/after audit read functions and index.
-- Target nsytraextbndfyprwzts; verify connection separately. Run the WHOLE file as postgres.
-- No application, audit, Auth or gate rows read; no application functions called.
-- Compare 33 source tables, two audit/Auth metadata fingerprints and every other routine.
-- Only the exact named new index is excluded from old counts; its complete structure is checked below.
begin read only;
set local statement_timeout='15s';
set local lock_timeout='3s';
set local search_path=pg_catalog;
with m09_function_expected(${columns.join(',')}) as (values
${rows}
),
${cumulative},
m09_previous_report as (
${oldReport}
),
${functions},
${checks.replace('M09_INDEX_HASH',m09Manifest.index.definition_md5)}
rollback;
`;
}
const checks=String.raw`m09_index_check as (
  select c.oid is not null as present,
    coalesce(c.relkind='i' and c.relpersistence='p' and pg_get_userbyid(c.relowner)='postgres'
      and i.indrelid=to_regclass('private.admin_audit_event_v1') and i.indisvalid and i.indisready and i.indislive
      and not i.indisunique and not i.indisprimary and i.indimmediate and i.indnkeyatts=3 and i.indnatts=3
      and case when c.relkind='i' then md5(pg_get_indexdef(c.oid)) end='M09_INDEX_HASH',false) as matches
  from (values(1)) dummy(n) left join (pg_class c join pg_namespace n on n.oid=c.relnamespace)
    on n.nspname='private' and c.relname='admin_audit_event_auth_time_v1'
  left join pg_index i on i.indexrelid=c.oid
),
m09_support_tables as materialized (
  select e.identity,c.* from (values('private.admin_audit_event_v1'),('auth.users')) e(identity)
  left join pg_class c on c.oid=to_regclass(e.identity)
),
m09_support_fingerprints as (
  select t.identity,t.oid is not null as present,
    md5(jsonb_build_object('kind',t.relkind,'owner',pg_get_userbyid(t.relowner),'persistence',t.relpersistence,
      'rls',t.relrowsecurity,'force_rls',t.relforcerowsecurity,'acl',t.relacl::text,'options',t.reloptions,
      'columns',(select jsonb_agg((to_jsonb(a)-array['attrelid','attcacheoff'])||jsonb_build_object('default',pg_get_expr(d.adbin,d.adrelid)) order by a.attnum)
        from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=t.oid and a.attnum>0),
      'constraints',(select jsonb_agg(jsonb_build_array(k.conname,k.contype,k.convalidated,k.condeferrable,k.condeferred,pg_get_constraintdef(k.oid,true)) order by k.conname) from pg_constraint k where k.conrelid=t.oid),
      'indexes',(select jsonb_agg(jsonb_build_array(c.relname,pg_get_indexdef(i.indexrelid),i.indisvalid,i.indisready,i.indislive) order by c.relname)
        from pg_index i join pg_class c on c.oid=i.indexrelid where i.indrelid=t.oid and i.indexrelid is distinct from to_regclass('private.admin_audit_event_auth_time_v1')),
      'policies',(select jsonb_agg(to_jsonb(p)-array['oid','polrelid'] order by p.polname) from pg_policy p where p.polrelid=t.oid),
      'triggers',(select jsonb_agg(jsonb_build_array(g.tgname,g.tgenabled,pg_get_triggerdef(g.oid,true),md5(replace(pg_get_functiondef(g.tgfoid),E'\r\n',E'\n'))) order by g.tgname) from pg_trigger g where g.tgrelid=t.oid),
      'api_select',(select jsonb_agg(jsonb_build_array(r.rolname,has_table_privilege(r.oid,t.oid,'SELECT'),has_any_column_privilege(r.oid,t.oid,'SELECT')) order by r.rolname) from api_roles r where r.rolname in ('anon','authenticated','service_role'))
    )::text) as fingerprint_md5
  from m09_support_tables t
),
m09_checks as (
  select current_user='postgres' and current_setting('transaction_read_only')='on' as sql_operator,
    coalesce(m.m08_report->>'status'='m08_structurally_verified',false) as m01_m08_catalog_matches,
    (select count(*)=2 and bool_and(oid is not null and relkind='r') from m09_support_tables) as support_tables_present,
    not exists(select 1 from m09_support_tables t cross join api_roles r where r.rolname in ('anon','authenticated','service_role')
      and (has_table_privilege(r.oid,t.oid,'SELECT') or has_any_column_privilege(r.oid,t.oid,'SELECT'))) as direct_api_select_denied,
    exists(select 1 from pg_attribute where attrelid=to_regclass('auth.users') and attname='id' and atttypid='uuid'::regtype and not attisdropped)
      and exists(select 1 from pg_attribute a join pg_type t on t.oid=a.atttypid where a.attrelid=to_regclass('auth.users') and a.attname='email' and t.typcategory='S' and not a.attisdropped) as auth_columns_match,
    not exists(select 1 from m09_unexpected_routines) as routine_identities_match,
    (select count(*) from m09_named_routines) as named_routine_count,
    coalesce((select bool_and(present and protection_matches and after_body_matches) from m09_function_checks),false) as functions_match,
    (select present from m09_index_check) as index_present,(select matches from m09_index_check) as index_match
  from m09_previous_report m
),
m09_result as (
  select *,sql_operator and m01_m08_catalog_matches and support_tables_present and direct_api_select_denied
    and auth_columns_match and routine_identities_match as prerequisites_match from m09_checks
)
select jsonb_build_object('step','M09','report_version',1,'captured_at',statement_timestamp(),
  'expected_project_ref','nsytraextbndfyprwzts','operator',current_user,'transaction_read_only',current_setting('transaction_read_only'),
  'server_version_num',current_setting('server_version_num')::integer,
  'status',case when not r.prerequisites_match then 'm09_prerequisites_or_drift_require_review'
    when r.named_routine_count=0 and not r.index_present then 'ready_for_m09_catalog_checks_only'
    when r.named_routine_count=4 and r.functions_match and r.index_match then 'm09_structurally_verified'
    else 'm09_partial_or_drift_require_review' end,
  'checks',to_jsonb(r),'functions',(select jsonb_agg(to_jsonb(f) order by identity) from m09_function_checks f),
  'unexpected_routines',(select coalesce(jsonb_agg(to_jsonb(f) order by schema_name,name,args),'[]'::jsonb) from m09_unexpected_routines f),
  'index',(select to_jsonb(i) from m09_index_check i),
  'unchanged_table_fingerprints',m.m08_report->'unchanged_table_fingerprints',
  'unchanged_routine_fingerprints',m.m08_report->'unchanged_routine_fingerprints',
  'support_table_fingerprints',(select jsonb_agg(to_jsonb(t) order by identity) from m09_support_fingerprints t),
  'prerequisite_checks',m.m08_report->'checks','prerequisite_diagnostics',case when not r.m01_m08_catalog_matches then m.m08_report end,
  'limits',m.m08_report->'limits','notes',jsonb_build_array(
    'Catalogs only; no event, Auth, application or gate rows read and no application functions called.',
    'Only the M09 index is excluded from old audit index counts and normalized support fingerprints; its parent, definition and validity are checked separately.',
    'Compare all 33 tables, two support metadata fingerprints and every unchanged routine before/after. OID-based routine metadata is comparable only on the same database.',
    'Auth/PostgREST authorization, current account email rendering, retention concurrency, performance, API exposure and release remain separate evidence.'
  )) as m09_report from m09_result r cross join m09_previous_report m;
`;
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  writeFileSync(new URL('supabase/scripts/dashboard_admin_verify_m09.sql',root),buildM09Verification());
  console.log('Generated supabase/scripts/dashboard_admin_verify_m09.sql');
}

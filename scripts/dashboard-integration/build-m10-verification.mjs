import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildM09Verification } from './build-m09-verification.mjs';
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
export const m10Manifest=JSON.parse(read('scripts/dashboard-integration/m10-definition-fingerprints.json'));
const literal=v=>v===null?'null':typeof v==='boolean'||typeof v==='number'?String(v):`'${String(v).replaceAll("'","''")}'`;
export function buildM10Verification(){
  const source=read('supabase/scripts/dashboard_admin_verify_m09.sql');
  const hash=s=>createHash('sha256').update(s).digest('hex');
  if(source!==buildM09Verification()||hash(source)!==m10Manifest.m09VerifierSha256||hash(read(m10Manifest.source))!==m10Manifest.sourceSha256)throw new Error('M10_SOURCES_REQUIRE_REVIEW');
  const start=source.indexOf('\nwith ')+6,end=source.lastIndexOf("\nselect jsonb_build_object('step','M09'"),finish=source.lastIndexOf('\nrollback;');
  if(start<6||end<start||finish<end)throw new Error('M10_SOURCE_FORMAT_REQUIRE_REVIEW');
  let cumulative=source.slice(start,end);
  const routineStart=cumulative.indexOf('m08_unchanged_routines as ('),routineEnd=cumulative.indexOf('m08_checks as (',routineStart);
  if(routineStart<0||routineEnd<routineStart)throw new Error('M10_ROUTINE_SCOPE_REQUIRE_REVIEW');
  const routineBlock=cumulative.slice(routineStart,routineEnd);
  if(routineBlock.split('from m09_function_expected e').length!==2)throw new Error('M10_ROUTINE_EXCLUSIONS_REQUIRE_REVIEW');
  cumulative=cumulative.slice(0,routineStart)+routineBlock.replace('from m09_function_expected e','from m10_function_expected e')+cumulative.slice(routineEnd);
  const functionStart=source.indexOf('m09_named_routines as materialized ('),functionEnd=source.indexOf('m09_index_check as (',functionStart);
  if(functionStart<0||functionEnd<functionStart)throw new Error('M10_FUNCTION_CHECKS_REQUIRE_REVIEW');
  const functions=source.slice(functionStart,functionEnd).replaceAll('m09_','m10_').trim().replace(/,$/,'');
  const columns=['identity','schema_name','name','args','before_md5','after_md5','acl_md5','is_definer','settings','volatility','is_strict','returns_set','default_args','return_type','language','api_role'];
  const rows=m10Manifest.functions.map(f=>'('+columns.map(c=>literal(c==='settings'?JSON.stringify(f[c]):f[c])).join(',')+')').join(',\n');
  const oldReport=source.slice(end+1,finish).trim().replace(/;$/,'');
  return `-- M10: catalog-only verification before/after Home aggregates.
-- Target nsytraextbndfyprwzts; verify connection separately. Run the WHOLE file as postgres.
-- No application, audit, Auth or gate rows read; no aggregate functions called.
-- Compare 33 source tables, audit/Auth metadata and every other routine before/after.
-- M01-M09 checks retained; no new table/index exclusions or normalization.
begin read only;
set local statement_timeout='15s';
set local lock_timeout='3s';
set local search_path=pg_catalog;
with m10_function_expected(${columns.join(',')}) as (values
${rows}
),
${cumulative},
m10_previous_report as (
${oldReport}
),
${functions},
${checks}
rollback;
`;
}
const checks=String.raw`m10_required_columns(table_name,column_name,type_name) as (values
  ('utente','utente_uuid','uuid'),('utente','tipologia_utente','string'),('utente','registrato_il','timestamp with time zone'),
  ('profilo','uuid','uuid'),('profilo','uuid_utente','uuid'),('profilo','nascosto','boolean'),('profilo','tipologia_principale','string'),
  ('annuncio','uuid','uuid'),('annuncio','eliminato_il','timestamp with time zone'),('annuncio','stato_annuncio','string'),
  ('annuncio','tipologia_annuncio','string'),('annuncio','creato_il','timestamp with time zone')
),
m10_column_checks as (
  select e.*,a.attnum is not null as present,coalesce(case when e.type_name='string' then t.typcategory='S'
    else format_type(a.atttypid,a.atttypmod)=e.type_name end,false) as matches
  from m10_required_columns e left join pg_attribute a on a.attrelid=to_regclass('public.'||e.table_name)
    and a.attname=e.column_name and a.attnum>0 and not a.attisdropped left join pg_type t on t.oid=a.atttypid
),
m10_checks as (
  select current_user='postgres' and current_setting('transaction_read_only')='on' as sql_operator,
    coalesce(m.m09_report->>'status'='m09_structurally_verified',false) as m01_m09_catalog_matches,
    (select count(*)=12 and bool_and(present and matches) from m10_column_checks) as source_columns_match,
    not exists(select 1 from m10_unexpected_routines) as routine_identities_match,
    (select count(*) from m10_named_routines) as named_routine_count,
    coalesce((select bool_and(present and protection_matches and after_body_matches) from m10_function_checks),false) as functions_match
  from m10_previous_report m
),
m10_result as (
  select *,sql_operator and m01_m09_catalog_matches and source_columns_match and routine_identities_match as prerequisites_match from m10_checks
)
select jsonb_build_object('step','M10','report_version',1,'captured_at',statement_timestamp(),
  'expected_project_ref','nsytraextbndfyprwzts','operator',current_user,'transaction_read_only',current_setting('transaction_read_only'),
  'server_version_num',current_setting('server_version_num')::integer,
  'status',case when not r.prerequisites_match then 'm10_prerequisites_or_drift_require_review'
    when r.named_routine_count=0 then 'ready_for_m10_catalog_checks_only'
    when r.named_routine_count=4 and r.functions_match then 'm10_structurally_verified'
    else 'm10_partial_or_drift_require_review' end,
  'checks',to_jsonb(r),'functions',(select jsonb_agg(to_jsonb(f) order by identity) from m10_function_checks f),
  'unexpected_routines',(select coalesce(jsonb_agg(to_jsonb(f) order by schema_name,name,args),'[]'::jsonb) from m10_unexpected_routines f),
  'source_columns',(select jsonb_agg(to_jsonb(c) order by table_name,column_name) from m10_column_checks c),
  'unchanged_table_fingerprints',m.m09_report->'unchanged_table_fingerprints',
  'unchanged_routine_fingerprints',m.m09_report->'unchanged_routine_fingerprints',
  'support_table_fingerprints',m.m09_report->'support_table_fingerprints',
  'prerequisite_checks',m.m09_report->'checks','prerequisite_diagnostics',case when not r.m01_m09_catalog_matches then m.m09_report end,
  'limits',m.m09_report->'limits','notes',jsonb_build_array(
    'Catalogs only; no metric counts, event, Auth, application or gate rows read and no application functions called.',
    'Four exact STABLE functions; public invoker wrappers and private definer bridges, owner postgres and empty search_path, authenticated EXECUTE only among API roles.',
    'No new table/index exclusions. Compare 33 tables, two support metadata fingerprints and every other routine before/after; OID metadata is comparable only on the same database.',
    'Metric correctness is tested on synthetic data. Actual Auth/PostgREST, API exposure, HTTP/browser, performance, gate activation and release remain separate evidence.'
  )) as m10_report from m10_result r cross join m10_previous_report m;
`;
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  writeFileSync(new URL('supabase/scripts/dashboard_admin_verify_m10.sql',root),buildM10Verification());
  console.log('Generated supabase/scripts/dashboard_admin_verify_m10.sql');
}

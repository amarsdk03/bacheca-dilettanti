import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildM07Verification } from './build-m07-verification.mjs';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
export const m08Manifest = JSON.parse(read('scripts/dashboard-integration/m08-definition-fingerprints.json'));
const quote = value => value === null ? 'null' : typeof value === 'boolean' || typeof value === 'number'
  ? String(value) : `'${String(value).replaceAll("'", "''")}'`;

export function buildM08Verification() {
  const previous = read('supabase/scripts/dashboard_admin_verify_m07.sql');
  if (createHash('sha256').update(previous).digest('hex') !== m08Manifest.m07VerifierSha256 || previous !== buildM07Verification()
    || createHash('sha256').update(read(m08Manifest.source)).digest('hex') !== m08Manifest.sourceSha256) {
    throw new Error('M08_SOURCES_REQUIRE_REVIEW');
  }
  const start = previous.indexOf('with\n');
  const reportStart = previous.lastIndexOf("\nselect jsonb_build_object('step','M07'");
  const reportEnd = previous.lastIndexOf('\nrollback;');
  if (start < 0 || reportStart < start || reportEnd < reportStart) throw new Error('M08_PREVIOUS_FORMAT_REQUIRE_REVIEW');
  const columns = ['identity','schema_name','name','args','before_md5','after_md5','acl_md5','is_definer','settings','volatility',
    'is_strict','returns_set','default_args','return_type','language','api_role'];
  const rows = m08Manifest.functions.map(f => '('+columns.map(c=>quote(c==='settings'?JSON.stringify(f[c]):f[c])).join(',')+')').join(',\n');
  let cumulative = previous.slice(start + 5, reportStart);
  const routineStart=cumulative.indexOf('\nroutines as materialized (');
  const routineEnd=cumulative.indexOf('\nrelations as materialized (',routineStart);
  if (routineStart<0 || routineEnd<routineStart) throw new Error('M08_ROUTINE_SCOPE_REQUIRE_REVIEW');
  const routineBlock=cumulative.slice(routineStart,routineEnd);
  const needle = 'then coalesce((select e.before_md5 from m07_function_expected';
  if (routineBlock.split(needle).length !== 2) throw new Error('M08_NORMALIZATION_REQUIRE_REVIEW');
  // Map only the exact reviewed M08 audit validator back for M01-M07 checks.
  // The actual new body, ACL and metadata are independently checked below.
  const normalized=routineBlock.replace(needle, String.raw`then coalesce((select e.before_md5 from m08_function_expected e
        where e.identity=p.oid::regprocedure::text and e.after_md5=md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))),
        (select e.before_md5 from m07_function_expected`);
  cumulative=cumulative.slice(0,routineStart)+normalized+cumulative.slice(routineEnd);
  const previousReport = previous.slice(reportStart + 1, reportEnd).trim().replace(/;$/, '');
  return `-- M08: catalog-only verification before/after the existing export migration.
-- Target nsytraextbndfyprwzts; verify connection identity separately.
-- Run the whole file as postgres. No application rows/functions or gate value read.
-- Compare all 33 table fingerprints AND all unchanged routine fingerprints before/after.
-- M07 source is unchanged; only the exact M08 audit validator is normalized here.
begin read only;
set local statement_timeout='15s';
set local lock_timeout='3s';
set local search_path=pg_catalog;
with m08_function_expected(${columns.join(',')}) as (values
${rows}
),
${cumulative},
m08_previous_report as (
${previousReport}
),
${checks}
rollback;
`;
}

const checks = String.raw`m08_named_routines as materialized (
  select p.*,n.nspname,l.lanname,replace(oidvectortypes(p.proargtypes),', ',',') as args,
    case when p.prokind in ('f','p') then md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n')) end as definition_md5
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
  where n.nspname in ('public','private') and p.proname in (select name from m08_function_expected)
),
m08_function_checks as (
  select e.identity,e.name,e.before_md5 is null as is_new,p.oid is not null as present,
    p.definition_md5 as actual_md5,md5(p.proacl::text) as acl_md5,
    coalesce(p.prokind='f' and pg_get_userbyid(p.proowner)='postgres' and md5(p.proacl::text)=e.acl_md5
      and p.prosecdef=e.is_definer and to_jsonb(p.proconfig)=e.settings::jsonb and p.provolatile=e.volatility
      and p.proisstrict=e.is_strict and p.proretset=e.returns_set and p.pronargdefaults=e.default_args
      and format_type(p.prorettype,null)=e.return_type and p.lanname=e.language
      and not exists(select 1 from api_roles r where has_function_privilege(r.oid,p.oid,'EXECUTE')
        is distinct from (r.rolname=e.api_role is true)),false) as protection_matches,
    coalesce(p.definition_md5=e.before_md5,false) as before_body_matches,
    coalesce(p.definition_md5=e.after_md5,false) as after_body_matches,
    (select coalesce(jsonb_agg(jsonb_build_object('role',r.rolname,'execute',has_function_privilege(r.oid,p.oid,'EXECUTE')) order by r.rolname),'[]'::jsonb)
      from api_roles r where p.oid is not null) as effective_execute
  from m08_function_expected e left join m08_named_routines p on p.nspname=e.schema_name and p.proname=e.name and p.args=e.args
),
m08_unexpected_routines as (
  select nspname as schema_name,proname as name,args,prokind as kind,definition_md5
  from m08_named_routines p where not exists(select 1 from m08_function_expected e
    where e.schema_name=p.nspname and e.name=p.proname and e.args=p.args)
),
m08_unchanged_routines as (
  select format('%I.%I(%s)',n.nspname,p.proname,replace(oidvectortypes(p.proargtypes),', ',',')) as identity,
    p.prokind as kind,
    md5(jsonb_build_object('definition',case when p.prokind in ('f','p') then replace(pg_get_functiondef(p.oid),E'\r\n',E'\n') end,
      'catalog',to_jsonb(p)-array['oid','prosrc','prosqlbody'],'owner',pg_get_userbyid(p.proowner),
      'aggregate',(select to_jsonb(a) from pg_aggregate a where a.aggfnoid=p.oid),
      'effective_execute',(select jsonb_agg(jsonb_build_array(r.rolname,has_function_privilege(r.oid,p.oid,'EXECUTE')) order by r.rolname) from api_roles r))::text) as fingerprint_md5
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and not exists(select 1 from m08_function_expected e
    where e.schema_name=n.nspname and e.name=p.proname and e.args=replace(oidvectortypes(p.proargtypes),', ',','))
),
m08_checks as (
  select current_user='postgres' and current_setting('transaction_read_only')='on' as sql_operator,
    coalesce((r.m07_report#>>'{checks,prerequisites_match}')::boolean and (r.m07_report#>>'{checks,m07_catalog_match}')::boolean,false) as m01_m07_catalog_matches,
    not exists(select 1 from m08_unexpected_routines) as routine_identities_match,
    (select count(*) from m08_named_routines) as named_routine_count,
    coalesce((select bool_and(present and protection_matches and before_body_matches) from m08_function_checks where not is_new),false)
      and not exists(select 1 from m08_function_checks where is_new and present) as before_matches,
    coalesce((select bool_and(present and protection_matches and after_body_matches) from m08_function_checks),false) as after_matches
  from m08_previous_report r
),
m08_result as (
  select *,sql_operator and m01_m07_catalog_matches and routine_identities_match as prerequisites_match from m08_checks
)
select jsonb_build_object('step','M08','report_version',1,'captured_at',statement_timestamp(),
  'expected_project_ref','nsytraextbndfyprwzts','operator',current_user,
  'server_version_num',current_setting('server_version_num')::integer,'transaction_read_only',current_setting('transaction_read_only'),
  'status',case when not r.prerequisites_match then 'm08_prerequisites_or_drift_require_review'
    when r.named_routine_count=1 and r.before_matches then 'ready_for_m08_catalog_checks_only'
    when r.named_routine_count=3 and r.after_matches then 'm08_structurally_verified'
    else 'm08_partial_or_drift_require_review' end,
  'checks',to_jsonb(r),'functions',(select jsonb_agg(to_jsonb(f) order by identity) from m08_function_checks f),
  'unexpected_routines',(select coalesce(jsonb_agg(to_jsonb(f) order by schema_name,name,args),'[]'::jsonb) from m08_unexpected_routines f),
  'unchanged_table_fingerprints',m.m07_report->'unchanged_table_fingerprints',
  'unchanged_routine_fingerprints',(select coalesce(jsonb_agg(to_jsonb(f) order by identity),'[]'::jsonb) from m08_unchanged_routines f),
  'prerequisite_checks',m.m07_report->'checks',
  'prerequisite_diagnostics',case when not r.m01_m07_catalog_matches then m.m07_report end,
  'limits',m.m07_report->'limits',
  'notes',jsonb_build_array(
    'Catalogs only. No application functions, audit rows, export, gate value, payment, Storage or Cron accessed.',
    'Only the exact reviewed M08 audit validator body is normalized for cumulative M01-M07 prerequisites. Actual body and ACL are independently checked.',
    'External before/after comparison of all 33 tables and every unchanged public/private routine is mandatory; SQL limits remain false.',
    'Unchanged routine fingerprints include pg_proc/aggregate catalogs and contain OIDs: compare only on the same database, not across restores or fixtures.',
    'Legacy checkout issue, Auth/PostgREST authorization, API exposure, actual CSV delivery, gate value and release remain separate evidence.'
  )) as m08_report from m08_result r cross join m08_previous_report m;
`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(new URL('supabase/scripts/dashboard_admin_verify_m08.sql',root), buildM08Verification());
  console.log('Generated supabase/scripts/dashboard_admin_verify_m08.sql');
}

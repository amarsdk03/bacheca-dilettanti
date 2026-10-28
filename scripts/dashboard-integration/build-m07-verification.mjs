import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { buildM07Inventory } from "./build-m07-inventory.mjs";

const root = new URL("../../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
export const m07Manifest = JSON.parse(read("scripts/dashboard-integration/m07-definition-fingerprints.json"));
const literal = value => value === null ? "null" : typeof value === "boolean" ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const values = rows => rows.map(row => `(${row.map(literal).join(",")})`).join(",\n");

export function buildM07Verification() {
  const inventory = buildM07Inventory(); // Also checks the unchanged M06/M07 sources.
  const fixture = read("tests/fixtures/admin-m07-reviewed-consumers.sql");
  if (createHash("sha256").update(fixture).digest("hex") !== m07Manifest.fixtureSha256) throw new Error("M07_CONSUMER_FIXTURE_REVIEW_REQUIRED");
  const source = read("supabase/scripts/dashboard_admin_check_m06.sql").replaceAll("\r\n", "\n");
  const begin = source.indexOf("with\n") + 5;
  const end = source.indexOf("\nselect jsonb_build_object('report_version',3");
  const inventoryStart = inventory.indexOf("m07_routine_names(name,scope)");
  const inventoryEnd = inventory.indexOf("\nselect jsonb_build_object('report_version',1,'step','M07A'");
  if (begin < 5 || end < begin || inventoryStart < 0 || inventoryEnd < inventoryStart) throw new Error("M07_SOURCE_FORMAT_REVIEW_REQUIRED");
  const canonical = String.raw`md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))`;
  // Only exact reviewed post-M07 bodies are mapped back for cumulative M01-M06
  // prerequisites. Actual M07 bodies/ACLs are checked independently below.
  const normalized = `coalesce((select e.before_md5 from m07_function_expected e where e.identity::text=p.oid::regprocedure::text and e.after_md5=${canonical}),${canonical})`;
  let cumulative = source.slice(begin, end).replaceAll(canonical, normalized);
  const oldFilter = "where n.nspname='public' and t.tgname in ('admin_lock_parent_v1','zz_guard_admin_announcement_visibility_v1')";
  if (!cumulative.includes(oldFilter)) throw new Error("M06_TRIGGER_SCOPE_REVIEW_REQUIRED");
  cumulative = cumulative.replace(oldFilter, `${oldFilter}\n    and not(c.relname='annuncio_generico' and t.tgname='admin_lock_parent_v1')`);
  return `-- M07B/C: catalog verification BEFORE/AFTER the existing M07 migration.
-- Webapp Bacheca Dilettanti / nsytraextbndfyprwzts (identity verified separately).
-- Run the ENTIRE file as postgres. Catalogs only; no application or gate row read.
-- The initial M07A inventory remains a separate unchanged file.
-- Reviewed target: 17 existing routines, both payment/session overloads, generic child present, snapshot absent.
-- Compare all 33 unchanged_table_fingerprints by schema_name/table_name before closure.
-- A structurally verified state does not certify gate value, authorization, history, cache or release.
begin read only;
set local statement_timeout='15s';
set local lock_timeout='3s';
set local search_path=pg_catalog;
with
m07_function_expected(identity,schema_name,name,args,before_md5,after_md5,acl_md5,is_definer,settings,api_role) as (values
${values(m07Manifest.functions.map(f => [f.identity,f.schema_name,f.name,f.args,f.before_md5,f.after_md5,f.acl_md5,f.is_definer,JSON.stringify(f.settings),f.api_role]))}
),
${cumulative},
${inventory.slice(inventoryStart, inventoryEnd)},
${verificationSql}
rollback;
`;
}

const verificationSql = String.raw`m07_all_routines as materialized (
  select p.*,n.nspname as schema_name,replace(oidvectortypes(p.proargtypes),', ',',') as args,
    case when p.prokind in ('f','p') then md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n')) end as actual_md5
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and (p.proname in(select name from m07_routine_names) or p.proname='guard_announcement_trash_v1')
),
m07_function_checks as (
  select e.identity,e.schema_name,e.name,e.args,e.before_md5 is null as is_new,p.oid is not null as present,p.actual_md5,
    md5(p.proacl::text) as acl_md5,
    coalesce(p.prokind='f' and pg_get_userbyid(p.proowner)='postgres' and md5(p.proacl::text)=e.acl_md5
      and p.prosecdef=e.is_definer and to_jsonb(p.proconfig)=e.settings::jsonb
      and not exists(select 1 from api_roles r where has_function_privilege(r.oid,p.oid,'EXECUTE') is distinct from(r.rolname=e.api_role is true)),false) as protection_matches,
    coalesce(p.actual_md5=e.before_md5,false) as before_body_matches,
    coalesce(p.actual_md5=e.after_md5,false) as after_body_matches,
    (select coalesce(jsonb_agg(jsonb_build_object('role',r.rolname,'execute',has_function_privilege(r.oid,p.oid,'EXECUTE')) order by r.rolname),'[]'::jsonb)
      from api_roles r where p.oid is not null) as effective_execute
  from m07_function_expected e left join m07_all_routines p on p.schema_name=e.schema_name and p.proname=e.name and p.args=e.args
),
m07_consumer_trigger_expected(table_name,name,definition_md5,function_identity,is_new) as (values
CONSUMER_TRIGGER_VALUES
),
m07_consumer_trigger_checks as (
  select e.table_name,e.name,e.is_new,t.name is not null as present,
    coalesce(t.schema_name='public' and t.enabled='O' and t.definition_md5=e.definition_md5
      and t.function_schema||'.'||t.function_name||'('||t.function_args||')'=e.function_identity,false) as matches
  from m07_consumer_trigger_expected e left join m07_consumer_triggers t
    on t.schema_name='public' and t.table_name=e.table_name and t.name=e.name
),
m07_unexpected_routines as (
  select p.schema_name,p.proname as name,p.args,p.prokind as kind,p.actual_md5,pg_get_userbyid(p.proowner) as owner,
    md5(p.proacl::text) as acl_md5,p.proconfig as settings
  from m07_all_routines p where not exists(select 1 from m07_function_expected e where e.schema_name=p.schema_name and e.name=p.proname and e.args=p.args)
),
m07_policy_expected(table_name,name,using_md5,check_md5) as (values
POLICY_VALUES
),
m07_policy_checks as (
  select e.table_name,e.name,p.oid is not null as present,
    coalesce(not p.polpermissive and p.polcmd='*' and p.polroles @> array[(select oid from api_roles where rolname='anon'),(select oid from api_roles where rolname='authenticated')]
      and cardinality(p.polroles)=2 and md5(pg_get_expr(p.polqual,p.polrelid))=e.using_md5
      and md5(pg_get_expr(p.polwithcheck,p.polrelid))=e.check_md5,false) as matches
  from m07_policy_expected e left join m07_tables t on t.schema_name='public' and t.table_name=e.table_name
  left join pg_policy p on p.polrelid=t.oid and p.polname=e.name
),
m07_trigger_expected(table_name,name,definition_md5,function_identity) as (values
TRIGGER_VALUES
),
m07_trigger_checks as (
  select e.table_name,e.name,t.oid is not null as present,
    coalesce(t.tgfoid=to_regprocedure(e.function_identity) and t.tgtype=31 and t.tgenabled='O'
      and not t.tgisinternal and not t.tgdeferrable and not t.tginitdeferred and t.tgparentid=0 and t.tgconstraint=0
      and md5(replace(pg_get_triggerdef(t.oid,true),E'\r\n',E'\n'))=e.definition_md5,false) as matches
  from m07_trigger_expected e left join m07_tables c on c.schema_name='public' and c.table_name=e.table_name
  left join pg_trigger t on t.tgrelid=c.oid and t.tgname=e.name
),
m07_column_checks as (
  select e.name,a.attnum is not null as present,
    coalesce(format_type(a.atttypid,a.atttypmod)=e.type and not a.attnotnull and a.attidentity='' and a.attgenerated='' and a.attacl is null and d.oid is null,false) as matches
  from (values('eliminato_il','timestamp with time zone'),('eliminato_da','uuid')) e(name,type)
  left join m07_tables t on t.schema_name='public' and t.table_name='annuncio'
  left join pg_attribute a on a.attrelid=t.oid and a.attname=e.name and a.attnum>0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
),
m07_gate as materialized (
  select c.* from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname='admin_trash_release_v1'
),
m07_gate_checks as (
  select exists(select 1 from m07_gate) as present,
    coalesce((select case when relkind='r' then relpersistence='p' and pg_get_userbyid(relowner)='postgres' and relrowsecurity and not relforcerowsecurity
      and not exists(select 1 from aclexplode(coalesce(relacl,acldefault('r',relowner))) a where a.grantee<>relowner)
      and not exists(select 1 from api_roles r where has_table_privilege(r.oid,g.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
        or has_any_column_privilege(r.oid,g.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
      and not exists(select 1 from pg_policy p where p.polrelid=g.oid)
      and not exists(select 1 from pg_trigger t where t.tgrelid=g.oid and not t.tgisinternal)
      and (select jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attidentity,a.attgenerated,a.attacl::text,pg_get_expr(d.adbin,d.adrelid)) order by a.attnum)
        from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=g.oid and a.attnum>0 and not a.attisdropped)='GATE_COLUMNS'::jsonb
      and (select jsonb_agg(jsonb_build_array(c.conname,c.contype,c.convalidated,md5(pg_get_constraintdef(c.oid,true))) order by c.conname)
        from pg_constraint c where c.conrelid=g.oid and c.contype<>'n')='GATE_CONSTRAINTS'::jsonb
      and (select count(*)=1 and bool_and(i.indisprimary and i.indisunique and i.indisvalid and i.indisready and i.indislive and i.indimmediate
        and i.indpred is null and i.indexprs is null and i.indnkeyatts=1 and i.indnatts=1) from pg_index i where i.indrelid=g.oid)
      else false end
      from m07_gate g),false) as matches
),
m07_index_check as (
  select coalesce((select c.relkind='i' and i.indisvalid and i.indisready and i.indislive and not i.indisunique and not i.indisprimary
    and case when c.relkind='i' then md5(pg_get_indexdef(c.oid)) end='INDEX_HASH' from pg_class c join pg_namespace n on n.oid=c.relnamespace
    left join pg_index i on i.indexrelid=c.oid where n.nspname='public' and c.relname='annuncio_admin_trash_order_v1_idx'),false) as matches
),
m07_constraint_check as (
  select coalesce((select c.contype='c' and c.convalidated and not c.condeferrable and not c.condeferred
    and md5(pg_get_constraintdef(c.oid,true))='CONSTRAINT_HASH' from pg_constraint c
    where c.conrelid=to_regclass('public.annuncio') and c.conname='annuncio_trash_metadata_v1'),false) as matches
),
m07_normalized_arrays as (
  select t.*,
    (select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(t.columns) with ordinality x(v,ord)
      where not(t.schema_name='public' and t.table_name='annuncio' and v->>'name' in('eliminato_il','eliminato_da'))) as unchanged_columns,
    (select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(t.policies) with ordinality x(v,ord)
      where not(t.schema_name='public' and exists(select 1 from m07_policy_expected e where e.table_name=t.table_name and e.name=v->>'name'))) as unchanged_policies,
    (select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(t.indexes) with ordinality x(v,ord)
      where not(t.schema_name='public' and t.table_name='annuncio' and v->>'name'='annuncio_admin_trash_order_v1_idx')) as unchanged_indexes,
    (select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) from jsonb_array_elements(t.constraints) with ordinality x(v,ord)
      where not(t.schema_name='public' and t.table_name='annuncio' and v->>'name'='annuncio_trash_metadata_v1')) as unchanged_constraints,
    (select coalesce(jsonb_agg(v||jsonb_build_object('function_md5',coalesce(
      (select e.before_md5 from m07_function_expected e where e.identity=v->>'function_identity' and e.after_md5=v->>'function_md5'),v->>'function_md5')) order by ord),'[]'::jsonb)
      from jsonb_array_elements(t.triggers) with ordinality x(v,ord)
      where not(t.schema_name='public' and exists(select 1 from m07_trigger_expected e where e.table_name=t.table_name and e.name=v->>'name'))) as unchanged_triggers
  from m07_table_inventory t
),
m07_unchanged_tables as (
  select schema_name,table_name,present,relkind,relpersistence,owner,rls,force_rls,acl_md5,
    md5(effective_privileges::text) as privileges_md5,md5(unchanged_columns::text) as columns_md5,
    md5(unchanged_policies::text) as policies_md5,md5(unchanged_indexes::text) as indexes_md5,
    md5(unchanged_constraints::text) as constraints_md5,md5(unchanged_triggers::text) as triggers_md5
  from m07_normalized_arrays
),
m07_checks as (
  select current_user='postgres' as sql_operator,
    coalesce(m.m06_prerequisites_match and m.moderation_catalog_matches,false) as m01_m06_prerequisites_match,
    (select count(*)=33 and bool_and(present and relkind='r' and relpersistence='p' and owner='postgres' and rls) from m07_table_inventory) as source_tables_match,
    (select count(*) from m07_all_routines) as actual_routine_count,
    (select count(*) from m07_objects) as m07_marker_count,
    (select count(*) from m07_consumer_triggers) as actual_consumer_trigger_count,
    (select count(*)=18 from m07_consumer_triggers) and (select bool_and(matches) from m07_consumer_trigger_checks where not is_new) as consumer_triggers_before_match,
    (select count(*)=19 from m07_consumer_triggers) and (select bool_and(matches) from m07_consumer_trigger_checks) as consumer_triggers_after_match,
    not exists(select 1 from m07_unexpected_routines) as routine_identities_match,
    coalesce((select bool_and(present and protection_matches and before_body_matches) from m07_function_checks where not is_new),false) as functions_before_match,
    coalesce((select bool_and(present and protection_matches and after_body_matches) from m07_function_checks),false) as functions_after_match,
    (select bool_and(matches) from m07_column_checks) as columns_match,
    (select bool_and(matches) from m07_policy_checks) as policies_match,
    (select bool_and(matches) from m07_trigger_checks) as triggers_match,
    (select matches from m07_gate_checks) as gate_catalog_match,
    (select matches from m07_index_check) as index_match,
    (select matches from m07_constraint_check) as constraint_match
  from m06_result m
),
m07_result as (
  select c.*,coalesce(sql_operator and m01_m06_prerequisites_match and source_tables_match and routine_identities_match
      and (consumer_triggers_before_match or consumer_triggers_after_match),false) as prerequisites_match,
    coalesce(actual_routine_count=18 and m07_marker_count=25 and functions_after_match and columns_match and policies_match and triggers_match
      and gate_catalog_match and index_match and constraint_match and consumer_triggers_after_match,false) as m07_catalog_match from m07_checks c
)
select jsonb_build_object('step','M07','report_version',2,'captured_at',statement_timestamp(),
  'expected_project_name','Webapp Bacheca Dilettanti','expected_project_ref','nsytraextbndfyprwzts',
  'operator',current_user,'server_version_num',current_setting('server_version_num')::integer,'transaction_read_only',current_setting('transaction_read_only'),
  'status',case when not r.prerequisites_match then 'm07_prerequisites_or_drift_require_review'
    when actual_routine_count=17 and m07_marker_count=0 and functions_before_match and consumer_triggers_before_match then 'ready_for_m07_catalog_checks_only'
    when m07_catalog_match then 'm07_structurally_verified_gate_unread' else 'm07_partial_or_drift_require_review' end,
  'checks',to_jsonb(r),
  'functions',(select jsonb_agg(to_jsonb(f) order by schema_name,name,args) from m07_function_checks f),
  'unexpected_routines',(select coalesce(jsonb_agg(to_jsonb(f) order by schema_name,name,args),'[]'::jsonb) from m07_unexpected_routines f),
  'columns',(select jsonb_agg(to_jsonb(c) order by name) from m07_column_checks c),
  'policies',(select jsonb_agg(to_jsonb(p) order by table_name,name) from m07_policy_checks p),
  'triggers',(select jsonb_agg(to_jsonb(t) order by table_name,name) from m07_trigger_checks t),
  'consumer_triggers',(select jsonb_agg(to_jsonb(t) order by table_name,name) from m07_consumer_trigger_checks t),
  'unexpected_consumer_triggers',(select coalesce(jsonb_agg(to_jsonb(t) order by schema_name,table_name,name),'[]'::jsonb) from m07_consumer_triggers t
    where not exists(select 1 from m07_consumer_trigger_expected e where t.schema_name='public' and t.table_name=e.table_name and t.name=e.name)),
  'gate_catalog',(select to_jsonb(g) from m07_gate_checks g),
  'unchanged_table_fingerprints',(select jsonb_agg(to_jsonb(t) order by schema_name,table_name) from m07_unchanged_tables t),
  'm07_objects',(select coalesce(jsonb_agg(to_jsonb(o) order by kind,schema_name,table_name,name),'[]'::jsonb) from m07_objects o),
  'prerequisite_checks',to_jsonb(m06_result),
  'limits',jsonb_build_object('project_identity_verified',false,'backup_verified',false,'application_rows_read',false,'application_functions_called',false,
    'gate_value_read',false,'gate_disabled_verified',false,'external_table_comparison_completed',false,'functional_authorization_verified',false,
    'migration_history_verified',false,'api_schema_exposure_verified',false,'cron_jobs_read_or_changed',false,'release_authorized',false),
  'notes',jsonb_build_array(
    'Catalogs only. No application rows/functions, gate value, payment, audit or Cron job accessed.',
    'This target-specific check requires both reviewed payment overloads, both session overloads, generic child present and snapshot function absent. New overloads require review.',
    'Cumulative M01-M06 checks normalize only exact reviewed post-M07 function hashes and omit the separately checked new generic trigger. Never replay M05/M06/M06A after intentional M07 changes.',
    'Compare all 33 unchanged_table_fingerprints with the reviewed M07A baseline and fresh pre-M07 report, by schema_name/table_name. Source limits remain false.',
    'Only the two trash columns, seventeen expected policies, two expected new triggers, one constraint and one index are excluded from unchanged fingerprints. Each is separately checked.',
    'For existing triggers only exact reviewed post-M07 function bodies are normalized to their before hash; all other bodies, definitions, grants, owners and effective privileges remain fingerprinted.',
    '25 markers cover principal new objects, excluding gate internal columns/constraints/index which are checked separately. Partial or mixed states require review, never replay or grants.',
    'The structurally verified status deliberately leaves the gate unread. Its actual disabled value requires the separate post-installation READ ONLY gate check; activation is a separate release step.',
    'Project identity, accepted Free backup, API exposure, functional authorization, migration history and release are separate evidence. No activation is authorized by this report.')
) as m07_report from m07_result r cross join m06_result;`
  .replace("POLICY_VALUES", values(m07Manifest.policies.map(p => [p.table_name,p.name,p.using_md5,p.check_md5])))
  .replace("CONSUMER_TRIGGER_VALUES", values(m07Manifest.consumerTriggers.map(t => [t.table_name,t.name,t.definition_md5,t.function_identity,t.is_new])))
  .replace("TRIGGER_VALUES", values(m07Manifest.newTriggers.map(t => [t.table_name,t.name,t.definition_md5,t.function_identity])))
  .replace("GATE_COLUMNS", JSON.stringify(m07Manifest.gateColumns).replaceAll("'", "''"))
  .replace("GATE_CONSTRAINTS", JSON.stringify(m07Manifest.gateConstraints).replaceAll("'", "''"))
  .replace("INDEX_HASH", m07Manifest.newIndex.definition_md5)
  .replace("CONSTRAINT_HASH", m07Manifest.newConstraint.definition_md5);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(new URL("supabase/scripts/dashboard_admin_verify_m07.sql", root), buildM07Verification());
  console.log("Generated supabase/scripts/dashboard_admin_verify_m07.sql");
}

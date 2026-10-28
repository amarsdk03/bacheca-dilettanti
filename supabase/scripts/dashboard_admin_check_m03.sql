-- M03: run this ENTIRE file BEFORE and AFTER the existing bridge migration.
-- Expected: Webapp Bacheca Dilettanti / nsytraextbndfyprwzts (Dashboard URL).
-- Catalogs only. No audit rows, app/helper calls, writes, Cron or secret values.
-- Includes independent M01/M02 prerequisite checks; never replay M01/M02.
begin read only;
set local statement_timeout = '15s';
set local lock_timeout = '3s';
set local search_path = pg_catalog;

with
expected_functions(name,args,definition_md5) as (values
  ('admin_audit_payload_valid_v1','text,text,text,text,jsonb,jsonb','606bb068d32160b3a7ac848e20a02ae1'),
  ('admin_audit_retention_cutoff_v1','timestamp with time zone','cdc37d3f5fb200e278b3378a4f243807'),
  ('append_admin_audit_event_v1','uuid,uuid,text,text,uuid,text,uuid,text,text,jsonb,jsonb','fd3f1c47ae594c6dc03a2a03a01c57df'),
  ('purge_admin_audit_events_v1','','4b6f0370fd949eed8372813ba059ab46')
),
expected_constraints(name,definition_md5) as (values
  ('admin_audit_actor_v1','c4d1be0c3ef78d48654dbc1b58e32b6e'),
  ('admin_audit_event_v1_occurred_at_check','8f94bbba9e03d811c822d0c095a39e36'),
  ('admin_audit_event_v1_pkey','91e4ea610efff48974c04e1e28bdec3a'),
  ('admin_audit_payload_v1','33febb0a86a5b4f14f4e491e4d58805a'),
  ('admin_audit_resource_v1','f34805ea71c521ed464ce3951b318e28')
),
expected_indexes(name,definition_md5,is_primary) as (values
  ('admin_audit_event_actor_time_v1','e244b41ef5db6499e2901066504720b8',false),
  ('admin_audit_event_correlation_v1','4a4f9924c1de9072ee3e4df2927dcf25',false),
  ('admin_audit_event_time_v1','8d8faa526fe93b50bf5883c0227e7587',false),
  ('admin_audit_event_v1_pkey','a49c1c3ab9c1af6741fd5ecaf7396ecb',true)
),
api_roles as materialized (
  select oid,rolname,rolsuper,rolbypassrls from pg_roles
  where rolname in ('anon','authenticated','service_role','supabase_auth_admin')
),
private_schema as materialized (select * from pg_namespace where nspname='private'),
routines as materialized (
  select p.*,replace(oidvectortypes(p.proargtypes),', ',',') as args,
    case when p.prokind='f' and (p.proname='require_admin_context_v1' or p.proname in (select name from expected_functions))
      then md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n')) end as canonical_md5
  from pg_proc p join private_schema n on n.oid=p.pronamespace
),
relations as materialized (
  select c.* from pg_class c join private_schema n on n.oid=c.relnamespace
),
audit_table as materialized (select * from relations where relname='admin_audit_event_v1'),
function_checks as (
  select e.name,e.args,p.oid is not null as present,
    p.canonical_md5 as actual_md5,
    coalesce(p.prokind='f' and pg_get_userbyid(p.proowner)='postgres' and not p.prosecdef
      and p.canonical_md5=e.definition_md5
      and has_function_privilege(p.oid,'EXECUTE')
      and not exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee<>p.proowner)
      and not exists(select 1 from api_roles r where has_function_privilege(r.oid,p.oid,'EXECUTE')),false) as matches,
    (select jsonb_agg(jsonb_build_object('role',r.rolname,'execute',has_function_privilege(r.oid,p.oid,'EXECUTE')) order by r.rolname)
      from api_roles r where p.oid is not null) as effective_execute
  from expected_functions e left join routines p on p.proname=e.name and p.args=e.args
),
column_checks as (
  select coalesce(jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,
      (select md5(pg_get_expr(d.adbin,d.adrelid)) from pg_attrdef d where d.adrelid=a.attrelid and d.adnum=a.attnum)) order by a.attnum),'[]'::jsonb) as spec,
    coalesce(bool_and(a.attidentity='' and a.attgenerated='' and a.attacl is null),false) as attributes_match,
    coalesce(bool_and(not exists(select 1 from api_roles r where
      has_column_privilege(r.oid,a.attrelid,a.attnum,'SELECT,INSERT,UPDATE,REFERENCES'))),false) as api_denied
  from audit_table t join pg_attribute a on a.attrelid=t.oid where a.attnum>0 and not a.attisdropped
),
constraint_checks as (
  select e.name,coalesce(k.convalidated and md5(pg_get_constraintdef(k.oid,true))=e.definition_md5,false) as matches
  from expected_constraints e left join (pg_constraint k join audit_table t on t.oid=k.conrelid) on k.conname=e.name
),
index_checks as (
  select e.name,coalesce(i.indisvalid and i.indisready and i.indislive and i.indisprimary=e.is_primary
    and i.indisunique=e.is_primary and md5(pg_get_indexdef(c.oid))=e.definition_md5,false) as matches
  from expected_indexes e left join (relations c join pg_index i on i.indexrelid=c.oid
    join audit_table t on t.oid=i.indrelid) on c.relname=e.name
),
checks as (
  select
    current_user='postgres' and nullif(current_setting('request.jwt.claims',true),'') is null as sql_operator,
    (select count(*)=4 and bool_and(case when rolname in ('anon','authenticated') then not rolsuper and not rolbypassrls else not rolsuper end) from api_roles) as roles_expected,
    coalesce((select pg_get_userbyid(nspowner)='postgres' and has_schema_privilege(oid,'USAGE') and has_schema_privilege(oid,'CREATE')
      and not exists(select 1 from api_roles r where has_schema_privilege(r.oid,n.oid,'CREATE')) from private_schema n),false) as private_schema_ready,
    coalesce((select p.prokind='f' and pg_get_userbyid(p.proowner)='postgres' and p.prosecdef
      and p.canonical_md5='1d690a9d807dd26c539b26dd2d092c14'
      and has_function_privilege(p.oid,'EXECUTE')
      and not exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        where a.grantee<>p.proowner and (a.is_grantable or a.grantee not in
          (select r.oid from api_roles r where r.rolname='authenticated')))
      and not exists(select 1 from api_roles r where has_function_privilege(r.oid,p.oid,'EXECUTE') is distinct from (r.rolname='authenticated'))
      from routines p where p.proname='require_admin_context_v1' and p.args=''),false) as m01_context_matches,
    (select count(*) from routines p where p.proname in (select name from expected_functions))
      +(select count(*) from relations c where c.relname='admin_audit_event_v1' or c.relname in (select name from expected_indexes)) as m02_named_objects,
    (select count(*)=4 from routines p where p.proname in (select name from expected_functions))
      and (select bool_and(matches) from function_checks) as functions_match,
    coalesce((select relkind='r' and relpersistence='p' and pg_get_userbyid(relowner)='postgres'
      and relrowsecurity and not relforcerowsecurity
      and has_table_privilege(t.oid,'SELECT') and has_table_privilege(t.oid,'INSERT')
      and has_table_privilege(t.oid,'UPDATE') and has_table_privilege(t.oid,'DELETE')
      and not exists(select 1 from aclexplode(coalesce(relacl,acldefault('r',relowner))) a where a.grantee<>relowner)
      and not exists(select 1 from api_roles r where has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))
      and not exists(select 1 from pg_policy p where p.polrelid=t.oid)
      and not exists(select 1 from pg_trigger g where g.tgrelid=t.oid and not g.tgisinternal)
      from audit_table t),false) as table_access_matches,
    (select attributes_match and api_denied and spec='[
      ["event_uuid","uuid",true,"f3b72bb359a50b640590970a2ab8e514"],
      ["occurred_at","timestamp with time zone",true,"f84048a7a635d04d1283dec150d2655f"],
      ["correlation_uuid","uuid",true,null],["actor_auth_user_uuid","uuid",false,null],
      ["actor_utente_uuid","uuid",false,null],["action","text",true,null],
      ["resource_type","text",true,null],["resource_uuid","uuid",false,null],
      ["outcome","text",true,null],["reason","text",false,null],["failure_code","text",false,null],
      ["changes","jsonb",true,"f3db357cf4f4a03883484fa3281a056c"],
      ["details","jsonb",true,"f3db357cf4f4a03883484fa3281a056c"]]'::jsonb from column_checks) as columns_match,
    (select bool_and(matches) from constraint_checks) and
      (select count(*)=5 from pg_constraint k join audit_table t on t.oid=k.conrelid where k.contype<>'n') as constraints_match,
    (select bool_and(matches) from index_checks) and
      (select count(*)=4 from pg_index i join audit_table t on t.oid=i.indrelid) as indexes_match
),
result as (
  select *,sql_operator and roles_expected and private_schema_ready and m01_context_matches as prerequisites_match,
    functions_match and table_access_matches and columns_match and constraints_match and indexes_match as audit_catalog_matches
  from checks
),
bridge_expected(schema_name,name,args,definition_md5,is_definer,language_name) as (values
  ('private','record_admin_server_audit_v1','text,text,uuid,uuid,uuid,uuid,text','17127de1fccf90f1d52d1c64ca666887',true,'plpgsql'),
  ('public','admin_record_server_audit_v1','text,text,uuid,uuid,uuid,uuid,text','cdcbb3cc1271435cd92bebfa0ddc15cb',false,'sql')
),
bridge_routines as materialized (
  select p.*,n.nspname,l.lanname,replace(oidvectortypes(p.proargtypes),', ',',') as args,
    case when p.prokind='f' then md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n')) end as canonical_md5
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
  where (n.nspname,p.proname) in (select schema_name,name from bridge_expected)
),
bridge_function_checks as (
  select e.schema_name,e.name,e.args,p.oid is not null as present,
    p.canonical_md5 as actual_md5,
    coalesce(p.prokind='f' and pg_get_userbyid(p.proowner)='postgres'
      and p.prosecdef=e.is_definer and p.provolatile='v' and not p.proisstrict and not p.proretset
      and p.prorettype='uuid'::regtype and p.pronargdefaults=4 and p.lanname=e.language_name
      and p.proconfig=array['search_path=""']::text[] and p.canonical_md5=e.definition_md5
      and has_function_privilege(p.oid,'EXECUTE')
      and not exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        where a.grantee<>p.proowner and (a.is_grantable or a.grantee not in
          (select oid from api_roles where rolname='service_role')))
      and not exists(select 1 from api_roles r where has_function_privilege(r.oid,p.oid,'EXECUTE') is distinct from (r.rolname='service_role')),false) as matches,
    (select jsonb_agg(jsonb_build_object('role',r.rolname,'execute',has_function_privilege(r.oid,p.oid,'EXECUTE')) order by r.rolname)
      from api_roles r where p.oid is not null) as effective_execute
  from bridge_expected e left join bridge_routines p on p.nspname=e.schema_name and p.proname=e.name and p.args=e.args
),
private_public_execute as materialized (
  select format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) as identity
  from pg_proc p join private_schema n on n.oid=p.pronamespace
  where exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    where a.grantee=0 and a.privilege_type='EXECUTE')
),
bridge_checks as (
  select (select count(*) from bridge_routines) as m03_named_objects,
    coalesce((select pg_get_userbyid(nspowner) in ('postgres','pg_database_owner')
      and has_schema_privilege(oid,'USAGE') and has_schema_privilege(oid,'CREATE')
      and not exists(select 1 from api_roles r where has_schema_privilege(r.oid,n.oid,'CREATE'))
      from pg_namespace n where nspname='public'),false) as public_schema_ready,
    coalesce((select count(*)=1 and bool_and(p.prokind='f' and p.prorettype='jsonb'::regtype
      and has_function_privilege((select oid from api_roles where rolname='service_role'),p.oid,'EXECUTE')
      and has_schema_privilege((select oid from api_roles where rolname='service_role'),n.oid,'USAGE'))
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='auth' and p.proname='jwt' and p.pronargs=0),false) as auth_jwt_available,
    not exists(select 1 from private_public_execute) as private_public_execute_denied,
    coalesce((select has_schema_privilege(r.oid,n.oid,'USAGE') from private_schema n
      cross join api_roles r where r.rolname='service_role'),false) as service_private_usage,
    (select count(*)=2 from bridge_routines) and
      coalesce((select bool_and(matches) from bridge_function_checks),false) as bridge_functions_match
),
m03_result as (
  select r.*,b.*, coalesce(r.prerequisites_match and r.audit_catalog_matches
      and b.public_schema_ready and b.auth_jwt_available and b.private_public_execute_denied,false) as m03_prerequisites_match,
    b.bridge_functions_match and b.service_private_usage as bridge_catalog_matches
  from result r cross join bridge_checks b
)
select jsonb_build_object(
  'report_version',1,'step','M03','captured_at',statement_timestamp(),
  'expected_project_name','Webapp Bacheca Dilettanti','expected_project_ref','nsytraextbndfyprwzts',
  'operator',current_user,'server_version_num',current_setting('server_version_num')::integer,
  'transaction_read_only',current_setting('transaction_read_only'),
  'status',case when not m03_prerequisites_match then 'prerequisites_require_review'
    when m03_named_objects=0 then 'ready_for_m03_catalog_checks_only'
    when bridge_catalog_matches then 'm03_structurally_verified'
    else 'm03_partial_or_drift_require_review' end,
  'checks',to_jsonb(m03_result),
  'functions',(select jsonb_agg(to_jsonb(f) order by schema_name,name) from bridge_function_checks f),
  'm02_functions',(select jsonb_agg(to_jsonb(f) order by name) from function_checks f),
  'm02_constraints',(select jsonb_agg(to_jsonb(c) order by name) from constraint_checks c),
  'm02_indexes',(select jsonb_agg(to_jsonb(i) order by name) from index_checks i),
  'private_public_execute',(select coalesce(jsonb_agg(identity order by identity),'[]'::jsonb) from private_public_execute),
  'limits',jsonb_build_object('application_rows_read',false,'application_functions_called',false,
    'project_identity_verified',false,'backup_verified',false,'functional_authorization_verified',false,
    'migration_history_verified',false,'cron_jobs_read_or_changed',false,'api_schema_exposure_verified',false),
  'notes',jsonb_build_array('Project ID and manual backup are recorded separately; report labels cannot certify them.',
    'Definition hashes normalize LF/CRLF. Differences require review, never replay or privilege repair.',
    'No audit write, append, purge, auth settings, Cron or session policy values are invoked/read.',
    'Private PUBLIC EXECUTE must be reviewed before granting schema usage; API exposure is checked separately.',
    'This report never applies migrations. After verified installation, never replay M03.')
) as m03_report from m03_result;
rollback;

-- IN01: run this ENTIRE file in the existing apps/web project's SQL Editor.
-- No parameters, DDL, application RPCs, account/session rows or data writes.
-- Record the project name/ref separately: current_database() is not a project ID.
-- The OPTIONAL history query at the bottom is COMMENTED OUT deliberately.
-- Return the complete baseline_report, not only the truncated cell preview.
-- BASELINE_SQL_BEGIN
begin read only;
set local statement_timeout = '15s';
set local lock_timeout = '3s';
set local search_path = pg_catalog;

with
expected(migration, version, kind, identity) as (values
  ('M01','20261024095639','relation','private.admin_session_policy_v1'),
  ('M01','20261024095639','function','private.require_admin_context_v1()'),
  ('M01','20261024095639','function','public.admin_get_context_v1()'),
  ('M02','20261024104822','relation','private.admin_audit_event_v1'),
  ('M02','20261024104822','function','private.purge_admin_audit_events_v1()'),
  ('M03','20261024110910','function','private.record_admin_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)'),
  ('M03','20261024110910','function','public.admin_record_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)'),
  ('M04','20261024120724','function','public.admin_list_announcements_v1(jsonb)'),
  ('M04','20261024120724','relation','public.annuncio_admin_order_v1_idx'),
  ('M05','20261024145954','function','public.admin_get_announcement_v1(uuid)'),
  ('M05','20261024145954','function','private.admin_announcement_snapshot_v1(uuid)'),
  ('M06','20261024155838','function','public.admin_moderate_announcement_v1(uuid,text,text,text)'),
  ('M06','20261024155838','column','public.annuncio.oscurato_da_admin'),
  ('M07','20261024162714','relation','private.admin_trash_release_v1'),
  ('M07','20261024162714','column','public.annuncio.eliminato_il'),
  ('M07','20261024162714','column','public.annuncio.eliminato_da'),
  ('M08','20261024205423','function','public.admin_export_announcements_v1(jsonb,jsonb)'),
  ('M08','20261024205423','function','private.export_admin_announcements_v1(jsonb,jsonb)'),
  ('M09','20261024211431','function','public.admin_list_audit_events_v1(jsonb)'),
  ('M09','20261024211431','function','public.admin_get_audit_event_v1(uuid)'),
  ('M09','20261024211431','relation','private.admin_audit_event_auth_time_v1'),
  ('M10','20261024212824','function','public.admin_get_home_summary_v1()'),
  ('M10','20261024212824','function','public.admin_get_home_chart_v1(text)')
),
roles as materialized (
  select oid, rolname, rolsuper, rolinherit, rolbypassrls
  from pg_roles where rolname in ('anon','authenticated','service_role','supabase_auth_admin',current_user)
),
classes as materialized (
  select c.*, n.nspname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','private','auth','storage','supabase_migrations')
),
routines as materialized (
  select p.*, n.nspname,
    n.nspname || '.' || p.proname || '(' || replace(oidvectortypes(p.proargtypes), ', ', ',') || ')' as identity
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and p.prokind='f'
),
objects(kind, identity) as (
  select 'relation', nspname || '.' || relname from classes
  union all select 'function', identity from routines
  union all select 'column', c.nspname || '.' || c.relname || '.' || a.attname
    from classes c join pg_attribute a on a.attrelid=c.oid where a.attnum>0 and not a.attisdropped
),
markers as (
  select e.*, exists(select 1 from objects o where o.kind=e.kind and o.identity=e.identity) as present from expected e
),
history as (
  select c.oid, c.relkind,
    exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='version' and a.attnum>0 and not a.attisdropped) as version_column,
    has_table_privilege(c.oid,'SELECT') as readable
  from classes c where c.nspname='supabase_migrations' and c.relname='schema_migrations' and c.relkind in ('r','p')
)
select jsonb_build_object(
  'report_version', 1,
  'captured_at', statement_timestamp(),
  'environment', jsonb_build_object('database',current_database(),'operator',current_user,
    'server_version_num',current_setting('server_version_num')::integer,
    'transaction_read_only',current_setting('transaction_read_only'),
    'statement_timeout',current_setting('statement_timeout'),'lock_timeout',current_setting('lock_timeout'),
    'inspection_search_path',current_setting('search_path'),
    'project_identity','record_project_name_and_ref_separately'),
  'limits', jsonb_build_object('application_rows_read',false,'application_functions_called',false,
    'migration_application_certified',false,'functional_authorization_verified',false,
    'auth_settings_gate_values_and_cron_jobs_read',false,'definition_fingerprints_only',true),
  'migration_markers', (select jsonb_agg(jsonb_build_object('migration',migration,'version',version,
    'presence',case when all_present then 'all_markers_present' when any_present then 'some_markers_present' else 'markers_absent' end,
    'objects',items) order by migration) from (
      select migration,version,bool_and(present) as all_present,bool_or(present) as any_present,
        jsonb_agg(jsonb_build_object('kind',kind,'identity',identity,'present',present) order by kind,identity) as items
      from markers group by migration,version
    ) m),
  'migration_history', coalesce((select jsonb_build_object('table_present',true,'version_column_present',version_column,
    'select_allowed',readable,'can_read_versions',version_column and readable,
    'status',case when not version_column then 'version_column_missing' when not readable then 'not_verifiable_permission_denied' else 'run_optional_history_query' end) from history),
    jsonb_build_object('table_present',false,'can_read_versions',false,'status','history_table_absent_not_proof_of_missing_migrations')),
  'schemas', (select coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),'acl',n.nspacl,
    'effective_privileges',(select jsonb_agg(jsonb_build_object('role',r.rolname,'usage',has_schema_privilege(r.oid,n.oid,'USAGE'),
      'create',has_schema_privilege(r.oid,n.oid,'CREATE')) order by r.rolname) from roles r)) order by n.nspname),'[]'::jsonb)
    from pg_namespace n where n.nspname in ('public','private','auth','storage','supabase_migrations')),
  'roles', (select coalesce(jsonb_agg(jsonb_build_object('name',rolname,'superuser',rolsuper,'inherit',rolinherit,'bypass_rls',rolbypassrls)
    order by rolname),'[]'::jsonb) from roles),
  'extensions', (select coalesce(jsonb_agg(jsonb_build_object('name',e.extname,'version',e.extversion,'schema',n.nspname) order by e.extname),'[]'::jsonb)
    from pg_extension e join pg_namespace n on n.oid=e.extnamespace),
  'relations', (select coalesce(jsonb_agg(jsonb_build_object('schema',c.nspname,'name',c.relname,'kind',c.relkind,
    'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl,
    'effective_privileges',(select jsonb_agg(jsonb_build_object('role',r.rolname,'select',has_table_privilege(r.oid,c.oid,'SELECT'),
      'insert',has_table_privilege(r.oid,c.oid,'INSERT'),'update',has_table_privilege(r.oid,c.oid,'UPDATE'),'delete',has_table_privilege(r.oid,c.oid,'DELETE')) order by r.rolname) from roles r),
    'columns',(select coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
      'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'acl',a.attacl,
      'default_md5',(select md5(pg_get_expr(d.adbin,d.adrelid)) from pg_attrdef d where d.adrelid=c.oid and d.adnum=a.attnum),
      'admin_identity_privileges',case when c.nspname='public' and c.relname='utente' and a.attname in ('tipologia_utente','auth_user_uuid','utente_uuid','registrato_il') then
        (select jsonb_agg(jsonb_build_object('role',r.rolname,'select',has_column_privilege(r.oid,c.oid,a.attnum,'SELECT'),
          'insert',has_column_privilege(r.oid,c.oid,a.attnum,'INSERT'),'update',has_column_privilege(r.oid,c.oid,a.attnum,'UPDATE')) order by r.rolname) from roles r) else null end
      ) order by a.attnum),'[]'::jsonb) from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'type',k.contype,'validated',k.convalidated,
      'definition_md5',md5(pg_get_constraintdef(k.oid,true))) order by k.conname),'[]'::jsonb) from pg_constraint k where k.conrelid=c.oid),
    'indexes',(select coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'unique',i.indisunique,'primary',i.indisprimary,
      'valid',i.indisvalid,'ready',i.indisready,'definition_md5',md5(pg_get_indexdef(i.indexrelid))) order by ic.relname),'[]'::jsonb)
      from pg_index i join pg_class ic on ic.oid=i.indexrelid where i.indrelid=c.oid),
    'policies',(select coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
      'roles',(select jsonb_agg(case when role_oid=0 then 'PUBLIC' else pg_get_userbyid(role_oid) end order by role_oid) from unnest(p.polroles) as role_oid),
      'using_md5',md5(pg_get_expr(p.polqual,p.polrelid)),'with_check_md5',md5(pg_get_expr(p.polwithcheck,p.polrelid))) order by p.polname),'[]'::jsonb) from pg_policy p where p.polrelid=c.oid),
    'triggers',(select coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,
      'definition_md5',md5(pg_get_triggerdef(t.oid,false)),'function',fn.nspname || '.' || fp.proname)
      order by t.tgname),'[]'::jsonb) from pg_trigger t join pg_proc fp on fp.oid=t.tgfoid join pg_namespace fn on fn.oid=fp.pronamespace
      where t.tgrelid=c.oid and not t.tgisinternal)
    ) order by c.nspname,c.relname),'[]'::jsonb) from classes c
      where c.relkind in ('r','p','v','m','f') and c.nspname in ('public','private','auth','storage')),
  'functions', (select coalesce(jsonb_agg(jsonb_build_object('identity',p.identity,'owner',pg_get_userbyid(p.proowner),
    'language',l.lanname,'result',pg_get_function_result(p.oid),'security_definer',p.prosecdef,
    'volatility',p.provolatile,'strict',p.proisstrict,'acl',p.proacl,'definition_md5',md5(pg_get_functiondef(p.oid)),
    'operational_settings',(select coalesce(jsonb_agg(setting order by setting),'[]'::jsonb) from unnest(p.proconfig) as setting
      where split_part(setting,'=',1) in ('search_path','row_security','statement_timeout','lock_timeout')),
    'public_execute',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),
    'effective_execute',(select jsonb_agg(jsonb_build_object('role',r.rolname,'allowed',has_function_privilege(r.oid,p.oid,'EXECUTE')) order by r.rolname) from roles r)
    ) order by p.identity),'[]'::jsonb) from routines p join pg_language l on l.oid=p.prolang),
  'notes', jsonb_build_array('Markers certify presence only. Compare definitions and effective privileges before any migration.',
    'NULL ACL does not mean no privileges: effective privileges and PUBLIC defaults are reported.',
    'Only metadata and definition hashes are returned. No application function is executed.',
    'Hash differences require review; they are not instructions to replay or repair migrations.')
) as baseline_report;
rollback;
-- BASELINE_SQL_END

/*
OPTIONAL HISTORY: execute ONLY when baseline_report.migration_history.can_read_versions=true.
Copy just the SQL between the next two markers into a SECOND SQL Editor query.
Only version IDs are read. statements, names and applied_by are NEVER exported.
-- OPTIONAL_HISTORY_SQL_BEGIN
begin read only;
set local statement_timeout = '15s';
set local lock_timeout = '3s';
set local search_path = pg_catalog;
with history as materialized (
  select version::text as version from supabase_migrations.schema_migrations order by version limit 2001
), bounded as (select version from history order by version limit 2000)
select jsonb_build_object('report_version',1,'captured_at',statement_timestamp(),
  'transaction_read_only',current_setting('transaction_read_only'),
  'versions',coalesce((select jsonb_agg(version order by version) from bounded),'[]'::jsonb),
  'returned_count',(select count(*) from bounded),'truncated',(select count(*)>2000 from history)
) as migration_history_report;
rollback;
-- OPTIONAL_HISTORY_SQL_END
*/

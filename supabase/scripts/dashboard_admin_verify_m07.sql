-- M07B/C: catalog verification BEFORE/AFTER the existing M07 migration.
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
('private.admin_moderation_capabilities_v1(jsonb,jsonb)','private','admin_moderation_capabilities_v1','jsonb,jsonb','9e8450c8255a342109bcdaad9e62c954','1f01ac11c43c6465b18d3557b4b35caa','dfda960bf9e0be03ea7516906ee58e3b',false,'["search_path=\"\""]',null),
('private.auto_approve_new_announcement_until_v1()','private','auto_approve_new_announcement_until_v1','','893f818587ade9ca2b8d0f27fac660e8','3541acabba0afd57c036b552b22dcb81','dfda960bf9e0be03ea7516906ee58e3b',true,'["search_path=\"\""]',null),
('private.guard_announcement_trash_v1()','private','guard_announcement_trash_v1','',null,'b9d416e6847e7d8ac710e661967d18e0','dfda960bf9e0be03ea7516906ee58e3b',false,'["search_path=\"\""]',null),
('private.list_admin_announcements_v1(jsonb)','private','list_admin_announcements_v1','jsonb','29910e0bd58ec293e1990b606c84e09d','dea0fb8102667f29d22c3226ea53fbde','5fc13192159b7c60c3a808895ae2c2c8',true,'["search_path=\"\"","TimeZone=UTC"]','authenticated'),
('private.lock_announcement_child_parent_v1()','private','lock_announcement_child_parent_v1','','3f9b776a4e1194bea2eb6f6aa7e61c05','60c836283d4aff2cef93d9ae5b998f42','dfda960bf9e0be03ea7516906ee58e3b',true,'["search_path=\"\""]',null),
('private.moderate_admin_announcement_v1(uuid,text,text,text)','private','moderate_admin_announcement_v1','uuid,text,text,text','ace0def49e8a35dcb59c0c72b120e5d7','e66dbe840d1b9aa27fe7ac79fa6b6da8','5fc13192159b7c60c3a808895ae2c2c8',true,'["search_path=\"\"","TimeZone=UTC"]','authenticated'),
('private.notification_display_ref(jsonb,boolean)','private','notification_display_ref','jsonb,boolean','3e998f80a4513347c7f1438136ae7ed7','13e0c62d7427811509b455de5877bdd0','db23e67d6fad77fdfa003856d807d6af',false,'["search_path=\"\""]','service_role'),
('private.notification_target_ref(uuid,uuid,text)','private','notification_target_ref','uuid,uuid,text','cac75d74b1a071d2295e0250c6c7293b','81e5e29fa1a66e648a20969ca7974147','db23e67d6fad77fdfa003856d807d6af',false,'["search_path=\"\""]','service_role'),
('private.notify_announcement_v1()','private','notify_announcement_v1','','2735b306133d0ba90dd7feb7715b10c1','3448753b4008593bae365041c8cf5288','db23e67d6fad77fdfa003856d807d6af',false,'["search_path=\"\""]','service_role'),
('private.project_admin_announcement_v1(jsonb)','private','project_admin_announcement_v1','jsonb','b673a78e7214368677a39109697b8e0b','aba2757a5e72bd267cbf8c325647eb3f','dfda960bf9e0be03ea7516906ee58e3b',false,'["search_path=\"\"","TimeZone=UTC"]',null),
('private.prune_revoked_professional_regions_v1()','private','prune_revoked_professional_regions_v1','','077856bb543dcec689800e3b0841d236','b5ffb877a3a225e8b19d634f1f428d26','db23e67d6fad77fdfa003856d807d6af',false,'["search_path=\"\""]','service_role'),
('public.get_notifications_v1(uuid,integer,timestamp with time zone,bigint)','public','get_notifications_v1','uuid,integer,timestamp with time zone,bigint','1479c65da44778e4291fdba171a64996','55713baacb8ffa7d847c6e5f4b07370e','db23e67d6fad77fdfa003856d807d6af',false,'["search_path=\"\""]','service_role'),
('public.get_notifications_v2(uuid,integer,timestamp with time zone,bigint,text)','public','get_notifications_v2','uuid,integer,timestamp with time zone,bigint,text','d3c028ad4e6b96069ea0724e12470582','aeecfa47e2325237d8dd79259f50f6d7','db23e67d6fad77fdfa003856d807d6af',false,'["search_path=\"\""]','service_role'),
('public.get_owned_priority_checkout_v1(uuid)','public','get_owned_priority_checkout_v1','uuid','584cc98a7fd6f653053c7af8f58fc44b','f97eac99d2081b0862052e60984e9f93','5fc13192159b7c60c3a808895ae2c2c8',true,'["search_path=\"\""]','authenticated'),
('public.record_priority_checkout_event_v1(uuid,uuid,text,text,integer,integer,text,text,text,boolean)','public','record_priority_checkout_event_v1','uuid,uuid,text,text,integer,integer,text,text,text,boolean','f77948a78239684e1e8ba4333d299fb5','bb6e0f982f238aab88eec51d7c6e7804','db23e67d6fad77fdfa003856d807d6af',true,'["search_path=\"\""]','service_role'),
('public.record_priority_checkout_event_v1(uuid,uuid,text,text,text,text,text,boolean)','public','record_priority_checkout_event_v1','uuid,uuid,text,text,text,text,text,boolean','e23890414fe6633d54cd4cb8694901fe','858d3aaf166f8b8bc7d0a083046cf1ae','db23e67d6fad77fdfa003856d807d6af',true,'["search_path=\"\""]','service_role'),
('public.record_priority_checkout_session_v1(uuid,uuid,text,text,integer,integer,text,text,integer)','public','record_priority_checkout_session_v1','uuid,uuid,text,text,integer,integer,text,text,integer','96b12ddf647dcc6e02ce9cdca3caf4a7','89af3bebd95579c8752cacc8f0a25b09','db23e67d6fad77fdfa003856d807d6af',true,'["search_path=\"\""]','service_role'),
('public.record_priority_checkout_session_v1(uuid,uuid,text,text,text,text,integer)','public','record_priority_checkout_session_v1','uuid,uuid,text,text,text,text,integer','d19374cb76be47b3aeedbd28c9aa550d','727ca3928a5b0477188e5d473ed046e5','db23e67d6fad77fdfa003856d807d6af',true,'["search_path=\"\""]','service_role')
),
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
      then coalesce((select e.before_md5 from m07_function_expected e where e.identity::text=p.oid::regprocedure::text and e.after_md5=md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))),md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))) end as canonical_md5
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
    case when p.prokind='f' then coalesce((select e.before_md5 from m07_function_expected e where e.identity::text=p.oid::regprocedure::text and e.after_md5=md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))),md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))) end as canonical_md5
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
),
required_source_columns(table_name,column_name,type_name) as (values
  ('annuncio','uuid','uuid'),
  ('annuncio','creato_da','uuid'),
  ('annuncio','autore_annuncio','uuid'),
  ('annuncio','titolo_annuncio','text'),
  ('annuncio','tipologia_annuncio','text'),
  ('annuncio','stato_annuncio','text'),
  ('annuncio','nascosto','boolean'),
  ('annuncio','privato','boolean'),
  ('annuncio','creato_il','timestamp with time zone'),
  ('annuncio','ultima_modifica_il','timestamp with time zone'),
  ('profilo','uuid','uuid'),
  ('profilo','uuid_utente','uuid'),
  ('profilo','nascosto','boolean'),
  ('profilo_giocatore','id','bigint'),
  ('profilo_giocatore','uuid_profilo','uuid'),
  ('profilo_giocatore','nascosto','boolean'),
  ('profilo_giocatore','nominativo_anonimo','boolean'),
  ('profilo_giocatore','nome','text'),
  ('profilo_giocatore','cognome','text'),
  ('profilo_squadra','id','bigint'),
  ('profilo_squadra','uuid_profilo','uuid'),
  ('profilo_squadra','nascosto','boolean'),
  ('profilo_squadra','nominativo_anonimo','boolean'),
  ('profilo_squadra','nome_societa','text'),
  ('profilo_staff_sportivo','id','bigint'),
  ('profilo_staff_sportivo','uuid_profilo','uuid'),
  ('profilo_staff_sportivo','nascosto','boolean'),
  ('profilo_staff_sportivo','nominativo_anonimo','boolean'),
  ('profilo_staff_sportivo','nome','text'),
  ('profilo_staff_sportivo','cognome','text'),
  ('profilo_arbitro','id','bigint'),
  ('profilo_arbitro','uuid_profilo','uuid'),
  ('profilo_arbitro','nascosto','boolean'),
  ('profilo_arbitro','nominativo_anonimo','boolean'),
  ('profilo_arbitro','nome','text'),
  ('profilo_arbitro','cognome','text'),
  ('profilo_servizi_consulenze','id','bigint'),
  ('profilo_servizi_consulenze','uuid_profilo','uuid'),
  ('profilo_servizi_consulenze','nascosto','boolean'),
  ('profilo_servizi_consulenze','nome','text'),
  ('profilo_creator','id','bigint'),
  ('profilo_creator','uuid_profilo','uuid'),
  ('profilo_creator','nascosto','boolean'),
  ('profilo_creator','nome_creator','text'),
  ('profilo_torneo_evento','id','bigint'),
  ('profilo_torneo_evento','uuid_profilo','uuid'),
  ('profilo_torneo_evento','nascosto','boolean'),
  ('profilo_torneo_evento','nome_organizzazione','text'),
  ('profilo_campi_impianti','id','bigint'),
  ('profilo_campi_impianti','uuid_profilo','uuid'),
  ('profilo_campi_impianti','nascosto','boolean'),
  ('profilo_campi_impianti','nome_organizzazione','text'),
  ('annuncio_giocatore','uuid_annuncio','uuid'),
  ('annuncio_giocatore','tipologie_sport','text[]'),
  ('annuncio_giocatore','ruoli_principali','text[]'),
  ('annuncio_giocatore','ruoli_secondari','text[]'),
  ('annuncio_giocatore','categorie_ricercate','text[]'),
  ('annuncio_giocatore','descrizione_aggiuntiva','text|character varying'),
  ('annuncio_squadra_cerca_giocatore','uuid_annuncio','uuid'),
  ('annuncio_squadra_cerca_giocatore','gruppo_squadra','text|character varying'),
  ('annuncio_squadra_cerca_giocatore','tipologie_sport','text[]'),
  ('annuncio_squadra_cerca_giocatore','ruoli_principali','text[]'),
  ('annuncio_squadra_cerca_giocatore','ruoli_secondari','text[]'),
  ('annuncio_squadra_cerca_giocatore','annata_da','smallint|integer|bigint|numeric|real|double precision'),
  ('annuncio_squadra_cerca_giocatore','annata_a','smallint|integer|bigint|numeric|real|double precision'),
  ('annuncio_squadra_cerca_giocatore','annate_ricercate','text[]'),
  ('annuncio_squadra_cerca_giocatore','stagione','text|character varying'),
  ('annuncio_squadra_cerca_giocatore','descrizione_aggiuntiva','text|character varying'),
  ('annuncio_squadra_cerca_staff','uuid_annuncio','uuid'),
  ('annuncio_squadra_cerca_staff','figura_ricercata','text|character varying'),
  ('annuncio_squadra_cerca_staff','figure_ricercate','text[]'),
  ('annuncio_squadra_cerca_staff','settore','text|character varying'),
  ('annuncio_squadra_cerca_staff','compenso_mensile','smallint|integer|bigint|numeric|real|double precision'),
  ('annuncio_squadra_cerca_staff','requisiti','text|character varying'),
  ('annuncio_squadra_cerca_staff','stagione','text|character varying'),
  ('annuncio_squadra_cerca_staff','periodo_dal','text|character varying|date'),
  ('annuncio_squadra_cerca_staff','periodo_al','text|character varying|date'),
  ('annuncio_squadra_cerca_staff','descrizione_aggiuntiva','text|character varying'),
  ('annuncio_squadra_cerca_partita','uuid_annuncio','uuid'),
  ('annuncio_squadra_cerca_partita','gruppo_squadra','text|character varying'),
  ('annuncio_squadra_cerca_partita','categorie_avversario','text[]'),
  ('annuncio_squadra_cerca_partita','disponibilita_trasferta','text|character varying'),
  ('annuncio_squadra_cerca_partita','periodo_dal','text|character varying|date'),
  ('annuncio_squadra_cerca_partita','periodo_al','text|character varying|date'),
  ('annuncio_squadra_cerca_partita','orario_dalle','text|character varying|time without time zone'),
  ('annuncio_squadra_cerca_partita','orario_alle','text|character varying|time without time zone'),
  ('annuncio_squadra_cerca_partita','descrizione_aggiuntiva','text|character varying'),
  ('annuncio_squadra_cerca_sponsor','uuid_annuncio','uuid'),
  ('annuncio_squadra_cerca_sponsor','categoria_settore','text|character varying'),
  ('annuncio_squadra_cerca_sponsor','supporto_cercato','text|character varying'),
  ('annuncio_squadra_cerca_sponsor','offerta_fornita','text|character varying'),
  ('annuncio_squadra_cerca_sponsor','descrizione_aggiuntiva','text|character varying'),
  ('annuncio_staff_sportivo','uuid_annuncio','uuid'),
  ('annuncio_staff_sportivo','figure_professionali','text[]'),
  ('annuncio_staff_sportivo','tipologie_sport','text[]'),
  ('annuncio_staff_sportivo','categorie_ricercate','text[]'),
  ('annuncio_staff_sportivo','disponibilita_occupazione','text|character varying'),
  ('annuncio_staff_sportivo','disponibilita_spostamento','text|character varying'),
  ('annuncio_staff_sportivo','disponibile_remoto','boolean'),
  ('annuncio_staff_sportivo','descrizione_aggiuntiva','text|character varying'),
  ('annuncio_staff_sportivo','lista_esperienze','jsonb'),
  ('annuncio_staff_sportivo','qualifiche_licenze','jsonb'),
  ('annuncio_arbitro','uuid_annuncio','uuid'),
  ('annuncio_arbitro','tipologie_sport','text[]'),
  ('annuncio_arbitro','categorie_ricercate','text[]'),
  ('annuncio_arbitro','disponibilita_occupazione','text|character varying'),
  ('annuncio_arbitro','disponibilita_spostamento','text|character varying'),
  ('annuncio_arbitro','automunito','text|character varying'),
  ('annuncio_arbitro','descrizione_aggiuntiva','text|character varying'),
  ('annuncio_arbitro','lista_esperienze','jsonb'),
  ('annuncio_arbitro','qualifiche_licenze','jsonb'),
  ('annuncio_torneo_evento','uuid_annuncio','uuid'),
  ('annuncio_torneo_evento','nome_evento','text|character varying'),
  ('annuncio_torneo_evento','modalita_iscrizione','text|character varying'),
  ('annuncio_torneo_evento','annate_ammesse_da','text|character varying'),
  ('annuncio_torneo_evento','annate_ammesse_a','text|character varying'),
  ('annuncio_torneo_evento','numero_squadre','smallint|integer|bigint|numeric|real|double precision'),
  ('annuncio_torneo_evento','costo_partecipazione','smallint|integer|bigint|numeric|real|double precision'),
  ('annuncio_torneo_evento','tipo_partecipazione','text|character varying'),
  ('annuncio_torneo_evento','tipologie_sport','text[]'),
  ('annuncio_torneo_evento','lista_premi_trofei','jsonb'),
  ('annuncio_torneo_evento','descrizione_aggiuntiva','text|character varying'),
  ('annuncio_campo_impianto','uuid_annuncio','uuid'),
  ('annuncio_campo_impianto','tipologie_sport','text[]'),
  ('annuncio_campo_impianto','orari','jsonb'),
  ('annuncio_campo_impianto','costo_partenza','smallint|integer|bigint|numeric|real|double precision'),
  ('annuncio_campo_impianto','servizi_inclusi','text|character varying'),
  ('annuncio_campo_impianto','indirizzo','text|character varying'),
  ('annuncio_campo_impianto','descrizione_aggiuntiva','text|character varying'),
  ('annuncio_servizi_consulenze','uuid_annuncio','uuid'),
  ('annuncio_servizi_consulenze','figura_professionale','text[]'),
  ('annuncio_servizi_consulenze','specializzazione','text|character varying'),
  ('annuncio_servizi_consulenze','presentazione_servizi','text|character varying'),
  ('annuncio_servizi_consulenze','tipologie_sport','jsonb'),
  ('annuncio_servizi_consulenze','automunito','text|character varying'),
  ('annuncio_servizi_consulenze','lista_esperienze','jsonb'),
  ('annuncio_servizi_consulenze','qualifiche_licenze','jsonb'),
  ('annuncio_servizi_consulenze','descrizione_aggiuntiva','text|character varying'),
  ('annuncio_creator','uuid_annuncio','uuid'),
  ('annuncio_creator','titolo_post','text|character varying'),
  ('annuncio_creator','descrizione_post','text|character varying'),
  ('annuncio_creator','contenuto_post','text|character varying'),
  ('annuncio_creator','descrizione_aggiuntiva','text|character varying'),
  ('annuncio','info_stato_annuncio','text|character varying'),
  ('annuncio','livello_annuncio','text|character varying'),
  ('annuncio','priorita_attiva','boolean'),
  ('annuncio','priorita_inizio_il','timestamp with time zone'),
  ('annuncio','priorita_fine_il','timestamp with time zone'),
  ('annuncio','ultima_modifica_da','uuid'),
  ('localita_annuncio','id','bigint'),
  ('localita_annuncio','uuid_annuncio','uuid'),
  ('localita_annuncio','regione','text|character varying'),
  ('localita_annuncio','citta','text|character varying'),
  ('contatto_annuncio','id','bigint'),
  ('contatto_annuncio','uuid_annuncio','uuid'),
  ('contatto_annuncio','tipo','text|character varying'),
  ('contatto_annuncio','valore','text|character varying'),
  ('contatto_annuncio','referente','text|character varying'),
  ('link_social_annuncio','id','bigint'),
  ('link_social_annuncio','uuid_annuncio','uuid'),
  ('link_social_annuncio','piattaforma','text|character varying'),
  ('link_social_annuncio','sublink','text|character varying'),
  ('media_annuncio','id','bigint'),
  ('media_annuncio','uuid_annuncio','uuid'),
  ('media_annuncio','formato_media','text|character varying'),
  ('media_annuncio','link_media','text|character varying'),
  ('utente','utente_uuid','uuid'),
  ('utente','registrato_il','timestamp with time zone'),
  ('announcement_submission','submission_id','uuid'),
  ('announcement_submission','announcement_id','uuid'),
  ('announcement_submission','requested_announcement_id','uuid'),
  ('announcement_submission','utente_id','uuid'),
  ('announcement_submission','requested_visibility','text|character varying'),
  ('announcement_submission','paid_at','timestamp with time zone'),
  ('announcement_submission','refund_required_at','timestamp with time zone'),
  ('announcement_submission','refunded_at','timestamp with time zone'),
  ('announcement_submission','stripe_checkout_session_id','text|character varying'),
  ('announcement_submission','stripe_price_id','text|character varying'),
  ('announcement_submission','stripe_amount_subtotal','integer'),
  ('announcement_submission','stripe_amount_total','integer'),
  ('announcement_submission','stripe_checkout_status','text|character varying'),
  ('announcement_submission','stripe_payment_status','text|character varying'),
  ('announcement_submission','stripe_payment_intent_id','text|character varying'),
  ('announcement_submission','anonymous_at_publish','boolean'),
  ('announcement_submission','created_at','timestamp with time zone')
),
source_tables as materialized (
  select e.table_name,case when e.table_name='announcement_submission' then 'private' else 'public' end as schema_name,c.oid,c.relkind,c.relpersistence,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity
  from (select distinct table_name from required_source_columns) e
  left join (pg_class c join pg_namespace n on n.oid=c.relnamespace) on c.relname=e.table_name
    and n.nspname=case when e.table_name='announcement_submission' then 'private' else 'public' end
),
source_column_checks as (
  select e.table_name,e.column_name,e.type_name as expected_type,format_type(a.atttypid,a.atttypmod) as actual_type,
    coalesce(a.attnum>0 and not a.attisdropped and case when strpos(e.type_name,'|')>0 then format_type(a.atttypid,null)=any(string_to_array(e.type_name,'|')) else format_type(a.atttypid,a.atttypmod)=e.type_name end,false) as matches
  from required_source_columns e join source_tables t on t.table_name=e.table_name
  left join pg_attribute a on a.attrelid=t.oid and a.attname=e.column_name and a.attnum>0 and not a.attisdropped
),
source_table_specs as materialized (
  select t.table_name,t.schema_name,t.oid is not null as present,
    coalesce(t.relkind='r' and t.relpersistence='p' and has_table_privilege(t.oid,'SELECT'),false) as usable,
    jsonb_build_object('owner',pg_get_userbyid(t.relowner),'kind',t.relkind,'persistence',t.relpersistence,
      'rls',t.relrowsecurity,'force_rls',t.relforcerowsecurity,
      'table_acl_md5',md5((select coalesce(jsonb_agg(jsonb_build_array(a.grantor,a.grantee,a.privilege_type,a.is_grantable)
        order by a.grantor,a.grantee,a.privilege_type,a.is_grantable),'[]'::jsonb)::text
        from aclexplode(coalesce(t.relacl,acldefault('r',t.relowner))) a)),
      'columns_md5',md5((select coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
        'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'collation',a.attcollation,
        'default_md5',(select md5(pg_get_expr(d.adbin,d.adrelid)) from pg_attrdef d where d.adrelid=a.attrelid and d.adnum=a.attnum),
        'acl',a.attacl::text,
        'api_privileges',(select jsonb_agg(jsonb_build_array(r.rolname,has_column_privilege(r.oid,t.oid,a.attnum,'SELECT'),has_column_privilege(r.oid,t.oid,a.attnum,'INSERT'),has_column_privilege(r.oid,t.oid,a.attnum,'UPDATE'),has_column_privilege(r.oid,t.oid,a.attnum,'REFERENCES')) order by r.rolname) from api_roles r)
        ) order by a.attnum),'[]'::jsonb)::text from pg_attribute a where a.attrelid=t.oid and a.attnum>0 and not a.attisdropped and not (t.table_name='annuncio' and a.attname='oscurato_da_admin'))),
      'policies_md5',md5((select coalesce(jsonb_agg(jsonb_build_array(p.polname,p.polcmd,p.polpermissive,p.polroles::text,
        md5(pg_get_expr(p.polqual,p.polrelid)),md5(pg_get_expr(p.polwithcheck,p.polrelid))) order by p.polname),'[]'::jsonb)::text
        from pg_policy p where p.polrelid=t.oid)),
      'api_privileges',(select jsonb_agg(jsonb_build_object('role',r.rolname,'select',has_table_privilege(r.oid,t.oid,'SELECT'),'insert',has_table_privilege(r.oid,t.oid,'INSERT'),'update',has_table_privilege(r.oid,t.oid,'UPDATE'),'delete',has_table_privilege(r.oid,t.oid,'DELETE'),'truncate',has_table_privilege(r.oid,t.oid,'TRUNCATE'),'references',has_table_privilege(r.oid,t.oid,'REFERENCES'),'trigger',has_table_privilege(r.oid,t.oid,'TRIGGER'),'maintain',has_table_privilege(r.oid,t.oid,'MAINTAIN')) order by r.rolname) from api_roles r)
    ) as spec
  from source_tables t
),
table_protections as (
  select table_name,schema_name,present,usable,spec->>'owner' as owner,(spec->>'rls')::boolean as rls,
    (spec->>'force_rls')::boolean as force_rls,md5(spec::text) as protection_md5,
    spec->>'table_acl_md5' as table_acl_md5,spec->>'columns_md5' as columns_md5,
    spec->>'policies_md5' as policies_md5,spec->'api_privileges' as effective_privileges
  from source_table_specs
),
list_expected(schema_name,name,is_definer,language_name,definition_md5,settings) as (values
  ('private','list_admin_announcements_v1',true,'plpgsql','29910e0bd58ec293e1990b606c84e09d',array['search_path=""','TimeZone=UTC']::text[]),
  ('public','admin_list_announcements_v1',false,'sql','417e6e463cae3810c46eccb7cb3d9aaf',array['search_path=""']::text[])
),
list_routines as materialized (
  select p.*,n.nspname,l.lanname,replace(oidvectortypes(p.proargtypes),', ',',') as args,
    case when p.prokind='f' then coalesce((select e.before_md5 from m07_function_expected e where e.identity::text=p.oid::regprocedure::text and e.after_md5=md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))),md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))) end as canonical_md5
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
  where (n.nspname,p.proname) in (select schema_name,name from list_expected)
),
list_function_checks as (
  select e.schema_name,e.name,'jsonb' as args,p.oid is not null as present,p.canonical_md5 as actual_md5,
    coalesce(p.prokind='f' and pg_get_userbyid(p.proowner)='postgres' and p.prosecdef=e.is_definer
      and p.lanname=e.language_name and p.provolatile='s' and not p.proisstrict and not p.proretset
      and p.prorettype='jsonb'::regtype and p.pronargdefaults=1 and p.proconfig=e.settings
      and p.canonical_md5=e.definition_md5 and has_function_privilege(p.oid,'EXECUTE')
      and not exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        where a.grantee<>p.proowner and (a.is_grantable or a.grantee not in (select oid from api_roles where rolname='authenticated')))
      and not exists(select 1 from api_roles r where has_function_privilege(r.oid,p.oid,'EXECUTE') is distinct from (r.rolname='authenticated')),false) as matches,
    (select jsonb_agg(jsonb_build_object('role',r.rolname,'execute',has_function_privilege(r.oid,p.oid,'EXECUTE')) order by r.rolname)
      from api_roles r where p.oid is not null) as effective_execute
  from list_expected e left join list_routines p on p.nspname=e.schema_name and p.proname=e.name and p.args='jsonb'
),
list_index as materialized (
  select c.*,i.indrelid,i.indisvalid,i.indisready,i.indislive,i.indisunique,i.indisprimary,
    case when c.relkind='i' then md5(pg_get_indexdef(c.oid)) end as canonical_md5
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  left join pg_index i on i.indexrelid=c.oid
  where n.nspname='public' and c.relname='annuncio_admin_order_v1_idx'
),
m04_checks as (
  select (select count(*) from list_routines)+(select count(*) from list_index) as m04_named_objects,
    (select count(*)=27 and bool_and(usable) from source_table_specs)
      and (select bool_and(matches) from source_column_checks) as source_schema_matches,
    (select count(*)=2 from list_routines) and (select bool_and(matches) from list_function_checks) as list_functions_match,
    coalesce((select relkind='i' and indrelid=to_regclass('public.annuncio')
      and pg_get_userbyid(relowner)='postgres' and indisvalid and indisready and indislive
      and not indisunique and not indisprimary and canonical_md5='4756a5f8e95f24fb26b23a68cd254b69'
      from list_index),false) as list_index_matches,
    coalesce((select has_schema_privilege(r.oid,n.oid,'USAGE') from private_schema n cross join api_roles r
      where r.rolname='authenticated'),false) as authenticated_private_usage
),
m04_result as (
  select m.*,l.*,coalesce(m.m03_prerequisites_match and m.bridge_catalog_matches and l.source_schema_matches,false) as m04_prerequisites_match,
    coalesce(l.m04_named_objects=3 and l.list_functions_match and l.list_index_matches and l.authenticated_private_usage,false) as list_catalog_matches
  from m03_result m cross join m04_checks l
),
detail_tables(table_name) as (values
  ('annuncio_giocatore'),
  ('annuncio_squadra_cerca_giocatore'),
  ('annuncio_squadra_cerca_staff'),
  ('annuncio_squadra_cerca_partita'),
  ('annuncio_squadra_cerca_sponsor'),
  ('annuncio_staff_sportivo'),
  ('annuncio_arbitro'),
  ('annuncio_torneo_evento'),
  ('annuncio_campo_impianto'),
  ('annuncio_servizi_consulenze'),
  ('annuncio_creator')
),
detail_unique_checks as (
  select e.table_name,exists(select 1 from source_tables t
    join pg_attribute a on a.attrelid=t.oid and a.attname='uuid_annuncio' and a.attnum>0 and not a.attisdropped
    join pg_index i on i.indrelid=t.oid and i.indkey[0]=a.attnum
    where t.table_name=e.table_name and i.indisunique and i.indisvalid and i.indisready and i.indislive
      and i.indimmediate and i.indnkeyatts=1 and i.indpred is null and i.indexprs is null) as matches
  from detail_tables e
),
detail_expected(schema_name,name,args,definition_md5,is_definer,language_name,volatility,settings,human_execute) as (values
  ('private','admin_announcement_author_v1','uuid,text','e84bee24b64542536ec9da0e07504600',false,'sql','s',array['search_path=""']::text[],false),
  ('private','admin_announcement_detail_spec_v1','text','a278c4de70132cc162a68da84671afdf',false,'sql','i',array['search_path=""']::text[],false),
  ('private','admin_announcement_field_v1','jsonb,text,text','4bd3ab7aaf2ee8eed1d646efec6c8521',false,'plpgsql','s',array['search_path=""']::text[],false),
  ('private','admin_announcement_snapshot_v1','uuid','1de5cd3843e700a007c60a7b07f983a7',false,'plpgsql','s',array['search_path=""','TimeZone=UTC']::text[],false),
  ('private','get_admin_announcement_v1','uuid','2f8a44d5ec24d4ed3d095835f02eb899',true,'plpgsql','s',array['search_path=""','TimeZone=UTC']::text[],true),
  ('public','admin_get_announcement_v1','uuid','53e45d4d0fb16202ad923d0564b1a785',false,'sql','s',array['search_path=""']::text[],true)
),
detail_routines as materialized (
  select p.*,n.nspname,l.lanname,replace(oidvectortypes(p.proargtypes),', ',',') as args,
    case when p.prokind='f' then coalesce((select e.before_md5 from m07_function_expected e where e.identity::text=p.oid::regprocedure::text and e.after_md5=md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))),md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))) end as canonical_md5
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
  where (n.nspname,p.proname) in (select schema_name,name from detail_expected)
),
detail_function_checks as (
  select e.schema_name,e.name,e.args,p.oid is not null as present,p.canonical_md5 as actual_md5,
    coalesce(p.prokind='f' and pg_get_userbyid(p.proowner)='postgres' and p.prosecdef=e.is_definer
      and p.lanname=e.language_name and p.provolatile=e.volatility::"char" and not p.proisstrict and not p.proretset
      and p.prorettype='jsonb'::regtype and p.pronargdefaults=0 and p.proconfig=e.settings
      and p.canonical_md5 in (e.definition_md5,case e.name when 'admin_announcement_field_v1' then '994756870c17df52e8ba755a676b3b02' when 'get_admin_announcement_v1' then 'deb0298d0d1371a47283b4524780c21a' end) and has_function_privilege(p.oid,'EXECUTE')
      and not exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        where a.grantee<>p.proowner and (a.is_grantable or not e.human_execute
          or a.grantee not in (select oid from api_roles where rolname='authenticated')))
      and not exists(select 1 from api_roles r where has_function_privilege(r.oid,p.oid,'EXECUTE')
        is distinct from (e.human_execute and r.rolname='authenticated')),false) as matches,
    (select jsonb_agg(jsonb_build_object('role',r.rolname,'execute',has_function_privilege(r.oid,p.oid,'EXECUTE')) order by r.rolname)
      from api_roles r where p.oid is not null) as effective_execute
  from detail_expected e left join detail_routines p on p.nspname=e.schema_name and p.proname=e.name and p.args=e.args
),
m05_checks as (
  select (select count(*) from detail_routines) as m05_named_objects,
    (select count(*)=11 and bool_and(matches) from detail_unique_checks) as detail_uniqueness_matches,
    coalesce((select count(*)=6 from detail_routines) and (select bool_and(matches) from detail_function_checks),false) as detail_functions_match
),
m05_result as (
  select m.*,d.*,coalesce(m.m04_prerequisites_match and m.list_catalog_matches and d.detail_uniqueness_matches,false) as m05_prerequisites_match,
    coalesce(d.detail_functions_match and m.authenticated_private_usage,false) as detail_catalog_matches
  from m04_result m cross join m05_checks d
),
moderation_required_expected(schema_name,name,args,before_md5,after_md5,is_definer,language_name,volatility,is_strict,result_type,defaults,settings,api_role,is_new) as (values
  ('private','admin_moderation_capabilities_v1','jsonb,jsonb',null,'9e8450c8255a342109bcdaad9e62c954',false,'plpgsql','s',false,'jsonb',0,array['search_path=""']::text[],null,true),
  ('private','admin_review_issues_v1','jsonb',null,'19be446a2e276bf9ca491256f4d49472',false,'plpgsql','i',false,'jsonb',0,array['search_path=""']::text[],null,true),
  ('private','admin_review_url_valid_v1','text',null,'d06b105274d1e1c8f61d46857f2db875',false,'plpgsql','i',false,'boolean',0,array['search_path=""']::text[],null,true),
  ('private','admin_utf16_length_v1','text',null,'d783635fa643cd13c8a9a2e7f9c35f8e',false,'sql','i',true,'integer',0,array['search_path=""']::text[],null,true),
  ('private','guard_admin_announcement_visibility_v1','',null,'67e794873253d850987e51f549432e8f',false,'plpgsql','v',false,'trigger',0,array['search_path=""']::text[],null,true),
  ('private','lock_announcement_child_parent_v1','',null,'3f9b776a4e1194bea2eb6f6aa7e61c05',true,'plpgsql','v',false,'trigger',0,array['search_path=""']::text[],null,true),
  ('private','moderate_admin_announcement_v1','uuid,text,text,text',null,'ace0def49e8a35dcb59c0c72b120e5d7',true,'plpgsql','v',false,'jsonb',0,array['search_path=""','TimeZone=UTC']::text[],'authenticated',true),
  ('private','project_admin_announcement_v1','jsonb',null,'b673a78e7214368677a39109697b8e0b',false,'plpgsql','s',false,'jsonb',0,array['search_path=""','TimeZone=UTC']::text[],null,true),
  ('private','publish_text_is_valid','text,boolean,integer','27807d135edebd3b28f0251d565e5e09','27807d135edebd3b28f0251d565e5e09',false,'sql','i',false,'boolean',2,array['search_path=""']::text[],null,false),
  ('public','admin_moderate_announcement_v1','uuid,text,text,text',null,'8abbe9cae01d77da7daadebe3eafc6f1',false,'sql','v',false,'jsonb',1,array['search_path=""']::text[],'authenticated',true),
  ('public','record_priority_checkout_event_v1','uuid,uuid,text,text,integer,integer,text,text,text,boolean','99e82d42b114039b6f7f7d7748d836e1','f77948a78239684e1e8ba4333d299fb5',true,'plpgsql','v',false,'jsonb',0,array['search_path=""']::text[],'service_role',false)
),
moderation_expected as (
  select * from moderation_required_expected
  union all select 'public','record_priority_checkout_event_v1','uuid,uuid,text,text,text,text,text,boolean',
    '44155d0a2a904fe2fb0211c1b3f2bf67','e23890414fe6633d54cd4cb8694901fe',true,'plpgsql','v',false,'jsonb',0,
    array['search_path=""']::text[],'service_role',false
  where to_regprocedure('public.record_priority_checkout_event_v1(uuid,uuid,text,text,text,text,text,boolean)') is not null
),
moderation_routines as materialized (
  select p.*,n.nspname,l.lanname,replace(oidvectortypes(p.proargtypes),', ',',') as args,
    case when p.prokind='f' then coalesce((select e.before_md5 from m07_function_expected e where e.identity::text=p.oid::regprocedure::text and e.after_md5=md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))),md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))) end as canonical_md5
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
  where (n.nspname,p.proname) in (select schema_name,name from moderation_expected)
),
unexpected_moderation_routines as (
  select r.* from moderation_routines r where not exists(
    select 1 from moderation_expected e where e.schema_name=r.nspname and e.name=r.proname and e.args=r.args)
),
moderation_function_structures as (
  select e.*,p.oid,p.canonical_md5 as actual_md5,md5(p.proacl::text) as acl_md5,
    coalesce(p.prokind='f' and pg_get_userbyid(p.proowner)='postgres' and p.prosecdef=e.is_definer
      and p.lanname=e.language_name and p.provolatile=e.volatility::"char" and p.proisstrict=e.is_strict and not p.proretset
      and format_type(p.prorettype,null)=e.result_type and p.pronargdefaults=e.defaults and p.proconfig=e.settings
      and has_function_privilege(p.oid,'EXECUTE')
      and not exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee<>p.proowner
        and (a.is_grantable or e.api_role is null or a.grantee not in(select oid from api_roles where rolname=e.api_role)))
      and not exists(select 1 from api_roles r where has_function_privilege(r.oid,p.oid,'EXECUTE')
        is distinct from coalesce(r.rolname=e.api_role,false)),false) as structure_matches,
    (select jsonb_agg(jsonb_build_object('role',r.rolname,'execute',has_function_privilege(r.oid,p.oid,'EXECUTE')) order by r.rolname) from api_roles r where p.oid is not null) as effective_execute,
    md5(jsonb_build_object('owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text,'settings',p.proconfig)::text) as protection_md5
  from moderation_expected e left join moderation_routines p on p.nspname=e.schema_name and p.proname=e.name and p.args=e.args
),
moderation_function_checks as (
  select schema_name,name,args,is_new,oid is not null as present,actual_md5,acl_md5,effective_execute,protection_md5,
    coalesce(structure_matches and actual_md5=before_md5,false) as before_matches,
    coalesce(structure_matches and actual_md5=after_md5,false) as after_matches
  from moderation_function_structures
),
moderation_trigger_expected(table_name,name,definition_md5,function_identity,trigger_type) as (values
  ('annuncio','zz_guard_admin_announcement_visibility_v1','7cfc30b6d887b0f21371f0ee8445ab12','private.guard_admin_announcement_visibility_v1()',23),
  ('annuncio_arbitro','admin_lock_parent_v1','8a334ebc632201cd6a897bd45a434e53','private.lock_announcement_child_parent_v1()',31),
  ('annuncio_campo_impianto','admin_lock_parent_v1','04729cdf0681bbcc75b452d8182158a3','private.lock_announcement_child_parent_v1()',31),
  ('annuncio_creator','admin_lock_parent_v1','f1c529971806b526a91af99a8458293b','private.lock_announcement_child_parent_v1()',31),
  ('annuncio_giocatore','admin_lock_parent_v1','dfbd4d3073deea9622c4716dcc003e85','private.lock_announcement_child_parent_v1()',31),
  ('annuncio_servizi_consulenze','admin_lock_parent_v1','63c1175415857bc39feb658bad67cebc','private.lock_announcement_child_parent_v1()',31),
  ('annuncio_squadra_cerca_giocatore','admin_lock_parent_v1','c084f09cec6400ea02e097f2a82f3a98','private.lock_announcement_child_parent_v1()',31),
  ('annuncio_squadra_cerca_partita','admin_lock_parent_v1','46eb478ec742a15cb1107dd14ebb4eae','private.lock_announcement_child_parent_v1()',31),
  ('annuncio_squadra_cerca_sponsor','admin_lock_parent_v1','7cbacc380463c982a274d3b6d5894dfc','private.lock_announcement_child_parent_v1()',31),
  ('annuncio_squadra_cerca_staff','admin_lock_parent_v1','7b5cc702e0b2a2d86b5eac9dcadbc2af','private.lock_announcement_child_parent_v1()',31),
  ('annuncio_staff_sportivo','admin_lock_parent_v1','e08c9ee4ff068823b5ebced0bc48a97b','private.lock_announcement_child_parent_v1()',31),
  ('annuncio_torneo_evento','admin_lock_parent_v1','149ba691aaa33f6751c77af771eb8fd6','private.lock_announcement_child_parent_v1()',31),
  ('contatto_annuncio','admin_lock_parent_v1','bc91d9ed60ec399513d7a1ccc8511bc1','private.lock_announcement_child_parent_v1()',31),
  ('link_social_annuncio','admin_lock_parent_v1','a0a034edea33754796bde80b4dd677bb','private.lock_announcement_child_parent_v1()',31),
  ('localita_annuncio','admin_lock_parent_v1','c12bd686e234ec1fdcef9af3dce95776','private.lock_announcement_child_parent_v1()',31),
  ('media_annuncio','admin_lock_parent_v1','19b730b7a5c2925474eefb3fe583f7f1','private.lock_announcement_child_parent_v1()',31)
),
moderation_triggers as materialized (
  select t.*,c.relname as table_name from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and t.tgname in ('admin_lock_parent_v1','zz_guard_admin_announcement_visibility_v1')
    and not(c.relname='annuncio_generico' and t.tgname='admin_lock_parent_v1')
),
moderation_trigger_checks as (
  select e.table_name,e.name,t.oid is not null as present,
    case when t.oid is not null then md5(replace(pg_get_triggerdef(t.oid,true),E'\r\n',E'\n')) end as actual_md5,
    coalesce(t.tgfoid=to_regprocedure(e.function_identity) and t.tgtype=e.trigger_type and t.tgenabled='O'
      and not t.tgisinternal and not t.tgdeferrable and not t.tginitdeferred and t.tgparentid=0
      and t.tgconstraint=0 and md5(replace(pg_get_triggerdef(t.oid,true),E'\r\n',E'\n'))=e.definition_md5,false) as matches
  from moderation_trigger_expected e left join moderation_triggers t on t.table_name=e.table_name and t.tgname=e.name
),
moderation_column as (
  select a.attnum is not null as present,
    coalesce(format_type(a.atttypid,a.atttypmod)='boolean' and a.attnotnull and a.attidentity='' and a.attgenerated='' and a.attacl is null
      and pg_get_userbyid(t.relowner)='postgres' and pg_get_expr(d.adbin,d.adrelid)='false',false) as matches
  from source_tables t left join pg_attribute a on a.attrelid=t.oid and a.attname='oscurato_da_admin' and a.attnum>0 and not a.attisdropped
  left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where t.table_name='annuncio'
),
unchanged_table_metadata as (
  select s.schema_name,s.table_name,
    md5((select coalesce(jsonb_agg(jsonb_build_array(g.tgname,g.tgenabled,
      md5(replace(pg_get_triggerdef(g.oid,true),E'\r\n',E'\n')),
      case when p.prokind='f' then coalesce((select e.before_md5 from m07_function_expected e where e.identity::text=p.oid::regprocedure::text and e.after_md5=md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))),md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n'))) end) order by g.tgname),'[]')::text
      from pg_trigger g join pg_proc p on p.oid=g.tgfoid where g.tgrelid=s.oid and not g.tgisinternal
        and not exists(select 1 from moderation_trigger_expected e where e.table_name=s.table_name and e.name=g.tgname and s.schema_name='public'))) as triggers_md5,
    md5((select coalesce(jsonb_agg(jsonb_build_array(c.conname,c.convalidated,md5(pg_get_constraintdef(c.oid,true))) order by c.conname),'[]')::text
      from pg_constraint c where c.conrelid=s.oid and c.contype<>'n')) as constraints_md5,
    md5((select coalesce(jsonb_agg(jsonb_build_array(c.relname,i.indisvalid,i.indisready,i.indislive,md5(pg_get_indexdef(c.oid))) order by c.relname),'[]')::text
      from pg_index i join pg_class c on c.oid=i.indexrelid where i.indrelid=s.oid)) as indexes_md5
  from source_tables s
),
moderation_checks as (
  select (select count(*) from moderation_routines r where (r.nspname,r.proname) in(select schema_name,name from moderation_expected where is_new))
      +(select count(*) from moderation_triggers)+(select present::int from moderation_column) as m06_named_objects,
    exists(select 1 from source_tables t join pg_attribute a on a.attrelid=t.oid and a.attname='submission_id' and not a.attisdropped
      join pg_index i on i.indrelid=t.oid and i.indkey[0]=a.attnum where t.table_name='announcement_submission'
      and i.indisunique and i.indisvalid and i.indisready and i.indislive and i.indimmediate and i.indnkeyatts=1 and i.indpred is null and i.indexprs is null) as receipt_key_matches,
    (select count(*) from moderation_routines) as moderation_routine_count,
    (select count(*) from moderation_expected) as expected_moderation_routine_count,
    (select count(*) from moderation_routines)=(select count(*) from moderation_expected) as moderation_routine_count_matches,
    (select bool_and(after_matches) from moderation_function_checks) as moderation_functions_match,
    (select count(*)=16 from moderation_triggers) and (select bool_and(matches) from moderation_trigger_checks) as moderation_triggers_match,
    (select matches from moderation_column) as moderation_column_matches,
    coalesce((select count(*)=(select count(*) from moderation_expected where not is_new)
      and bool_and(before_matches or after_matches) from moderation_function_checks where not is_new),false) as payment_dependencies_match,
    exists(select 1 from moderation_function_checks where name='record_priority_checkout_event_v1'
      and args='uuid,uuid,text,text,text,text,text,boolean') as legacy_payment_present,
    coalesce((select after_matches from moderation_function_checks where name='record_priority_checkout_event_v1'
      and args='uuid,uuid,text,text,text,text,text,boolean'),true) as legacy_payment_matches,
    coalesce((select bool_and(before_matches) from moderation_function_checks where not is_new),false) as payment_before_matches,
    (select bool_and(f.actual_md5=e.definition_md5) from detail_function_checks f join detail_expected e using(schema_name,name,args)) as detail_before_matches,
    (select bool_and(f.actual_md5=case f.name when 'admin_announcement_field_v1' then '994756870c17df52e8ba755a676b3b02' when 'get_admin_announcement_v1' then 'deb0298d0d1371a47283b4524780c21a' else e.definition_md5 end)
      from detail_function_checks f join detail_expected e using(schema_name,name,args)) as detail_after_matches
),
m06_result as (
  select m.*,c.*,coalesce(m.m05_prerequisites_match and m.detail_catalog_matches and c.payment_dependencies_match and c.receipt_key_matches,false) as m06_prerequisites_match,
    coalesce(c.m06_named_objects=26 and c.moderation_routine_count_matches and c.moderation_functions_match and c.moderation_triggers_match
      and c.moderation_column_matches and c.detail_after_matches,false) as moderation_catalog_matches
  from m05_result m cross join moderation_checks c
),
m07_routine_names(name,scope) as (values
  ('notify_announcement_v1','consumer_rewrite'),
  ('notification_target_ref','consumer_rewrite'),
  ('notification_display_ref','consumer_rewrite'),
  ('get_owned_priority_checkout_v1','consumer_rewrite'),
  ('get_notifications_v1','consumer_rewrite'),
  ('get_notifications_v2','consumer_rewrite'),
  ('record_priority_checkout_session_v1','consumer_rewrite'),
  ('record_priority_checkout_event_v1','consumer_rewrite'),
  ('auto_approve_new_announcement_until_v1','consumer_rewrite'),
  ('prune_revoked_professional_regions_v1','consumer_rewrite'),
  ('sync_published_profile_snapshot_v1','consumer_rewrite'),
  ('lock_announcement_child_parent_v1','child_guard_rewrite'),
  ('admin_moderation_capabilities_v1','admin_replacement'),
  ('project_admin_announcement_v1','admin_replacement'),
  ('moderate_admin_announcement_v1','admin_replacement'),
  ('list_admin_announcements_v1','admin_replacement')
),
m07_routines as materialized (
  select p.*,n.nspname as schema_name,l.lanname as language,e.scope,
    replace(oidvectortypes(p.proargtypes),', ',',') as args,
    case when p.prokind in ('f','p') then md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n')) end as definition_md5
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  join pg_language l on l.oid=p.prolang join m07_routine_names e on e.name=p.proname
  where n.nspname in ('public','private')
),
m07_table_names(schema_name,table_name) as (
  select schema_name,table_name from source_tables
  union values ('public','annuncio_generico'),('public','restricted_profile_access'),
    ('public','localita_profilo'),('public','profilo_follow'),
    ('private','notifiche'),('private','manifestazioni_interesse')
),
m07_tables as materialized (
  select e.schema_name,e.table_name,c.* from m07_table_names e
  left join pg_namespace n on n.nspname=e.schema_name
  left join pg_class c on c.relnamespace=n.oid and c.relname=e.table_name
),
m07_objects(kind,schema_name,table_name,name) as (
  select 'column',n.nspname,c.relname,a.attname from pg_attribute a
    join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='annuncio' and a.attnum>0 and not a.attisdropped
      and a.attname in ('eliminato_il','eliminato_da')
  union all select 'relation',n.nspname,null,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where (n.nspname='private' and c.relname='admin_trash_release_v1')
      or (n.nspname='public' and c.relname='annuncio_admin_trash_order_v1_idx')
  union all select 'constraint',n.nspname,c.relname,k.conname from pg_constraint k
    join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='annuncio' and k.conname='annuncio_trash_metadata_v1'
  union all select 'routine',n.nspname,null,p.proname||'('||oidvectortypes(p.proargtypes)||')'
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','private') and p.proname='guard_announcement_trash_v1'
  union all select 'trigger',n.nspname,c.relname,t.tgname from pg_trigger t
    join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and (t.tgname='zz_guard_announcement_trash_v1'
      or (c.relname='annuncio_generico' and t.tgname='admin_lock_parent_v1'))
  union all select 'policy',n.nspname,c.relname,p.polname from pg_policy p
    join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and p.polname in ('annuncio_not_trashed_v1','not_trashed_v1')
),
m07_table_inventory as (
  select s.schema_name,s.table_name,s.oid is not null as present,s.relkind,s.relpersistence,
    pg_get_userbyid(s.relowner) as owner,s.relrowsecurity as rls,s.relforcerowsecurity as force_rls,
    md5(s.relacl::text) as acl_md5,
    (select coalesce(jsonb_agg(jsonb_build_object('role',r.rolname,
      'select',has_table_privilege(r.oid,s.oid,'SELECT'),'insert',has_table_privilege(r.oid,s.oid,'INSERT'),
      'update',has_table_privilege(r.oid,s.oid,'UPDATE'),'delete',has_table_privilege(r.oid,s.oid,'DELETE'),
      'truncate',has_table_privilege(r.oid,s.oid,'TRUNCATE'),'references',has_table_privilege(r.oid,s.oid,'REFERENCES'),
      'trigger',has_table_privilege(r.oid,s.oid,'TRIGGER'),'maintain',has_table_privilege(r.oid,s.oid,'MAINTAIN'))
      order by r.rolname),'[]'::jsonb) from api_roles r where s.relkind in ('r','p','v','m','f')) as effective_privileges,
    (select coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'position',a.attnum,
      'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,
      'collation',a.attcollation::regcollation::text,'acl_md5',md5(a.attacl::text),
      'default_md5',md5(pg_get_expr(d.adbin,d.adrelid)),
      'effective_privileges',(select coalesce(jsonb_agg(jsonb_build_array(r.rolname,
        has_column_privilege(r.oid,s.oid,a.attnum,'SELECT'),has_column_privilege(r.oid,s.oid,a.attnum,'INSERT'),
        has_column_privilege(r.oid,s.oid,a.attnum,'UPDATE'),has_column_privilege(r.oid,s.oid,a.attnum,'REFERENCES'))
        order by r.rolname),'[]'::jsonb) from api_roles r where s.relkind in ('r','p','v','m','f')))
      order by a.attnum),'[]'::jsonb)
      from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
      where a.attrelid=s.oid and a.attnum>0 and not a.attisdropped) as columns,
    (select coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,
      'roles',(select jsonb_agg(case when x=0 then 'PUBLIC' else pg_get_userbyid(x) end
        order by case when x=0 then 'PUBLIC' else pg_get_userbyid(x) end) from unnest(p.polroles) x),
      'using_md5',md5(pg_get_expr(p.polqual,p.polrelid)),'check_md5',md5(pg_get_expr(p.polwithcheck,p.polrelid)))
      order by p.polname),'[]'::jsonb) from pg_policy p where p.polrelid=s.oid) as policies,
    (select coalesce(jsonb_agg(jsonb_build_object('name',c.conname,'type',c.contype,'validated',c.convalidated,
      'definition_md5',md5(pg_get_constraintdef(c.oid,true))) order by c.conname),'[]'::jsonb)
      from pg_constraint c where c.conrelid=s.oid and c.contype<>'n') as constraints,
    (select coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'valid',i.indisvalid,'ready',i.indisready,
      'live',i.indislive,'definition_md5',md5(pg_get_indexdef(i.indexrelid))) order by c.relname),'[]'::jsonb)
      from pg_index i join pg_class c on c.oid=i.indexrelid where i.indrelid=s.oid) as indexes,
    (select coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,
      'definition_md5',md5(replace(pg_get_triggerdef(t.oid,true),E'\r\n',E'\n')),
      'function_identity',t.tgfoid::regprocedure::text,
      'function_owner',pg_get_userbyid(p.proowner),'function_acl_md5',md5(p.proacl::text),
      'function_effective_execute',(select jsonb_agg(jsonb_build_array(r.rolname,
        has_function_privilege(r.oid,p.oid,'EXECUTE')) order by r.rolname) from api_roles r),
      'function_md5',case when p.prokind='f' then md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n')) end)
      order by t.tgname),'[]'::jsonb) from pg_trigger t join pg_proc p on p.oid=t.tgfoid
      where t.tgrelid=s.oid and not t.tgisinternal) as triggers
  from m07_tables s
),
m07_consumer_triggers as (
  select n.nspname as schema_name,c.relname as table_name,t.tgname as name,t.tgenabled as enabled,
    md5(replace(pg_get_triggerdef(t.oid,true),E'\r\n',E'\n')) as definition_md5,
    p.schema_name as function_schema,p.proname as function_name,p.args as function_args,p.definition_md5 as function_md5
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
  join m07_routines p on p.oid=t.tgfoid where not t.tgisinternal and n.nspname in ('public','private')
),
m07_all_routines as materialized (
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
('annuncio','auto_approve_new_announcement_until_v1','c5a9e3ea6286f3d9a58dade75c079edb','private.auto_approve_new_announcement_until_v1()',false),
('annuncio','notification_announcement','dd0257740950c621fb90664ee0ad4606','private.notify_announcement_v1()',false),
('annuncio_arbitro','admin_lock_parent_v1','8a334ebc632201cd6a897bd45a434e53','private.lock_announcement_child_parent_v1()',false),
('annuncio_campo_impianto','admin_lock_parent_v1','04729cdf0681bbcc75b452d8182158a3','private.lock_announcement_child_parent_v1()',false),
('annuncio_creator','admin_lock_parent_v1','f1c529971806b526a91af99a8458293b','private.lock_announcement_child_parent_v1()',false),
('annuncio_giocatore','admin_lock_parent_v1','dfbd4d3073deea9622c4716dcc003e85','private.lock_announcement_child_parent_v1()',false),
('annuncio_servizi_consulenze','admin_lock_parent_v1','63c1175415857bc39feb658bad67cebc','private.lock_announcement_child_parent_v1()',false),
('annuncio_squadra_cerca_giocatore','admin_lock_parent_v1','c084f09cec6400ea02e097f2a82f3a98','private.lock_announcement_child_parent_v1()',false),
('annuncio_squadra_cerca_partita','admin_lock_parent_v1','46eb478ec742a15cb1107dd14ebb4eae','private.lock_announcement_child_parent_v1()',false),
('annuncio_squadra_cerca_sponsor','admin_lock_parent_v1','7cbacc380463c982a274d3b6d5894dfc','private.lock_announcement_child_parent_v1()',false),
('annuncio_squadra_cerca_staff','admin_lock_parent_v1','7b5cc702e0b2a2d86b5eac9dcadbc2af','private.lock_announcement_child_parent_v1()',false),
('annuncio_staff_sportivo','admin_lock_parent_v1','e08c9ee4ff068823b5ebced0bc48a97b','private.lock_announcement_child_parent_v1()',false),
('annuncio_torneo_evento','admin_lock_parent_v1','149ba691aaa33f6751c77af771eb8fd6','private.lock_announcement_child_parent_v1()',false),
('contatto_annuncio','admin_lock_parent_v1','bc91d9ed60ec399513d7a1ccc8511bc1','private.lock_announcement_child_parent_v1()',false),
('link_social_annuncio','admin_lock_parent_v1','a0a034edea33754796bde80b4dd677bb','private.lock_announcement_child_parent_v1()',false),
('localita_annuncio','admin_lock_parent_v1','c12bd686e234ec1fdcef9af3dce95776','private.lock_announcement_child_parent_v1()',false),
('media_annuncio','admin_lock_parent_v1','19b730b7a5c2925474eefb3fe583f7f1','private.lock_announcement_child_parent_v1()',false),
('restricted_profile_access','prune_revoked_professional_regions','8070b2beef2d44247ec02b0494e025b6','private.prune_revoked_professional_regions_v1()',false),
('annuncio_generico','admin_lock_parent_v1','ae1beb1c9d9deb997f9466095a105ce2','private.lock_announcement_child_parent_v1()',true)
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
('annuncio','annuncio_not_trashed_v1','8607aa61a16b54d3aeb51e5f24d638ae','8607aa61a16b54d3aeb51e5f24d638ae'),
('annuncio_arbitro','not_trashed_v1','1be727dae130c13908cdb552a363bf67','1be727dae130c13908cdb552a363bf67'),
('annuncio_campo_impianto','not_trashed_v1','06fbae111b0cf0eeeba36207a1d8fdc8','06fbae111b0cf0eeeba36207a1d8fdc8'),
('annuncio_creator','not_trashed_v1','65822a386c9e93108106a2d707519d05','65822a386c9e93108106a2d707519d05'),
('annuncio_generico','not_trashed_v1','ae9db05156cfde064a492d785a16ad04','ae9db05156cfde064a492d785a16ad04'),
('annuncio_giocatore','not_trashed_v1','095a648700dcf57639d07a86ff817dc4','095a648700dcf57639d07a86ff817dc4'),
('annuncio_servizi_consulenze','not_trashed_v1','6df36c652df6dd66d55c46a8faf606a6','6df36c652df6dd66d55c46a8faf606a6'),
('annuncio_squadra_cerca_giocatore','not_trashed_v1','2d22a0c7edc39b77d3c6ba24f9782b14','2d22a0c7edc39b77d3c6ba24f9782b14'),
('annuncio_squadra_cerca_partita','not_trashed_v1','483c7d730af206236da1f12e6835ee19','483c7d730af206236da1f12e6835ee19'),
('annuncio_squadra_cerca_sponsor','not_trashed_v1','647ee9432643832046371fa75d4881ab','647ee9432643832046371fa75d4881ab'),
('annuncio_squadra_cerca_staff','not_trashed_v1','ee969dc14bfab1adbe9893cf7f78e19c','ee969dc14bfab1adbe9893cf7f78e19c'),
('annuncio_staff_sportivo','not_trashed_v1','d9dc818aa18b9fc8ac1e0087d9ca62c7','d9dc818aa18b9fc8ac1e0087d9ca62c7'),
('annuncio_torneo_evento','not_trashed_v1','52a105a937668a15b95f1707d734246c','52a105a937668a15b95f1707d734246c'),
('contatto_annuncio','not_trashed_v1','2667d80a6b50e7eefdc43412bf054f7d','2667d80a6b50e7eefdc43412bf054f7d'),
('link_social_annuncio','not_trashed_v1','28d5f68baebd85c2e17022308fbe9b4f','28d5f68baebd85c2e17022308fbe9b4f'),
('localita_annuncio','not_trashed_v1','a0c82202514832c8e88847321cc1373d','a0c82202514832c8e88847321cc1373d'),
('media_annuncio','not_trashed_v1','3b3875a9c392af50eb80c85c7d38d58b','3b3875a9c392af50eb80c85c7d38d58b')
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
('annuncio','zz_guard_announcement_trash_v1','c51b6f8f5afc226128f51b74401c3965','private.guard_announcement_trash_v1()'),
('annuncio_generico','admin_lock_parent_v1','ae1beb1c9d9deb997f9466095a105ce2','private.lock_announcement_child_parent_v1()')
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
        from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=g.oid and a.attnum>0 and not a.attisdropped)='[["singleton","boolean",true,"","",null,"true"],["enabled","boolean",true,"","",null,"false"]]'::jsonb
      and (select jsonb_agg(jsonb_build_array(c.conname,c.contype,c.convalidated,md5(pg_get_constraintdef(c.oid,true))) order by c.conname)
        from pg_constraint c where c.conrelid=g.oid and c.contype<>'n')='[["admin_trash_release_v1_pkey","p",true,"7511e9a8e50c073e1d6eff73afcc0f24"],["admin_trash_release_v1_singleton_check","c",true,"ae6f6dfbe38290d5bfa8f3e96d1aff91"]]'::jsonb
      and (select count(*)=1 and bool_and(i.indisprimary and i.indisunique and i.indisvalid and i.indisready and i.indislive and i.indimmediate
        and i.indpred is null and i.indexprs is null and i.indnkeyatts=1 and i.indnatts=1) from pg_index i where i.indrelid=g.oid)
      else false end
      from m07_gate g),false) as matches
),
m07_index_check as (
  select coalesce((select c.relkind='i' and i.indisvalid and i.indisready and i.indislive and not i.indisunique and not i.indisprimary
    and case when c.relkind='i' then md5(pg_get_indexdef(c.oid)) end='348a6441294af0ed7f3b15c3ad06a6b7' from pg_class c join pg_namespace n on n.oid=c.relnamespace
    left join pg_index i on i.indexrelid=c.oid where n.nspname='public' and c.relname='annuncio_admin_trash_order_v1_idx'),false) as matches
),
m07_constraint_check as (
  select coalesce((select c.contype='c' and c.convalidated and not c.condeferrable and not c.condeferred
    and md5(pg_get_constraintdef(c.oid,true))='b6f7b6c86bd22defddbb39e4dfc7c814' from pg_constraint c
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
) as m07_report from m07_result r cross join m06_result;
rollback;

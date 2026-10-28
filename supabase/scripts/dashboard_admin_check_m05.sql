-- M05: run this ENTIRE file BEFORE and AFTER the existing detail migration.
-- Expected project: Webapp Bacheca Dilettanti / nsytraextbndfyprwzts (Dashboard URL).
-- Catalogs only: never invokes detail/spec/snapshot, Auth, audit or purge functions.
-- Save BOTH reports; compare all 25 table_protections separately before closure.
-- M01-M04 are prerequisites, not replay/repair instructions. No history or Cron read.
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
  ('media_annuncio','link_media','text|character varying')
),
source_tables as materialized (
  select e.table_name,c.oid,c.relkind,c.relpersistence,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity
  from (select distinct table_name from required_source_columns) e
  left join (pg_class c join pg_namespace n on n.oid=c.relnamespace and n.nspname='public') on c.relname=e.table_name
),
source_column_checks as (
  select e.table_name,e.column_name,e.type_name as expected_type,format_type(a.atttypid,a.atttypmod) as actual_type,
    coalesce(a.attnum>0 and not a.attisdropped and case when strpos(e.type_name,'|')>0 then format_type(a.atttypid,null)=any(string_to_array(e.type_name,'|')) else format_type(a.atttypid,a.atttypmod)=e.type_name end,false) as matches
  from required_source_columns e join source_tables t on t.table_name=e.table_name
  left join pg_attribute a on a.attrelid=t.oid and a.attname=e.column_name and a.attnum>0 and not a.attisdropped
),
source_table_specs as materialized (
  select t.table_name,t.oid is not null as present,
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
        ) order by a.attnum),'[]'::jsonb)::text from pg_attribute a where a.attrelid=t.oid and a.attnum>0 and not a.attisdropped)),
      'policies_md5',md5((select coalesce(jsonb_agg(jsonb_build_array(p.polname,p.polcmd,p.polpermissive,p.polroles::text,
        md5(pg_get_expr(p.polqual,p.polrelid)),md5(pg_get_expr(p.polwithcheck,p.polrelid))) order by p.polname),'[]'::jsonb)::text
        from pg_policy p where p.polrelid=t.oid)),
      'api_privileges',(select jsonb_agg(jsonb_build_object('role',r.rolname,'select',has_table_privilege(r.oid,t.oid,'SELECT'),'insert',has_table_privilege(r.oid,t.oid,'INSERT'),'update',has_table_privilege(r.oid,t.oid,'UPDATE'),'delete',has_table_privilege(r.oid,t.oid,'DELETE'),'truncate',has_table_privilege(r.oid,t.oid,'TRUNCATE'),'references',has_table_privilege(r.oid,t.oid,'REFERENCES'),'trigger',has_table_privilege(r.oid,t.oid,'TRIGGER'),'maintain',has_table_privilege(r.oid,t.oid,'MAINTAIN')) order by r.rolname) from api_roles r)
    ) as spec
  from source_tables t
),
table_protections as (
  select table_name,present,usable,spec->>'owner' as owner,(spec->>'rls')::boolean as rls,
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
    case when p.prokind='f' then md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n')) end as canonical_md5
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
    (select count(*)=25 and bool_and(usable) from source_table_specs)
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
    case when p.prokind='f' then md5(replace(pg_get_functiondef(p.oid),E'\r\n',E'\n')) end as canonical_md5
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
  where (n.nspname,p.proname) in (select schema_name,name from detail_expected)
),
detail_function_checks as (
  select e.schema_name,e.name,e.args,p.oid is not null as present,p.canonical_md5 as actual_md5,
    coalesce(p.prokind='f' and pg_get_userbyid(p.proowner)='postgres' and p.prosecdef=e.is_definer
      and p.lanname=e.language_name and p.provolatile=e.volatility::"char" and not p.proisstrict and not p.proretset
      and p.prorettype='jsonb'::regtype and p.pronargdefaults=0 and p.proconfig=e.settings
      and p.canonical_md5=e.definition_md5 and has_function_privilege(p.oid,'EXECUTE')
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
)
select jsonb_build_object(
  'report_version',1,'step','M05','captured_at',statement_timestamp(),
  'expected_project_name','Webapp Bacheca Dilettanti','expected_project_ref','nsytraextbndfyprwzts',
  'operator',current_user,'server_version_num',current_setting('server_version_num')::integer,
  'transaction_read_only',current_setting('transaction_read_only'),
  'status',case when not m05_prerequisites_match then 'prerequisites_require_review'
    when m05_named_objects=0 then 'ready_for_m05_catalog_checks_only'
    when detail_catalog_matches then 'm05_structurally_verified' else 'm05_partial_or_drift_require_review' end,
  'checks',to_jsonb(m05_result),
  'functions',(select jsonb_agg(to_jsonb(f) order by schema_name,name) from detail_function_checks f),
  'required_columns',(select jsonb_agg(to_jsonb(c) order by table_name,column_name) from source_column_checks c),
  'detail_uniqueness',(select jsonb_agg(to_jsonb(c) order by table_name) from detail_unique_checks c),
  'table_protections',(select jsonb_agg(to_jsonb(t) order by table_name) from table_protections t),
  'm04_functions',(select jsonb_agg(to_jsonb(f) order by schema_name,name) from list_function_checks f),
  'm04_index',jsonb_build_object('name','annuncio_admin_order_v1_idx','matches',list_index_matches,
    'actual_md5',(select canonical_md5 from list_index)),
  'm03_functions',(select jsonb_agg(to_jsonb(f) order by schema_name,name) from bridge_function_checks f),
  'private_public_execute',(select coalesce(jsonb_agg(identity order by identity),'[]'::jsonb) from private_public_execute),
  'limits',jsonb_build_object('application_rows_read',false,'application_functions_called',false,
    'project_identity_verified',false,'backup_verified',false,'functional_authorization_verified',false,
    'migration_history_verified',false,'cron_jobs_read_or_changed',false,'api_schema_exposure_verified',false,
    'table_protections_compared',false),
  'notes',jsonb_build_array('Project identity and Free manual backup are documented separately, not certified by labels.',
    'Save both reports; compare all 25 table_protections by table_name before closing M05.',
    'Additional source fields accept explicit compatible types separated by |; actual types are reported. No complete historical DDL is inferred.',
    'Four private helpers must deny all API roles; only the wrapper and privileged bridge allow authenticated.',
    'LF/CRLF-normalized definitions must match. Partial installation or drift requires review, never replay or automatic grants.',
    'No application function or row is accessed. M01-M04 remain prerequisites. Never replay a verified M05 installation.')
) as m05_report from m05_result;
rollback;

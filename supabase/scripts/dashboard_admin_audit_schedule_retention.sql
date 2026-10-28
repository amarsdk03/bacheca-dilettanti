-- Manual operator script, NOT a migration/seed. Run only after integration
-- validation and explicit activation for this target, as postgres (SQL Editor).
-- Requires pg_cron already installed. Does not enable extensions, change global
-- timezone, run the purge immediately or grant access to any API role.
begin;
do $schedule$
declare v_job_id bigint;
begin
  if current_user <> 'postgres'
    or nullif(pg_catalog.current_setting('request.jwt.claims',true),'') is not null then
    raise exception 'ADMIN_AUDIT_SQL_OPERATOR_REQUIRED';
  end if;
  if not exists(select 1 from pg_catalog.pg_extension where extname='pg_cron') then
    raise exception 'ADMIN_AUDIT_PG_CRON_REQUIRED';
  end if;
  if pg_catalog.to_regprocedure('private.purge_admin_audit_events_v1()') is null then
    raise exception 'ADMIN_AUDIT_MIGRATION_REQUIRED';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dashboard-admin-audit-retention-v1',0));
  if exists(select 1 from cron.job where jobname='dashboard-admin-audit-retention-v1'
    and (username <> 'postgres' or database <> pg_catalog.current_database())) then
    raise exception 'ADMIN_AUDIT_CRON_JOB_CONFLICT';
  end if;
  select cron.schedule('dashboard-admin-audit-retention-v1', '17 3 * * *',
    'select private.purge_admin_audit_events_v1();') into v_job_id;
  perform cron.alter_job(v_job_id, active := true);
  raise notice 'Audit retention job %, daily 03:17 in cron.timezone=% (cutoff always UTC)',
    v_job_id, coalesce(nullif(pg_catalog.current_setting('cron.timezone',true),''),'GMT');
end;
$schedule$;
commit;

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "./helpers/pglite.mjs";
import { createAdminDatabaseFixture } from "./helpers/admin-database-fixture.mjs";

const inspection = readFileSync(new URL("../supabase/scripts/dashboard_admin_check_m02.sql", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261024104822_admin_audit_foundation.sql", import.meta.url), "utf8");
const inspect = async db => (await db.exec(inspection)).find(result => result.rows?.[0]?.m02_report).rows[0].m02_report;

test("M02 inspection handles missing prerequisites without granting access or leaving session settings", async t => {
  const db = await PGlite.create(); t.after(() => db.close());
  await db.exec("set statement_timeout='23s'; set search_path=public");
  const result = await inspect(db);
  assert.equal(result.status, "prerequisites_require_review");
  assert.equal(result.checks.m02_named_objects, 0);
  assert.equal(result.limits.project_identity_verified, false);
  assert.equal(result.limits.backup_verified, false);
  assert.equal(result.transaction_read_only, "on");
  assert.deepEqual((await db.query("select current_setting('statement_timeout') st,current_setting('search_path') sp,current_setting('transaction_read_only') ro")).rows[0], { st: "23s", sp: "public", ro: "off" });
  assert.equal((await db.query("select count(*)::int n from pg_namespace where nspname='private'")).rows[0].n, 0);
});

test("M02 can be checked before and after application, with CRLF bodies and no audit reads or purge", async t => {
  const { db } = await createAdminDatabaseFixture(); t.after(() => db.close());
  const before = await inspect(db);
  assert.equal(before.status, "ready_for_m02_catalog_checks_only");
  assert.equal(before.checks.prerequisites_match, true);
  assert.equal(before.checks.m02_named_objects, 0);
  await db.exec(migration.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n"));
  // An old synthetic event would disappear if the inspector invoked purge.
  const canary = "a4e4a4e4-a4e4-44e4-84e4-a4e4a4e4a4e4";
  await db.query(`insert into private.admin_audit_event_v1
    (correlation_uuid,occurred_at,action,resource_type,outcome,failure_code)
    values($1,'2020-01-01','auth.access_denied','session','failure','ACCESS_DENIED')`, [canary]);
  const after = await inspect(db);
  assert.equal(after.status, "m02_structurally_verified");
  assert.equal(after.checks.audit_catalog_matches, true);
  assert(after.functions.every(fn => fn.matches));
  assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, 1);
  assert(!JSON.stringify(after).includes(canary));
  assert.equal(after.limits.application_rows_read, false);
  assert.equal(after.limits.application_functions_called, false);
});

test("M02 inspection refuses a partial installation and an altered M01 helper", async t => {
  const { db } = await createAdminDatabaseFixture(); t.after(() => db.close());
  await db.exec("create table private.admin_audit_event_v1(event_uuid uuid)");
  assert.equal((await inspect(db)).status, "m02_partial_or_drift_require_review");
  await db.exec("alter function private.require_admin_context_v1() security invoker");
  const changed = await inspect(db);
  assert.equal(changed.status, "prerequisites_require_review");
  assert.equal(changed.checks.m01_context_matches, false);
});

test("M02 inspection refuses inherited column access and PUBLIC function access", async t => {
  const { db } = await createAdminDatabaseFixture(); t.after(() => db.close());
  await db.exec(migration);
  await db.exec(`create role inherited_audit_reader;
    grant select(reason) on private.admin_audit_event_v1 to inherited_audit_reader;
    grant inherited_audit_reader to authenticated`);
  assert.equal((await db.query("select has_table_privilege('authenticated','private.admin_audit_event_v1','SELECT') allowed")).rows[0].allowed, false);
  const columnGrant = await inspect(db);
  assert.equal(columnGrant.status, "m02_partial_or_drift_require_review");
  assert.equal(columnGrant.checks.columns_match, false);
  await db.exec("revoke select(reason) on private.admin_audit_event_v1 from inherited_audit_reader");
  await db.exec("grant execute on function private.purge_admin_audit_events_v1() to public");
  const functionGrant = await inspect(db);
  assert.equal(functionGrant.status, "m02_partial_or_drift_require_review");
  assert.equal(functionGrant.checks.functions_match, false);
});

test("M02 inspection refuses a changed check constraint and invalid structure despite all marker names", async t => {
  const { db } = await createAdminDatabaseFixture(); t.after(() => db.close());
  await db.exec(migration);
  await db.exec(`alter table private.admin_audit_event_v1 drop constraint admin_audit_actor_v1;
    alter table private.admin_audit_event_v1 add constraint admin_audit_actor_v1 check(true)`);
  const changed = await inspect(db);
  assert.equal(changed.checks.m02_named_objects, 9);
  assert.equal(changed.status, "m02_partial_or_drift_require_review");
  assert.equal(changed.checks.constraints_match, false);
  await db.exec("alter table private.admin_audit_event_v1 disable row level security");
  assert.equal((await inspect(db)).checks.table_access_matches, false);
});

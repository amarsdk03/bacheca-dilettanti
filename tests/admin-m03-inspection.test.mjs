import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "./helpers/pglite.mjs";
import { createAdminDatabaseFixture } from "./helpers/admin-database-fixture.mjs";

const inspection = readFileSync(new URL("../supabase/scripts/dashboard_admin_check_m03.sql", import.meta.url), "utf8");
const foundation = readFileSync(new URL("../supabase/migrations/20261024104822_admin_audit_foundation.sql", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/20261024110910_admin_audit_server_bridge.sql", import.meta.url), "utf8");
const signature = "(text,text,uuid,uuid,uuid,uuid,text)";
const inspect = async db => (await db.exec(inspection)).find(result => result.rows?.[0]?.m03_report).rows[0].m03_report;
const fixture = async t => {
  const { db } = await createAdminDatabaseFixture();
  t.after(() => db.close());
  await db.exec(foundation);
  return db;
};

test("M03 missing prerequisites produce a read-only report and restore session settings", async t => {
  const db = await PGlite.create(); t.after(() => db.close());
  await db.exec("set statement_timeout='23s'; set search_path=public");
  const result = await inspect(db);
  assert.equal(result.status, "prerequisites_require_review");
  assert.equal(result.checks.m03_named_objects, 0);
  assert.equal(result.checks.m03_prerequisites_match, false);
  assert.equal(result.transaction_read_only, "on");
  assert.equal(result.limits.api_schema_exposure_verified, false);
  assert.equal(result.limits.backup_verified, false);
  assert.deepEqual((await db.query("select current_setting('statement_timeout') st,current_setting('search_path') sp,current_setting('transaction_read_only') ro")).rows[0], { st: "23s", sp: "public", ro: "off" });
  assert.equal((await db.query("select count(*)::int n from pg_namespace where nspname='private'")).rows[0].n, 0);
});

test("M03 precheck validates M01/M02, postcheck accepts CRLF definitions without executing audit functions", async t => {
  const db = await fixture(t);
  await db.exec("revoke usage on schema private from service_role");
  const before = await inspect(db);
  assert.equal(before.status, "ready_for_m03_catalog_checks_only");
  assert.equal(before.checks.m03_prerequisites_match, true);
  assert.equal(before.checks.audit_catalog_matches, true);
  assert.equal(before.checks.service_private_usage, false);
  await db.exec(migration.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n"));
  const canary = "a3a3a3a3-a3a3-43a3-83a3-a3a3a3a3a3a3";
  await db.query(`insert into private.admin_audit_event_v1
    (correlation_uuid,occurred_at,action,resource_type,outcome,failure_code)
    values($1,'2020-01-01','auth.access_denied','session','failure','ACCESS_DENIED')`, [canary]);
  const after = await inspect(db);
  assert.equal(after.status, "m03_structurally_verified");
  assert.equal(after.checks.m03_named_objects, 2);
  assert.equal(after.checks.bridge_catalog_matches, true);
  assert(after.functions.every(fn => fn.matches));
  assert(after.m02_functions.every(fn => fn.matches));
  for (const fn of after.functions) for (const grant of fn.effective_execute) assert.equal(grant.execute, grant.role === "service_role");
  assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, 1);
  assert(!JSON.stringify(after).includes(canary));
  assert.equal(after.limits.application_functions_called, false);
  assert.equal(after.limits.application_rows_read, false);
  assert.deepEqual(after.private_public_execute, []);
});

test("M03 rejects partial installations and unexpected overloads instead of proposing replay", async t => {
  const db = await fixture(t);
  await db.exec(`create function private.record_admin_server_audit_v1(p_action text) returns uuid language sql as $$ select null::uuid $$;
    revoke all on function private.record_admin_server_audit_v1(text) from public`);
  const partial = await inspect(db);
  assert.equal(partial.checks.m03_named_objects, 1);
  assert.equal(partial.status, "m03_partial_or_drift_require_review");
  await db.exec(migration);
  const overloaded = await inspect(db);
  assert.equal(overloaded.checks.m03_named_objects, 3);
  assert.equal(overloaded.status, "m03_partial_or_drift_require_review");
  assert(overloaded.functions.every(fn => fn.matches));
});

test("M03 rejects PUBLIC and inherited execution even if the expected bodies match", async t => {
  const db = await fixture(t); await db.exec(migration);
  await db.exec(`grant execute on function public.admin_record_server_audit_v1${signature} to public`);
  const publicGrant = await inspect(db);
  assert.equal(publicGrant.status, "m03_partial_or_drift_require_review");
  assert.equal(publicGrant.checks.bridge_functions_match, false);
  await db.exec(`revoke execute on function public.admin_record_server_audit_v1${signature} from public;
    create role audit_bridge_delegate;
    grant execute on function private.record_admin_server_audit_v1${signature} to audit_bridge_delegate;
    grant audit_bridge_delegate to authenticated`);
  const inherited = await inspect(db);
  assert.equal(inherited.status, "m03_partial_or_drift_require_review");
  assert.equal(inherited.functions.find(fn => fn.schema_name === "private").effective_execute.find(r => r.role === "authenticated").execute, true);
});

test("M03 blocks private PUBLIC routines and changed M02 table protections before application", async t => {
  const db = await fixture(t);
  await db.exec("create function private.unreviewed_public_helper() returns text language sql as $$ select 'synthetic'::text $$");
  const helper = await inspect(db);
  assert.equal(helper.status, "prerequisites_require_review");
  assert.equal(helper.checks.private_public_execute_denied, false);
  assert.deepEqual(helper.private_public_execute, ["private.unreviewed_public_helper()"]);
  await db.exec("revoke execute on function private.unreviewed_public_helper() from public; grant select(reason) on private.admin_audit_event_v1 to authenticated");
  const column = await inspect(db);
  assert.equal(column.status, "prerequisites_require_review");
  assert.equal(column.checks.columns_match, false);
});

test("M03 detects definer drift, lost schema usage, and unavailable trusted JWT dependency", async t => {
  const db = await fixture(t); await db.exec(migration);
  await db.exec(`alter function private.record_admin_server_audit_v1${signature} security invoker`);
  assert.equal((await inspect(db)).status, "m03_partial_or_drift_require_review");
  await db.exec(`alter function private.record_admin_server_audit_v1${signature} security definer;
    revoke usage on schema private from service_role`);
  const noUsage = await inspect(db);
  assert.equal(noUsage.status, "m03_partial_or_drift_require_review");
  assert.equal(noUsage.checks.bridge_functions_match, true);
  assert.equal(noUsage.checks.service_private_usage, false);
  await db.exec("grant usage on schema private to service_role; revoke execute on function auth.jwt() from public");
  const noJwt = await inspect(db);
  assert.equal(noJwt.status, "prerequisites_require_review");
  assert.equal(noJwt.checks.auth_jwt_available, false);
});

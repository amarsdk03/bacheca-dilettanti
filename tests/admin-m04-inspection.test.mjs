import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "./helpers/pglite.mjs";
import { createAnnouncementFixture, announcementListMigration } from "./helpers/admin-announcements-fixture.mjs";

const inspection = readFileSync(new URL("../supabase/scripts/dashboard_admin_check_m04.sql", import.meta.url), "utf8");
const audit = readFileSync(new URL("../supabase/migrations/20261024104822_admin_audit_foundation.sql", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../supabase/migrations/20261024110910_admin_audit_server_bridge.sql", import.meta.url), "utf8");
const inspect = async db => (await db.exec(inspection)).find(result => result.rows?.[0]?.m04_report).rows[0].m04_report;
const protections = result => Object.fromEntries(result.table_protections.map(t => [t.table_name, t.protection_md5]));
async function fixture(t) {
  const h = await createAnnouncementFixture({ apply: false });
  t.after(() => h.db.close());
  await h.db.exec(audit);
  await h.db.exec(bridge);
  return h;
}

test("M04 handles missing prerequisites, returns metadata only and restores session settings", async t => {
  const db = await PGlite.create(); t.after(() => db.close());
  await db.exec("set statement_timeout='23s'; set search_path=public");
  const result = await inspect(db);
  assert.equal(result.status, "prerequisites_require_review");
  assert.equal(result.checks.m04_named_objects, 0);
  assert.equal(result.checks.source_schema_matches, false);
  assert.equal(result.required_columns.length, 52);
  assert.equal(result.table_protections.length, 10);
  assert(result.required_columns.every(c => !c.matches));
  assert.equal(result.transaction_read_only, "on");
  assert.equal(result.limits.table_protections_compared, false);
  assert.deepEqual((await db.query("select current_setting('statement_timeout') st,current_setting('search_path') sp,current_setting('transaction_read_only') ro")).rows[0], { st: "23s", sp: "public", ro: "off" });
  assert.equal((await db.query("select count(*)::int n from pg_namespace where nspname='private'")).rows[0].n, 0);
});

test("M04 pre/postcheck accepts CRLF, verifies three objects and preserves every table protection", async t => {
  const { db, insert, reset } = await fixture(t);
  await reset();
  await insert(8100, { title: "SYNTHETIC_PRIVATE_TITLE_NEVER_IN_REPORT" });
  await db.exec(`insert into private.admin_audit_event_v1(correlation_uuid,occurred_at,action,resource_type,outcome,failure_code)
    values('a4a4a4a4-a4a4-44a4-84a4-a4a4a4a4a4a4','2020-01-01','auth.access_denied','session','failure','ACCESS_DENIED')`);
  const before = await inspect(db);
  assert.equal(before.status, "ready_for_m04_catalog_checks_only");
  assert.equal(before.checks.m04_prerequisites_match, true);
  assert.equal(before.checks.m04_named_objects, 0);
  assert(before.required_columns.every(c => c.matches));
  await db.exec(announcementListMigration.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n"));
  const after = await inspect(db);
  assert.equal(after.status, "m04_structurally_verified");
  assert.equal(after.checks.m04_named_objects, 3);
  assert.equal(after.checks.list_catalog_matches, true);
  assert(after.functions.every(fn => fn.matches));
  assert.equal(after.index.matches, true);
  for (const fn of after.functions) for (const grant of fn.effective_execute) assert.equal(grant.execute, grant.role === "authenticated");
  assert.deepEqual(protections(after), protections(before));
  assert(after.table_protections.every(table => /^[a-f0-9]{32}$/.test(table.protection_md5)));
  assert(!JSON.stringify(after).includes("SYNTHETIC_PRIVATE_TITLE_NEVER_IN_REPORT"));
  assert(!JSON.stringify(after).includes("a4a4a4a4-a4a4-44a4-84a4-a4a4a4a4a4a4"));
  assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, 1);
  assert.equal(after.limits.application_functions_called, false);
  assert.equal(after.limits.application_rows_read, false);
  assert.equal(after.limits.table_protections_compared, false);
});

test("M04 requires M03 and the actual source-column types before reporting ready", async t => {
  const { db } = await fixture(t);
  await db.exec("alter table public.profilo rename column uuid_utente to old_user_column");
  const missing = await inspect(db);
  assert.equal(missing.status, "prerequisites_require_review");
  assert.equal(missing.required_columns.find(c => c.table_name === "profilo" && c.column_name === "uuid_utente").matches, false);
  await db.exec("alter table public.profilo rename column old_user_column to uuid_utente; alter table public.annuncio alter column titolo_annuncio type varchar(200)");
  const wrongType = await inspect(db);
  assert.equal(wrongType.status, "prerequisites_require_review");
  assert.equal(wrongType.required_columns.find(c => c.table_name === "annuncio" && c.column_name === "titolo_annuncio").actual_type, "character varying(200)");
  await db.exec("alter table public.annuncio alter column titolo_annuncio type text; drop function public.admin_record_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)");
  const noM03 = await inspect(db);
  assert.equal(noM03.status, "prerequisites_require_review");
  assert.equal(noM03.checks.bridge_catalog_matches, false);
});

test("M04 detects partial installations, overloads and altered function settings", async t => {
  const { db } = await fixture(t);
  await db.exec("create index annuncio_admin_order_v1_idx on public.annuncio(creato_il desc nulls last,uuid desc)");
  assert.equal((await inspect(db)).status, "m04_partial_or_drift_require_review");
  await db.exec("drop index public.annuncio_admin_order_v1_idx");
  await db.exec(announcementListMigration);
  await db.exec("create function public.admin_list_announcements_v1(p_query text) returns jsonb language sql as $$ select '{}'::jsonb $$; revoke execute on function public.admin_list_announcements_v1(text) from public");
  const overloaded = await inspect(db);
  assert.equal(overloaded.checks.m04_named_objects, 4);
  assert.equal(overloaded.status, "m04_partial_or_drift_require_review");
  await db.exec("drop function public.admin_list_announcements_v1(text); alter function private.list_admin_announcements_v1(jsonb) set timezone='Europe/Rome'");
  const timezone = await inspect(db);
  assert.equal(timezone.checks.list_functions_match, false);
  assert.equal(timezone.status, "m04_partial_or_drift_require_review");
});

test("M04 rejects wrong index ordering and a matching name attached to the wrong table", async t => {
  const { db } = await fixture(t); await db.exec(announcementListMigration);
  for (const definition of ["on public.annuncio(creato_il desc,uuid desc)", "on public.profilo(uuid desc)"]) {
    await db.exec(`drop index public.annuncio_admin_order_v1_idx; create index annuncio_admin_order_v1_idx ${definition}`);
    const result = await inspect(db);
    assert.equal(result.index.present, true);
    assert.equal(result.index.matches, false);
    assert.equal(result.status, "m04_partial_or_drift_require_review");
  }
});

test("M04 rejects PUBLIC, inherited API grants and missing authenticated schema usage", async t => {
  const { db } = await fixture(t); await db.exec(announcementListMigration);
  await db.exec("grant execute on function public.admin_list_announcements_v1(jsonb) to public");
  assert.equal((await inspect(db)).checks.list_functions_match, false);
  await db.exec(`revoke execute on function public.admin_list_announcements_v1(jsonb) from public;
    create role list_api_delegate;
    grant execute on function private.list_admin_announcements_v1(jsonb) to list_api_delegate;
    grant list_api_delegate to service_role`);
  const inherited = await inspect(db);
  assert.equal(inherited.status, "m04_partial_or_drift_require_review");
  assert.equal(inherited.functions.find(f => f.schema_name === "private").effective_execute.find(r => r.role === "service_role").execute, true);
  await db.exec("revoke execute on function private.list_admin_announcements_v1(jsonb) from list_api_delegate; revoke usage on schema private from authenticated");
  const usage = await inspect(db);
  assert.equal(usage.checks.list_functions_match, true);
  assert.equal(usage.checks.authenticated_private_usage, false);
  assert.equal(usage.status, "m04_partial_or_drift_require_review");
});

test("M04 snapshots expose table/column grants and RLS/policy changes without pretending to compare reports", async t => {
  const { db } = await fixture(t); await db.exec(announcementListMigration);
  const baseline = await inspect(db);
  const changes = [
    ["grant select on public.annuncio to authenticated", "annuncio", "revoke select on public.annuncio from authenticated"],
    ["grant select(titolo_annuncio) on public.annuncio to authenticated", "annuncio", "revoke select(titolo_annuncio) on public.annuncio from authenticated"],
    ["alter table public.annuncio disable row level security", "annuncio", "alter table public.annuncio enable row level security"],
    ["create policy synthetic_changed_policy on public.annuncio for select to authenticated using(true)", "annuncio", "drop policy synthetic_changed_policy on public.annuncio"],
  ];
  for (const [change, table, undo] of changes) {
    await db.exec(change);
    const result = await inspect(db);
    assert.notEqual(protections(result)[table], protections(baseline)[table]);
    assert.equal(result.limits.table_protections_compared, false);
    await db.exec(undo);
    assert.deepEqual(protections(await inspect(db)), protections(baseline));
  }
});

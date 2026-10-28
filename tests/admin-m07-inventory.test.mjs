import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildM07Inventory, migrationSha256, m06Sha256 } from "../scripts/dashboard-integration/build-m07-inventory.mjs";
import { PGlite } from "./helpers/pglite.mjs";
import { createM06InspectionFixture } from "./helpers/admin-m06-inspection-fixture.mjs";
import { moderationMigration } from "./helpers/admin-moderation-fixture.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const sql = read("../supabase/scripts/dashboard_admin_check_m07.sql");
const inspect = async db => (await db.exec(sql)).find(r => r.rows?.[0]?.m07_report).rows[0].m07_report;
const table = (r, name) => r.tables.find(t => t.table_name === name);
const routine = (r, name, args) => r.routines.find(f => f.name === name && (!args || f.args === args));
async function fixture(t, legacy = true) {
  const h = await createM06InspectionFixture(); t.after(() => h.db.close());
  await h.db.exec(moderationMigration);
  if (legacy) {
    await h.db.exec(read("./fixtures/admin-m06-legacy-payment.sql"));
    await h.db.exec(read("../supabase/migrations/20261026100239_admin_m06_legacy_payment_hold_compatibility.sql"));
  }
  return h;
}

test("M07A reports missing prerequisites without creating schemas or changing session settings", async t => {
  const db = await PGlite.create(); t.after(() => db.close());
  await db.exec("set search_path=public; set statement_timeout='23s'; set lock_timeout='7s'");
  const r = await inspect(db);
  assert.equal(r.status, "prerequisites_require_review");
  assert.equal(r.step, "M07A"); assert.equal(r.report_version, 1);
  assert.equal(r.transaction_read_only, "on");
  assert.equal(r.checks.m07_objects_present, 0);
  assert.equal(r.checks.consumer_routine_count, 0);
  assert.equal(r.tables.length, 33);
  assert(r.tables.every(t => !t.present && t.column_count === 0));
  assert.equal(r.support_table_details.length, 6);
  assert.equal(r.routine_names.length, 16);
  assert.equal(r.routine_names.filter(n => n.scope === "consumer_rewrite").length, 11);
  assert(r.routine_names.every(n => n.present_count === 0));
  assert.deepEqual((await db.query("select current_setting('search_path') s,current_setting('statement_timeout') t,current_setting('lock_timeout') l,current_setting('transaction_read_only') r")).rows[0],
    { s: "public", t: "23s", l: "7s", r: "off" });
  assert.equal((await db.query("select count(*)::int n from pg_namespace where nspname='private'")).rows[0].n, 0);
});

test("M07A inventories both reviewed payment signatures, preserves M06 checks and never authorizes migration", async t => {
  const h = await fixture(t); const { db } = h;
  await h.reset(); await h.insert(9800, { title: "SECRET_M07_ANNOUNCEMENT_ROW" });
  await db.exec("insert into private.announcement_submission(submission_id,stripe_checkout_session_id) values('c7070707-0707-4707-8707-070707070707','cs_SECRET_M07_RECEIPT'); create table private.admin_trash_release_v1(singleton boolean,enabled boolean); insert into private.admin_trash_release_v1 values(true,true)");
  const withGate = await inspect(db);
  assert.equal(withGate.status, "m07_objects_present_require_review");
  assert.equal(withGate.limits.gate_value_read, false);
  assert.equal(withGate.limits.gate_disabled_verified, false);
  await db.exec("drop table private.admin_trash_release_v1");
  const beforeObjects = await db.query("select count(*)::int n from pg_class");
  const r = await inspect(db);
  assert.equal(r.status, "m07_inventory_requires_review");
  assert.equal(r.checks.m06_structurally_verified, true);
  assert.equal(r.m06_baseline.status, "m06_structurally_verified");
  assert.equal(r.m06_baseline.checks.detail_before_matches, false);
  assert.equal(r.m06_baseline.checks.payment_before_matches, false);
  assert.equal(r.m06_baseline.checks.m06_named_objects, 26);
  assert.equal(r.m06_baseline.table_protections.length, 27);
  assert.equal(r.m06_baseline.unchanged_table_metadata.length, 27);
  assert(r.m06_baseline.table_protections.every(p => !Object.hasOwn(p, "effective_privileges") && p.protection_md5));
  assert(Object.values(r.m06_baseline.mismatches).every(items => items.length === 0));
  const payments = r.routines.filter(f => f.name === "record_priority_checkout_event_v1");
  assert.equal(payments.length, 2);
  assert.deepEqual(payments.map(f => f.definition_md5).sort(), ["e23890414fe6633d54cd4cb8694901fe", "f77948a78239684e1e8ba4333d299fb5"].sort());
  for (const p of payments) {
    assert.equal(p.acl_md5, "db23e67d6fad77fdfa003856d807d6af");
    assert(p.effective_execute.every(g => g.execute === (g.role === "service_role")));
  }
  assert.deepEqual(await db.query("select count(*)::int n from pg_class"), beforeObjects);
  assert(Object.values(r.limits).every(v => v === false));
  for (const secret of ["SECRET_M07_ANNOUNCEMENT_ROW", "cs_SECRET_M07_RECEIPT", "c7070707-0707-4707-8707-070707070707"]) assert(!JSON.stringify(r).includes(secret));
  assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, 0);
  assert.equal(r.m06_baseline.checks.moderation_column_matches, true);
  assert(r.consumer_triggers.some(t => t.table_name === "annuncio_creator" && t.function_name === "lock_announcement_child_parent_v1"));
});

test("M07A requires completed M06 and the corrected legacy body when the legacy signature exists", async t => {
  const { db } = await fixture(t, false);
  assert.equal((await inspect(db)).status, "m07_inventory_requires_review");
  await db.exec(read("./fixtures/admin-m06-legacy-payment.sql"));
  const r = await inspect(db);
  assert.equal(r.status, "prerequisites_require_review");
  assert.equal(r.m06_baseline.checks.legacy_payment_matches, false);
  assert.equal(routine(r, "record_priority_checkout_event_v1", "uuid,uuid,text,text,text,text,text,boolean").definition_md5, "44155d0a2a904fe2fb0211c1b3f2bf67");
});

test("M07A includes unexpected overloads, procedures and aggregates without invoking or accepting them", async t => {
  const { db } = await fixture(t, false);
  await db.exec(`create function public.get_notifications_v2(text) returns text language plpgsql as $$begin raise exception 'SECRET_M07_FUNCTION_SOURCE'; end$$;
    create procedure private.notification_target_ref(text) language plpgsql as $$begin raise exception 'MUST_NOT_CALL'; end$$;
    create aggregate public.get_notifications_v1(bigint)(sfunc=int8pl,stype=bigint,initcond='0');`);
  const r = await inspect(db);
  assert.equal(r.status, "prerequisites_require_review");
  assert.equal(r.m06_baseline.checks.private_public_execute_denied, false);
  assert.equal(routine(r, "get_notifications_v2").kind, "f");
  assert.equal(routine(r, "notification_target_ref", "text").kind, "p");
  assert.equal(routine(r, "get_notifications_v1").kind, "a");
  assert.equal(routine(r, "get_notifications_v1").definition_md5, null);
  assert(!JSON.stringify(r).includes("SECRET_M07_FUNCTION_SOURCE"));
  assert.equal(r.limits.consumer_bodies_reviewed, false);
  assert.equal(r.limits.migration_authorized, false);
});

test("M07A fingerprints every current column, grant, policy, index, constraint and trigger body", async t => {
  const { db } = await fixture(t, false);
  const first = await inspect(db);
  await db.exec("alter table public.annuncio add column synthetic_m07 text default 'SECRET_DEFAULT_VALUE'");
  const withColumn = await inspect(db);
  await db.exec(`grant update(synthetic_m07) on public.annuncio to authenticated;
    create policy synthetic_m07 on public.annuncio as restrictive for all to authenticated using(false) with check(false);
    create index synthetic_m07 on public.annuncio(synthetic_m07);
    alter table public.annuncio add constraint synthetic_m07 check(synthetic_m07 is null);
    create or replace function private.notify_announcement_v1() returns trigger language plpgsql security definer set search_path='' as $$begin raise exception 'MUST_NOT_CALL'; end$$;`);
  const r = await inspect(db); const before = table(first, "annuncio"); const after = table(r, "annuncio");
  for (const key of ["columns_md5", "policies_md5", "indexes_md5", "constraints_md5", "triggers_md5"]) assert.notEqual(after[key], before[key], key);
  assert.equal(after.policy_count, before.policy_count + 1);
  assert.notEqual(after.columns_md5, table(withColumn, "annuncio").columns_md5, "column grants remain fingerprinted independently of the new column");
  assert(!JSON.stringify(r).includes("SECRET_DEFAULT_VALUE"));
  assert.equal(r.limits.tables_compared_with_m06, false);
  await db.exec("grant execute on function private.notify_announcement_v1() to service_role");
  const withGrant = await inspect(db);
  assert.equal(routine(withGrant, "notify_announcement_v1").definition_md5, routine(r, "notify_announcement_v1").definition_md5);
  assert.notEqual(routine(withGrant, "notify_announcement_v1").acl_md5, routine(r, "notify_announcement_v1").acl_md5);
  assert.notEqual(table(withGrant, "annuncio").triggers_md5, after.triggers_md5, "trigger function grants remain fingerprinted without body changes");
});

test("M07A reports optional support tables explicitly and does not mistake a view for a table", async t => {
  const { db } = await fixture(t, false);
  const before = await inspect(db);
  assert.equal(before.checks.legacy_generic_present, false);
  assert.equal(table(before, "annuncio_generico").present, false);
  await db.exec("create view public.annuncio_generico as select uuid as uuid_annuncio from public.annuncio; create table public.restricted_profile_access(profile_id uuid,profile_type text,allowed_regions text[])");
  const r = await inspect(db);
  assert.equal(r.tables.length, 33);
  assert.equal(table(r, "annuncio_generico").relkind, "v");
  assert.equal(r.support_table_details.find(t => t.table_name === "restricted_profile_access").columns.find(c => c.name === "allowed_regions").type, "text[]");
  assert.equal(r.limits.consumer_bodies_reviewed, false);
});

test("M07A inventories monitored consumers' triggers outside its 33 table slots", async t => {
  const { db } = await fixture(t, false);
  await db.exec("create table private.synthetic_consumer_context(id integer); create trigger synthetic_context after insert on private.synthetic_consumer_context for each row execute function private.notify_announcement_v1()");
  const r = await inspect(db);
  const trigger = r.consumer_triggers.find(t => t.table_name === "synthetic_consumer_context");
  assert.equal(trigger.function_name, "notify_announcement_v1");
  assert.equal(trigger.function_md5, routine(r, "notify_announcement_v1").definition_md5);
  assert.equal(trigger.enabled, "O");
});

test("M07A detects partial M07 markers without proposing replay or claiming post verification", async t => {
  const { db } = await fixture(t, false);
  await db.exec(`alter table public.annuncio add column eliminato_il timestamptz,add column eliminato_da uuid;
    create policy annuncio_not_trashed_v1 on public.annuncio as restrictive for all to anon,authenticated using(eliminato_il is null) with check(eliminato_il is null);
    create function private.guard_announcement_trash_v1() returns trigger language plpgsql as $$begin return new; end$$;
    revoke all on function private.guard_announcement_trash_v1() from public;
    create trigger zz_guard_announcement_trash_v1 before insert on public.annuncio for each row execute function private.guard_announcement_trash_v1();`);
  const r = await inspect(db);
  assert.equal(r.status, "m07_objects_present_require_review");
  assert.equal(r.checks.m07_objects_present, 5);
  assert.deepEqual(r.m07_objects.map(o => o.kind).sort(), ["column", "column", "policy", "routine", "trigger"]);
  assert.equal(r.limits.post_migration_verified, false);
  assert.equal(r.limits.migration_authorized, false);
});

test("M07A normalizes CRLF routine bodies and reproduces the generated SQL without changing migrations", async t => {
  const { db } = await fixture(t, false);
  const definition = "create function public.get_notifications_v2(text) returns text language plpgsql as $$\nbegin\n return $1;\nend\n$$;";
  await db.exec(definition);
  const first = routine(await inspect(db), "get_notifications_v2").definition_md5;
  await db.exec("drop function public.get_notifications_v2(text)");
  await db.exec(definition.replaceAll("\n", "\r\n"));
  assert.equal(routine(await inspect(db), "get_notifications_v2").definition_md5, first);
  assert.equal(buildM07Inventory(), sql);
  const sha = path => createHash("sha256").update(read(path)).digest("hex");
  assert.equal(sha("../supabase/scripts/dashboard_admin_check_m06.sql"), m06Sha256);
  assert.equal(sha("../supabase/migrations/20261024162714_admin_announcement_trash.sql"), migrationSha256);
});

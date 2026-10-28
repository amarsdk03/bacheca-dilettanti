import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createM06InspectionFixture } from "./helpers/admin-m06-inspection-fixture.mjs";
import { moderationMigration } from "./helpers/admin-moderation-fixture.mjs";
import { listId as id, listActor as actor } from "./helpers/admin-announcements-fixture.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const legacy = read("./fixtures/admin-m06-legacy-payment.sql");
const fix = read("../supabase/migrations/20261026100239_admin_m06_legacy_payment_hold_compatibility.sql");
const inspector = read("../supabase/scripts/dashboard_admin_check_m06.sql");
const identity = "public.record_priority_checkout_event_v1(uuid,uuid,text,text,text,text,text,boolean)";
const inspect = async db => (await db.exec(inspector)).find(r => r.rows?.[0]?.m06_report).rows[0].m06_report;
async function fixture(t, apply = true) {
  const h = await createM06InspectionFixture(); t.after(() => h.db.close());
  if (apply) await h.db.exec(moderationMigration);
  await h.db.exec(legacy);
  return h;
}
const payment = async (h, n, overrides = [], role = "service_role") =>
  (await h.callAs(role, { role }, "select public.record_priority_checkout_event_v1($1::uuid,$2::uuid,$3::text,$4::text,$5::text,$6::text,$7::text,$8::boolean) as result",
    [id(n), id(n + 1000), "cs_legacy", "price_legacy", "complete", "paid", "pi_legacy", true].map((v, i) => i in overrides ? overrides[i] : v))).rows[0].result;
const row = async (db, n) => (await db.query("select * from public.annuncio where uuid=$1", [id(n)])).rows[0];
async function receipt(h, n) {
  await h.insert(n, { status: "in_attesa_pagamento", private: true });
  await h.child(id(n), "annuncio_giocatore");
  await h.db.query("update public.annuncio set livello_annuncio='prioritario' where uuid=$1", [id(n)]);
  await h.db.query("insert into private.announcement_submission(submission_id,announcement_id,utente_id,requested_visibility) values($1,$2,$3,'prioritario')", [id(n + 1000), id(n), actor.authorId]);
}
async function rejected(db, pattern) {
  try { await assert.rejects(db.exec(fix), pattern); }
  finally { await db.exec("rollback"); }
}

test("M06 legacy payment reproduces the held-payment rollback and the forward fix preserves hold, reason and ACL", async t => {
  const h = await fixture(t); const { db } = h; await h.reset(); await receipt(h, 9700);
  const detail = await h.detail(id(9700));
  assert.equal((await h.moderate(id(9700), "hide", detail.contentFingerprint, "Verifica pagamento legacy")).status, "ok");
  const before = await inspect(db);
  const old = before.functions.find(f => f.args === "uuid,uuid,text,text,text,text,text,boolean");
  assert.equal(old.actual_md5, "44155d0a2a904fe2fb0211c1b3f2bf67");
  assert.equal(old.acl_md5, "db23e67d6fad77fdfa003856d807d6af");
  assert.equal(before.checks.legacy_payment_present, true);
  assert.equal(before.checks.legacy_payment_matches, false);
  assert.equal(before.checks.moderation_routine_count, 12);
  assert.equal(before.checks.expected_moderation_routine_count, 12);
  assert.equal(before.status, "m06_partial_or_drift_require_review");
  assert.deepEqual(before.unexpected_routines, []);
  const held = await row(db, 9700);
  await assert.rejects(payment(h, 9700), /ADMIN_ANNOUNCEMENT_HIDDEN/);
  assert.deepEqual(await row(db, 9700), held);
  assert.equal((await db.query("select paid_at from private.announcement_submission where submission_id=$1", [id(10700)])).rows[0].paid_at, null);
  const auditCount = (await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n;
  await db.exec(fix);
  const after = await inspect(db);
  assert.equal(after.status, "m06_structurally_verified");
  assert.equal(after.checks.legacy_payment_matches, true);
  assert.equal(after.checks.m06_named_objects, 26);
  assert(after.functions.every(f => f.after_matches));
  assert.deepEqual(after.table_protections, before.table_protections);
  assert.deepEqual(after.unchanged_table_metadata, before.unchanged_table_metadata);
  assert.deepEqual(after.m05_functions, before.m05_functions);
  for (const f of before.functions) {
    const current = after.functions.find(a => a.schema_name === f.schema_name && a.name === f.name && a.args === f.args);
    assert.equal(current.protection_md5, f.protection_md5);
    assert.equal(current.acl_md5, f.acl_md5);
    assert.deepEqual(current.effective_execute, f.effective_execute);
    if (f.args !== "uuid,uuid,text,text,text,text,text,boolean") assert.deepEqual(current, f);
  }
  assert.equal((await payment(h, 9700)).status, "success");
  const paid = await row(db, 9700);
  assert.equal(paid.stato_annuncio, "in_revisione"); assert.equal(paid.nascosto, true); assert.equal(paid.oscurato_da_admin, true);
  assert.equal(paid.info_stato_annuncio, held.info_stato_annuncio);
  const saved = (await db.query("select paid_at,stripe_amount_total from private.announcement_submission where submission_id=$1", [id(10700)])).rows[0];
  assert(saved.paid_at); assert.equal(saved.stripe_amount_total, null);
  assert.equal((await payment(h, 9700)).status, "success");
  assert.deepEqual((await db.query("select paid_at from private.announcement_submission where submission_id=$1", [id(10700)])).rows[0].paid_at, saved.paid_at);
  assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, auditCount);
  for (const role of ["anon", "authenticated"]) await assert.rejects(payment(h, 9700, [], role), /permission denied/);
});

test("M06 legacy fix preserves ordinary completion, invalid input rollback and stale-session behavior", async t => {
  const h = await fixture(t); const { db } = h; await h.reset(); await receipt(h, 9701); await db.exec(fix);
  await assert.rejects(payment(h, 9701, { 2: "bad_session" }), /INVALID_CHECKOUT_EVENT/);
  assert.equal((await row(db, 9701)).stato_annuncio, "in_attesa_pagamento");
  assert.equal((await payment(h, 9701)).status, "success");
  const paid = await row(db, 9701);
  assert.equal(paid.oscurato_da_admin, false); assert.equal(paid.nascosto, false); assert.equal(paid.stato_annuncio, "in_revisione");
  assert.equal(paid.info_stato_annuncio, "Pagamento ricevuto. Annuncio in attesa di revisione.");
  assert.deepEqual(await payment(h, 9701, { 2: "cs_other" }), { status: "ignored", reason: "stale_session" });
  assert.deepEqual(await payment(h, 9999), { status: "ignored", reason: "not_found" });
});

test("M06 legacy fix refuses missing M06, altered bodies and expanded privileges without repairing them", async t => {
  const h = await fixture(t, false); const { db } = h;
  await rejected(db, /ADMIN_M06_LEGACY_PAYMENT_DEPENDENCIES_REQUIRED/);
  await db.exec(moderationMigration);
  await db.exec(`grant execute on function ${identity} to authenticated`);
  await rejected(db, /ADMIN_M06_LEGACY_PAYMENT_REVIEW_REQUIRED/);
  assert.equal((await db.query("select has_function_privilege('authenticated',$1,'EXECUTE') ok", [identity])).rows[0].ok, true);
  await db.exec(`revoke execute on function ${identity} from authenticated`);
  const original = (await db.query("select pg_get_functiondef($1::regprocedure) d", [identity])).rows[0].d;
  await db.exec(original.replace("INVALID_CHECKOUT_EVENT", "UNREVIEWED_BODY"));
  await rejected(db, /ADMIN_M06_LEGACY_PAYMENT_REVIEW_REQUIRED/);
  assert.equal((await inspect(db)).checks.payment_dependencies_match, false);
});

test("M06 legacy fix accepts CRLF, refuses replay and never accepts an arbitrary extra payment overload", async t => {
  const h = await fixture(t); const { db } = h;
  const definition = (await db.query("select pg_get_functiondef($1::regprocedure) d", [identity])).rows[0].d;
  await db.exec(definition.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n"));
  await db.exec(fix);
  await rejected(db, /ADMIN_M06_LEGACY_PAYMENT_ALREADY_FIXED/);
  assert.equal((await inspect(db)).status, "m06_structurally_verified");
  await db.exec("create function public.record_priority_checkout_event_v1(integer) returns jsonb language sql as $$select '{}'::jsonb$$; revoke execute on function public.record_priority_checkout_event_v1(integer) from public");
  const r = await inspect(db);
  assert.equal(r.status, "m06_partial_or_drift_require_review");
  assert.equal(r.checks.moderation_routine_count, 13); assert.equal(r.checks.expected_moderation_routine_count, 12);
  assert.equal(r.unexpected_routines.length, 1); assert.equal(r.unexpected_routines[0].args, "integer");
});

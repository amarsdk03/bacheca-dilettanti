import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "./helpers/pglite.mjs";
import { createM06InspectionFixture } from "./helpers/admin-m06-inspection-fixture.mjs";
import { moderationMigration } from "./helpers/admin-moderation-fixture.mjs";

const sql = readFileSync(new URL("../supabase/scripts/dashboard_admin_check_m06.sql", import.meta.url), "utf8");
const inspect = async db => (await db.exec(sql)).find(r => r.rows?.[0]?.m06_report).rows[0].m06_report;
async function fixture(t, apply = false) {
  const h = await createM06InspectionFixture(); t.after(() => h.db.close());
  if (apply) await h.db.exec(moderationMigration);
  return h;
}
const protection = (r, table) => r.table_protections.find(t => t.table_name === table);

test("M06 reports absent prerequisites without mutating schema or session settings", async t => {
  const db = await PGlite.create(); t.after(() => db.close());
  await db.exec("set search_path=public; set statement_timeout='23s'");
  const r = await inspect(db);
  assert.equal(r.status, "prerequisites_require_review");
  assert.equal(r.checks.m06_named_objects, 0);
  assert.equal(r.table_protections.length, 27);
  assert.equal(r.required_columns.length, 185);
  assert.equal(r.triggers.length, 16);
  assert.equal(r.transaction_read_only, "on");
  assert.equal((await db.query("select current_setting('search_path') s,current_setting('statement_timeout') t,current_setting('transaction_read_only') r")).rows[0].s, "public");
  assert.equal((await db.query("select current_setting('statement_timeout') t,current_setting('transaction_read_only') r")).rows[0].t, "23s");
  assert.equal((await db.query("select current_setting('transaction_read_only') r")).rows[0].r, "off");
  assert.equal((await db.query("select count(*)::int n from pg_namespace where nspname='private'")).rows[0].n, 0);
});

test("M06 recognizes CRLF installation, intended function changes and 26 new named objects", async t => {
  const h = await fixture(t); const { db } = h;
  await h.reset(); await h.insert(9600, { title: "SECRET_MODERATION_TITLE_NEVER_RETURNED" });
  await db.exec(`insert into private.announcement_submission(submission_id,stripe_checkout_session_id)
    values('a6060606-0606-4606-8606-060606060606','cs_SECRET_RECEIPT_NEVER_RETURNED');
    insert into private.admin_audit_event_v1(correlation_uuid,occurred_at,action,resource_type,outcome,failure_code)
    values('b6060606-0606-4606-8606-060606060606','2020-01-01','auth.access_denied','session','failure','ACCESS_DENIED')`);
  const before = await inspect(db);
  assert.equal(before.status, "ready_for_m06_catalog_checks_only");
  assert.equal(before.checks.m06_named_objects, 0);
  assert.equal(before.checks.moderation_routine_count, 2);
  assert.equal(before.checks.expected_moderation_routine_count, 11);
  assert.deepEqual(before.unexpected_routines, []);
  assert(before.required_columns.every(c => c.matches));
  await db.exec(moderationMigration.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n"));
  const after = await inspect(db);
  assert.equal(after.status, "m06_structurally_verified");
  assert.equal(after.checks.m06_named_objects, 26);
  assert.equal(after.report_version, 3);
  assert.equal(after.checks.moderation_routine_count, 11);
  assert.deepEqual(after.unexpected_routines, []);
  assert(after.triggers.every(t => t.matches));
  assert(after.column.matches);
  assert(after.functions.every(f => f.after_matches));
  assert(after.m05_functions.every(f => f.matches));
  assert.equal(after.checks.detail_before_matches, false);
  assert.equal(after.checks.detail_after_matches, true);
  assert.equal(after.checks.payment_before_matches, false);
  assert.deepEqual(after.table_protections, before.table_protections);
  assert.deepEqual(after.unchanged_table_metadata, before.unchanged_table_metadata);
  const payment = name => name === "record_priority_checkout_event_v1";
  for (const fn of after.functions) for (const grant of fn.effective_execute) {
    const expectedRole = payment(fn.name) ? "service_role" : ["admin_moderate_announcement_v1", "moderate_admin_announcement_v1"].includes(fn.name) ? "authenticated" : null;
    assert.equal(grant.execute, grant.role === expectedRole);
  }
  for (const sentinel of ["SECRET_MODERATION_TITLE_NEVER_RETURNED", "cs_SECRET_RECEIPT_NEVER_RETURNED", "b6060606-0606-4606-8606-060606060606"]) assert(!JSON.stringify(after).includes(sentinel));
  assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, 1);
  assert(Object.values(after.limits).every(v => v === false));
});

test("M06 checks receipt columns, key, payment function and existing detail prerequisites", async t => {
  const { db } = await fixture(t);
  await db.exec("alter table private.announcement_submission rename column paid_at to old_paid_at");
  assert.equal((await inspect(db)).status, "prerequisites_require_review");
  await db.exec("alter table private.announcement_submission rename column old_paid_at to paid_at; alter table private.announcement_submission drop constraint announcement_submission_pkey");
  assert.equal((await inspect(db)).checks.receipt_key_matches, false);
  await db.exec("alter table private.announcement_submission add primary key(submission_id); alter table private.announcement_submission alter column stripe_amount_total type text");
  assert.equal((await inspect(db)).checks.source_schema_matches, false);
  await db.exec("alter table private.announcement_submission alter column stripe_amount_total type integer using stripe_amount_total::integer; drop function public.record_priority_checkout_event_v1(uuid,uuid,text,text,integer,integer,text,text,text,boolean)");
  assert.equal((await inspect(db)).checks.payment_dependencies_match, false);
});

test("M06 refuses a partial flag or wrong flag default without hiding other source changes", async t => {
  const { db } = await fixture(t);
  const before = await inspect(db);
  await db.exec("alter table public.annuncio add column oscurato_da_admin boolean not null default false");
  const partial = await inspect(db);
  assert.equal(partial.status, "m06_partial_or_drift_require_review");
  assert.equal(partial.checks.m06_named_objects, 1);
  assert.deepEqual(partial.table_protections, before.table_protections);
  await db.exec("alter table public.annuncio alter column oscurato_da_admin set default true");
  assert.equal((await inspect(db)).column.matches, false);
  await db.exec("alter table public.annuncio alter column oscurato_da_admin set default false; grant update(oscurato_da_admin) on public.annuncio to authenticated");
  assert.equal((await inspect(db)).column.matches, false);
  await db.exec("revoke update(oscurato_da_admin) on public.annuncio from authenticated; alter table public.annuncio add column synthetic_unexpected text");
  assert.notEqual(protection(await inspect(db), "annuncio").columns_md5, protection(before, "annuncio").columns_md5);
});

test("M06 checks trigger target, events, enabled state, overloads and function configuration", async t => {
  const { db } = await fixture(t, true);
  await db.exec("alter table public.annuncio_creator disable trigger admin_lock_parent_v1");
  assert.equal((await inspect(db)).checks.moderation_triggers_match, false);
  await db.exec("alter table public.annuncio_creator enable trigger admin_lock_parent_v1; drop trigger admin_lock_parent_v1 on public.annuncio_creator; create trigger admin_lock_parent_v1 before insert on public.annuncio_creator for each row execute function private.lock_announcement_child_parent_v1()");
  assert.equal((await inspect(db)).status, "m06_partial_or_drift_require_review");
  await db.exec("drop trigger admin_lock_parent_v1 on public.annuncio_creator; create trigger admin_lock_parent_v1 before insert or update or delete on public.annuncio_creator for each row execute function private.lock_announcement_child_parent_v1(); create function public.admin_moderate_announcement_v1(text) returns jsonb language sql as $$select null::jsonb$$; revoke execute on function public.admin_moderate_announcement_v1(text) from public");
  assert.equal((await inspect(db)).checks.m06_named_objects, 27);
  await db.exec("drop function public.admin_moderate_announcement_v1(text); alter function private.moderate_admin_announcement_v1(uuid,text,text,text) set timezone='Europe/Rome'");
  assert.equal((await inspect(db)).checks.moderation_functions_match, false);
});

test("M06 reports dependency overloads before and after installation without hiding their execution grants", async t => {
  const { db } = await fixture(t);
  await db.exec(`create function public.record_priority_checkout_event_v1(text) returns jsonb language plpgsql
    security definer set search_path='' as $$begin raise exception 'MUST_NOT_CALL_OVERLOAD'; end$$;
    revoke execute on function public.record_priority_checkout_event_v1(text) from public;
    grant execute on function public.record_priority_checkout_event_v1(text) to service_role`);
  const before = await inspect(db);
  assert.equal(before.status, "m06_partial_or_drift_require_review");
  assert.equal(before.checks.moderation_routine_count, 3);
  assert.equal(before.checks.m06_named_objects, 0);
  assert.equal(before.unexpected_routines.length, 1);
  const extra = before.unexpected_routines[0];
  assert.equal(extra.schema_name, "public");
  assert.equal(extra.name, "record_priority_checkout_event_v1");
  assert.equal(extra.args, "text");
  assert.equal(extra.kind, "f");
  assert.equal(extra.owner, "postgres");
  assert.equal(extra.is_definer, true);
  assert.match(extra.actual_md5, /^[a-f0-9]{32}$/);
  assert.match(extra.acl_md5, /^[a-f0-9]{32}$/);
  assert.deepEqual(extra.settings, ['search_path=""']);
  assert.deepEqual(extra.effective_execute.filter(g => g.execute).map(g => g.role), ["service_role"]);
  await db.exec(moderationMigration);
  const after = await inspect(db);
  assert.equal(after.status, "m06_partial_or_drift_require_review");
  assert.equal(after.checks.m06_named_objects, 26);
  assert.equal(after.checks.moderation_routine_count, 12);
  assert.equal(after.checks.moderation_routine_count_matches, false);
  assert(after.functions.every(f => f.after_matches));
  assert.deepEqual(after.unexpected_routines, before.unexpected_routines);
  assert.deepEqual(after.table_protections, before.table_protections);
  assert.deepEqual(after.unchanged_table_metadata, before.unchanged_table_metadata);
  assert(!JSON.stringify(after).includes("MUST_NOT_CALL_OVERLOAD"));
  assert.equal(after.limits.application_functions_called, false);
});

test("M06 inventory distinguishes unexpected procedures and aggregates without asking for their function bodies", async t => {
  const { db } = await fixture(t, true);
  await db.exec(`create procedure private.publish_text_is_valid(integer) language plpgsql
    as $$begin raise exception 'MUST_NOT_CALL_PROCEDURE'; end$$;
    revoke execute on procedure private.publish_text_is_valid(integer) from public;
    create aggregate private.publish_text_is_valid(bigint) (sfunc=pg_catalog.int8pl,stype=bigint,initcond='0');
    revoke execute on function private.publish_text_is_valid(bigint) from public`);
  const after = await inspect(db);
  assert.equal(after.checks.moderation_routine_count, 13);
  assert.equal(after.checks.moderation_routine_count_matches, false);
  assert.equal(after.status, "m06_partial_or_drift_require_review");
  assert.equal(after.unexpected_routines.length, 2);
  const aggregate = after.unexpected_routines.find(r => r.kind === "a");
  const procedure = after.unexpected_routines.find(r => r.kind === "p");
  assert.equal(aggregate.args, "bigint");
  assert.equal(aggregate.actual_md5, null);
  assert.equal(procedure.args, "integer");
  assert.equal(procedure.actual_md5, null);
  assert(!JSON.stringify(after).includes("MUST_NOT_CALL_PROCEDURE"));
});

test("M06 does not mistake old or arbitrary replacement bodies for the required final payment/detail functions", async t => {
  const { db } = await fixture(t);
  const beforeBody = (await db.query("select pg_get_functiondef('private.get_admin_announcement_v1(uuid)'::regprocedure) d")).rows[0].d;
  await db.exec(moderationMigration);
  await db.exec(beforeBody);
  const mixed = await inspect(db);
  assert.equal(mixed.checks.m06_prerequisites_match, true);
  assert.equal(mixed.status, "m06_partial_or_drift_require_review");
  assert.equal(mixed.checks.detail_after_matches, false);
  await db.exec("create or replace function public.record_priority_checkout_event_v1(p_announcement_id uuid,p_submission_id uuid,p_session_id text,p_price_id text,p_amount_subtotal integer,p_amount_total integer,p_checkout_status text,p_payment_status text,p_payment_intent_id text,p_paid boolean) returns jsonb language plpgsql security definer set search_path='' as $$begin return '{}'::jsonb; end$$");
  assert.equal((await inspect(db)).checks.payment_dependencies_match, false);
});

test("M06 refuses PUBLIC, inherited helper grants and payment access beyond service_role", async t => {
  const { db } = await fixture(t, true);
  await db.exec("grant execute on function public.admin_moderate_announcement_v1(uuid,text,text,text) to public");
  assert.equal((await inspect(db)).checks.moderation_functions_match, false);
  await db.exec("revoke execute on function public.admin_moderate_announcement_v1(uuid,text,text,text) from public; create role moderation_delegate; grant execute on function private.project_admin_announcement_v1(jsonb) to moderation_delegate; grant moderation_delegate to authenticated");
  const inherited = await inspect(db);
  assert.equal(inherited.checks.moderation_functions_match, false);
  assert.equal(inherited.functions.find(f => f.name === "project_admin_announcement_v1").effective_execute.find(g => g.role === "authenticated").execute, true);
  await db.exec("revoke execute on function private.project_admin_announcement_v1(jsonb) from moderation_delegate; grant execute on function public.record_priority_checkout_event_v1(uuid,uuid,text,text,integer,integer,text,text,text,boolean) to authenticated");
  assert.equal((await inspect(db)).checks.payment_dependencies_match, false);
});

test("M06 fingerprints preserve all other grants, policies, triggers and indexes and never call helpers", async t => {
  const { db } = await fixture(t, true);
  const baseline = await inspect(db);
  await db.exec("grant select on private.announcement_submission to authenticated");
  assert.notEqual(protection(await inspect(db), "announcement_submission").protection_md5, protection(baseline, "announcement_submission").protection_md5);
  await db.exec("revoke select on private.announcement_submission from authenticated; alter table public.annuncio disable trigger notification_announcement");
  const changed = await inspect(db);
  assert.notDeepEqual(changed.unchanged_table_metadata, baseline.unchanged_table_metadata);
  assert.equal(changed.limits.unchanged_metadata_compared, false);
  await db.exec("alter table public.annuncio enable trigger notification_announcement; create index synthetic_extra_index on public.annuncio(titolo_annuncio)");
  assert.notDeepEqual((await inspect(db)).unchanged_table_metadata, baseline.unchanged_table_metadata);
  await db.exec("drop index public.synthetic_extra_index; create or replace function private.admin_review_url_valid_v1(p_value text) returns boolean language plpgsql immutable security invoker set search_path='' as $$begin raise exception 'MUST_NOT_EXECUTE'; end$$");
  const result = await inspect(db);
  assert.equal(result.checks.moderation_functions_match, false);
  assert(!JSON.stringify(result).includes("MUST_NOT_EXECUTE"));
  assert.equal(result.limits.application_functions_called, false);
});

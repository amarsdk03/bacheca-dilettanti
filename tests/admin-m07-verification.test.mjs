import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "./helpers/pglite.mjs";
import { createM07InspectionFixture } from "./helpers/admin-m07-inspection-fixture.mjs";
import { trashMigration } from "./helpers/admin-trash-fixture.mjs";
import { listId as id, listActor as actor } from "./helpers/admin-announcements-fixture.mjs";
import { buildM07Verification, m07Manifest } from "../scripts/dashboard-integration/build-m07-verification.mjs";
import { compareM07Reports } from "../scripts/dashboard-integration/compare-m07-reports.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const sql = read("../supabase/scripts/dashboard_admin_verify_m07.sql");
const inventory = read("../supabase/scripts/dashboard_admin_check_m07.sql");
const gateSql = read("../supabase/scripts/dashboard_admin_check_m07_gate.sql");
const inspect = async db => (await db.exec(sql)).find(r => r.rows?.[0]?.m07_report).rows[0].m07_report;
const inspectGate = async db => (await db.exec(gateSql)).find(r => r.rows?.[0]?.m07_gate_report).rows[0].m07_gate_report;
const row = (r, name) => r.unchanged_table_fingerprints.find(t => t.table_name === name);
async function fixture(t, options) {
  const h = await createM07InspectionFixture(options); t.after(() => h.db.close()); return h;
}
const review = r => assert.match(r.status,/require_review$/);

test("M07B missing prerequisites remain read only and do not alter session settings", async t => {
  const db = await PGlite.create(); t.after(() => db.close());
  await db.exec("set search_path=public;set statement_timeout='23s';set lock_timeout='7s'");
  const r = await inspect(db);
  assert.equal(r.status,"m07_prerequisites_or_drift_require_review");
  assert.equal(r.checks.actual_routine_count,0); assert.equal(r.checks.m07_marker_count,0);
  assert.equal(r.unchanged_table_fingerprints.length,33); assert.equal(r.functions.length,18);
  assert.equal(r.transaction_read_only,"on");
  assert.deepEqual((await db.query("select current_setting('search_path') s,current_setting('statement_timeout') t,current_setting('lock_timeout') l,current_setting('transaction_read_only') r")).rows[0],
    {s:"public",t:"23s",l:"7s",r:"off"});
  assert.equal((await db.query("select count(*)::int n from pg_namespace where nspname='private'")).rows[0].n,0);
});

test("M07B recognizes all reviewed bodies, both overload pairs and exact post-M07 changes under CRLF", async t => {
  const h = await fixture(t,{crlf:true}); const {db} = h;
  await h.reset(); await h.insert(9900,{title:"SECRET_M07B_ROW_TITLE"});
  await db.exec("insert into private.announcement_submission(submission_id,stripe_checkout_session_id) values('d7070707-0707-4707-8707-070707070707','cs_SECRET_M07B')");
  const initial = (await db.exec(inventory)).find(r=>r.rows?.[0]?.m07_report).rows[0].m07_report;
  const before = await inspect(db);
  assert.equal(before.status,"ready_for_m07_catalog_checks_only");
  assert.equal(before.checks.actual_routine_count,17); assert.equal(before.checks.m07_marker_count,0);
  assert.equal(before.checks.actual_consumer_trigger_count,18);
  assert.equal(before.checks.consumer_triggers_before_match,true);
  assert.equal(before.functions.filter(f=>f.before_body_matches&&f.protection_matches).length,17);
  assert.equal(compareM07Reports(initial,before).matchedTables,33);
  await db.exec(trashMigration.replaceAll("\r\n","\n").replaceAll("\n","\r\n"));
  const after = await inspect(db);
  assert.equal(after.status,"m07_structurally_verified_gate_unread");
  assert.equal(after.checks.actual_routine_count,18); assert.equal(after.checks.m07_marker_count,25);
  assert.equal(after.checks.actual_consumer_trigger_count,19);
  assert.equal(after.checks.consumer_triggers_after_match,true);
  assert(after.functions.every(f=>f.after_body_matches&&f.protection_matches));
  assert(after.columns.every(c=>c.matches)); assert(after.policies.every(p=>p.matches)); assert.equal(after.policies.length,17);
  assert(after.triggers.every(t=>t.matches)); assert.equal(after.checks.m01_m06_prerequisites_match,true);
  assert.deepEqual(after.unchanged_table_fingerprints,before.unchanged_table_fingerprints);
  assert.equal(compareM07Reports(before,after).matches,true);
  assert.equal(compareM07Reports(initial,after).matches,true);
  assert(Object.values(after.limits).every(v=>v===false));
  for(const secret of ["SECRET_M07B_ROW_TITLE","cs_SECRET_M07B","d7070707-0707-4707-8707-070707070707"])assert(!JSON.stringify(after).includes(secret));
  assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n,0);
  assert.equal((await inspectGate(db)).gate_disabled,true);
  assert.equal(buildM07Verification(),sql);
});

test("M07B refuses an altered M01 prerequisite and mixed pre/post routine bodies", async t => {
  const {db} = await fixture(t);
  const old = (await db.query("select pg_get_functiondef('private.list_admin_announcements_v1(jsonb)'::regprocedure) d")).rows[0].d;
  await db.exec(trashMigration);
  await db.exec(old);
  const mixed = await inspect(db); review(mixed);
  assert.equal(mixed.checks.functions_after_match,false);
  assert.equal(mixed.checks.functions_before_match,false);
  await db.exec("alter function private.require_admin_context_v1() set timezone='Europe/Rome'");
  assert.equal((await inspect(db)).checks.m01_m06_prerequisites_match,false);
});

test("M07B reports additional overloads, procedures, aggregates and the absent target snapshot without invoking them", async t => {
  const {db} = await fixture(t);
  await db.exec(`create function private.sync_published_profile_snapshot_v1(uuid) returns void language plpgsql as $$begin raise exception 'MUST_NOT_CALL'; end$$;
    revoke all on function private.sync_published_profile_snapshot_v1(uuid) from public;
    create function public.record_priority_checkout_session_v1(text) returns jsonb language plpgsql as $$begin raise exception 'MUST_NOT_CALL'; end$$;
    create procedure public.notification_target_ref(text) language plpgsql as $$begin raise exception 'MUST_NOT_CALL'; end$$;
    create aggregate public.get_notifications_v1(bigint)(sfunc=int8pl,stype=bigint,initcond='0');`);
  const r = await inspect(db); review(r);
  assert.equal(r.unexpected_routines.length,4);
  assert(r.unexpected_routines.some(f=>f.kind==='a'&&f.actual_md5===null));
  assert(r.unexpected_routines.some(f=>f.kind==='p'));
  assert.equal(r.checks.routine_identities_match,false);
});

test("M07B rejects function grants and inherited effective access drift even with an unchanged body", async t => {
  const {db} = await fixture(t,{apply:true});
  const before = await inspect(db);
  await db.exec("grant execute on function private.notification_target_ref(uuid,uuid,text) to authenticated");
  const r = await inspect(db); review(r);
  const changed = r.functions.find(f=>f.name==='notification_target_ref');
  assert.equal(changed.actual_md5,before.functions.find(f=>f.name==='notification_target_ref').actual_md5);
  assert.equal(changed.protection_matches,false);
  await db.exec("revoke execute on function private.notification_target_ref(uuid,uuid,text) from authenticated;grant authenticated to anon");
  review(await inspect(db));
  assert.equal((await inspect(db)).functions.find(f=>f.name==='moderate_admin_announcement_v1').protection_matches,false);
});

test("M07B refuses consumer triggers on additional tables outside the 33-table inventory", async t => {
  const {db} = await fixture(t,{apply:true});
  await db.exec("create table private.synthetic_trigger_context(id integer);create trigger synthetic_context after insert on private.synthetic_trigger_context for each row execute function private.notify_announcement_v1()");
  const r = await inspect(db); review(r);
  assert.equal(r.checks.consumer_triggers_after_match,false);
  assert.equal(r.unexpected_consumer_triggers.length,1);
  assert.equal(r.unexpected_consumer_triggers[0].table_name,"synthetic_trigger_context");
});

test("M07B checks both new column defaults and column grants independently of normalized fingerprints", async t => {
  const {db} = await fixture(t,{apply:true});
  const before = await inspect(db);
  await db.exec("grant update(eliminato_il) on public.annuncio to authenticated");
  let r = await inspect(db); review(r); assert.equal(r.checks.columns_match,false);
  assert.equal(row(r,"annuncio").columns_md5,row(before,"annuncio").columns_md5);
  await db.exec("revoke update(eliminato_il) on public.annuncio from authenticated;alter table public.annuncio alter column eliminato_il set default now()");
  r = await inspect(db); review(r); assert.equal(r.checks.columns_match,false);
});

test("M07B validates restrictive policy roles, expression and command separately from exclusions", async t => {
  const {db} = await fixture(t,{apply:true});
  const before = await inspect(db);
  await db.exec("drop policy not_trashed_v1 on public.annuncio_generico;create policy not_trashed_v1 on public.annuncio_generico as permissive for select to public using(true)");
  const r = await inspect(db); review(r); assert.equal(r.checks.policies_match,false);
  assert.equal(row(r,"annuncio_generico").policies_md5,row(before,"annuncio_generico").policies_md5);
});

test("M07B detects wrong triggers, a substitute index and an unvalidated constraint", async t => {
  const {db} = await fixture(t,{apply:true});
  await db.exec("alter table public.annuncio_generico disable trigger admin_lock_parent_v1");
  assert.equal((await inspect(db)).checks.triggers_match,false);
  await db.exec("alter table public.annuncio_generico enable trigger admin_lock_parent_v1;drop index public.annuncio_admin_trash_order_v1_idx;create index annuncio_admin_trash_order_v1_idx on public.annuncio(uuid)");
  assert.equal((await inspect(db)).checks.index_match,false);
  await db.exec("alter table public.annuncio drop constraint annuncio_trash_metadata_v1;alter table public.annuncio add constraint annuncio_trash_metadata_v1 check(eliminato_il is null) not valid");
  assert.equal((await inspect(db)).checks.constraint_match,false);
});

test("M07B never infers a gate value and the separate post-install check detects activation", async t => {
  const {db} = await fixture(t,{apply:true});
  assert.equal((await inspectGate(db)).gate_disabled,true);
  await db.exec("update private.admin_trash_release_v1 set enabled=true");
  const r = await inspect(db);
  assert.equal(r.status,"m07_structurally_verified_gate_unread");
  assert.equal(r.limits.gate_value_read,false); assert.equal(r.limits.gate_disabled_verified,false);
  assert.equal((await inspectGate(db)).gate_disabled,false);
  await db.exec("grant select on private.admin_trash_release_v1 to service_role");
  assert.equal((await inspect(db)).checks.gate_catalog_match,false);
  await db.exec("revoke select on private.admin_trash_release_v1 from service_role;alter table private.admin_trash_release_v1 disable row level security");
  assert.equal((await inspect(db)).checks.gate_catalog_match,false);
});

test("M07B reports gate/index name collisions with incompatible relation kinds without failing introspection", async t => {
  const {db} = await fixture(t);
  await db.exec("create sequence private.admin_trash_release_v1;create view public.annuncio_admin_trash_order_v1_idx as select 1 as synthetic");
  const r = await inspect(db); review(r);
  assert.equal(r.gate_catalog.present,true); assert.equal(r.gate_catalog.matches,false);
  assert.equal(r.checks.index_match,false);
});

test("M07B retains all other table and trigger changes in the mandatory external comparison", async t => {
  const {db} = await fixture(t,{apply:true}); const before = await inspect(db);
  await db.exec(`alter table public.annuncio add column synthetic_m07b text;
    grant update(synthetic_m07b) on public.annuncio to authenticated;
    create policy synthetic_m07b on public.annuncio as restrictive for select to authenticated using(false);
    create index synthetic_m07b on public.annuncio(synthetic_m07b);
    alter table public.annuncio add constraint synthetic_m07b check(synthetic_m07b is null);
    grant execute on function private.stamp_annuncio_visibility_update() to service_role;`);
  const after = await inspect(db); const result = compareM07Reports(before,after);
  assert.equal(result.matches,false); assert.equal(result.matchedTables,32);
  for(const field of ["columns_md5","policies_md5","indexes_md5","constraints_md5","triggers_md5"])assert(result.differences.some(d=>d.field===field),field);
  assert.equal(after.limits.external_table_comparison_completed,false);
  const missing = structuredClone(after); missing.unchanged_table_fingerprints.pop();
  assert.throws(()=>compareM07Reports(before,missing),/ALL_33/);
  const duplicate = structuredClone(after); duplicate.unchanged_table_fingerprints[1]=duplicate.unchanged_table_fingerprints[0];
  assert.throws(()=>compareM07Reports(before,duplicate),/DUPLICATE/);
});

test("M07 reviewed payment overloads preserve privacy and both checkout session overloads reject trash", async t => {
  const h = await fixture(t,{apply:true}); const {db} = h; await h.reset();
  await db.exec("update private.admin_trash_release_v1 set enabled=true");
  for(const [n,legacy] of [[9910,false],[9911,true]]) {
    await h.insert(n,{status:"in_attesa_pagamento",private:true}); await h.child(id(n),"annuncio_giocatore");
    await db.query("update public.annuncio set livello_annuncio='prioritario' where uuid=$1",[id(n)]);
    await db.query("insert into private.announcement_submission(submission_id,announcement_id,utente_id,requested_visibility) values($1,$2,$3,'prioritario')",[id(n+1000),id(n),actor.authorId]);
    const d = await h.detail(id(n)); assert.equal((await h.moderate(id(n),"trash",d.contentFingerprint,"Review")).status,"ok");
    const base = [id(n),id(n+1000)];
    const payment = legacy ? "select public.record_priority_checkout_event_v1($1::uuid,$2::uuid,'cs_legacy','price_test','complete','paid','pi_legacy',true)"
      : "select public.record_priority_checkout_event_v1($1::uuid,$2::uuid,'cs_modern','price_test',799,799,'complete','paid','pi_modern',true)";
    await h.callAs("service_role",{role:"service_role"},payment,base);
    const record = (await db.query("select privato,nascosto,oscurato_da_admin,eliminato_il,stato_annuncio from public.annuncio where uuid=$1",[id(n)])).rows[0];
    assert(record.privato&&record.nascosto&&record.oscurato_da_admin&&record.eliminato_il);
    assert.equal(record.stato_annuncio,"in_revisione");
    for(const statement of ["select public.record_priority_checkout_session_v1($1::uuid,$2::uuid,'cs_new','price_test',799,799,'open','unpaid',2)",
      "select public.record_priority_checkout_session_v1($1::uuid,$2::uuid,'cs_new','price_test','open','unpaid',2)"]) {
      await assert.rejects(h.callAs("service_role",{role:"service_role"},statement,base),/ANNOUNCEMENT_TRASH_PROTECTED/);
    }
  }
});

test("M07 preserves the existing seven-argument checkout behavior outside trash without silently repairing its source", async t => {
  const h = await fixture(t); const {db} = h;
  await h.reset(); await h.insert(9920,{status:"in_attesa_pagamento"});
  await db.query("insert into private.announcement_submission(submission_id,announcement_id,utente_id,requested_visibility) values($1,$2,$3,'prioritario')",[id(10920),id(9920),actor.authorId]);
  const call = ()=>h.callAs("service_role",{role:"service_role"},"select public.record_priority_checkout_session_v1($1::uuid,$2::uuid,'cs_existing','price_test','open','unpaid',1)",[id(9920),id(10920)]);
  await assert.rejects(call(),/function pg_catalog.greatest\(integer, integer\) does not exist/);
  await db.exec(trashMigration);
  await assert.rejects(call(),/function pg_catalog.greatest\(integer, integer\) does not exist/);
  assert.equal((await inspect(db)).status,"m07_structurally_verified_gate_unread");
  assert.equal(m07Manifest.functions.filter(f=>f.name==='record_priority_checkout_session_v1').length,2);
});

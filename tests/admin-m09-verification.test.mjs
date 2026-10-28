import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from './helpers/pglite.mjs';
import { createM07InspectionFixture } from './helpers/admin-m07-inspection-fixture.mjs';
import { buildM09Verification } from '../scripts/dashboard-integration/build-m09-verification.mjs';
import { compareM09Reports } from '../scripts/dashboard-integration/compare-m09-reports.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/scripts/dashboard_admin_verify_m09.sql');
const migration=read('../supabase/migrations/20261024211431_admin_audit_reads.sql');
const inspect=async db=>(await db.exec(sql)).find(r=>r.rows?.[0]?.m09_report).rows[0].m09_report;
async function fixture(t,apply=false){
  const h=await createM07InspectionFixture({apply:true});t.after(()=>h.db.close());
  await h.db.exec(read('../supabase/migrations/20261024205423_admin_announcement_export.sql'));
  if(apply)await h.db.exec(migration);return h;
}
test('M09 missing prerequisites stay read only and preserve session settings',async t=>{
  const db=await PGlite.create();t.after(()=>db.close());
  await db.exec("set search_path=public;set statement_timeout='23s';set lock_timeout='7s'");
  const r=await inspect(db);assert.equal(r.status,'m09_prerequisites_or_drift_require_review');assert.equal(r.transaction_read_only,'on');
  assert.deepEqual((await db.query("select current_setting('search_path') s,current_setting('statement_timeout') t,current_setting('lock_timeout') l,current_setting('transaction_read_only') r")).rows[0],{s:'public',t:'23s',l:'7s',r:'off'});
});
test('M09 recognizes CRLF bodies and its single new index while preserving all other catalog fingerprints',async t=>{
  const {db}=await fixture(t);const before=await inspect(db);assert.equal(before.status,'ready_for_m09_catalog_checks_only');
  await db.exec(migration.replaceAll('\r\n','\n').replaceAll('\n','\r\n'));
  const after=await inspect(db);assert.equal(after.status,'m09_structurally_verified');
  assert.equal(after.functions.length,4);assert(after.functions.every(f=>f.after_body_matches&&f.protection_matches));
  assert(after.checks.direct_api_select_denied);assert(compareM09Reports(before,after).matches);
  assert(Object.values(after.limits).every(v=>v===false));
  assert.equal((await db.query('select count(*)::int n from private.admin_audit_event_v1')).rows[0].n,0);
  await db.exec('update private.admin_trash_release_v1 set enabled=true');
  assert.equal((await inspect(db)).status,'m09_structurally_verified');
  assert.equal(buildM09Verification(),sql);
});
test('M09 rejects effective function grants and direct column access to Auth or audit',async t=>{
  const {db}=await fixture(t,true);
  await db.exec('grant select(email) on auth.users to authenticated');
  assert.equal((await inspect(db)).checks.direct_api_select_denied,false);
  await db.exec('revoke select(email) on auth.users from authenticated;grant select(action) on private.admin_audit_event_v1 to anon');
  assert.equal((await inspect(db)).checks.direct_api_select_denied,false);
  await db.exec('revoke select(action) on private.admin_audit_event_v1 from anon;grant execute on function public.admin_get_audit_event_v1(uuid) to service_role');
  const r=await inspect(db);assert.match(r.status,/require_review$/);
  assert.equal(r.functions.find(f=>f.name==='admin_get_audit_event_v1').protection_matches,false);
});
test('M09 rejects a partial state and a substitute audit index excluded from cumulative counts',async t=>{
  const {db}=await fixture(t);
  await db.exec('create index admin_audit_event_auth_time_v1 on private.admin_audit_event_v1(action)');
  let r=await inspect(db);assert.equal(r.status,'m09_partial_or_drift_require_review');assert.equal(r.index.matches,false);
  await db.exec('drop index private.admin_audit_event_auth_time_v1');await db.exec(migration);
  await db.exec('drop function public.admin_get_audit_event_v1(uuid)');
  r=await inspect(db);assert.equal(r.status,'m09_partial_or_drift_require_review');
});
test('M09 reports additional overloads procedures and aggregates without invoking them',async t=>{
  const {db}=await fixture(t,true);
  await db.exec("create function public.admin_get_audit_event_v1(text) returns void language plpgsql as $$begin raise exception 'MUST_NOT_CALL'; end$$;create procedure private.admin_list_audit_events_v1(text) language plpgsql as $$begin raise exception 'MUST_NOT_CALL'; end$$;create aggregate public.admin_get_audit_event_v1(bigint)(sfunc=int8pl,stype=bigint,initcond='0')");
  const r=await inspect(db);assert.match(r.status,/require_review$/);assert.equal(r.unexpected_routines.length,3);
});
test('M09 compares audit/Auth metadata and M08 routines without accepting incomplete support evidence',async t=>{
  const {db}=await fixture(t,true);const before=await inspect(db);
  await db.exec('alter table auth.users add column synthetic_m09 text;alter function private.export_admin_announcements_v1(jsonb,jsonb) set timezone=\'Europe/Rome\'');
  const after=await inspect(db),comparison=compareM09Reports(before,after);
  assert.equal(comparison.matches,false);assert(comparison.supportTableDifferences.some(d=>d.identity==='auth.users'));
  assert(comparison.unchangedRoutineDifferences.some(d=>d.identity==='private.export_admin_announcements_v1(jsonb,jsonb)'));
  assert.equal(after.checks.m01_m08_catalog_matches,false);
  const missing=structuredClone(after);missing.support_table_fingerprints.pop();assert.throws(()=>compareM09Reports(before,missing),/BOTH_SUPPORT/);
  const duplicate=structuredClone(after);duplicate.support_table_fingerprints[1]=duplicate.support_table_fingerprints[0];assert.throws(()=>compareM09Reports(before,duplicate),/INVALID_SUPPORT/);
});

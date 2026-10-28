import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from './helpers/pglite.mjs';
import { createM07InspectionFixture } from './helpers/admin-m07-inspection-fixture.mjs';
import { buildM10Verification } from '../scripts/dashboard-integration/build-m10-verification.mjs';
import { compareM10Reports } from '../scripts/dashboard-integration/compare-m10-reports.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const sql=read('../supabase/scripts/dashboard_admin_verify_m10.sql');
const migration=read('../supabase/migrations/20261024212824_admin_home_aggregations.sql');
const inspect=async db=>(await db.exec(sql)).find(r=>r.rows?.[0]?.m10_report).rows[0].m10_report;
async function fixture(t,apply=false){
  const h=await createM07InspectionFixture({apply:true});t.after(()=>h.db.close());
  for(const p of ['../supabase/migrations/20261024205423_admin_announcement_export.sql','../supabase/migrations/20261024211431_admin_audit_reads.sql'])await h.db.exec(read(p));
  await h.db.exec('alter table public.profilo add column tipologia_principale text');
  if(apply)await h.db.exec(migration);return h;
}
test('M10 missing prerequisites stay read only without altering session settings',async t=>{
  const db=await PGlite.create();t.after(()=>db.close());
  await db.exec("set search_path=public;set statement_timeout='23s';set lock_timeout='7s'");
  assert.equal((await inspect(db)).status,'m10_prerequisites_or_drift_require_review');
  assert.deepEqual((await db.query("select current_setting('search_path') s,current_setting('statement_timeout') t,current_setting('lock_timeout') l,current_setting('transaction_read_only') r")).rows[0],{s:'public',t:'23s',l:'7s',r:'off'});
});
test('M10 recognizes exact CRLF STABLE functions and preserves every other catalog fingerprint',async t=>{
  const {db}=await fixture(t);const before=await inspect(db);assert.equal(before.status,'ready_for_m10_catalog_checks_only');
  await db.exec(migration.replaceAll('\r\n','\n').replaceAll('\n','\r\n'));
  const after=await inspect(db);assert.equal(after.status,'m10_structurally_verified');
  assert.equal(after.functions.length,4);assert(after.functions.every(f=>f.after_body_matches&&f.protection_matches));
  assert.equal(after.source_columns.length,12);assert(after.source_columns.every(c=>c.matches));
  assert(compareM10Reports(before,after).matches);assert(Object.values(after.limits).every(v=>v===false));
  assert.equal((await db.query('select count(*)::int n from private.admin_audit_event_v1')).rows[0].n,0);
  await db.exec('update private.admin_trash_release_v1 set enabled=true');
  assert.equal((await inspect(db)).status,'m10_structurally_verified');assert.equal(buildM10Verification(),sql);
});
test('M10 rejects missing or incompatible metric source columns',async t=>{
  const {db}=await fixture(t);
  await db.exec('alter table public.profilo alter column tipologia_principale type integer using null');
  let r=await inspect(db);assert.equal(r.status,'m10_prerequisites_or_drift_require_review');
  assert.equal(r.source_columns.find(c=>c.column_name==='tipologia_principale').matches,false);
  await db.exec('alter table public.profilo drop column tipologia_principale');
  r=await inspect(db);assert.equal(r.checks.source_columns_match,false);
});
test('M10 rejects changed volatility, technical EXECUTE access and partial installation',async t=>{
  const {db}=await fixture(t,true);
  await db.exec('alter function public.admin_get_home_summary_v1() volatile');
  let r=await inspect(db);assert.match(r.status,/require_review$/);assert.equal(r.functions.find(f=>f.name==='admin_get_home_summary_v1').protection_matches,false);
  await db.exec('alter function public.admin_get_home_summary_v1() stable;grant execute on function public.admin_get_home_summary_v1() to service_role');
  r=await inspect(db);assert.match(r.status,/require_review$/);
  await db.exec('revoke execute on function public.admin_get_home_summary_v1() from service_role;drop function public.admin_get_home_chart_v1(text)');
  assert.equal((await inspect(db)).status,'m10_partial_or_drift_require_review');
});
test('M10 identifies extra overloads procedures and aggregates without executing them',async t=>{
  const {db}=await fixture(t,true);
  await db.exec("create function public.admin_get_home_summary_v1(text) returns void language plpgsql as $$begin raise exception 'MUST_NOT_CALL'; end$$;create procedure private.admin_get_home_summary_v1(text) language plpgsql as $$begin raise exception 'MUST_NOT_CALL'; end$$;create aggregate public.admin_get_home_summary_v1(bigint)(sfunc=int8pl,stype=bigint,initcond='0')");
  const r=await inspect(db);assert.match(r.status,/require_review$/);assert.equal(r.unexpected_routines.length,3);
});
test('M10 retains changes to M09 functions and Auth metadata in mandatory external comparisons',async t=>{
  const {db}=await fixture(t,true);const before=await inspect(db);
  await db.exec("alter function public.admin_get_audit_event_v1(uuid) set timezone='Europe/Rome';alter table auth.users add column synthetic_m10 text");
  const after=await inspect(db),comparison=compareM10Reports(before,after);
  assert.equal(comparison.matches,false);assert.equal(after.checks.m01_m09_catalog_matches,false);
  assert(comparison.supportTableDifferences.some(d=>d.identity==='auth.users'));
  assert(comparison.unchangedRoutineDifferences.some(d=>d.identity==='public.admin_get_audit_event_v1(uuid)'));
  const incomplete=structuredClone(after);incomplete.unchanged_table_fingerprints.pop();assert.throws(()=>compareM10Reports(before,incomplete),/ALL_33/);
  const duplicate=structuredClone(after);duplicate.support_table_fingerprints[1]=duplicate.support_table_fingerprints[0];assert.throws(()=>compareM10Reports(before,duplicate),/INVALID_SUPPORT/);
});

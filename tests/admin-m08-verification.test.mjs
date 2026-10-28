import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from './helpers/pglite.mjs';
import { createM07InspectionFixture } from './helpers/admin-m07-inspection-fixture.mjs';
import { buildM08Verification } from '../scripts/dashboard-integration/build-m08-verification.mjs';
import { compareM08Reports } from '../scripts/dashboard-integration/compare-m08-reports.mjs';

const sql=readFileSync(new URL('../supabase/scripts/dashboard_admin_verify_m08.sql',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261024205423_admin_announcement_export.sql',import.meta.url),'utf8');
const inspect=async db=>(await db.exec(sql)).find(r=>r.rows?.[0]?.m08_report).rows[0].m08_report;
async function fixture(t,apply=false) {
  const h=await createM07InspectionFixture({apply:true});t.after(()=>h.db.close());
  if(apply) await h.db.exec(migration);
  return h;
}

test('M08 missing prerequisites fail read only without creating schemas or changing session settings',async t=>{
  const db=await PGlite.create();t.after(()=>db.close());
  await db.exec("set search_path=public;set statement_timeout='23s';set lock_timeout='7s'");
  const r=await inspect(db);
  assert.equal(r.status,'m08_prerequisites_or_drift_require_review');
  assert.equal(r.transaction_read_only,'on');assert.equal(r.unchanged_table_fingerprints.length,33);
  assert.deepEqual((await db.query("select current_setting('search_path') s,current_setting('statement_timeout') t,current_setting('lock_timeout') l,current_setting('transaction_read_only') r")).rows[0],{s:'public',t:'23s',l:'7s',r:'off'});
  assert.equal((await db.query("select count(*)::int n from pg_namespace where nspname='private'")).rows[0].n,0);
});

test('M08 recognizes exact before/after CRLF bodies, preserves all tables and unrelated routines and never reads audit or gate rows',async t=>{
  const {db}=await fixture(t);
  const before=await inspect(db);assert.equal(before.status,'ready_for_m08_catalog_checks_only');
  assert.equal(before.checks.named_routine_count,1);
  await db.exec(migration.replaceAll('\r\n','\n').replaceAll('\n','\r\n'));
  const after=await inspect(db);assert.equal(after.status,'m08_structurally_verified');
  assert.equal(after.checks.named_routine_count,3);assert(after.functions.every(f=>f.after_body_matches&&f.protection_matches));
  assert(Object.values(after.limits).every(v=>v===false));
  assert(compareM08Reports(before,after).matches);
  assert.equal((await db.query('select count(*)::int n from private.admin_audit_event_v1')).rows[0].n,0);
  await db.exec('update private.admin_trash_release_v1 set enabled=true');
  assert.equal((await inspect(db)).status,'m08_structurally_verified');
  assert.equal(buildM08Verification(),sql);
});

test('M08 refuses altered audit bodies and export execution grants',async t=>{
  const {db}=await fixture(t,true);
  await db.exec('grant execute on function public.admin_export_announcements_v1(jsonb,jsonb) to anon');
  let r=await inspect(db);assert.match(r.status,/require_review$/);
  assert.equal(r.functions.find(f=>f.name==='admin_export_announcements_v1').protection_matches,false);
  await db.exec("revoke execute on function public.admin_export_announcements_v1(jsonb,jsonb) from anon;create or replace function private.admin_audit_payload_valid_v1(p_action text,p_outcome text,p_reason text,p_failure_code text,p_changes jsonb,p_details jsonb) returns boolean language sql as $$select true$$");
  r=await inspect(db);assert.match(r.status,/require_review$/);assert.equal(r.checks.m01_m07_catalog_matches,false);
});

test('M08 identifies unexpected overloads, procedures and aggregates without calling them',async t=>{
  const {db}=await fixture(t,true);
  await db.exec("create function public.admin_export_announcements_v1(text) returns void language plpgsql as $$begin raise exception 'MUST_NOT_CALL'; end$$;create procedure private.export_admin_announcements_v1(text) language plpgsql as $$begin raise exception 'MUST_NOT_CALL'; end$$;create aggregate public.export_admin_announcements_v1(bigint)(sfunc=int8pl,stype=bigint,initcond='0')");
  const r=await inspect(db);assert.match(r.status,/require_review$/);
  assert.equal(r.unexpected_routines.length,3);assert.equal(r.checks.routine_identities_match,false);
});

test('M08 external comparison detects unrelated functions, grants and additional table columns',async t=>{
  const {db}=await fixture(t,true);const before=await inspect(db);
  await db.exec("grant execute on function private.stamp_annuncio_visibility_update() to service_role;alter table public.annuncio add column synthetic_m08 text");
  const after=await inspect(db);const result=compareM08Reports(before,after);
  assert.equal(result.matches,false);assert.equal(result.tableComparison.matchedTables,32);
  assert(result.unchangedRoutineDifferences.some(d=>d.identity==='private.stamp_annuncio_visibility_update()'));
  const missing=structuredClone(after);missing.unchanged_table_fingerprints.pop();
  assert.throws(()=>compareM08Reports(before,missing),/ALL_33/);
  const duplicate=structuredClone(after);duplicate.unchanged_routine_fingerprints.push(duplicate.unchanged_routine_fingerprints[0]);
  assert.throws(()=>compareM08Reports(before,duplicate),/DUPLICATE_ROUTINE/);
});

test('M08 rejects a partial installation and a missing M07 policy',async t=>{
  const {db}=await fixture(t,true);
  await db.exec('drop function public.admin_export_announcements_v1(jsonb,jsonb)');
  assert.equal((await inspect(db)).status,'m08_partial_or_drift_require_review');
  await db.exec('drop policy not_trashed_v1 on public.annuncio_generico');
  assert.equal((await inspect(db)).status,'m08_prerequisites_or_drift_require_review');
});

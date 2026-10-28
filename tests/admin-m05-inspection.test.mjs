import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "./helpers/pglite.mjs";
import { createDetailFixture, detailMigration } from "./helpers/admin-announcement-detail-fixture.mjs";
import { listId } from "./helpers/admin-announcements-fixture.mjs";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const inspection = readFileSync(new URL("../supabase/scripts/dashboard_admin_check_m05.sql", import.meta.url), "utf8");
const readMigration = name => readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
const inspect = async db => (await db.exec(inspection)).find(result => result.rows?.[0]?.m05_report).rows[0].m05_report;
const protections = report => Object.fromEntries(report.table_protections.map(row => [row.table_name, row.protection_md5]));
const { parseDetailResponse } = adminServerLoader()("apps/admin/src/features/annunci/server/detail-response.ts");
async function nativeTemporalColumns(db) {
  for (const table of ["annuncio_squadra_cerca_staff", "annuncio_squadra_cerca_partita"]) {
    await db.exec(`alter table public.${table}
      alter column periodo_dal type date using periodo_dal::date,
      alter column periodo_al type date using periodo_al::date`);
  }
  await db.exec(`alter table public.annuncio_squadra_cerca_partita
    alter column orario_dalle type time(6) without time zone using orario_dalle::time,
    alter column orario_alle type time(6) without time zone using orario_alle::time`);
}
async function fixture(t, apply = false) {
  const h = await createDetailFixture({ apply: false });
  t.after(() => h.db.close());
  await h.db.exec(readMigration("20261024104822_admin_audit_foundation"));
  await h.db.exec(readMigration("20261024110910_admin_audit_server_bridge"));
  if (apply) await h.db.exec(detailMigration);
  return h;
}

test("M05 missing prerequisites returns metadata and restores transaction settings", async t => {
  const db = await PGlite.create(); t.after(() => db.close());
  await db.exec("set statement_timeout='23s'; set search_path=public");
  const report = await inspect(db);
  assert.equal(report.status, "prerequisites_require_review");
  assert.equal(report.checks.m05_named_objects, 0);
  assert.equal(report.table_protections.length, 25);
  assert.equal(report.required_columns.length, 166);
  assert.equal(report.detail_uniqueness.length, 11);
  assert(report.required_columns.every(row => !row.matches));
  assert.equal(report.transaction_read_only, "on");
  assert.deepEqual((await db.query("select current_setting('statement_timeout') st,current_setting('search_path') sp,current_setting('transaction_read_only') ro")).rows[0], { st: "23s", sp: "public", ro: "off" });
  assert.equal((await db.query("select count(*)::int n from pg_namespace where nspname='private'")).rows[0].n, 0);
});

test("M05 CRLF pre/postcheck verifies six functions and preserves all 25 table protections", async t => {
  const { db, reset, insert } = await fixture(t);
  await reset();
  await insert(9100, { title: "SYNTHETIC_DETAIL_SECRET_NEVER_REPORTED" });
  await db.exec(`insert into private.admin_audit_event_v1(correlation_uuid,occurred_at,action,resource_type,outcome,failure_code)
    values('b5b5b5b5-b5b5-45b5-85b5-b5b5b5b5b5b5','2020-01-01','auth.access_denied','session','failure','ACCESS_DENIED')`);
  const before = await inspect(db);
  assert.equal(before.status, "ready_for_m05_catalog_checks_only");
  assert.equal(before.checks.m05_named_objects, 0);
  assert(before.required_columns.every(row => row.matches));
  assert(before.detail_uniqueness.every(row => row.matches));
  await db.exec(detailMigration.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n"));
  const after = await inspect(db);
  assert.equal(after.status, "m05_structurally_verified");
  assert.equal(after.checks.m05_named_objects, 6);
  assert(after.functions.every(fn => fn.matches));
  for (const fn of after.functions) {
    const human = ["admin_get_announcement_v1", "get_admin_announcement_v1"].includes(fn.name);
    for (const grant of fn.effective_execute) assert.equal(grant.execute, human && grant.role === "authenticated");
  }
  assert.deepEqual(after.table_protections, before.table_protections);
  assert(!JSON.stringify(after).includes("SYNTHETIC_DETAIL_SECRET_NEVER_REPORTED"));
  assert(!JSON.stringify(after).includes("b5b5b5b5-b5b5-45b5-85b5-b5b5b5b5b5b5"));
  assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, 1);
  assert(Object.values(after.limits).every(value => value === false));
});

test("M05 checks source fields, compatible numeric/text types and M03/M04 dependencies", async t => {
  const { db } = await fixture(t);
  await db.exec("alter table public.annuncio_creator rename column contenuto_post to old_content");
  assert.equal((await inspect(db)).status, "prerequisites_require_review");
  await db.exec("alter table public.annuncio_creator rename column old_content to contenuto_post; alter table public.annuncio_squadra_cerca_giocatore alter column annata_da type text using annata_da::text");
  const wrongType = await inspect(db);
  assert.equal(wrongType.checks.source_schema_matches, false);
  assert.equal(wrongType.required_columns.find(row => row.table_name === "annuncio_squadra_cerca_giocatore" && row.column_name === "annata_da").actual_type, "text");
  await db.exec("alter table public.annuncio_squadra_cerca_giocatore alter column annata_da type integer using annata_da::integer; alter table public.annuncio_creator alter column contenuto_post type varchar(4000)");
  assert.equal((await inspect(db)).status, "ready_for_m05_catalog_checks_only");
  await db.exec("alter index public.annuncio_admin_order_v1_idx rename to old_list_index");
  assert.equal((await inspect(db)).checks.m05_prerequisites_match, false);
  await db.exec("alter index public.old_list_index rename to annuncio_admin_order_v1_idx; drop function public.admin_record_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)");
  assert.equal((await inspect(db)).checks.m05_prerequisites_match, false);
});

test("M05 accepts the six native date/time source columns before and after installation", async t => {
  const { db } = await fixture(t);
  await nativeTemporalColumns(db);
  const before = await inspect(db);
  assert.equal(before.status, "ready_for_m05_catalog_checks_only");
  assert.equal(before.checks.m05_prerequisites_match, true);
  assert.equal(before.checks.m05_named_objects, 0);
  assert.equal(before.required_columns.length, 166);
  assert(before.required_columns.every(row => row.matches));
  const temporal = before.required_columns.filter(row => ["date", "time(6) without time zone"].includes(row.actual_type));
  assert.equal(temporal.length, 6);
  assert.equal(temporal.filter(row => row.actual_type === "date").length, 4);
  await db.exec(detailMigration);
  const after = await inspect(db);
  assert.equal(after.status, "m05_structurally_verified");
  assert.equal(after.checks.m05_named_objects, 6);
  assert.deepEqual(after.table_protections, before.table_protections);
  assert.equal(after.table_protections.length, 25);
  assert.equal(after.limits.application_functions_called, false);
  assert.equal(after.limits.application_rows_read, false);
});

test("native dates and fractional times roundtrip through the unchanged SQL and detail DTO", async t => {
  const h = await fixture(t);
  await nativeTemporalColumns(h.db);
  await h.db.exec(detailMigration);
  for (const datestyle of ["ISO, MDY", "German, DMY"]) {
    await h.db.query("select set_config('DateStyle',$1,false)", [datestyle]);
    for (const type of ["annuncio_squadra_cerca_staff", "annuncio_squadra_cerca_partita"]) {
      for (const nullable of [false, true]) {
        await h.reset();
        const id = listId(9200);
        const values = { periodo_dal: nullable ? null : "2028-02-29", periodo_al: nullable ? null : "2028-03-01" };
        if (type === "annuncio_squadra_cerca_partita") Object.assign(values, {
          orario_dalle: nullable ? null : "09:30:00.123456", orario_alle: nullable ? null : "11:00:00",
        });
        await h.insert(9200, { type });
        await h.child(id, type, values);
        const detail = parseDetailResponse(await h.detail(id), id);
        for (const [key, value] of Object.entries(values)) assert.equal(detail.content.fields[key], value);
        assert.equal(detail.complete, true);
        assert.deepEqual(detail.issues, []);
      }
    }
  }
});

test("M05 temporal compatibility excludes timestamps, timezone-bearing times and unrelated text fields", async t => {
  const { db } = await fixture(t);
  await nativeTemporalColumns(db);
  for (const [table, column, wrongType, restoreType] of [
    ["annuncio_squadra_cerca_staff", "periodo_dal", "timestamp with time zone", "date"],
    ["annuncio_squadra_cerca_partita", "orario_dalle", "time with time zone", "time without time zone"],
    ["annuncio_creator", "titolo_post", "date", "text"],
    ["annuncio_creator", "contenuto_post", "time without time zone", "text"],
  ]) {
    await db.exec(`alter table public.${table} alter column ${column} type ${wrongType} using null::${wrongType}`);
    const result = await inspect(db);
    assert.equal(result.status, "prerequisites_require_review");
    assert.equal(result.required_columns.find(row => row.table_name === table && row.column_name === column).matches, false);
    await db.exec(`alter table public.${table} alter column ${column} type ${restoreType} using null::${restoreType}`);
    assert.equal((await inspect(db)).status, "ready_for_m05_catalog_checks_only");
  }
});

test("M05 requires full immediate single-key uniqueness on every detail table", async t => {
  const { db } = await fixture(t);
  await db.exec("alter table public.annuncio_creator drop constraint annuncio_creator_pkey");
  const check = async () => {
    const result = await inspect(db);
    assert.equal(result.status, "prerequisites_require_review");
    assert.equal(result.detail_uniqueness.find(row => row.table_name === "annuncio_creator").matches, false);
  };
  await check();
  for (const keys of ["(uuid_annuncio) where titolo_post is not null", "((uuid_annuncio::text))", "(uuid_annuncio,titolo_post)"]) {
    await db.exec(`create unique index synthetic_bad_unique on public.annuncio_creator ${keys}`);
    await check(); await db.exec("drop index public.synthetic_bad_unique");
  }
  await db.exec("alter table public.annuncio_creator add constraint synthetic_deferred unique(uuid_annuncio) deferrable initially deferred");
  await check();
  await db.exec("alter table public.annuncio_creator drop constraint synthetic_deferred; create unique index synthetic_good_unique on public.annuncio_creator(uuid_annuncio) include(titolo_post)");
  assert.equal((await inspect(db)).status, "ready_for_m05_catalog_checks_only");
});

test("M05 detects partial installation, overloads, definition and operational-setting drift", async t => {
  const { db } = await fixture(t);
  await db.exec("create function private.admin_announcement_detail_spec_v1(text) returns jsonb language sql set search_path='' as $$select '{}'::jsonb$$; revoke execute on function private.admin_announcement_detail_spec_v1(text) from public");
  assert.equal((await inspect(db)).status, "m05_partial_or_drift_require_review");
  await db.exec("drop function private.admin_announcement_detail_spec_v1(text)");
  await db.exec(detailMigration);
  await db.exec("create function public.admin_get_announcement_v1(text) returns jsonb language sql as $$select '{}'::jsonb$$; revoke execute on function public.admin_get_announcement_v1(text) from public");
  const overloaded = await inspect(db);
  assert.equal(overloaded.checks.m05_named_objects, 7);
  assert.equal(overloaded.status, "m05_partial_or_drift_require_review");
  await db.exec("drop function public.admin_get_announcement_v1(text); alter function private.admin_announcement_snapshot_v1(uuid) set timezone='Europe/Rome'");
  assert.equal((await inspect(db)).checks.detail_functions_match, false);
  await db.exec("alter function private.admin_announcement_snapshot_v1(uuid) set timezone='UTC'; alter function private.admin_announcement_field_v1(jsonb,text,text) security definer");
  assert.equal((await inspect(db)).checks.detail_functions_match, false);
  await db.exec("alter function private.admin_announcement_field_v1(jsonb,text,text) security invoker; create or replace function public.admin_get_announcement_v1(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select null::jsonb$$");
  assert.equal((await inspect(db)).status, "m05_partial_or_drift_require_review");
});

test("M05 rejects PUBLIC, inherited, grant-option and raw-helper API access", async t => {
  const { db } = await fixture(t, true);
  await db.exec("grant execute on function public.admin_get_announcement_v1(uuid) to public");
  assert.equal((await inspect(db)).checks.detail_functions_match, false);
  await db.exec("revoke execute on function public.admin_get_announcement_v1(uuid) from public; grant execute on function private.admin_announcement_snapshot_v1(uuid) to authenticated");
  assert.equal((await inspect(db)).checks.detail_functions_match, false);
  await db.exec("revoke execute on function private.admin_announcement_snapshot_v1(uuid) from authenticated; create role detail_delegate; grant execute on function private.admin_announcement_field_v1(jsonb,text,text) to detail_delegate; grant detail_delegate to service_role");
  const inherited = await inspect(db);
  assert.equal(inherited.checks.detail_functions_match, false);
  assert.equal(inherited.functions.find(fn => fn.name === "admin_announcement_field_v1").effective_execute.find(role => role.role === "service_role").execute, true);
  await db.exec("revoke execute on function private.admin_announcement_field_v1(jsonb,text,text) from detail_delegate; grant execute on function public.admin_get_announcement_v1(uuid) to authenticated with grant option");
  assert.equal((await inspect(db)).checks.detail_functions_match, false);
  await db.exec("revoke grant option for execute on function public.admin_get_announcement_v1(uuid) from authenticated; revoke usage on schema private from authenticated");
  const noUsage = await inspect(db);
  assert.equal(noUsage.checks.detail_functions_match, true);
  assert.equal(noUsage.checks.m05_prerequisites_match, false);
});

test("M05 fingerprints detect added-detail ACL, column, RLS and policy changes", async t => {
  const { db } = await fixture(t, true);
  const baseline = await inspect(db);
  for (const [change, undo] of [
    ["grant select on public.annuncio_creator to authenticated", "revoke select on public.annuncio_creator from authenticated"],
    ["grant select(contenuto_post) on public.annuncio_creator to authenticated", "revoke select(contenuto_post) on public.annuncio_creator from authenticated"],
    ["alter table public.annuncio_creator disable row level security", "alter table public.annuncio_creator enable row level security"],
    ["create policy synthetic_detail_policy on public.annuncio_creator for select to authenticated using(true)", "drop policy synthetic_detail_policy on public.annuncio_creator"],
    ["alter table public.annuncio_creator add column synthetic_extra text", "alter table public.annuncio_creator drop column synthetic_extra"],
  ]) {
    await db.exec(change);
    const changed = await inspect(db);
    assert.notEqual(protections(changed).annuncio_creator, protections(baseline).annuncio_creator);
    assert.equal(changed.limits.table_protections_compared, false);
    await db.exec(undo);
    assert.deepEqual(protections(await inspect(db)), protections(baseline));
  }
});

test("M05 never invokes altered raw helpers while inspecting their catalog definitions", async t => {
  const { db } = await fixture(t, true);
  await db.exec(`create or replace function private.admin_announcement_detail_spec_v1(p_type text)
    returns jsonb language plpgsql immutable security invoker set search_path='' as $$begin raise exception 'APPLICATION_FUNCTION_WAS_EXECUTED'; end$$`);
  const result = await inspect(db);
  assert.equal(result.status, "m05_partial_or_drift_require_review");
  assert.equal(result.limits.application_functions_called, false);
  assert(!JSON.stringify(result).includes("APPLICATION_FUNCTION_WAS_EXECUTED"));
});

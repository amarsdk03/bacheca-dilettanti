import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "./helpers/pglite.mjs";
import { createAdminDatabaseFixture } from "./helpers/admin-database-fixture.mjs";
import { createHomeFixture } from "./helpers/admin-home-fixture.mjs";

const sql = readFileSync(new URL("../supabase/scripts/dashboard_admin_inspect_baseline.sql", import.meta.url), "utf8");
function block(name) {
  const start = sql.indexOf(`-- ${name}_SQL_BEGIN\n`), end = sql.indexOf(`-- ${name}_SQL_END`);
  assert(start >= 0 && end > start); return sql.slice(start + `-- ${name}_SQL_BEGIN\n`.length, end);
}
const inspect = async db => (await db.exec(sql)).find(result => result.rows?.[0]?.baseline_report)?.rows[0].baseline_report;
const history = async db => (await db.exec(block("OPTIONAL_HISTORY"))).find(result => result.rows?.[0]?.migration_history_report)?.rows[0].migration_history_report;
const catalogSnapshot = async db => (await db.query(`select jsonb_build_object(
  'classes',(select jsonb_agg(row(oid,relname,relowner,relacl,relrowsecurity)::text order by oid) from pg_class),
  'functions',(select jsonb_agg(row(oid,proname,proacl,prosrc,proconfig)::text order by oid) from pg_proc),
  'policies',(select jsonb_agg(row(oid,polname,polqual,polwithcheck)::text order by oid) from pg_policy),
  'triggers',(select jsonb_agg(row(oid,tgname,tgenabled)::text order by oid) from pg_trigger)
) snapshot`)).rows[0].snapshot;

test("baseline script tolerates absent schemas/roles/objects, is read-only and restores session settings", async t => {
  const db = await PGlite.create(); t.after(() => db.close());
  await db.exec("set statement_timeout='21s'; set lock_timeout='7s'; set search_path=public");
  const before = await catalogSnapshot(db), result = await inspect(db);
  assert.equal(result.report_version, 1); assert.equal(result.environment.transaction_read_only, "on");
  assert.equal(result.environment.statement_timeout, "15s"); assert.equal(result.environment.lock_timeout, "3s");
  assert.equal(result.migration_markers.length, 10); assert(result.migration_markers.every(item => item.presence === "markers_absent"));
  assert.equal(result.migration_history.can_read_versions, false); assert.equal(result.migration_history.table_present, false);
  assert.equal(result.limits.migration_application_certified, false);
  assert.deepEqual(await catalogSnapshot(db), before);
  assert.deepEqual((await db.query("select current_setting('transaction_read_only') ro,current_setting('statement_timeout') st,current_setting('lock_timeout') lt,current_setting('search_path') sp")).rows[0], { ro: "off", st: "21s", lt: "7s", sp: "public" });
  assert(sql.indexOf("/*") < sql.indexOf("-- OPTIONAL_HISTORY_SQL_BEGIN"));
});

test("an existing foundation is reported without treating missing history as missing migration", async t => {
  const { db } = await createAdminDatabaseFixture(); t.after(() => db.close());
  const before = await catalogSnapshot(db), result = await inspect(db);
  assert.equal(result.migration_markers[0].presence, "all_markers_present");
  assert(result.migration_markers.slice(1).every(item => item.presence === "markers_absent"));
  assert.match(result.migration_history.status, /not_proof_of_missing_migrations/);
  assert(result.relations.find(item => item.schema === "private" && item.name === "admin_session_policy_v1").rls);
  assert.deepEqual(await catalogSnapshot(db), before);
});

test("full Admin catalog exposes fingerprints and effective ACLs without calling functions or reading rows", async t => {
  const { db } = await createHomeFixture(); t.after(() => db.close());
  await db.exec(`create table public.inspection_canary(secret text default 'PRIVATE_DEFAULT_SENTINEL',
    constraint inspection_check check(secret <> 'PRIVATE_CONSTRAINT_SENTINEL'));
    insert into public.inspection_canary values('PRIVATE_ROW_SENTINEL');
    create function public.inspection_canary() returns text language plpgsql
      set inspection.secret = 'PRIVATE_SETTING_SENTINEL' as $$begin
        insert into public.inspection_canary values('MUST_NOT_EXECUTE');
        raise exception 'PRIVATE_FUNCTION_SENTINEL';
      end$$;
    alter table public.inspection_canary enable row level security;
    create policy inspection_policy on public.inspection_canary using(secret <> 'PRIVATE_POLICY_SENTINEL');
    create index inspection_index on public.inspection_canary(secret) where secret <> 'PRIVATE_INDEX_SENTINEL';`);
  const before = await catalogSnapshot(db), result = await inspect(db), serialized = JSON.stringify(result);
  assert(result.migration_markers.every(item => item.presence === "all_markers_present"), JSON.stringify(result.migration_markers));
  for (const sentinel of ["PRIVATE_DEFAULT_SENTINEL", "PRIVATE_CONSTRAINT_SENTINEL", "PRIVATE_ROW_SENTINEL", "PRIVATE_SETTING_SENTINEL", "PRIVATE_FUNCTION_SENTINEL", "PRIVATE_POLICY_SENTINEL", "PRIVATE_INDEX_SENTINEL"])
    assert(!serialized.includes(sentinel), sentinel);
  assert.equal((await db.query("select count(*)::int n from public.inspection_canary")).rows[0].n, 1);
  assert.deepEqual(await catalogSnapshot(db), before);
  const human = result.functions.find(item => item.identity === "public.admin_get_context_v1()");
  assert.match(human.definition_md5, /^[0-9a-f]{32}$/); assert.equal(human.security_definer, false); assert.equal(human.public_execute, false);
  assert.equal(human.effective_execute.find(item => item.role === "authenticated").allowed, true);
  assert.equal(human.effective_execute.find(item => item.role === "service_role").allowed, false);
  const canary = result.functions.find(item => item.identity === "public.inspection_canary()");
  assert.equal(canary.public_execute, true); assert.deepEqual(canary.operational_settings, []);
  const audit = result.relations.find(item => item.schema === "private" && item.name === "admin_audit_event_v1");
  assert(audit.rls); assert(audit.indexes.some(item => item.name === "admin_audit_event_auth_time_v1" && item.valid));

  await t.test("privilege or definition drift remains visible even when all marker names exist", async () => {
    await db.exec("alter function public.admin_get_context_v1() security definer; grant execute on function public.admin_get_context_v1() to public");
    const drift = await inspect(db), changed = drift.functions.find(item => item.identity === human.identity);
    assert(drift.migration_markers.every(item => item.presence === "all_markers_present"));
    assert.equal(changed.security_definer, true); assert.equal(changed.public_execute, true); assert.notEqual(changed.definition_md5, human.definition_md5);
  });
  await t.test("inherited column writes are visible even without table-level UPDATE", async () => {
    await db.exec("create role inherited_writer; grant update(tipologia_utente) on public.utente to inherited_writer; grant inherited_writer to authenticated");
    const inherited = await inspect(db), user = inherited.relations.find(item => item.schema === "public" && item.name === "utente");
    assert.equal(user.effective_privileges.find(item => item.role === "authenticated").update, false);
    assert.equal(user.columns.find(item => item.name === "tipologia_utente").admin_identity_privileges.find(item => item.role === "authenticated").update, true);
  });
  await t.test("missing a single column reports partial markers without certifying a migration", async () => {
    await db.exec("alter table public.annuncio rename column eliminato_da to inspection_missing_actor");
    const partial = await inspect(db);
    assert.equal(partial.migration_markers.find(item => item.migration === "M07").presence, "some_markers_present");
    assert.equal(partial.limits.migration_application_certified, false);
  });
});

test("optional history reads only version IDs, tolerates empty history and reports a bounded result", async t => {
  const db = await PGlite.create(); t.after(() => db.close());
  await db.exec("create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key,statements text[],name text,applied_by text)");
  const result = await inspect(db); assert.equal(result.migration_history.can_read_versions, true);
  assert.deepEqual((await history(db)).versions, []);
  await db.query("insert into supabase_migrations.schema_migrations values($1,$2,$3,$4)", ["20261024095639", ["PRIVATE_HISTORY_STATEMENT"], "PRIVATE_HISTORY_NAME", "PRIVATE_HISTORY_ACTOR"]);
  const versions = await history(db); assert.deepEqual(versions.versions, ["20261024095639"]); assert.equal(versions.transaction_read_only, "on");
  assert(!JSON.stringify(versions).includes("PRIVATE_HISTORY")); assert.equal(versions.truncated, false);
  await db.exec("insert into supabase_migrations.schema_migrations(version) select lpad(n::text,14,'0') from generate_series(1,2001) n");
  const bounded = await history(db); assert.equal(bounded.returned_count, 2000); assert.equal(bounded.versions.length, 2000); assert.equal(bounded.truncated, true);
});

test("unreadable migration history and missing version column are explicitly non-verifiable", async t => {
  const db = await PGlite.create(); t.after(() => db.close());
  await db.exec("create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text); create role inspection_reader; grant usage on schema public,supabase_migrations to inspection_reader; set role inspection_reader");
  const restricted = await inspect(db);
  assert.equal(restricted.migration_history.can_read_versions, false); assert.equal(restricted.migration_history.status, "not_verifiable_permission_denied");
  assert.equal(restricted.environment.operator, "inspection_reader");
  await db.exec("reset role; alter table supabase_migrations.schema_migrations rename column version to other");
  const missing = await inspect(db); assert.equal(missing.migration_history.status, "version_column_missing"); assert.equal(missing.migration_history.can_read_versions, false);
});

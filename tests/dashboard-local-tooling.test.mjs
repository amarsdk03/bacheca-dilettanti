import { PGlite } from "./helpers/pglite.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseEnv } from "node:util";
import { assertLocalTarget, assertLocalDockerEndpoint, sourceConnection, dumpArguments, inspectCapture } from "../scripts/dashboard-local/guard.mjs";

const local = parseEnv(readFileSync(new URL("../scripts/dashboard-local/target.env.example", import.meta.url), "utf8"));
const source = {
  BACHECA_SCHEMA_SOURCE_PROJECT_REF: "abcdefghijklmnopqrst",
  BACHECA_SCHEMA_SOURCE_HOST: "db.abcdefghijklmnopqrst.supabase.co",
  BACHECA_SCHEMA_SOURCE_ALLOWED_HOST: "db.abcdefghijklmnopqrst.supabase.co",
  BACHECA_SCHEMA_SOURCE_PORT: "5432",
  BACHECA_SCHEMA_SOURCE_DATABASE: "postgres",
  BACHECA_SCHEMA_SOURCE_USER: "postgres",
  BACHECA_SCHEMA_SOURCE_PASSWORD: "synthetic-only",
};

test("fixed local destination accepts its template and rejects remote/mixed endpoints", () => {
  assert.equal(assertLocalTarget(local).kind, "local");
  for (const overrides of [
    { BACHECA_TEST_TARGET: "staging" },
    { NEXT_PUBLIC_SUPABASE_URL: "https://real.supabase.co", BACHECA_TEST_ALLOWED_SUPABASE_ORIGINS: "https://real.supabase.co" },
    { BACHECA_TEST_ALLOWED_SUPABASE_ORIGINS: `${local.NEXT_PUBLIC_SUPABASE_URL},https://real.supabase.co` },
    { BACHECA_LOCAL_DB_URL: "postgresql://postgres:secret@db.real.supabase.co:5432/postgres" },
    { BACHECA_LOCAL_DB_URL: "postgresql://postgres:secret@127.0.0.1:55322/postgres?host=db.real.supabase.co" },
    { BACHECA_LOCAL_DB_URL: "postgresql://postgres:secret@127.0.0.1:5432/postgres" },
    { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55321/path" },
  ]) assert.throws(() => assertLocalTarget({ ...local, ...overrides }));
});

test("schema export requires a consistent explicit hosted source and readonly sessions", () => {
  const connection = sourceConnection(source);
  assert.match(connection.PGOPTIONS, /default_transaction_read_only=on/);
  assert.equal(connection.PGSSLMODE, "require");
  assert.equal(sourceConnection({ ...source,
    BACHECA_SCHEMA_SOURCE_HOST: "aws-0-eu-west-1.pooler.supabase.com",
    BACHECA_SCHEMA_SOURCE_ALLOWED_HOST: "aws-0-eu-west-1.pooler.supabase.com",
    BACHECA_SCHEMA_SOURCE_USER: "postgres.abcdefghijklmnopqrst",
  }).PGPORT, "5432");
  for (const overrides of [
    { BACHECA_SCHEMA_SOURCE_ALLOWED_HOST: "" },
    { BACHECA_SCHEMA_SOURCE_PROJECT_REF: "differentprojectrefxx" },
    { BACHECA_SCHEMA_SOURCE_PORT: "6543" },
    { BACHECA_SCHEMA_SOURCE_PASSWORD: "" },
    { BACHECA_SCHEMA_SOURCE_HOST: "localhost", BACHECA_SCHEMA_SOURCE_ALLOWED_HOST: "localhost" },
    { BACHECA_SCHEMA_SOURCE_USER: "postgres.anotherproject" },
  ]) assert.throws(() => sourceConnection({ ...source, ...overrides }));
  const args = dumpArguments();
  assert(args.includes("--schema-only"));
  assert(!args.some((arg) => /password=|data-only|--clean|--create|schema=auth|schema=storage/.test(arg)));
});

test("database credentials are never sent to a remote Docker engine", () => {
  assert.doesNotThrow(() => assertLocalDockerEndpoint("npipe:////./pipe/dockerDesktopLinuxEngine"));
  assert.doesNotThrow(() => assertLocalDockerEndpoint("unix:///var/run/docker.sock"));
  for (const endpoint of ["ssh://server", "tcp://server:2376", "tcp://127.0.0.1:2375", "npipe:////other-server/pipe/docker_engine"]) {
    assert.throws(() => assertLocalDockerEndpoint(endpoint));
  }
});

test("capture inventory rejects missing foundation and never authorizes automatic import", () => {
  const schema = ['CREATE TABLE "public"."utente"', 'CREATE TABLE "public"."profilo"',
    'CREATE TABLE "public"."annuncio"', 'CREATE TABLE "private"."admin_session_policy_v1"',
    'CREATE FUNCTION "public"."admin_get_context_v1"(', 'CREATE FUNCTION "private"."require_admin_context_v1"('].join("\n");
  const catalog = { admin_foundation: true, server_version_num: 170006,
    schemas: ["public", "private"], managed_triggers: [], managed_policies: [] };
  assert.equal(inspectCapture(schema, catalog).readyForAutomaticImport, false);
  assert.throws(() => inspectCapture(schema.replace('CREATE TABLE "public"."utente"', ""), catalog));
  assert.throws(() => inspectCapture(schema, { ...catalog, admin_foundation: false }));
  assert.throws(() => inspectCapture(schema, { ...catalog, server_version_num: 150000 }));
});

test("catalog query executes against PostgreSQL catalogs without application data", async () => {
  const db = await PGlite.create();
  try {
    const sql = readFileSync(new URL("../scripts/dashboard-local/capture-catalog.sql", import.meta.url), "utf8");
    await db.exec(`
      create schema auth;
      create table auth.users(id uuid primary key);
      create function public.catalog_test_trigger() returns trigger language plpgsql as $$ begin return new; end; $$;
      create trigger catalog_test before insert on auth.users for each row execute function public.catalog_test_trigger();
      alter table auth.users disable trigger catalog_test;
      create policy catalog_test_policy on auth.users as restrictive for select to public using (true);
      set search_path=pg_catalog;
      set default_transaction_read_only=on;
    `);
    const result = await db.query(sql);
    const catalog = result.rows[0].jsonb_build_object;
    assert.equal(catalog.admin_foundation, false);
    assert.equal(catalog.managed_triggers.length, 1);
    assert.equal(catalog.managed_triggers[0].enabled, "D");
    assert.match(catalog.managed_triggers[0].definition, /CREATE TRIGGER catalog_test/);
    assert.match(catalog.managed_triggers[0].definition, /public\.catalog_test_trigger/);
    assert.match(catalog.managed_triggers[0].function_definition, /RETURNS trigger/i);
    assert.match(catalog.managed_policies[0].definition, /AS RESTRICTIVE FOR SELECT TO PUBLIC USING \(true\)/);
    assert.equal(catalog.auth_columns[0].type, "uuid");
    assert(catalog.server_version_num >= 170000);
  } finally { await db.close(); }
});

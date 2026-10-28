import { assertTestTarget } from "../assert-test-target.mjs";

export const LOCAL_ORIGIN = "http://127.0.0.1:55321";
export const PG_IMAGE = "postgres:17";
export const CLI_VERSION = "2.122.0";

/** This stack deliberately accepts only fixed loopback endpoints, not staging. */
export function assertLocalTarget(env) {
  const target = assertTestTarget(env);
  if (target.kind !== "local" || target.origin !== LOCAL_ORIGIN ||
    env.BACHECA_TEST_ALLOWED_SUPABASE_ORIGINS !== LOCAL_ORIGIN) {
    throw new Error("La destinazione deve essere esclusivamente lo stack locale sulla porta 55321.");
  }
  const db = new URL(env.BACHECA_LOCAL_DB_URL);
  if (db.protocol !== "postgresql:" || db.hostname !== "127.0.0.1" ||
    db.port !== "55322" || db.pathname !== "/postgres" ||
    db.username !== "postgres" || db.search || db.hash) {
    throw new Error("Destinazione SQL locale non valida: richiesto 127.0.0.1:55322/postgres.");
  }
  return target;
}

/** Separate remote source: no URL parsing or interpolation into shell commands. */
export function sourceConnection(env) {
  const read = (name) => env[`BACHECA_SCHEMA_SOURCE_${name}`] ?? "";
  const ref = read("PROJECT_REF"), host = read("HOST"), user = read("USER");
  const direct = host === `db.${ref}.supabase.co` && user === "postgres";
  const pooler = /^[a-z0-9.-]+\.pooler\.supabase\.com$/.test(host) && user === `postgres.${ref}`;
  if (!/^[a-z0-9]{20}$/.test(ref) || !host || host !== read("ALLOWED_HOST") ||
    !(direct || pooler) || read("PORT") !== "5432" || read("DATABASE") !== "postgres" ||
    !read("PASSWORD") || /[\r\n\0]/.test(read("PASSWORD"))) {
    throw new Error("Compilare source.env con project ref, host Supabase consentito, porta 5432 e credenziali database coerenti.");
  }
  return {
    PGHOST: host, PGPORT: "5432", PGUSER: user, PGDATABASE: "postgres",
    PGPASSWORD: read("PASSWORD"), PGSSLMODE: "require", PGCONNECT_TIMEOUT: "15",
    PGAPPNAME: "bacheca-schema-capture",
    PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=120000 -c lock_timeout=10000 -c search_path=pg_catalog",
  };
}

export function assertLocalDockerEndpoint(endpoint) {
  if (!/^npipe:\/+\.\/pipe\/[a-zA-Z0-9_.-]+$/.test(endpoint) && !/^unix:\/\/\/[^?#]+$/.test(endpoint)) {
    throw new Error("È richiesto un Docker locale via named pipe o socket Unix; endpoint TCP/SSH rifiutato.");
  }
}

export const dumpArguments = () => [
  "pg_dump", "--no-password", "--schema-only", "--format=plain", "--quote-all-identifiers",
  "--schema=public", "--schema=private", "--schema=extensions", "--no-tablespaces",
  "--lock-wait-timeout=10000",
];

/** Content inventory only; this does not establish that SQL is safe to execute. */
export function inspectCapture(schema, catalog) {
  const required = [
    'CREATE TABLE "public"."utente"', 'CREATE TABLE "public"."profilo"',
    'CREATE TABLE "public"."annuncio"', 'CREATE TABLE "private"."admin_session_policy_v1"',
    'CREATE FUNCTION "public"."admin_get_context_v1"(',
    'CREATE FUNCTION "private"."require_admin_context_v1"(',
  ];
  const missing = required.filter((part) => !schema.includes(part));
  if (missing.length || !catalog.admin_foundation || !Number.isInteger(catalog.server_version_num) ||
    catalog.server_version_num < 170000 || catalog.server_version_num >= 180000) {
    throw new Error("Schema incompleto o versione diversa da PostgreSQL 17: confrontare il catalogo prima di proseguire.");
  }
  return {
    foundationPresent: true,
    schemas: catalog.schemas,
    managedTriggers: catalog.managed_triggers.length,
    managedPolicies: catalog.managed_policies.length,
    // An isolated runtime and manual review are still required.
    readyForAutomaticImport: false,
  };
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createSessionFixture, FIXTURE_EMAIL, FIXTURE_PASSWORD, FIXTURE_PUBLIC_KEY } from "../scripts/dashboard-browser/session-fixture.mjs";
import { auditId } from "../scripts/dashboard-browser/audit-fixture.mjs";
import { productionChartAsset } from "../scripts/dashboard-browser/registro-checks.mjs";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const load = adminServerLoader(), base = "apps/admin/src/features/audit/";
const { parseAuditPage, parseAuditDetail } = load(base + "server/read-response.ts");
const filters = { from: "", to: "", operator: "", action: "", outcome: "" };
const query = patch => ({ ...filters, limit: 30, cursor: null, ...patch });
async function setup(t) {
  const fixture = await createSessionFixture({ registro: true }); t.after(fixture.close);
  const client = createClient(fixture.origin, FIXTURE_PUBLIC_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  assert.equal((await client.auth.signInWithPassword({ email: FIXTURE_EMAIL, password: FIXTURE_PASSWORD })).error, null);
  const list = async patch => { const result = await client.rpc("admin_list_audit_events_v1", { p_query: query(patch) }); assert.equal(result.error, null); return result.data; };
  return { fixture, client, list };
}

test("Registro fixture passes real parsers with 37 events, cursor tie and all detail variants", async t => {
  const { fixture, client, list } = await setup(t);
  const first = await list(), parsed = parseAuditPage(first, { filters, limit: 30 });
  assert.equal(parsed.items.length, 30); assert(parsed.nextCursor);
  const rawSecond = await list({ cursor: first.nextCursor }), second = parseAuditPage(rawSecond, { filters, limit: 30 });
  assert.equal(second.items.length, 7); assert.equal(new Set([...parsed.items, ...second.items].map(row => row.id)).size, 37);
  assert.equal(first.items.at(-1).occurredAt, rawSecond.items[0].occurredAt);
  assert(first.items.at(-1).id > rawSecond.items[0].id);
  for (let n = 1; n <= 37; n++) {
    const { data, error } = await client.rpc("admin_get_audit_event_v1", { p_id: auditId(n) }); assert.equal(error, null);
    const detail = parseAuditDetail(data, auditId(n)); assert.equal(detail.id, auditId(n));
    if (n === 3) assert.equal(detail.export.rowCount, 1);
    if (n === 4) assert.deepEqual(detail.actor, { authId: null, userId: null, email: null });
    if (n === 5) { assert(detail.actor.authId); assert.equal(detail.actor.userId, null); }
  }
  const activity = await client.rpc("admin_list_audit_events_v1", { p_query: query({ limit: 5 }) });
  assert.equal(activity.error, null); assert.equal(activity.data.items.length, 5);
  assert.equal(fixture.stats.unexpected, 0); assert.equal(fixture.registro.stats.list, 2);
});

test("Registro filters cover Rome midnight, exact identities and cursor filter binding", async t => {
  const { client, list } = await setup(t);
  assert.deepEqual((await list({ operator: "unknown" })).items.map(row => row.id), [auditId(4)]);
  const email = await list({ operator: "admin@example.test" }); assert(email.items.every(row => row.actor.email === "admin@example.test"));
  const uuid = await list({ operator: "bbbbbbbb-bbbb-4bbb-8bbb-000000000001" }); assert(uuid.items.every(row => row.actor.userId));
  const date = await list({ from: "2026-10-25", to: "2026-10-25" });
  const tail = await list({ from: "2026-10-25", to: "2026-10-25", cursor: date.nextCursor });
  assert(tail.items.some(row => row.id === auditId(36))); assert(!tail.items.some(row => row.id === auditId(37)));
  const selected = await list({ action: "announcement.approve", outcome: "success" }); assert(selected.items.length > 0); assert(selected.items.every(row => row.action === "announcement.approve" && row.outcome === "success"));
  const mismatch = await client.rpc("admin_list_audit_events_v1", { p_query: query({ cursor: date.nextCursor }) }); assert.equal(mismatch.error.code, "22023");
});

test("Registro functional reads reject ordinary, revoked and technical callers", async t => {
  const { fixture, client } = await setup(t);
  fixture.setRole("admin"); assert.equal((await client.rpc("admin_list_audit_events_v1", { p_query: query() })).error.code, "42501");
  fixture.setRole("Admin"); fixture.revoke(); assert.equal((await client.rpc("admin_get_audit_event_v1", { p_id: auditId(1) })).error.code, "42501");
  const response = await fetch(fixture.origin + "/rest/v1/rpc/admin_get_audit_event_v1", { method: "POST", headers: { apikey: fixture.secretKey, Authorization: "Bearer " + fixture.secretKey, "Content-Type": "application/json" }, body: JSON.stringify({ p_id: auditId(1) }) });
  assert.equal(response.status, 403); assert.equal(fixture.registro.stats.list, 0); assert.equal(fixture.registro.stats.detail, 0);
});

test("Registro held responses snapshot failures and removal does not fabricate historical details", async t => {
  const { fixture, client } = await setup(t), data = fixture.registro;
  data.hold("detail"); data.setMode("detail", "unavailable");
  const pending = Promise.resolve(client.rpc("admin_get_audit_event_v1", { p_id: auditId(1) }));
  for (let n = 0; n < 100 && data.stats.held.detail !== 1; n++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(data.stats.held.detail, 1); data.setMode("detail", "ok"); data.release("detail");
  assert.equal((await pending).error.code, "TEST_AUDIT_UNAVAILABLE");
  data.remove(auditId(1)); const removed = await client.rpc("admin_get_audit_event_v1", { p_id: auditId(1) }); assert.equal(removed.error, null); assert.equal(removed.data, null);
  data.setMode("list", "empty"); const empty = await client.rpc("admin_list_audit_events_v1", { p_query: query() }); assert.deepEqual(empty.data, { items: [], hasMore: false, nextCursor: null });
});

test("production renderer discovery uses actual build files and refuses absent or ambiguous matches", t => {
  const directory = mkdtempSync(join(tmpdir(), "bacheca-registro-assets-"));
  t.after(() => { assert.equal(dirname(resolve(directory)), resolve(tmpdir())); assert(basename(directory).startsWith("bacheca-registro-assets-")); rmSync(directory, { recursive: true }); });
  mkdirSync(join(directory, "chunks")); writeFileSync(join(directory, "chunks/shell.js"), "shell");
  assert.throws(() => productionChartAsset(directory), /BROWSER_CHART_ASSET_AMBIGUOUS/);
  writeFileSync(join(directory, "chunks/actual-hash.js"), '"Periodo / Categoria";"Mostra dati:";');
  assert.equal(productionChartAsset(directory), "/_next/static/chunks/actual-hash.js");
  writeFileSync(join(directory, "chunks/duplicate.js"), '"Periodo / Categoria";"Mostra dati:";');
  assert.throws(() => productionChartAsset(directory), /BROWSER_CHART_ASSET_AMBIGUOUS/);
});

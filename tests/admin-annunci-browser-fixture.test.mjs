import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createSessionFixture, FIXTURE_EMAIL, FIXTURE_PASSWORD, FIXTURE_PUBLIC_KEY } from "../scripts/dashboard-browser/session-fixture.mjs";
import { annunciId, ANNUNCI_TYPES } from "../scripts/dashboard-browser/annunci-fixture.mjs";
import { parseDownloadedCsv } from "../scripts/dashboard-browser/annunci-checks.mjs";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const load = adminServerLoader(), base = "apps/admin/src/features/annunci/";
const { parseDetailResponse } = load(base + "server/detail-response.ts"), { parseListResponse } = load(base + "server/response.ts");
const { announcementCsv } = load(base + "server/export-csv.ts");
const filters = { search: "", status: null, type: null, visibility: "all", trash: "exclude" };
const query = patch => ({ ...filters, limit: 30, cursor: null, ...patch });
async function setup(t) {
  const fixture = await createSessionFixture({ annunci: true }); t.after(fixture.close);
  const client = createClient(fixture.origin, FIXTURE_PUBLIC_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  assert.equal((await client.auth.signInWithPassword({ email: FIXTURE_EMAIL, password: FIXTURE_PASSWORD })).error, null);
  const rpc = async (name, args = {}) => { const result = await client.rpc(name, args); assert.equal(result.error, null); return result.data; };
  const detail = id => rpc("admin_get_announcement_v1", { p_id: id });
  const moderate = async (id, operation, reason = null, fingerprint) => rpc("admin_moderate_announcement_v1", { p_id: id, p_operation: operation, p_reason: reason, p_fingerprint: fingerprint ?? (await detail(id)).contentFingerprint });
  return { fixture, client, rpc, detail, moderate };
}
test("Annunci HTTP fixture passes real list/detail parsers, pagination and all eleven types", async t => {
  const { fixture, rpc, detail } = await setup(t);
  const first = await rpc("admin_list_announcements_v1", { p_query: query() });
  const page = parseListResponse(first, { filters, limit: 30 }); assert.equal(page.items.length, 30); assert(page.nextCursor);
  const second = await rpc("admin_list_announcements_v1", { p_query: query({ cursor: first.nextCursor }) });
  assert.equal(parseListResponse(second, { filters, limit: 30 }).items.length, 5); assert.equal(second.items.at(-1).createdAt, null);
  for (let i = 1; i <= 11; i++) {
    const id = annunciId(i), parsed = parseDetailResponse(await detail(id), id);
    assert.equal(parsed.content.type, ANNUNCI_TYPES[i - 1]); assert(parsed.complete); assert.equal(parsed.locations[0].id, "9007199254740993");
  }
  assert.equal((await detail(annunciId(1))).summary.author.displayName, "Giocatore");
  assert.equal((await detail(annunciId(34))).summary.author.displayName, "Profilo non disponibile");
  assert.equal(fixture.stats.unexpected, 0);
});
test("filters, title literal search, two trashed records and parser projections remain separate", async t => {
  const { rpc } = await setup(t);
  for (const [patch, count] of [[{ status: "in_revisione" }, 11], [{ search: "=SUM(1;2)" }, 1], [{ type: ANNUNCI_TYPES[0] }, 4], [{ visibility: "hidden" }, 7], [{ trash: "only" }, 2]]) {
    const raw = await rpc("admin_list_announcements_v1", { p_query: query(patch) });
    assert.equal(parseListResponse(raw, { filters: { ...filters, ...patch }, limit: 30 }).items.length, count);
  }
});
test("modeled mutations require current version/capability, preserve hold on restore, and record one modeled success", async t => {
  const { fixture, detail, moderate } = await setup(t), id = annunciId(1);
  assert.equal((await moderate(id, "trash", "interno")).reason, "TRASH_NOT_ENABLED");
  assert.equal((await detail(annunciId(36))).moderation.capabilities.restore.reason, "TRASH_NOT_ENABLED");
  const old = (await detail(id)).contentFingerprint; fixture.annunci.bump(id);
  assert.equal((await moderate(id, "approve", null, old)).status, "conflict");
  fixture.annunci.setIncomplete(id, true); assert.equal((await moderate(id, "approve")).reason, "INCOMPLETE_CONTENT"); fixture.annunci.setIncomplete(id, false);
  assert.equal((await moderate(id, "approve")).status, "ok");
  assert.equal((await moderate(id, "hide", "visibile")).status, "ok");
  assert.equal((await moderate(id, "show")).status, "ok"); fixture.annunci.setGate(true);
  assert.equal((await moderate(id, "trash", "interno")).status, "ok"); assert.equal((await moderate(id, "restore")).status, "ok");
  const restored = parseDetailResponse(await detail(id), id); assert.equal(restored.summary.trashed, false); assert(restored.summary.hidden); assert(restored.moderation.adminHidden);
  assert.equal(fixture.annunci.stats.events.length, 5);
});
test("uncertain delivery models a committed write once without pretending to prove SQL atomicity", async t => {
  const { fixture, client, detail } = await setup(t), id = annunciId(1), fingerprint = (await detail(id)).contentFingerprint;
  fixture.annunci.setMode("moderate", "uncertain");
  const result = await client.rpc("admin_moderate_announcement_v1", { p_id: id, p_operation: "hide", p_reason: "test", p_fingerprint: fingerprint });
  assert.equal(result.error.code, "TEST_ANNUNCI_UNAVAILABLE"); assert.equal((await detail(id)).summary.hidden, true);
  assert.equal(fixture.annunci.stats.events.length, 1); assert.equal(fixture.annunci.stats.moderate, 1);
});
test("export rechecks the exact ordered selection; native CSV parser preserves BOM, quoting and formula protection", async t => {
  const { fixture, rpc } = await setup(t), p_query = query();
  const page = await rpc("admin_list_announcements_v1", { p_query });
  const selection = page.items.map(row => ({ id: row.id, rowFingerprint: row.rowFingerprint, authorName: row.author.displayName }));
  const exported = await rpc("admin_export_announcements_v1", { p_query, p_selection: selection }); assert.equal(exported.status, "ok");
  const csv = Buffer.from(announcementCsv(exported.items)); const parsed = parseDownloadedCsv(csv);
  assert.equal(parsed.length, 31); assert(parsed.every(row => row.length === 6)); assert.equal(parsed[2][0], '\'=SUM(1;2) "Èlite"'); assert.equal(parsed[3][0], "Riga uno;\nRiga due");
  fixture.annunci.bump(selection[0].id);
  assert.equal((await rpc("admin_export_announcements_v1", { p_query, p_selection: selection })).status, "conflict");
  assert.equal(fixture.annunci.stats.events.length, 1);
});
test("technical key cannot record operation success or invoke human functions; current role/session gates every Annunci RPC", async t => {
  const { fixture, client } = await setup(t), technical = createClient(fixture.origin, fixture.secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  assert((await technical.rpc("admin_record_server_audit_v1", { p_action: "announcement.approve", p_outcome: "success" })).error);
  assert.equal((await technical.rpc("admin_record_server_audit_v1", { p_action: "announcement.approve", p_outcome: "failure", p_failure_code: "STATE_CONFLICT" })).error, null);
  assert((await technical.rpc("admin_list_announcements_v1", { p_query: query() })).error);
  for (const role of ["admin", "Utente"]) { fixture.setRole(role); assert((await client.rpc("admin_list_announcements_v1", { p_query: query() })).error); }
  fixture.setRole("Admin"); fixture.revoke(); assert((await client.rpc("admin_moderate_announcement_v1", { p_id: annunciId(1) })).error);
  assert.equal(fixture.annunci.stats.list, 0); assert.equal(fixture.annunci.stats.moderate, 0);
});
test("controlled read cancellation frees waiters; invalid controls fail and diagnostics omit credentials", async t => {
  const { fixture, client } = await setup(t), data = fixture.annunci, controller = new AbortController();
  data.hold("detail"); const pending = Promise.resolve(client.rpc("admin_get_announcement_v1", { p_id: annunciId(1) }).abortSignal(controller.signal));
  for (let i = 0; i < 100 && data.stats.held.detail !== 1; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(data.stats.held.detail, 1); controller.abort(); assert((await pending).error);
  for (let i = 0; i < 100 && data.stats.held.detail; i++) await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(data.stats.held.detail, 0); data.release("detail");
  assert.throws(() => data.hold("bad")); assert.throws(() => data.setMode("list", "remote")); assert.throws(() => data.setDelay("list", 10000)); assert.throws(() => data.setExternalOrigin("https://example.com"));
  const json = JSON.stringify(data.stats); assert(!json.includes(fixture.secretKey)); assert(!json.includes(FIXTURE_PASSWORD));
});

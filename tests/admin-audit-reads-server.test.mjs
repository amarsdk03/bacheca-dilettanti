import assert from "node:assert/strict";
import { test } from "node:test";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
const base = "apps/admin/src/features/audit/", load = adminServerLoader();
const { createAuditQueries } = load(base + "server/read-service.ts");
const { parseAuditQuery, encodeAuditCursor } = load(base + "server/read-input.ts");
const { parseAuditPage, parseAuditDetail } = load(base + "server/read-response.ts");
const { DEFAULT_AUDIT_FILTERS: filters } = load(base + "read-validation.ts");
const id = "eeeeeeee-eeee-4eee-8eee-000000000001", at = "2026-10-23T12:00:00.123456Z";
const summary = { id, occurredAt: at, action: "auth.login", outcome: "success", actor: { authId: id, userId: id, email: "admin@example.test" } };
const detail = { ...summary, resourceType: "session", resourceId: id, correlationId: id, reason: null, failureCode: null, changes: {}, export: null };
const empty = { items: [], hasMore: false, nextCursor: null };
function service({ claims = { sub: id, session_id: id, role: "authenticated", exp: Date.now() / 1000 + 3600 }, authError = null, data = empty, error = null, throws = false } = {}) {
  const calls = [], logs = [];
  return { calls, logs, q: createAuditQueries({ log(...args) { logs.push(args); }, async getClient() {
    calls.push("client"); if (throws) throw new Error("secret"); return {
      auth: { async getClaims() { calls.push("claims"); return { data: claims ? { claims } : null, error: authError }; } },
      async rpc(name, args) { calls.push({ name, args }); return { data, error }; },
    };
  } }) };
}
test("cursor is canonical Base64URL and preserves all six microseconds and normalized filters", () => {
  const cursor = { v: 1, id, occurredAt: at, filters };
  assert.deepEqual(parseAuditQuery({ cursor: encodeAuditCursor(cursor), limit: 1 }), { filters, cursor, limit: 1 });
  assert.throws(() => parseAuditQuery({ operator: "unknown", cursor: encodeAuditCursor(cursor) }));
});
for (const cursor of ["", "==", "abc=", "a".repeat(4097), "e30", Buffer.from(JSON.stringify({ v: 2, id, occurredAt: at, filters })).toString("base64url"), Buffer.from(JSON.stringify({ v: 1, id, occurredAt: "2026-02-30T12:00:00.123456Z", filters })).toString("base64url")]) test(`reject malformed cursor ${cursor.slice(0, 18)}`, () => assert.throws(() => parseAuditQuery({ cursor })));
for (const input of [null, [], { limit: null }, { limit: 31 }, { from: null }, { operator: "a" }, { to: "2026-02-30" }, { from: "2026-10-24", to: "2026-10-23" }, { action: "admin" }, { outcome: "ok" }, { extra: true }]) test(`invalid input never creates a client: ${JSON.stringify(input)}`, async () => { const h = service(); assert.equal((await h.q.list(input)).status, "invalid"); assert.equal(h.calls.length, 0); });
test("invalid detail ID rejected before session lookup", async () => { const h = service(); assert.equal((await h.q.detail("bad")).status, "invalid"); assert.equal(h.calls.length, 0); });
test("each read verifies claims and calls exactly one functional RPC", async () => {
  const h = service(); assert.equal((await h.q.list()).status, "ok"); assert.equal(h.calls.length, 3); assert.equal(h.calls[2].name, "admin_list_audit_events_v1");
  assert.deepEqual(h.calls[2].args.p_query, { ...filters, limit: 30, cursor: null });
  const d = service({ data: detail }); assert.equal((await d.q.detail(id.toUpperCase())).status, "ok"); assert.equal(d.calls[2].name, "admin_get_audit_event_v1"); assert.equal(d.calls.length, 3);
});
for (const claims of [null, { sub: id, role: "authenticated", exp: 1 }, { sub: id, session_id: id, role: "service_role", exp: Date.now() / 1000 + 3600 }]) test(`unverified claims cannot invoke a data RPC: ${JSON.stringify(claims)}`, async () => { const h = service({ claims }); assert.equal((await h.q.list()).status, "denied"); assert.equal(h.calls.length, 2); assert.equal(h.logs.length, 0); });
for (const [error, status] of [[{ code: "42501", message: "ADMIN_ACCESS_DENIED" }, "denied"], [{ code: "42501", message: "ADMIN_SESSION_POLICY_UNVERIFIED" }, "unavailable"], [{ code: "22023", message: "secret" }, "invalid"], [{ code: "XX000", message: "secret" }, "unavailable"]]) test(`RPC ${error.code}/${error.message} maps safely to ${status}`, async () => {
  const h = service({ error }); const result = await h.q.list(); assert.equal(result.status, status); assert(!JSON.stringify(result).includes("secret"));
  assert.equal(h.logs.length, status === "unavailable" ? 1 : 0); if (h.logs.length) assert.equal(h.logs[0].length, 2);
});
test("missing event is a genuine not-found; thrown infrastructure errors stay bounded", async () => {
  assert.equal((await service({ data: null }).q.detail(id)).status, "not_found"); assert.equal((await service({ throws: true }).q.list()).status, "unavailable");
});
test("response projection drops unexpected backend fields at summary, actor and detail levels", () => {
  const p = parseAuditPage({ items: [{ ...summary, password: "secret", actor: { ...summary.actor, password: "secret" } }], hasMore: false, nextCursor: null }, parseAuditQuery({}));
  assert(!JSON.stringify(p).includes("secret"));
  const d = parseAuditDetail({ ...detail, password: "secret", actor: { ...summary.actor, secret: "secret" }, changes: { hidden: { before: false, after: true, secret: "secret" }, extra: "secret" } }, id);
  assert(!JSON.stringify(d).includes("secret")); assert.deepEqual(d.changes, { hidden: { before: false, after: true } });
});
for (const patch of [{ items: Array(31).fill(summary) }, { items: [summary, summary] }, { items: [{ ...summary, occurredAt: "bad" }] }, { items: [{ ...summary, action: "other" }] }, { items: [{ ...summary, actor: { authId: null, userId: id, email: null } }] }, { hasMore: true, nextCursor: null }, { nextCursor: {} }]) test(`malformed page fails closed: ${Object.keys(patch)}`, () => assert.throws(() => parseAuditPage({ items: [], hasMore: false, nextCursor: null, ...patch }, parseAuditQuery({}))));
test("lookahead cursor must match the last projected row and filters", () => {
  const cursor = { v: 1, id, occurredAt: at, filters };
  assert.equal(typeof parseAuditPage({ items: [summary], hasMore: true, nextCursor: cursor }, parseAuditQuery({ limit: 1 })).nextCursor, "string");
  assert.throws(() => parseAuditPage({ items: [summary], hasMore: true, nextCursor: { ...cursor, occurredAt: "2026-10-22T12:00:00.123456Z" } }, parseAuditQuery({ limit: 1 })));
});
for (const patch of [{ id: "bad" }, { correlationId: "bad" }, { resourceType: "user" }, { failureCode: "SECRET" }, { reason: "a".repeat(1001) }, { changes: { hidden: { before: false, after: "true" } } }, { export: {} }]) test(`malformed detail fails closed: ${Object.keys(patch)}`, () => assert.throws(() => parseAuditDetail({ ...detail, ...patch }, id)));
test("export detail supports historical missing IDs and validates fresh arrays", () => {
  const value = { ...detail, action: "announcement.export", resourceType: "announcement_export", resourceId: null, export: { rowCount: 1, columns: null, announcementIds: null } };
  assert.equal(parseAuditDetail(value, id).export.announcementIds, null);
  assert.deepEqual(parseAuditDetail({ ...value, export: { rowCount: 1, columns: ["title"], announcementIds: [id] } }, id).export.announcementIds, [id]);
  for (const exp of [{ rowCount: 31, columns: null, announcementIds: null }, { rowCount: 1, columns: ["email"], announcementIds: [id] }, { rowCount: 2, columns: null, announcementIds: [id, id] }]) assert.throws(() => parseAuditDetail({ ...value, export: exp }, id));
});
test("reason length follows PostgreSQL codepoints rather than UTF16 code units", () => assert.equal(parseAuditDetail({ ...detail, reason: "😀".repeat(1000) }, id).reason.length, 2000));
test("actual GET routes use writable cookie clients and private no-store statuses", async () => {
  let calls = 0, denied = false;
  const client = { auth: { async getClaims() { return { data: { claims: { sub: id, session_id: id, role: "authenticated", exp: Date.now() / 1000 + 3600 } }, error: null }; } }, async rpc(name) { calls++; return { data: name === "admin_list_audit_events_v1" ? empty : null, error: denied ? { code: "42501" } : null }; } };
  const l = adminServerLoader({ dependencies: { "@/lib/supabase/server": { async createClient() { return client; }, createReadClient() { assert.fail("wrong client"); } } } });
  const list = l("apps/admin/src/app/api/registro-attivita/route.ts").GET, get = l("apps/admin/src/app/api/registro-attivita/[id]/route.ts").GET;
  for (const [query, expected] of [["", 200], ["?limit=100", 400], ["?from=2026-02-30", 400], ["?cursor=e30", 400]]) {
    const res = await list(new Request("https://admin.example.test/api/registro-attivita" + query)); assert.equal(res.status, expected); assert.match(res.headers.get("cache-control"), /private.*no-store/); assert.equal(res.headers.get("vary"), "Cookie");
  }
  assert.equal(calls, 1); const missing = await get(new Request("https://admin.example.test"), { params: Promise.resolve({ id }) }); assert.equal(missing.status, 404);
  denied = true; assert.equal((await list(new Request("https://admin.example.test/api/registro-attivita"))).status, 403); assert.equal(calls, 3);
});

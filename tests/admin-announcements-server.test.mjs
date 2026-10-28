import assert from "node:assert/strict";
import { test } from "node:test";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const load = adminServerLoader();
const { parseListQuery, encodeListCursor } = load("apps/admin/src/features/annunci/server/query-input.ts");
const { parseListResponse } = load("apps/admin/src/features/annunci/server/response.ts");
const { createAnnouncementQueries } = load("apps/admin/src/features/annunci/server/service.ts");
const id = (n) => `eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12, "0")}`;
const filters = { search: "", status: null, type: null, visibility: "all", trash: "exclude" };
const timestamp = "2026-01-01T12:00:00.123456Z";
const cursor = (extra = {}) => ({ v: 2, id: id(1), createdAt: timestamp, filters, ...extra });
const row = (extra = {}) => ({ id: id(1), title: "Titolo pubblico", type: "annuncio_giocatore", status: "in_revisione",
  hidden: false, private: false, creatorId: id(101), createdAt: timestamp, updatedAt: null, rowFingerprint: "a".repeat(32),
  author: { profileId: id(201), userId: id(101), displayName: "Giocatore", anonymous: true, available: true }, ...extra });
const page = (items = [row()], extra = {}) => ({ items, hasMore: false, nextCursor: null, ...extra });
const claims = () => ({ sub: id(1), session_id: id(501), role: "authenticated", exp: Date.now()/1000+3600 });

function harness(options = {}) {
  const calls = [], logs = [];
  const client = {
    auth: { async getClaims() {
      calls.push({ name: "claims" });
      if (options.claimThrows) throw new Error("secret provider details");
      return { data: options.noSession ? null : { claims: { ...claims(), ...options.claims } }, error: options.claimError ?? null };
    } },
    async rpc(name, args) {
      calls.push({ name, args });
      if (options.rpcThrows) throw new Error("secret SQL details");
      return { data: options.response ?? page(), error: options.rpcError ?? null };
    },
  };
  const service = createAnnouncementQueries({
    async getClient() { if (options.clientThrows) throw new Error("secret configuration"); return client; },
    log(code, correlationId) { logs.push({ code, correlationId }); if (options.logThrows) throw new Error("secret logger"); },
  });
  return { service, calls, logs, options };
}

test("query defaults and normalization preserve Unicode, literal search and exact selectors", () => {
  assert.deepEqual(parseListQuery({}), { filters, limit: 30, cursor: null });
  assert.equal(parseListQuery({ search: "\uFEFF\u00A0 Équipe 100%_\\ \u3000" }).filters.search, "Équipe 100%_\\");
  assert.equal(parseListQuery({ search: id(1).toUpperCase() }).filters.search, id(1));
  assert.equal(parseListQuery({ search: "😀".repeat(200) }).filters.search.length, 400);
  const query = parseListQuery({ status: "pubblicato", visibility: "shown", type: "annuncio_giocatore", limit: 1 });
  assert.equal(query.limit, 1); assert.equal(query.filters.visibility, "shown");
});

test("Base64URL cursor roundtrip retains microseconds/null dates and binds all filters", () => {
  for (const createdAt of [timestamp, "2024-02-29T00:00:00.000001Z", null]) {
    const original = cursor({ createdAt });
    assert.deepEqual(parseListQuery({ cursor: encodeListCursor(original) }).cursor, original);
  }
  const token = encodeListCursor(cursor());
  assert.equal(parseListQuery({ cursor: token, limit: 1 }).limit, 1);
  for (const changed of [{ search: "another" }, { status: "pubblicato" }, { type: "annuncio_creators" }, { visibility: "hidden" }, { trash: "only" }])
    assert.throws(() => parseListQuery({ ...changed, cursor: token }));
});

const badInputs = [null, [], { extra: true }, { limit: 0 }, { limit: 31 }, { limit: 1.5 }, { limit: "30" }, { limit: null },
  { search: null }, { search: 5 }, { search: "😀".repeat(201) }, { status: "Pubblicato" }, { visibility: null }, { visibility: "visible" },
  { trash: null }, { trash: "Only" }, { type: "legacy" }, { cursor: {} }, { cursor: "=" }, { cursor: "x".repeat(4097) }, { cursor: "eyJ" },
  { cursor: Buffer.from("not JSON").toString("base64url") }];
test("malformed queries never create a client or make an authorization/data request", async () => {
  const h = harness({ clientThrows: true });
  for (const input of badInputs) assert.deepEqual(await h.service.list(input), { status: "invalid", code: "INVALID_QUERY" });
  assert.deepEqual(h.calls, []); assert.deepEqual(h.logs, []);
});

test("cursor shape, canonical calendar timestamp, version and identifiers are validated", () => {
  for (const invalid of [cursor({ v: 1 }), cursor({ id: id(1).toUpperCase() }), cursor({ id: "invalid" }),
    cursor({ extra: true }), cursor({ filters: { ...filters, extra: true } }), cursor({ createdAt: "2026-02-29T00:00:00.000000Z" }),
    cursor({ createdAt: "2026-01-01T24:00:00.000000Z" }), cursor({ createdAt: "2026-01-01T00:00:00.123Z" }),
    cursor({ createdAt: "2026-01-01T00:00:00.123456+00:00" }), cursor({ createdAt: 0 })])
    assert.throws(() => parseListQuery({ cursor: encodeListCursor(invalid) }));
});

test("DTO explicitly drops backend extras including account contacts and Auth identities", () => {
  const result = parseListResponse(page([row({ accountEmail: "secret@example.test", auth_user_uuid: id(999),
    author: { ...row().author, realName: "secret real name", contact: "secret phone" } })], { extra: "secret" }), parseListQuery({}));
  assert.deepEqual(result, page()); assert(!JSON.stringify(result).includes("secret"));
});

test("valid response pagination returns an encoded frontend cursor bound to the last row", () => {
  const result = parseListResponse(page([row()], { hasMore: true, nextCursor: cursor() }), parseListQuery({ limit: 1 }));
  assert.deepEqual(parseListQuery({ limit: 30, cursor: result.nextCursor }).cursor, cursor());
  assert.equal(result.items[0].createdAt, timestamp);
  assert.deepEqual(parseListResponse(page([]), parseListQuery({})), page([]));
});

test("unknown type/status/null visibility remain consultable without inventing defaults", () => {
  const unknown = row({ type: "legacy", status: null, hidden: null, private: null, title: null, createdAt: null,
    creatorId: null, author: { profileId: null, userId: null, displayName: "Profilo non disponibile", anonymous: null, available: false } });
  assert.deepEqual(parseListResponse(page([unknown]), parseListQuery({})).items[0], unknown);
});

test("malformed DTOs and contradictory pagination fail closed", () => {
  const badRows = [row({ id: "invalid" }), row({ hidden: "false" }), row({ title: 3 }), row({ createdAt: "invalid" }),
    row({ rowFingerprint: "version" }), row({ creatorId: "invalid" }), row({ updatedAt: undefined }),
    row({ author: { ...row().author, displayName: "Actual private name" } }),
    row({ author: { ...row().author, available: false } }), row({ author: { ...row().author, profileId: null } })];
  const invalidPages = [null, { items: [] }, page(Array(31).fill(row())), page([row(), row()]),
    page([row(), row({ id: id(2) })]), page([row({ createdAt: null }), row({ id: id(2) })]),
    page([row()], { hasMore: true, nextCursor: null }), page([], { hasMore: true, nextCursor: cursor() }),
    page([row()], { nextCursor: cursor() }), page([row()], { hasMore: true, nextCursor: cursor({ id: id(99) }) }),
    ...badRows.map((item) => page([item]))];
  for (const invalid of invalidPages) assert.throws(() => parseListResponse(invalid, parseListQuery({})), /RESPONSE_INVALID/);
});

test("one and thirty results each make exactly one functional RPC, without a context or per-row RPC", async () => {
  for (const limit of [1, 30]) {
    const h = harness({ response: page(Array.from({ length: limit }, (_, n) => row({ id: id(100-n) }))) });
    assert.equal((await h.service.list({ limit })).status, "ok");
    assert.deepEqual(h.calls.map((call) => call.name), ["claims", "admin_list_announcements_v1"]);
    assert.deepEqual(h.calls[1].args, { p_query: { ...filters, limit, cursor: null } });
    assert.deepEqual(h.logs, []);
  }
});

for (const [label, options, status] of [
  ["missing session", { noSession: true }, "denied"],
  ["missing-session error", { claimError: { name: "AuthSessionMissingError" } }, "denied"],
  ["invalid JWT", { claimError: { name: "AuthInvalidJwtError" } }, "denied"],
  ["revoked Auth session", { claimError: { code: "session_not_found" } }, "denied"],
  ["expired token", { claims: { exp: 1 } }, "denied"],
  ["future token", { claims: { nbf: Date.now()/1000+3600 } }, "denied"],
  ["technical JWT", { claims: { role: "service_role" } }, "denied"],
  ["missing session_id", { claims: { session_id: null } }, "denied"],
  ["malformed subject", { claims: { sub: "invalid" } }, "denied"],
  ["Auth unavailable", { claimError: { code: "unexpected_failure", message: "secret" } }, "unavailable"],
  ["Auth exception", { claimThrows: true }, "unavailable"],
  ["client configuration", { clientThrows: true }, "unavailable"],
]) test(`${label} cannot reach the functional RPC`, async () => {
  const h = harness(options); const result = await h.service.list(); assert.equal(result.status, status);
  assert(!h.calls.some((call) => call.name === "admin_list_announcements_v1"));
  assert(!JSON.stringify(result).includes("secret")); assert(!JSON.stringify(h.logs).includes("secret"));
});

for (const [label, options, status] of [
  ["ordinary/revoked Admin", { rpcError: { code: "42501", message: "ADMIN_ACCESS_DENIED" } }, "denied"],
  ["unreviewed policy", { rpcError: { code: "42501", message: "ADMIN_SESSION_POLICY_UNVERIFIED" } }, "unavailable"],
  ["query invalid at database", { rpcError: { code: "22023", message: "secret query" } }, "invalid"],
  ["database error", { rpcError: { code: "XX000", message: "secret" } }, "unavailable"],
  ["transport exception", { rpcThrows: true }, "unavailable"],
  ["invalid response", { response: { items: "secret" } }, "unavailable"],
  ["logging failure", { rpcThrows: true, logThrows: true }, "unavailable"],
]) test(`${label} returns a bounded result and never retries or leaks raw errors`, async () => {
  const h = harness(options); const result = await h.service.list(); assert.equal(result.status, status);
  assert.equal(h.calls.filter((call) => call.name === "admin_list_announcements_v1").length, 1);
  assert(!JSON.stringify(result).includes("secret")); assert(!JSON.stringify(h.logs).includes("secret"));
  if (status === "unavailable") {
    assert.match(result.correlationId, /^[0-9a-f-]{36}$/);
    assert.deepEqual(h.logs, [{ code: "ADMIN_ANNOUNCEMENTS_UNAVAILABLE", correlationId: result.correlationId }]);
  }
});

test("role decisions and data are checked again on the next operation", async () => {
  const h = harness(); assert.equal((await h.service.list()).status, "ok");
  h.options.rpcError = { code: "42501", message: "ADMIN_ACCESS_DENIED" };
  assert.equal((await h.service.list()).status, "denied");
  assert.equal(h.calls.filter((call) => call.name === "claims").length, 2);
  assert.equal(h.calls.filter((call) => call.name === "admin_list_announcements_v1").length, 2);
});

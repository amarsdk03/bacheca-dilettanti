import assert from "node:assert/strict";
import {test} from "node:test";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
const load = adminServerLoader();
const {createPeopleService} = load("apps/admin/src/features/people/server/service.ts");
const {parsePeopleUrl, peopleHref, parseProfile, parseUserDetail, parseProfileMutation} = load("apps/admin/src/features/people/contracts.ts");
const id = "aaaaaaaa-aaaa-4aaa-8aaa-000000000001", at = "2026-11-15T12:00:00Z";
const profile = {id: id + ":giocatore", profileId: id, type: "giocatore", name: "Mario", userId: id, email: "mario@example.test", verifiedAt: null, adminHidden: false, version: 0, visibility: "public", locations: []};
function harness({data = {items: [], hasMore: false}, error = null, claims = {sub: id, session_id: id, role: "authenticated", exp: Date.now() / 1000 + 1000}} = {}) {
  const calls = [], failures = [], logs = [];
  const service = createPeopleService({async getClient() {calls.push("client"); return {auth: {async getClaims() {return {data: claims ? {claims} : null, error: null};}}, async rpc(name, args) {calls.push({name, args}); return {data, error};}};}, async failure(event) {failures.push(event);}, log: (...args) => logs.push(args)});
  return {service, calls, failures, logs};
}
test("URL filters round-trip and reject duplicates, unknown keys and malformed dates/offsets", () => {
  const query = {search: "mario@example.test", type: "squadra", user: id, visibility: "obscured", offset: 30};
  const href = peopleHref("profiles", query), parsed = parsePeopleUrl("profiles", new URL(href, "http://localhost").searchParams);
  assert.equal(parsed.valid, true); assert.equal(parsed.query.user, id); assert.equal(parsed.query.offset, 30);
  for (const q of ["offset=1", "offset=-30", "offset=", "offset=030", "offset=1000020", "visibility=public&visibility=private", "type=bad", "unknown=1", "user=bad"]) assert.equal(parsePeopleUrl("profiles", new URLSearchParams(q)).valid, false, q);
  for (const q of ["from=2026-02-30", "from=2026-11-15&to=2026-11-14", "registration=admin"]) assert.equal(parsePeopleUrl("users", new URLSearchParams(q)).valid, false);
});
test("invalid queries and mutations never create a client", async () => {
  const h = harness();
  for (const q of [null, [], {offset: 1}, {offset: 1000000}, {search: null}, {registration: "bad"}, {pending: true}]) assert.equal((await h.service.list("users", q)).status, "invalid");
  assert.equal((await h.service.detail("profiles", id, "inventato")).status, "invalid");
  for (const operation of ["hide", "unverify"]) assert.throws(() => parseProfileMutation({id, type: "giocatore", operation, version: 0, reason: " "}));
  assert.equal((await h.service.moderate({id, type: "giocatore", operation: "verify", version: -1, reason: null})).status, "invalid");
  assert.equal(h.calls.length, 0);
});
test("reads check claims, sanitize failures and project profile data", async () => {
  assert.equal((await harness({claims: null}).service.list("users", {})).status, "denied");
  const h = harness({data: {items: [{...profile, token: "private"}], hasMore: false}});
  const result = await h.service.list("profiles", {}); assert.equal(result.status, "ok"); assert.equal(result.data.items[0].token, undefined);
  assert.throws(() => parseProfile({...profile, adminHidden: true}));
  for (const [error, status] of [[{code: "42501", message: "DENIED"}, "denied"], [{code: "42501", message: "ADMIN_SESSION_POLICY_UNVERIFIED"}, "unavailable"], [{code: "22023"}, "invalid"], [{code: "XX000", message: "private"}, "unavailable"]]) {
    const r = await harness({error}).service.list("users", {}); assert.equal(r.status, status); assert.ok(!JSON.stringify(r).includes("private"));
  }
  assert.equal((await harness({data: {...profile, fields: {}, announcementCount: 0}}).service.detail("profiles", id, "giocatore")).status, "ok");
  assert.equal((await harness({data: {...profile, profileId: id.replace(/1$/, "2"), fields: {}, announcementCount: 0}}).service.detail("profiles", id, "giocatore")).status, "unavailable");
  assert.equal((await harness({data: null}).service.detail("users", id)).status, "not_found");
});
test("user detail requires consistent ownership and omits arbitrary Auth data", () => {
  const raw = {id, email: null, createdAt: at, confirmedAt: null, registeredAt: null, profileCount: 1, authId: id, phone: null, newsletter: false, newsletterUpdatedAt: null, legalAcceptedAt: null, termsVersion: null, privacyVersion: null, cookieVersion: null, profiles: [profile], encrypted_password: "private"};
  assert.equal(parseUserDetail(raw).encrypted_password, undefined);
  assert.throws(() => parseUserDetail({...raw, profileCount: 2}));
});
test("profile mutations audit failures separately and reject unverifiable receipts", async () => {
  const input = {id, type: "giocatore", operation: "hide", version: 0, reason: "Motivo"};
  const h = harness({data: {status: "ok", id, changed: true, eventId: id}});
  assert.equal((await h.service.moderate(input)).status, "ok"); assert.equal(h.failures.length, 0);
  const conflict = harness({data: {status: "conflict"}});
  assert.equal((await conflict.service.moderate(input)).status, "conflict"); assert.equal(conflict.failures[0].action, "profile.hide");
  assert.equal((await harness({data: {status: "ok", id, changed: true}}).service.moderate(input)).status, "unavailable");
});
test("HTTP endpoints validate detail/query shape and emit private no-store responses", async () => {
  let calls = 0;
  const http = adminServerLoader({dependencies: {"./index": {peopleService() {return {async list() {calls++; return {status: "denied"};}, async detail() {calls++; return {status: "not_found"};}};}}}})("apps/admin/src/features/people/server/http.ts").peopleHttp;
  for (const query of ["offset=1", "type=bad", "type=squadra&type=giocatore"]) assert.equal((await http("profiles", new Request("http://localhost/api/profili?" + query))).status, 400);
  assert.equal((await http("profiles", new Request("http://localhost/api/profili/" + id), id)).status, 400); assert.equal(calls, 0);
  const missing = await http("profiles", new Request("http://localhost/api/profili/" + id + "?type=squadra"), id); assert.equal(missing.status, 404); assert.match(missing.headers.get("cache-control"), /private.*no-store/);
});

import assert from "node:assert/strict";
import {test} from "node:test";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
const load = adminServerLoader();
const {createCommunityService} = load("apps/admin/src/features/community/server/service.ts");
const {parseCommunityQuery, parseReport, parseInvitationCode, parseCommunityPage, parseInvitationDetail} = load("apps/admin/src/features/community/contracts.ts");
const id = "eeeeeeee-eeee-4eee-8eee-000000000001";
const report = {id, number: "9007199254740993", createdAt: "2026-11-14T10:00:00+00:00", targetKind: "profilo", targetId: id, title: "Profilo", reporterEmail: null, reason: null, status: "open", version: 0, note: "", updatedAt: null, updatedBy: null, profileTypes: ["squadra"]};
const owner = {id, email: "inviter@example.test", code: "ABCDEF0123456789", total: 1, pending: 1};
function harness({data = {items: [], hasMore: false}, error = null, claims = {sub: id, session_id: id, role: "authenticated", exp: Date.now() / 1000 + 1000}, authError = null} = {}) {
  const calls = [], logs = [], failures = [];
  const service = createCommunityService({async getClient() {calls.push("client"); return {auth: {async getClaims() {return {data: claims ? {claims} : null, error: authError};}}, async rpc(name, args) {calls.push({name, args}); return {data, error};}};}, log: (...args) => logs.push(args), async failure(event) {failures.push(event);}});
  return {service, calls, logs, failures};
}
for (const input of [null, [], {offset: -1}, {offset: 0.5}, {offset: 1000001}, {status: "foo"}, {from: "2026-02-30"}, {from: "2026-11-15", to: "2026-11-14"}, {search: null}, {pending: true}]) test(`invalid report query ${JSON.stringify(input)} never opens a client`, async () => {
  const h = harness(); assert.equal((await h.service.list("reports", input)).status, "invalid"); assert.equal(h.calls.length, 0);
});
test("strict invitation query and report input validation", async () => {
  assert.throws(() => parseCommunityQuery("invitations", {pending: "true"}));
  assert.throws(() => parseCommunityQuery("invitations", {status: "open"}));
  const h = harness(); assert.equal((await h.service.update("reports", {id, status: "open", note: "a".repeat(1001), version: 0})).status, "invalid"); assert.equal(h.calls.length, 0);
  assert.equal((await h.service.detail("reports", "bad")).status, "invalid");
});
test("safe projection discards hashes, credentials and unexpected data", () => {
  assert.deepEqual(parseReport({...report, chiave_anonima_hash: "secret"}), report);
  assert.equal(parseReport(report).number, "9007199254740993");
  assert.deepEqual(parseInvitationCode({...owner, password: "secret"}), owner);
  assert.throws(() => parseInvitationCode({...owner, total: 0}));
  assert.throws(() => parseCommunityPage({items: [report, report], hasMore: false}, parseReport));
  assert.throws(() => parseCommunityPage({items: [], hasMore: true}, parseReport));
  assert.throws(() => parseReport({...report, profileTypes: ["../evil"]}));
});
test("success reads verify claims and use only the functional RPC", async () => {
  const h = harness({data: {items: [report], hasMore: false}});
  assert.equal((await h.service.list("reports", {})).status, "ok"); assert.equal(h.calls[1].name, "admin_list_reports_v1");
  const d = harness({data: report}); assert.equal((await d.service.detail("reports", id)).status, "ok");
  assert.equal((await harness({data: {...report, id: "eeeeeeee-eeee-4eee-8eee-000000000002"}}).service.detail("reports", id)).status, "unavailable");
});
for (const claims of [null, {sub: id, role: "service_role", exp: Date.now() / 1000 + 1000}, {sub: id, session_id: id, role: "authenticated", exp: 1}]) test("unverified sessions cannot read protected data", async () => {
  const h = harness({claims}); assert.equal((await h.service.list("invitations", {})).status, "denied"); assert.equal(h.calls.length, 1);
});
for (const [error, status] of [[{code: "42501", message: "ADMIN_ACCESS_DENIED"}, "denied"], [{code: "42501", message: "ADMIN_SESSION_POLICY_UNVERIFIED"}, "unavailable"], [{code: "22023", message: "secret"}, "invalid"], [{code: "PGRST202", message: "secret"}, "unavailable"]]) test(`read error ${error.code} is bounded and sanitized`, async () => {
  const h = harness({error}); const result = await h.service.list("reports", {}); assert.equal(result.status, status); assert(!JSON.stringify(result).includes("secret"));
});
test("report and invitation mutations project receipts and audit failures separately", async () => {
  const h = harness({data: {status: "ok", id, changed: true, eventId: id}});
  assert.equal((await h.service.update("reports", {id, status: "resolved", note: "internal", version: 0})).status, "ok"); assert.equal(h.failures.length, 0);
  const conflict = harness({data: {status: "conflict"}});
  assert.equal((await conflict.service.update("invitations", {id, considered: true, expected: false})).status, "conflict");
  assert.equal(conflict.failures[0].action, "invitation.consider"); assert.equal(conflict.failures[0].code, "STATE_CONFLICT");
  assert.equal((await harness({data: {status: "ok", id, changed: true}}).service.update("reports", {id, status: "working", note: "", version: 0})).status, "unavailable");
});
test("invitation detail rejects unconfirmed/malformed entries and a different owner", async () => {
  const v = {owner, items: [{id, email: null, registeredAt: report.createdAt, confirmedAt: report.createdAt, considered: false}], hasMore: false};
  assert.equal(parseInvitationDetail(v).items.length, 1);
  assert.throws(() => parseInvitationDetail({...v, items: [{...v.items[0], confirmedAt: null}]}));
  assert.equal((await harness({data: null}).service.detail("invitations", id)).status, "not_found");
});
test("HTTP adapters reject duplicate parameters and return private no-store", async () => {
  let calls = 0;
  const http = adminServerLoader({dependencies: {"./index": {communityService() {return {async list() {calls++; return {status: "denied"};}, async detail() {calls++; return {status: "not_found"};}};}}}})("apps/admin/src/features/community/server/http.ts").communityHttp;
  const duplicate = await http("reports", new Request("http://localhost/api/segnalazioni?status=all&status=open")); assert.equal(duplicate.status, 400); assert.equal(calls, 0);
  for (const query of ["offset=-1", "offset=NaN", "offset=", "pending=1"]) assert.equal((await http("invitations", new Request("http://localhost/api/codici-invito?" + query))).status, 400);
  const denied = await http("reports", new Request("http://localhost/api/segnalazioni")); assert.equal(denied.status, 403); assert.match(denied.headers.get("cache-control"), /private.*no-store/);
  const missing = await http("reports", new Request("http://localhost/api/segnalazioni/" + id), id); assert.equal(missing.status, 404);
});

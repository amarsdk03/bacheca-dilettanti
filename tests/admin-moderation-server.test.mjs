import assert from "node:assert/strict";
import { test } from "node:test";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
import { createModerationFixture } from "./helpers/admin-moderation-fixture.mjs";
import { listId, listClaims } from "./helpers/admin-announcements-fixture.mjs";
const load = adminServerLoader();
const base = "apps/admin/src/features/annunci/";
const { parseModerationInput, capability } = load(base + "moderation.ts");
const { createModerationService } = load(base + "server/moderation-service.ts");
const id = listId(1000), eventId = listId(2000), correlationId = listId(3000);
const input = { id, operation: "reject", fingerprint: "content-v1:" + "a".repeat(64), reason: " Motivo pubblico " };
const ok = { status: "ok", id, eventId, correlationId };
function harness(options = {}) {
  const calls = [], failures = [], logs = [];
  const client = { auth: { async getClaims() { calls.push("claims"); if (options.claimThrows) throw new Error("private error"); return { data: options.noSession ? null : { claims: listClaims(options.claims) }, error: null }; } },
    async rpc(name, args) { calls.push({ name, args }); if (options.rpcThrows) throw new Error("private error"); return { data: options.response ?? ok, error: options.error ?? null }; } };
  return { calls, failures, logs, options, run: createModerationService({ async getClient() { calls.push("client"); return client; },
    async failure(event) { failures.push(event); calls.push("failure-after-rpc"); if (options.auditThrows) throw new Error("private audit error"); },
    log(code, correlationId) { logs.push({ code, correlationId }); } }) };
}
test("input contract is closed, trims reason and counts Unicode code points", () => {
  assert.equal(parseModerationInput(input).reason, "Motivo pubblico");
  assert.equal(parseModerationInput({ ...input, reason: "😀".repeat(1000) }).reason.length, 2000);
  for (const bad of [null, {}, { ...input, actor: "forged" }, { ...input, operation: "destroy" }, { ...input, id: "bad" },
    { ...input, fingerprint: "rowFingerprint" }, { ...input, reason: null }, { ...input, reason: " \n " }, { ...input, reason: "😀".repeat(1001) }, { ...input, operation: "approve" }]) assert.throws(() => parseModerationInput(bad));
});
test("invalid input never creates session or audit transport", async () => {
  const h = harness(); assert.equal((await h.run({ ...input, reason: "" })).status, "invalid"); assert.deepEqual(h.calls, []); assert.deepEqual(h.failures, []);
});
test("success uses the human client and one mutation RPC, no authorization RPC or success attestation", async () => {
  const h = harness(); assert.deepEqual(await h.run(input), ok);
  assert.deepEqual(h.calls, ["client", "claims", { name: "admin_moderate_announcement_v1", args: { p_id: id, p_operation: "reject", p_fingerprint: input.fingerprint, p_reason: "Motivo pubblico" } }]);
  assert.deepEqual(h.failures, []);
});
for (const [name, options, status] of [
  ["no session", { noSession: true }, "denied"], ["expired session", { claims: { exp: 1 } }, "denied"],
  ["technical claims", { claims: { role: "service_role" } }, "denied"], ["Auth failure", { claimThrows: true }, "unavailable"],
  ["revoked role", { error: { code: "42501", message: "ADMIN_ACCESS_DENIED" } }, "denied"],
  ["unverified deployment policy", { error: { code: "42501", message: "ADMIN_SESSION_POLICY_UNVERIFIED" } }, "unavailable"],
  ["version conflict", { response: { status: "conflict", correlationId } }, "conflict"],
  ["missing resource", { response: { status: "not_found", correlationId } }, "not_found"],
  ["payment missing", { response: { status: "not_allowed", reason: "PAYMENT_REQUIRED", correlationId } }, "not_allowed"],
  ["SQL rollback", { response: { status: "unavailable", correlationId } }, "unavailable"],
  ["transport failure", { rpcThrows: true }, "unavailable"], ["malformed response", { response: { status: "ok", id, eventId: "bad", correlationId } }, "unavailable"],
  ["forged resource response", { response: { ...ok, id: listId(9999) } }, "unavailable"],
]) test(`${name}: bounded outcome, separate failure audit, no automatic retry`, async () => {
  const h = harness(options), result = await h.run(input); assert.equal(result.status, status);
  assert(h.calls.filter(v => typeof v === "object").length <= 1);
  assert.equal(h.failures.length, 1); assert.equal(h.failures[0].action, "announcement.reject");
  assert.equal(h.calls.at(-1), "failure-after-rpc"); assert(!JSON.stringify(h.failures).includes("Motivo pubblico"));
  assert(!JSON.stringify(result).includes("private error"));
});
test("failure audit outage cannot convert failure into success or leak diagnostics", async () => {
  const h = harness({ auditThrows: true, response: { status: "conflict", correlationId } }); assert.equal((await h.run(input)).status, "conflict"); assert.equal(h.logs.length, 1);
});
test("role/session is not cached between successful calls", async () => {
  const h = harness(); assert.equal((await h.run(input)).status, "ok"); h.options.error = { code: "42501" };
  assert.equal((await h.run(input)).status, "denied"); assert.equal(h.calls.filter(v => v === "claims").length, 2);
});
test("actual Server Action wires writable client; only failure outcomes invoke the separate audit service", async () => {
  let audit = 0, rpc = 0;
  const l = adminServerLoader({ dependencies: {
    "@/lib/supabase/server": { async createClient() { return { auth: { async getClaims() { return { data: { claims: listClaims() }, error: null }; } }, async rpc() { rpc++; return { data: ok, error: null }; } }; } },
    "@/features/audit/server": { createAdminAuditService() { audit++; throw new Error("Unexpected audit attestation"); } },
  } });
  assert.deepEqual(await l(base + "server/actions.ts").moderateAnnouncementAction(input), ok); assert.equal(rpc, 1); assert.equal(audit, 0);
});
test("capabilities fail closed for old DTO and client-side incomplete details", () => {
  assert(!capability({ complete: true }, "approve").allowed);
  assert(!capability({ complete: false, moderation: { capabilities: { approve: { allowed: true, reason: null } } } }, "approve").allowed);
});

test("trash has an internal reason, restore has none, and both retain the single mutation transport", async () => {
  for(const operation of ["trash","restore"]) {
    const payload={...input,operation,reason:operation==="trash"?"😀".repeat(1000):null};
    assert.equal(parseModerationInput(payload).operation,operation);
    const h=harness(); assert.deepEqual(await h.run(payload),ok);
    assert.equal(h.calls.filter(v=>typeof v==="object").length,1);
    assert.equal(h.calls.find(v=>typeof v==="object").args.p_operation,operation); assert.deepEqual(h.failures,[]);
  }
  for(const payload of [{...input,operation:"trash",reason:null},{...input,operation:"trash",reason:"😀".repeat(1001)},{...input,operation:"restore"}]) assert.throws(()=>parseModerationInput(payload));
});
test("real SQL detail DTO, service and mutation compose with synthetic transport", async (t) => {
  const h = await createModerationFixture(); t.after(() => h.db.close()); await h.reset();
  await h.insert(1000); await h.child(id, "annuncio_giocatore");
  const { parseDetailResponse } = load(base + "server/detail-response.ts");
  const detail = parseDetailResponse(await h.detail(id), id); assert(detail.moderation.capabilities.approve.allowed);
  const run = createModerationService({ async getClient() { return { auth: { async getClaims() { return { data: { claims: listClaims() }, error: null }; } },
    async rpc(_name, args) { return { data: await h.moderate(args.p_id, args.p_operation, args.p_fingerprint, args.p_reason), error: null }; } }; }, failure: async () => {}, log() {} });
  assert.equal((await run({ id, operation: "approve", fingerprint: detail.contentFingerprint, reason: null })).status, "ok");
  const updated = parseDetailResponse(await h.detail(id), id); assert.equal(updated.summary.status, "pubblicato"); assert(!updated.moderation.capabilities.approve.allowed);
});

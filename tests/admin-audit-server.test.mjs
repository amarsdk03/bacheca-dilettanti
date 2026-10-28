import assert from "node:assert/strict";
import { test } from "node:test";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const id = (n) => `cccccccc-cccc-4ccc-8ccc-${String(n).padStart(12, "0")}`;
const authId = id(1), userId = id(101), sessionId = id(501), eventId = id(1001);
const servicePath = "apps/admin/src/features/audit/server/service.ts";
const transportPath = "apps/admin/src/features/audit/server/transport.ts";
const claims = (extra = {}) => ({ role: "authenticated", sub: authId, session_id: sessionId,
  exp: Math.floor(Date.now() / 1000) + 3600, ...extra });

function harness(options = {}) {
  const order = [], writes = [], logs = [];
  let cleared = 0, revocations = 0, contextReads = 0, claimReads = 0;
  const client = {
    auth: {
      async getClaims() {
        order.push("claims"); claimReads++;
        if (options.claimThrows) throw new Error("secret Auth error");
        return { data: options.anonymous ? null : { claims: options.claims ?? claims() }, error: options.claimError ?? null };
      },
      async signOut(input) {
        order.push("signout"); revocations++; assert.deepEqual(input, { scope: "local" });
        if (options.signOutThrows) throw new Error("secret revocation error");
        return { error: options.signOutError ?? null };
      },
    },
    async rpc(name) {
      assert.equal(name, "admin_get_context_v1"); order.push("context"); contextReads++;
      if (options.contextThrows) throw new Error("secret context error");
      return { data: options.contextData ?? [{ auth_user_uuid: authId, utente_uuid: userId }], error: options.contextError ?? null };
    },
  };
  const service = adminServerLoader() (servicePath).createAuditService({
    async getSessionClient() {
      if (options.clientThrows) throw new Error("secret config error");
      return client;
    },
    async writeEvent(event) {
      order.push("audit"); writes.push(event);
      if (options.writeThrows) throw new Error("password=secret raw database error");
      return options.eventId ?? eventId;
    },
    log(code, correlationId) {
      logs.push({ code, correlationId });
      if (options.logThrows) throw new Error("secret logger failure");
    },
  });
  const clear = async () => {
    order.push("clear"); cleared++;
    if (options.clearThrows) throw new Error("secret cookie error");
  };
  return { service, clear, writes, order, logs, client,
    counts: () => ({ cleared, revocations, contextReads, claimReads }) };
}

test("login confirmation follows verified session/context and recorded audit, without cleanup on success", async () => {
  const h = harness({ claims: claims({ user_metadata: { actorId: id(999), role: "Admin" } }) });
  const result = await h.service.recordLoginSuccess(h.clear);
  assert.equal(result.status, "recorded"); assert.equal(result.eventId, eventId);
  assert.deepEqual(h.order, ["claims", "context", "audit"]);
  assert.equal(h.writes[0].actorAuthId, authId); assert.equal(h.writes[0].actorUserId, userId);
  assert.equal(h.writes[0].resourceId, sessionId); assert.equal(h.writes[0].action, "auth.login");
  assert.equal(h.counts().cleared, 0);
});
for (const options of [{ writeThrows: true }, { eventId: "invalid" }]) {
  test(`audit error blocks login and clears session ${JSON.stringify(options)}`, async () => {
    const h = harness(options); const result = await h.service.recordLoginSuccess(h.clear);
    assert.equal(result.status, "unavailable"); assert.equal(result.cleanup, "cleared");
    assert.equal(result.revocation, "succeeded"); assert.deepEqual(h.order, ["claims", "context", "audit", "signout", "clear"]);
    assert.equal(h.writes.length, 1); // No automatic retry after an uncertain write.
    assert(!JSON.stringify(h.logs).includes("secret"));
  });
}
for (const [label, options] of [
  ["role denied", { contextError: { code: "42501", message: "secret SQL error" } }],
  ["subject mismatch", { contextData: [{ auth_user_uuid: id(9), utente_uuid: userId }] }],
  ["invalid application ID", { contextData: [{ auth_user_uuid: authId, utente_uuid: "invalid" }] }],
  ["missing mapping result", { contextData: [] }],
  ["duplicate mapping result", { contextData: [{ auth_user_uuid: authId, utente_uuid: userId }, { auth_user_uuid: authId, utente_uuid: id(2) }] }],
  ["database unavailable", { contextThrows: true }],
  ["missing configuration", { clientThrows: true }],
  ["Auth unavailable", { claimError: { code: "unexpected_failure", message: "secret" } }],
]) test(`${label} prevents login success and still attempts cleanup`, async () => {
  const h = harness(options); const result = await h.service.recordLoginSuccess(h.clear);
  assert.notEqual(result.status, "recorded"); assert.equal(result.cleanup, "cleared");
  assert.equal(h.counts().cleared, 1); assert.equal(h.writes[0].outcome, "failure");
  assert.equal(h.writes[0].actorUserId, null);
  assert(h.order.indexOf("clear") < h.order.indexOf("audit"));
  assert(!JSON.stringify(h.logs).includes("secret"));
});
for (const [label, value] of [
  ["expired", claims({ exp: 1 })], ["missing session", claims({ session_id: undefined })],
  ["malformed subject", claims({ sub: "bad" })], ["string expiry", claims({ exp: "9999999999" })],
  ["future nbf", claims({ nbf: Date.now() / 1000 + 3600 })], ["invalid nbf", claims({ nbf: "bad" })],
  ["metadata role only", claims({ role: undefined, user_metadata: { role: "authenticated" } })],
  ["service JWT", claims({ role: "service_role" })],
]) test(`claims ${label} are not used as a verified actor`, async () => {
  const h = harness({ claims: value }); const result = await h.service.recordLoginSuccess(h.clear);
  assert.equal(result.status, "denied"); assert.equal(h.counts().contextReads, 0);
  assert.equal(h.writes[0].actorAuthId, null); assert.equal(h.writes[0].actorUserId, null);
});
test("getClaims validation errors and missing sessions do not invent identity", async () => {
  for (const options of [{ anonymous: true }, { claimError: { code: "bad_jwt", message: "secret" } }]) {
    const h = harness(options);
    await h.service.recordAuthFailure({ action: "auth.login", code: "INVALID_CREDENTIALS", actorAuthId: id(999), email: "person@example.test" });
    assert.equal(h.writes[0].actorAuthId, null); assert.equal(h.writes[0].resourceId, null);
    assert(!JSON.stringify(h.writes).includes("example.test"));
  }
});
test("failure identity may retain verified subject without pretending to have an Admin mapping", async () => {
  const h = harness({ contextError: { code: "42501" } });
  const result = await h.service.recordAuthFailure({ action: "auth.access_denied", code: "ACCESS_DENIED" });
  assert.equal(result.status, "recorded"); assert.equal(h.writes[0].actorAuthId, authId);
  assert.equal(h.writes[0].actorUserId, null);
});
test("functional failure uses only bounded fields and preserves the existing server correlation", async () => {
  const h = harness(); const correlationId = id(777);
  const result = await h.service.recordOperationFailure({ action: "announcement.approve", code: "STATE_CONFLICT",
    resourceId: id(901), correlationId, actorUserId: id(999), details: { token: "secret" } });
  assert.equal(result.correlationId, correlationId); assert.equal(h.writes[0].outcome, "failure");
  assert.equal(h.writes[0].actorUserId, userId); assert.equal(h.writes[0].resourceId, id(901));
  assert(!("details" in h.writes[0]));
});
test("failure audit unavailability returns a result, never replaces the original functional error", async () => {
  const h = harness({ writeThrows: true });
  const original = new Error("original mutation failure");
  let reported;
  try { throw original; } catch (error) {
    reported = await h.service.recordOperationFailure({ action: "announcement.hide", code: "OPERATION_FAILED" });
    assert.equal(error, original);
  }
  assert.equal(reported.status, "unavailable"); assert.equal(h.writes.length, 1);
});
for (const input of [
  { action: "announcement.approve", code: "secret raw error" },
  { action: "announcement.approve", code: "OPERATION_FAILED", correlationId: "secret" },
  { action: "announcement.approve", code: "OPERATION_FAILED", resourceId: "secret" },
  { action: "announcement.export", code: "EXPORT_FAILED", resourceId: id(901) },
  { action: "announcement.read", code: "OPERATION_FAILED" },
]) test(`invalid failure input is rejected without transport ${JSON.stringify(input)}`, async () => {
  const h = harness(); const result = await h.service.recordOperationFailure(input);
  assert.equal(result.status, "unavailable"); assert.equal(h.writes.length, 0);
  assert.equal(h.counts().claimReads, 0); assert(!JSON.stringify(h.logs).includes("secret"));
});

test("logout snapshots actor, revokes current session, clears local cookies, then records", async () => {
  const h = harness(); const result = await h.service.logoutWithAudit(h.clear);
  assert.deepEqual(h.order, ["claims", "context", "signout", "clear", "audit"]);
  assert.equal(result.revocation, "succeeded"); assert.equal(result.cleanup, "cleared"); assert.equal(result.audit.status, "recorded");
  assert.equal(h.writes[0].actorUserId, userId); assert.equal(h.writes[0].resourceId, sessionId);
});
for (const options of [{ signOutThrows: true }, { signOutError: { message: "secret" } },
  { writeThrows: true }, { clearThrows: true }, { contextThrows: true }, { clientThrows: true },
  { writeThrows: true, logThrows: true }, { signOutThrows: true, writeThrows: true, logThrows: true }]) {
  test(`logout always attempts local cleanup ${JSON.stringify(options)}`, async () => {
    const h = harness(options); const result = await h.service.logoutWithAudit(h.clear);
    assert.equal(h.counts().cleared, 1);
    assert.equal(result.cleanup, options.clearThrows ? "failed" : "cleared");
    if (h.writes.length) assert(h.order.indexOf("clear") < h.order.indexOf("audit"));
    if (options.signOutThrows || options.signOutError || options.clearThrows) {
      assert.equal(h.writes[0].outcome, "failure"); assert.equal(h.writes[0].failureCode, "LOGOUT_FAILED");
    }
    assert(!JSON.stringify(h.logs).includes("secret"));
  });
}
test("logout without a verified Admin cleans up without inventing successful Admin logout", async () => {
  for (const options of [{ anonymous: true }, { contextError: { code: "42501" } }]) {
    const h = harness(options); const result = await h.service.logoutWithAudit(h.clear);
    assert.equal(result.audit.status, "skipped"); assert.equal(h.counts().cleared, 1); assert.equal(h.writes.length, 0);
  }
});
test("login cleanup still runs when revocation and diagnostics fail", async () => {
  const h = harness({ writeThrows: true, signOutThrows: true, logThrows: true });
  const result = await h.service.recordLoginSuccess(h.clear);
  assert.equal(result.status, "unavailable"); assert.equal(result.cleanup, "cleared"); assert.equal(result.revocation, "failed");
});
test("service never caches verified role across operations", async () => {
  const h = harness();
  await h.service.recordLoginSuccess(h.clear);
  h.client.rpc = async () => ({ data: null, error: { code: "42501" } });
  const next = await h.service.recordLoginSuccess(h.clear);
  assert.equal(next.status, "denied"); assert.equal(h.counts().claimReads, 2);
});

function transportHarness(env, { rpcError = null, rpcThrows = false, response = eventId } = {}) {
  const calls = [], fetches = [];
  const load = adminServerLoader({ env, fetch: async (input, init) => { fetches.push({ input, init }); return new Response(); },
    dependencies: { "@supabase/supabase-js": { createClient(url, key, options) {
      calls.push({ url, key, options });
      return { async rpc(name, args) {
        calls.push({ name, args });
        if (rpcThrows) throw new Error("secret transport URL header password");
        return { data: response, error: rpcError };
      } };
    } } },
  });
  return { write: load(transportPath).writeServerAudit, calls, fetches };
}
const event = { action: "auth.login", outcome: "success", correlationId: id(777), actorAuthId: authId,
  actorUserId: userId, resourceId: sessionId, failureCode: null };
test("transport has no session storage, cookie header, user bearer or response cache", async () => {
  const h = transportHarness({ NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_synthetic" });
  assert.equal(await h.write({ ...event, password: "discarded", changes: { secret: true } }), eventId);
  const creation = h.calls[0], rpc = h.calls[1];
  assert.deepEqual(creation.options.auth, { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false });
  assert(!creation.options.global.headers); assert(!creation.options.cookies);
  assert.equal(rpc.name, "admin_record_server_audit_v1");
  assert.deepEqual(Object.keys(rpc.args).sort(), ["p_action","p_outcome","p_correlation_uuid","p_actor_auth_user_uuid","p_actor_utente_uuid","p_resource_uuid","p_failure_code"].sort());
  await creation.options.global.fetch("https://synthetic.supabase.co/rest/v1/rpc/example", {});
  assert.equal(h.fetches[0].init.cache, "no-store"); assert(h.fetches[0].init.signal instanceof AbortSignal);
});
for (const env of [{}, { NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.supabase.co" },
  { NEXT_PUBLIC_SUPABASE_URL: "https://user:password@synthetic.supabase.co", SUPABASE_SECRET_KEY: "secret" },
  { NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.supabase.co/path", SUPABASE_SECRET_KEY: "secret" }]) {
  test("missing/invalid backend configuration is sanitized before client construction", async () => {
    const h = transportHarness(env);
    await assert.rejects(h.write(event), (error) => error.message === "ADMIN_AUDIT_WRITE_UNAVAILABLE");
    assert.equal(h.calls.length, 0);
  });
}
for (const options of [{ rpcError: { message: "secret SQL" } }, { rpcThrows: true }, { response: "bad" }]) {
  test("transport errors are sanitized and never retried", async () => {
    const h = transportHarness({ NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_synthetic" }, options);
    await assert.rejects(h.write(event), (error) => error.message === "ADMIN_AUDIT_WRITE_UNAVAILABLE");
    assert.equal(h.calls.length, 2);
  });
}
test("Auth error mapping emits bounded codes without using raw error text", () => {
  const { mapAuthAuditFailure } = adminServerLoader()("apps/admin/src/features/audit/contracts.ts");
  assert.equal(mapAuthAuditFailure({ code: "invalid_credentials", message: "secret" }), "INVALID_CREDENTIALS");
  assert.equal(mapAuthAuditFailure({ code: "user_banned" }), "ACCESS_DENIED");
  assert.equal(mapAuthAuditFailure({ code: "session_not_found" }), "SESSION_INVALID");
  assert.equal(mapAuthAuditFailure(new Error("secret")), "AUTH_UNAVAILABLE");
});

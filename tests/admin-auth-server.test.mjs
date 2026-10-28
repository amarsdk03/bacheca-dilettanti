import assert from "node:assert/strict";
import { test } from "node:test";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server.js";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const base = "bacheca-admin-auth-token";
const id = (n) => `dddddddd-dddd-4ddd-8ddd-${String(n).padStart(12, "0")}`;
const authId = id(1), userId = id(2), sessionId = id(3), eventId = id(4);
const env = { NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.supabase.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key" };
const form = (email = "admin@example.test", password = " secret password ") => {
  const data = new FormData(); data.set("email", email); data.set("password", password); return data;
};
const claims = () => ({ sub: authId, session_id: sessionId, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 });
const load = adminServerLoader();
const { createAdminCookieBuffer, isAdminCookie } = load("apps/admin/src/lib/supabase/cookie-buffer.ts");

function harness(options = {}) {
  const order = [], writes = [], events = [], logs = [];
  let signedIn = false, commits = 0, signIns = 0, contextReads = 0;
  const incoming = [{ name: base + ".7", value: "old-admin" }, { name: "sb-web-auth-token.0", value: "web-unchanged" }];
  let buffer;
  const client = {
    auth: {
      async signInWithPassword(credentials) {
        signIns++; order.push("signin"); assert.deepEqual(credentials, { email: "admin@example.test", password: " secret password " });
        if (options.signInThrows) throw new Error("secret provider details");
        if (options.signInError) return { error: options.signInError };
        signedIn = true;
        buffer.setAll([0, 1].map((n) => ({ name: `${base}.${n}`, value: `synthetic-token-${n}`, options: { path: "/" } })));
        return { error: null };
      },
      async getClaims() {
        order.push("claims");
        if (options.claimThrows) throw new Error("secret claims error");
        return { data: signedIn ? { claims: { ...claims(), ...options.claims } } : null, error: null };
      },
      async signOut(input) {
        order.push("signout"); assert.deepEqual(input, { scope: "local" });
        if (options.signOutThrows) throw new Error("secret signout error");
        if (options.signOutError) return { error: options.signOutError };
        signedIn = false; return { error: null };
      },
    },
    async rpc(name) {
      assert.equal(name, "admin_get_context_v1"); contextReads++; order.push("context");
      return { data: options.contextData ?? [{ auth_user_uuid: authId, utente_uuid: userId }], error: options.contextError ?? null };
    },
  };
  const createAuditService = load("apps/admin/src/features/audit/server/service.ts").createAuditService;
  const auditFor = (getSessionClient) => createAuditService({
    getSessionClient,
    async writeEvent(event) {
      order.push("audit"); events.push(event);
      // No new session cookie may escape before the audit promise resolves.
      if (event.action === "auth.login" && event.outcome === "success") assert(!writes.some(({ value }) => value.startsWith("synthetic-token")));
      if (options.auditThrows) throw new Error("secret audit error");
      return eventId;
    },
    log: (code, correlationId) => logs.push({ code, correlationId }),
  });
  const service = load("apps/admin/src/features/auth/server/service.ts").createAuthService({
    async createSession(fresh) {
      order.push("session");
      if (options.sessionThrows) throw new Error("secret cookies error");
      signedIn = !fresh;
      buffer = createAdminCookieBuffer(incoming, (name, value, cookieOptions) => {
        order.push(value ? "cookie-value" : "cookie-expire"); writes.push({ name, value, options: cookieOptions });
        if (options.clearThrows && !value) throw new Error("secret clear error");
      }, fresh);
      return {
        async getClient() { if (options.clientThrows) throw new Error("secret configuration"); return client; },
        commit() { order.push("commit"); commits++; if (options.commitThrows) throw new Error("secret commit error"); buffer.commit(); },
        clear: buffer.clear,
      };
    },
    auditFor,
    async clearFallback() { order.push("fallback-clear"); if (options.clearThrows) throw new Error("secret fallback"); },
    log: (code, correlationId) => logs.push({ code, correlationId }),
  });
  return { service, order, writes, events, logs, counts: () => ({ commits, signIns, contextReads }) };
}

test("login uses the same verified session and commits cookies strictly after audit", async () => {
  const h = harness(); assert.deepEqual(await h.service.login(form(" admin@example.test ")), { status: "authenticated" });
  assert.deepEqual(h.order.slice(0, 6), ["session", "signin", "claims", "context", "audit", "commit"]);
  assert.equal(h.counts().contextReads, 1); assert.equal(h.counts().signIns, 1);
  assert.equal(h.events[0].actorAuthId, authId); assert.equal(h.events[0].actorUserId, userId);
  assert(h.writes.some(({ name, value }) => name === base + ".7" && value === ""));
  assert(!h.writes.some(({ name }) => name.startsWith("sb-web")));
  assert(!JSON.stringify(h.events).includes("password")); assert(!JSON.stringify(h.events).includes("example.test"));
});

for (const [label, options, status] of [
  ["ordinary/revoked account", { contextError: { code: "42501" } }, "denied"],
  ["unreviewed session policy", { contextError: { code: "42501", message: "ADMIN_SESSION_POLICY_UNVERIFIED" } }, "unavailable"],
  ["missing mapping", { contextData: [] }, "unavailable"],
  ["mismatched subject", { contextData: [{ auth_user_uuid: id(9), utente_uuid: userId }] }, "unavailable"],
  ["expired token", { claims: { exp: 1 } }, "denied"],
  ["Auth failure", { claimThrows: true }, "unavailable"],
  ["audit error", { auditThrows: true }, "unavailable"],
  ["configuration missing", { clientThrows: true }, "unavailable"],
  ["provider exception", { signInThrows: true }, "unavailable"],
]) test(`${label} cannot commit login cookies`, async () => {
  const h = harness(options); const result = await h.service.login(form());
  assert.equal(result.status, status); assert.equal(result.cleanup, "cleared");
  assert.equal(h.counts().commits, 0); assert(!h.writes.some(({ value }) => value));
  assert(!JSON.stringify(result).includes("secret")); assert(!JSON.stringify(h.logs).includes("secret"));
});

for (const code of ["invalid_credentials", "email_not_confirmed", "user_banned", "over_request_rate_limit"]) {
  test(`sign-in failure ${code} is bounded, audited and cleaned without cookie commit`, async () => {
    const h = harness({ signInError: { code, message: "secret" } }); const result = await h.service.login(form());
    assert.equal(result.status, code === "over_request_rate_limit" ? "unavailable" : "invalid");
    assert.equal(h.events[0].outcome, "failure"); assert.equal(h.events[0].actorAuthId, null);
    assert.equal(result.cleanup, "cleared"); assert.equal(h.counts().commits, 0);
    assert(!JSON.stringify(result).includes("password")); assert(!JSON.stringify(h.events).includes("secret"));
  });
}

test("failed audit is not retried and cleanup remains explicit when revocation/expiry fail", async () => {
  const h = harness({ auditThrows: true, signOutThrows: true, clearThrows: true });
  const result = await h.service.login(form());
  assert.equal(result.status, "unavailable"); assert.equal(result.cleanup, "failed"); assert.equal(result.revocation, "failed");
  assert.equal(h.events.length, 1); assert.equal(h.counts().signIns, 1);
  assert(h.writes.some(({ name }) => name === base + ".0")); assert(h.writes.some(({ name }) => name === base + ".1"));
});

test("cookie commit failure revokes and expires the session without claiming login success", async () => {
  const h = harness({ commitThrows: true }); const result = await h.service.login(form());
  assert.equal(result.status, "unavailable"); assert.equal(result.cleanup, "cleared");
  assert(h.order.indexOf("commit") < h.order.indexOf("signout"));
  assert.deepEqual(h.events.map(({ action, outcome }) => [action, outcome]), [["auth.login", "success"], ["auth.login", "failure"]]);
});

test("missing cookie store uses independent cleanup fallback", async () => {
  const h = harness({ sessionThrows: true }); const result = await h.service.login(form());
  assert.equal(result.status, "unavailable"); assert.equal(result.cleanup, "cleared"); assert(h.order.includes("fallback-clear"));
});

test("invalid input, files and oversize values do not reach Auth or audit", async () => {
  const cases = [form("bad"), form("admin@example.test", ""), form("a".repeat(321) + "@example.test"), form("admin@example.test", "x".repeat(4097))];
  const fileInput = form(); fileInput.set("password", new Blob(["secret"]), "password.txt"); cases.push(fileInput);
  for (const input of cases) {
    const h = harness(); const result = await h.service.login(input);
    assert.equal(result.status, "invalid"); assert(result.fieldErrors); assert.equal(h.order.length, 0);
    assert(!JSON.stringify(result).includes("secret"));
  }
});

for (const options of [{}, { auditThrows: true }, { signOutError: { code: "offline" } }, { clientThrows: true }, { sessionThrows: true }, { clearThrows: true }]) {
  test(`logout uses snapshot, local scope and unconditional cookie expiry ${JSON.stringify(options)}`, async () => {
    const h = harness(options); const result = await h.service.logout();
    assert.equal(result.cleanup, options.clearThrows ? "failed" : "cleared");
    if (!options.sessionThrows) assert(h.writes.some(({ name }) => name === base + ".7"));
    else assert(h.order.includes("fallback-clear"));
    assert(!h.writes.some(({ name }) => name.startsWith("sb-web")));
    if (!options.clientThrows && !options.sessionThrows) {
      assert(h.order.indexOf("context") < h.order.indexOf("signout"));
      assert(h.order.indexOf("cookie-expire") < h.order.indexOf("audit"));
      assert.equal(h.events[0].actorAuthId, authId);
    }
  });
}

test("Admin cookie matching is exact, including all chunks/accessory storage", () => {
  for (const name of [base, base + ".0", base + ".123", base + "-code-verifier", base + "-code-verifier.2", base + "-user.0"]) assert(isAdminCookie(name));
  for (const name of ["sb-web-auth-token", base + "-other", base + ".evil", base + "-copy.0", "prefix-" + base]) assert(!isAdminCookie(name));
});

test("cookie expiration preserves each actual chunk name in Next Set-Cookie headers", () => {
  for (const fresh of [false, true]) {
    const incoming = [{ name: base + ".0", value: "first" }, { name: base + ".1", value: "second" },
      { name: base + ".99", value: "stale" }, { name: "sb-web-auth-token.0", value: "web" }];
    const response = NextResponse.next();
    const buffer = createAdminCookieBuffer(incoming, (name, value, options) => response.cookies.set(name, value, options), fresh);
    if (fresh) buffer.commit(); else buffer.clear();
    const expired = response.headers.getSetCookie().map(header => header.split(";")[0].split("=")[0]);
    for (const name of [base + ".0", base + ".1", base + ".99"]) assert(expired.includes(name), "Missing expiration for " + name);
    assert(!expired.includes("sb-web-auth-token.0"));
    for (const header of response.headers.getSetCookie()) assert.match(header, /Max-Age=0/i);
  }
});

test("buffer expires all known names even after partial commit and a cleanup write error", () => {
  const attempts = [];
  const b = createAdminCookieBuffer([{ name: base + ".9", value: "old" }], (name, value) => {
    attempts.push({ name, value }); if (name === base + ".0") throw new Error("failed write");
  }, true);
  b.setAll([0, 1].map((n) => ({ name: `${base}.${n}`, value: "new", options: {} })));
  assert.throws(b.commit); assert.throws(b.clear, /ADMIN_COOKIE_CLEANUP_FAILED/);
  assert(attempts.some(({ name, value }) => name === base + ".1" && !value));
  assert.equal(b.getAll().length, 0);
  assert.throws(() => b.setAll([{ name: "sb-web", value: "bad", options: {} }]), /ADMIN_COOKIE_SCOPE_INVALID/);
});

test("context verifier does not preserve an authorization decision between operations", async () => {
  const h = harness(); await h.service.login(form());
  // Existing audit regression checks the revoked role on a second invocation;
  // this check covers auth/session creation on each new login as well.
  await h.service.login(form()); assert.equal(h.counts().contextReads, 2); assert.equal(h.counts().signIns, 2);
});

test("missing session is anonymous while unreviewed policy is unavailable", async () => {
  const { verifyAdminContext } = load("apps/admin/src/features/auth/server/context.ts");
  const anonymous = await verifyAdminContext(async () => ({ auth: { getClaims: async () => ({ data: null, error: { name: "AuthSessionMissingError" } }) } }));
  assert.equal(anonymous.status, "anonymous");
  const unavailable = await verifyAdminContext(async () => ({ auth: { getClaims: async () => ({ data: { claims: claims() }, error: null }) },
    rpc: async () => ({ data: null, error: { code: "42501", message: "ADMIN_SESSION_POLICY_UNVERIFIED" } }) }));
  assert.equal(unavailable.status, "unavailable");
});

for (const code of ["session_expired", "refresh_token_already_used"]) {
  test(`non-renewable ${code} opens login rather than an infrastructure error`, async () => {
    const { verifyAdminContext } = load("apps/admin/src/features/auth/server/context.ts");
    const result = await verifyAdminContext(async () => ({
      auth: { getClaims: async () => ({ data: null, error: { code, message: "secret provider text" } }) },
      rpc() { assert.fail("An invalid session cannot query Admin data"); },
    }));
    assert.equal(result.status, "denied"); assert.equal(result.authId, null);
  });
}

function proxyHarness({ method = "GET", cookie = `${base}.0=old; sb-web-auth-token.0=web`, throws = false } = {}) {
  let calls = 0;
  const proxyLoad = adminServerLoader({ env, dependencies: {
    "next/server": { NextRequest, NextResponse },
    "@supabase/ssr": { createServerClient(url, key, options) {
      calls++; assert.equal(url, env.NEXT_PUBLIC_SUPABASE_URL); assert.equal(key, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
      return { auth: { async getClaims() {
        if (throws) throw new Error("secret refresh error");
        options.cookies.setAll([{ name: base + ".0", value: "renewed0", options: { path: "/", sameSite: "lax" } }], { "Cache-Control": "private, no-store", Pragma: "no-cache" });
        options.cookies.setAll([{ name: base + ".1", value: "renewed1", options: { path: "/" } }], { Expires: "0" });
        return { data: { claims: claims() }, error: null };
      } } };
    } },
  } });
  return { updateSession: proxyLoad("apps/admin/src/lib/supabase/proxy.ts").updateSession,
    request: new NextRequest("https://admin.example.test/", { method, headers: { cookie } }), calls: () => calls };
}

test("proxy propagates all SDK cookie batches to request/response with non-cacheable headers", async () => {
  const h = proxyHarness(); const response = await h.updateSession(h.request);
  assert.equal(response.cookies.get(base + ".0").value, "renewed0"); assert.equal(response.cookies.get(base + ".1").value, "renewed1");
  assert.equal(h.request.cookies.get(base + ".1").value, "renewed1");
  assert.equal(h.request.cookies.get("sb-web-auth-token.0").value, "web"); assert(!response.cookies.has("sb-web-auth-token.0"));
  assert.match(response.headers.get("Cache-Control"), /private.*no-store/); assert.equal(response.headers.get("Expires"), "0");
  assert.match(response.headers.get("x-middleware-request-cookie"), /renewed1/); assert.equal(h.calls(), 1);
});
for (const options of [{ method: "POST" }, { cookie: "sb-web-auth-token.0=web" }, { cookie: "" }, { throws: true }]) {
  test(`proxy errors/skip paths do not grant access or block action cleanup ${JSON.stringify(options)}`, async () => {
    const h = proxyHarness(options); const response = await h.updateSession(h.request);
    assert.equal(response.headers.get("location"), null); assert.match(response.headers.get("Cache-Control"), /no-store/);
    assert.equal(h.calls(), options.throws ? 1 : 0);
  });
}

test("actual SSR SDK stages multi-chunk sign-in and uses the same user client for context/logout", async () => {
  const user = { id: authId, aud: "authenticated", role: "authenticated", email: "admin@example.test", email_confirmed_at: "2026-01-01T00:00:00Z", user_metadata: { padding: "x".repeat(10000) } };
  const jwt = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ ...claims(), iss: env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1" })).toString("base64url"), "c2ln"].join(".");
  const issued = { access_token: jwt, refresh_token: "synthetic-refresh", expires_in: 3600, token_type: "bearer", user };
  const writes = [], requests = [];
  const jar = new Map([["sb-web-auth-token.0", "web"], [base + ".99", "stale"]]);
  const sdkLoad = adminServerLoader({ env, dependencies: {
    "@supabase/ssr": { createServerClient },
    "next/headers": { cookies: async () => ({ getAll: () => Array.from(jar, ([name, value]) => ({ name, value })), set(name, value, options) {
      writes.push({ name, value, options }); if (options.maxAge === 0) jar.delete(name); else jar.set(name, value);
    } }) },
  }, fetch: async (input, init) => {
    const url = String(input); requests.push({ url, init });
    assert.match(url, /^https:\/\/synthetic\.supabase\.test\//); assert.equal(init.cache, "no-store"); assert(init.signal instanceof AbortSignal);
    if (url.includes("/token?grant_type=password")) { assert.equal(JSON.parse(init.body).password, " secret password "); return Response.json(issued); }
    if (url.includes("/auth/v1/user")) return Response.json(user);
    if (url.includes("/rest/v1/rpc/admin_get_context_v1")) return Response.json([{ auth_user_uuid: authId, utente_uuid: userId }]);
    if (url.includes("/logout?scope=local")) return new Response(null, { status: 204 });
    assert.fail("Unexpected synthetic SDK URL: " + url);
  } });
  const { createCookieSession, createReadClient } = sdkLoad("apps/admin/src/lib/supabase/server.ts");
  const session = await createCookieSession(true); const client = await session.getClient();
  assert.equal(await session.getClient(), client);
  assert.equal((await client.auth.signInWithPassword({ email: "admin@example.test", password: " secret password " })).error, null);
  assert.equal(writes.length, 0);
  const ctx = await sdkLoad("apps/admin/src/features/auth/server/context.ts").verifyAdminContext(session.getClient);
  assert.equal(ctx.status, "admin"); assert.equal(writes.length, 0);
  session.commit(); assert(writes.filter(({ value }) => value).length > 1); assert(!jar.has(base + ".99"));
  const reader = await createReadClient(); assert.equal((await reader.auth.getClaims()).error, null);
  assert.equal((await client.auth.signOut({ scope: "local" })).error, null); session.clear();
  assert(!Array.from(jar.keys()).some((name) => isAdminCookie(name))); assert.equal(jar.get("sb-web-auth-token.0"), "web");
  assert(requests.some(({ url }) => url.includes("/logout?scope=local")));
});

test("actual SDK refresh propagates replacement chunks and cache headers through the real Next proxy adapter", async () => {
  const user = { id: authId, aud: "authenticated", role: "authenticated", email: "admin@example.test", user_metadata: {} };
  const jwt = (exp) => [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ ...claims(), exp })).toString("base64url"), "c2ln"].join(".");
  const expired = Math.floor(Date.now() / 1000) - 3600;
  const old = { access_token: jwt(expired), refresh_token: "synthetic-refresh", expires_at: expired, expires_in: -3600, token_type: "bearer", user };
  const encoded = "base64-" + Buffer.from(JSON.stringify(old)).toString("base64url");
  const request = new NextRequest("https://admin.example.test/", { headers: { cookie: `${base}=${encoded}; sb-web-auth-token=web` } });
  let refreshes = 0;
  const sdkLoad = adminServerLoader({ env, dependencies: { "@supabase/ssr": { createServerClient }, "next/server": { NextRequest, NextResponse } },
    fetch: async (input, init) => {
      const url = String(input); assert.match(url, /^https:\/\/synthetic\.supabase\.test\//); assert.equal(init.cache, "no-store");
      if (url.includes("/token?grant_type=refresh_token")) {
        refreshes++; assert.equal(JSON.parse(init.body).refresh_token, "synthetic-refresh");
        return Response.json({ ...old, access_token: jwt(Math.floor(Date.now() / 1000) + 3600), expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600, user: { ...user, user_metadata: { padding: "x".repeat(10000) } } });
      }
      if (url.includes("/auth/v1/user")) return Response.json(user);
      assert.fail("Unexpected synthetic refresh URL: " + url);
    } });
  const response = await sdkLoad("apps/admin/src/lib/supabase/proxy.ts").updateSession(request);
  assert.equal(refreshes, 1); assert.equal(response.cookies.get(base).value, "");
  assert(response.cookies.get(base + ".0").value); assert(response.cookies.get(base + ".1").value);
  assert.equal(request.cookies.get(base + ".1").value, response.cookies.get(base + ".1").value);
  assert.equal(request.cookies.get("sb-web-auth-token").value, "web"); assert(!response.cookies.has("sb-web-auth-token"));
  assert.match(response.headers.get("Cache-Control"), /private.*no-store/); assert.equal(response.headers.get("Pragma"), "no-cache");
});

test("action guard verifies anew with a writable client, distinct from rendering reads", async () => {
  let writes = 0, reads = 0, denied = false;
  const client = { auth: { getClaims: async () => ({ data: { claims: claims() }, error: null }) },
    rpc: async () => ({ data: [{ auth_user_uuid: authId, utente_uuid: userId }], error: denied ? { code: "42501" } : null }) };
  const queries = adminServerLoader({ dependencies: {
    react: { cache: (fn) => fn },
    "@/lib/supabase/server": { createClient: async () => { writes++; return client; }, createReadClient: async () => { reads++; return client; } },
  } })("apps/admin/src/features/auth/server/queries.ts");
  assert.equal((await queries.getAdminContext()).status, "admin"); assert.equal(reads, 1);
  assert.equal((await queries.requireAdminSession()).status, "admin");
  denied = true;
  await assert.rejects(queries.requireAdminSession(), /ADMIN_ACCESS_DENIED/); assert.equal(writes, 2);
});

import { generateKeyPairSync, randomUUID, sign, verify } from "node:crypto";
import { createServer } from "node:http";
import { createHomeFixture } from "./home-fixture.mjs";
import { createAnnunciFixture, OPERATIONS } from "./annunci-fixture.mjs";
import { createAuditFixture } from "./audit-fixture.mjs";

export const FIXTURE_EMAIL = "admin@example.test";
export const FIXTURE_PASSWORD = "Only-a-local-fixture-123";
export const FIXTURE_PUBLIC_KEY = "sb_publishable_dashboard_browser_fixture";
const AUTH_ID = "aaaaaaaa-aaaa-4aaa-8aaa-000000000001", USER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-000000000001";
const AS_OF = "2026-10-25T12:00:00.000000Z";
const b64 = value => Buffer.from(JSON.stringify(value)).toString("base64url");

/** A deliberately small HTTP double, not a Supabase server or SQL adapter.
 * It never persists request bodies, bearer tokens, keys or cookie values in logs.
 */
export async function createSessionFixture({ home = false, annunci = false, registro = false } = {}) {
  if (home && annunci || registro && (home || annunci)) throw new Error("BROWSER_FIXTURE_SCENARIOS");
  const homeFixture = home || registro ? createHomeFixture() : null;
  const annunciFixture = annunci ? createAnnunciFixture() : null;
  const auditFixture = registro ? createAuditFixture() : null;
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const kid = randomUUID(), secretKey = "sb_secret_browser_session_" + randomUUID().replaceAll("-", "");
  const jwk = { ...publicKey.export({ format: "jwk" }), kid, use: "sig", alg: "ES256" };
  const sessions = new Map(), waiting = new Set(), events = [];
  const counters = { password: 0, jwks: 0, user: 0, context: 0, audit: 0, logout: 0, summary: 0, activity: 0, chart: 0, unexpected: 0, external: 0 };
  let origin, role = "Admin", auditUnavailable = false, logoutUnavailable = false, held = false;
  const user = () => ({ id: AUTH_ID, aud: "authenticated", role: "authenticated", email: FIXTURE_EMAIL,
    email_confirmed_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z", app_metadata: { provider: "email", providers: ["email"] },
    // Force multiple SSR cookie chunks and prove metadata is not the admin context.
    user_metadata: { tipologia_utente: "Admin", padding: "x".repeat(10000) }, identities: [] });
  const issue = () => {
    const now = Math.floor(Date.now() / 1000), id = randomUUID();
    const head = b64({ alg: "ES256", typ: "JWT", kid }), payload = b64({ iss: origin + "/auth/v1", aud: "authenticated",
      sub: AUTH_ID, role: "authenticated", session_id: id, iat: now, exp: now + 3600 });
    const input = head + "." + payload;
    const jwt = input + "." + sign("sha256", Buffer.from(input), { key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
    sessions.set(id, { active: true });
    return { access_token: jwt, refresh_token: randomUUID(), token_type: "bearer", expires_in: 3600, expires_at: now + 3600, user: user() };
  };
  const session = (token, allowRevoked = false) => {
    try {
      const parts = token.split("."); if (parts.length !== 3) return null;
      const header = JSON.parse(Buffer.from(parts[0], "base64url"));
      if (header.alg !== "ES256" || header.kid !== kid || !verify("sha256", Buffer.from(parts[0] + "." + parts[1]),
        { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(parts[2], "base64url"))) return null;
      const claims = JSON.parse(Buffer.from(parts[1], "base64url")), current = sessions.get(claims.session_id);
      return claims.sub === AUTH_ID && claims.role === "authenticated" && claims.iss === origin + "/auth/v1" &&
        claims.aud === "authenticated" && claims.exp > Date.now() / 1000 && current && (allowRevoked || current.active) ? { ...claims, current } : null;
    } catch { return null; }
  };
  const server = createServer(async (request, response) => {
    const reply = (status, value) => {
      if (response.destroyed) return;
      response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Supabase-Api-Version": "2024-01-01" });
      response.end(status === 204 ? undefined : JSON.stringify(value));
    };
    const denied = () => reply(403, { code: "42501", message: "ADMIN_ACCESS_DENIED" });
    try {
      const url = new URL(request.url, origin), token = /^Bearer (.+)$/.exec(request.headers.authorization ?? "")?.[1] ?? "";
      const humanKey = request.headers.apikey === FIXTURE_PUBLIC_KEY;
      if ((annunciFixture || auditFixture) && request.method === "GET" && url.pathname === "/favicon.ico" && !url.search) { response.writeHead(204, { "Cache-Control": "no-store" }); response.end(); return; }
      if ((annunciFixture || auditFixture) && request.method === "GET" && url.pathname === "/external/announcement" && !url.search) {
        counters.external++; response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        response.end("<!doctype html><title>Destinazione sintetica</title><p>Contenuto esterno di test locale.</p>"); return;
      }
      let body = {}, bytes = 0, raw = "";
      for await (const chunk of request) { bytes += chunk.length; if (bytes > 65536) { reply(413, {}); return; } raw += chunk; }
      if (raw) { try { body = JSON.parse(raw); } catch { reply(400, {}); return; } }
      if (request.method === "GET" && url.pathname === "/auth/v1/.well-known/jwks.json" && humanKey) {
        counters.jwks++; reply(200, { keys: [jwk] }); return;
      }
      if (request.method === "POST" && url.pathname === "/auth/v1/token" && url.search === "?grant_type=password" && humanKey) {
        counters.password++;
        if (body.email !== FIXTURE_EMAIL || body.password !== FIXTURE_PASSWORD) { reply(400, { code: "invalid_credentials", msg: "Synthetic credentials rejected" }); return; }
        reply(200, issue()); return;
      }
      if (request.method === "GET" && url.pathname === "/auth/v1/user" && humanKey) {
        counters.user++; if (!session(token)) { reply(401, { code: "session_not_found", msg: "Synthetic session denied" }); return; }
        reply(200, user()); return;
      }
      if (request.method === "POST" && url.pathname === "/auth/v1/logout" && url.search === "?scope=local" && humanKey) {
        counters.logout++;
        if (logoutUnavailable) { reply(503, { code: "unexpected_failure", msg: "Synthetic logout unavailable" }); return; }
        const current = session(token, true); if (!current) { denied(); return; }
        current.current.active = false; reply(204); return;
      }
      if (request.method !== "POST" || !url.pathname.startsWith("/rest/v1/rpc/") || url.search) { counters.unexpected++; denied(); return; }
      const rpc = url.pathname.slice("/rest/v1/rpc/".length);
      if (rpc === "admin_record_server_audit_v1") {
        counters.audit++;
        const allowedAuth = ["auth.login", "auth.logout", "auth.access_denied"].includes(body.p_action) && ["success", "failure"].includes(body.p_outcome);
        const allowedOperationFailure = annunciFixture && [...OPERATIONS.map(operation => "announcement." + operation), "announcement.export"].includes(body.p_action) && body.p_outcome === "failure" && typeof body.p_failure_code === "string";
        if (request.headers.apikey !== secretKey || token !== secretKey || !(allowedAuth || allowedOperationFailure)) { denied(); return; }
        const send = () => {
          if (auditUnavailable) { reply(503, { code: "TEST_AUDIT_UNAVAILABLE", message: "Synthetic audit unavailable" }); return; }
          events.push({ action: body.p_action, outcome: body.p_outcome }); reply(200, randomUUID());
        };
        if (held) waiting.add(send); else send(); return;
      }
      if (!humanKey || !session(token) || role !== "Admin") { denied(); return; }
      if (rpc === "admin_get_context_v1") { counters.context++; reply(200, [{ auth_user_uuid: AUTH_ID, utente_uuid: USER_ID }]); return; }
      if (annunciFixture?.respond(rpc, body, response, reply)) return;
      if (auditFixture?.respond(rpc, body, response, reply)) return;
      if (homeFixture) {
        const block = rpc === "admin_get_home_summary_v1" ? "summary" : rpc === "admin_list_audit_events_v1" && body.p_query?.limit === 5 ? "activity" :
          rpc === "admin_get_home_chart_v1" && ["users", "announcements", "pending", "profits"].includes(body.p_metric) ? "chart:" + body.p_metric : null;
        if (block) { counters[block.startsWith("chart:") ? "chart" : block]++; homeFixture.respond(block, response, reply); return; }
      }
      if (rpc === "admin_get_home_summary_v1") { counters.summary++; reply(200, { asOf: AS_OF, users: 0, announcements: 0, pending: 0, profits: { available: false } }); return; }
      if (rpc === "admin_list_audit_events_v1" && body.p_query?.limit === 5) {
        counters.activity++; reply(200, { items: [], hasMore: false, nextCursor: null }); return;
      }
      if (rpc === "admin_get_home_chart_v1" && body.p_metric === "users") {
        counters.chart++;
        reply(200, { metric: "users", asOf: AS_OF, timezone: "Europe/Rome", available: true, population: 0,
          excludedDates: { missingOrNonFinite: 0, future: 0 }, distributionTotal: 0, distribution: [],
          series: Array.from({ length: 12 }, (_, i) => ({ month: i === 0 ? "2025-11" : i === 1 ? "2025-12" : "2026-" + String(i - 1).padStart(2, "0"), count: 0 })),
          period: { from: "2025-10-31T23:00:00.000000Z", to: AS_OF } }); return;
      }
      counters.unexpected++; denied();
    } catch { reply(500, { code: "TEST_FIXTURE_ERROR", message: "Synthetic request failed" }); }
  });
  await new Promise((accept, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", accept); });
  origin = `http://127.0.0.1:${server.address().port}`;
  annunciFixture?.setExternalOrigin(origin);
  return { origin, secretKey, home: homeFixture, annunci: annunciFixture, registro: auditFixture,
    get stats() { return { ...counters, activeSessions: [...sessions.values()].filter(s => s.active).length, heldAudit: waiting.size, events: events.map(e => ({ ...e })) }; },
    setRole(value) { role = value; }, revoke() { for (const s of sessions.values()) s.active = false; },
    setAuditUnavailable(value) { auditUnavailable = value; }, setLogoutUnavailable(value) { logoutUnavailable = value; },
    holdAudit() { held = true; }, releaseAudit() { held = false; for (const send of waiting) send(); waiting.clear(); },
    close: () => new Promise(accept => { waiting.clear(); homeFixture?.close(); annunciFixture?.close(); auditFixture?.close(); server.closeAllConnections(); server.close(accept); }) };
}

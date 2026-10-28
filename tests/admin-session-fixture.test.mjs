import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createSessionFixture, FIXTURE_EMAIL, FIXTURE_PASSWORD, FIXTURE_PUBLIC_KEY } from "../scripts/dashboard-browser/session-fixture.mjs";

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
async function setup(t) {
  const fixture = await createSessionFixture(); t.after(fixture.close);
  const client = createClient(fixture.origin, FIXTURE_PUBLIC_KEY, options);
  const { data, error } = await client.auth.signInWithPassword({ email: FIXTURE_EMAIL, password: FIXTURE_PASSWORD });
  assert.equal(error, null);
  return { fixture, client, token: data.session.access_token };
}
test("session fixture issues ES256 JWTs verified by the real SDK/JWKS, and rejects tampering", async t => {
  const { fixture, client, token } = await setup(t);
  const { data, error } = await client.auth.getClaims();
  assert.equal(error, null); assert.equal(data.header.alg, "ES256"); assert.equal(data.claims.role, "authenticated"); assert(data.claims.session_id);
  assert.equal(fixture.stats.jwks, 1);
  const parts = token.split("."); const payload = JSON.parse(Buffer.from(parts[1], "base64url")); payload.sub = "forged";
  parts[1] = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const invalid = await client.auth.getClaims(parts.join(".")); assert(invalid.error);
  assert.equal((await client.auth.getUser(parts.join("."))).data.user, null);
});
test("synthetic context enforces exact Admin despite admin user metadata, then revokes the active session", async t => {
  const { fixture, client } = await setup(t);
  assert.equal((await client.rpc("admin_get_context_v1")).data.length, 1);
  for (const role of ["Utente", "admin", "ADMIN", "Admin ", null]) {
    fixture.setRole(role); assert.equal((await client.rpc("admin_get_context_v1")).error.code, "42501");
  }
  fixture.setRole("Admin"); assert.equal((await client.rpc("admin_get_context_v1")).error, null);
  fixture.revoke(); assert.equal((await client.rpc("admin_get_context_v1")).error.code, "42501");
  assert.equal(fixture.stats.activeSessions, 0);
});
test("synthetic technical and human transports cannot substitute for each other", async t => {
  const { fixture, client } = await setup(t), technical = createClient(fixture.origin, fixture.secretKey, options);
  const event = { p_action: "auth.login", p_outcome: "success" };
  assert.equal((await client.rpc("admin_record_server_audit_v1", event)).error.code, "42501");
  assert.equal((await technical.rpc("admin_get_context_v1")).error.code, "42501");
  const written = await technical.rpc("admin_record_server_audit_v1", event); assert.equal(written.error, null); assert.match(written.data, /^[\da-f-]{36}$/);
  assert.deepEqual(fixture.stats.events, [{ action: "auth.login", outcome: "success" }]);
});
test("synthetic audit can be held without recording success, released, or made unavailable", async t => {
  const { fixture } = await setup(t), technical = createClient(fixture.origin, fixture.secretKey, options);
  fixture.holdAudit(); let resolved = false;
  const pending = technical.rpc("admin_record_server_audit_v1", { p_action: "auth.login", p_outcome: "success" }).then(result => { resolved = true; return result; });
  for (let i = 0; i < 100 && !fixture.stats.heldAudit; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(fixture.stats.heldAudit, 1); assert.equal(resolved, false); assert.equal(fixture.stats.events.length, 0);
  fixture.releaseAudit(); assert.equal((await pending).error, null);
  fixture.setAuditUnavailable(true);
  assert((await technical.rpc("admin_record_server_audit_v1", { p_action: "auth.logout", p_outcome: "success" })).error);
  assert.equal(fixture.stats.events.length, 1);
});
test("synthetic logout can fail without revoking, and successful local logout revokes", async t => {
  const { fixture, client, token } = await setup(t);
  fixture.setLogoutUnavailable(true); assert((await client.auth.signOut({ scope: "local" })).error);
  assert.equal(fixture.stats.activeSessions, 1);
  fixture.setLogoutUnavailable(false);
  const response = await fetch(fixture.origin + "/auth/v1/logout?scope=local", { method: "POST", headers: { apikey: FIXTURE_PUBLIC_KEY, Authorization: "Bearer " + token } });
  assert.equal(response.status, 204); assert.equal(fixture.stats.activeSessions, 0);
});
test("synthetic minimal Home reads are limited and unexpected endpoints fail closed without leaking inputs", async t => {
  const { fixture, client, token } = await setup(t);
  const summary = await client.rpc("admin_get_home_summary_v1"); assert.equal(summary.data.profits.available, false);
  assert.deepEqual((await client.rpc("admin_list_audit_events_v1", { p_query: { limit: 5 } })).data.items, []);
  assert.equal((await client.rpc("admin_get_home_chart_v1", { p_metric: "users" })).data.series.length, 12);
  assert((await client.rpc("admin_list_audit_events_v1", { p_query: { limit: 30 } })).error);
  const unknown = await fetch(fixture.origin + "/unknown?credential=" + FIXTURE_PASSWORD); assert.equal(unknown.status, 403);
  assert.equal(fixture.stats.unexpected, 2);
  const diagnostics = JSON.stringify(fixture.stats);
  for (const value of [token, fixture.secretKey, FIXTURE_PASSWORD, "credential", "padding"]) assert(!diagnostics.includes(value));
});

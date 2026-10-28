import assert from "node:assert/strict";
import { test } from "node:test";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
const id = "eeeeeeee-eeee-4eee-8eee-000000000001", asOf = "2026-10-24T12:00:00.123456Z";
const summary = { asOf, users: 0, announcements: 0, pending: 0, profits: { available: false } };
function harness() {
  const calls = []; let denied = false;
  const client = { auth: { async getClaims() { calls.push("claims"); return { data: { claims: { sub: id, session_id: id, role: "authenticated", exp: Date.now() / 1000 + 3600 } }, error: null }; } },
    async rpc(name, args) { calls.push({ name, args }); return { data: name === "admin_get_home_summary_v1" ? summary : name === "admin_get_home_chart_v1" ? { metric: "profits", asOf, timezone: "Europe/Rome", available: false } : { items: [], hasMore: false, nextCursor: null }, error: denied ? { code: "42501", message: "ADMIN_ACCESS_DENIED" } : null }; } };
  const l = adminServerLoader({ dependencies: { "@/lib/supabase/server": { async createClient() { calls.push("writable"); return client; }, createReadClient() { assert.fail("Wrong cookie client"); } } } });
  const routes = Object.fromEntries(["summary", "activity", "charts"].map(key => [key, l(`apps/admin/src/app/api/home/${key}/route.ts`).GET]));
  return { calls, routes, revoke() { denied = true; } };
}
for (const [endpoint, expected] of [["summary", "admin_get_home_summary_v1"], ["activity", "admin_list_audit_events_v1"], ["charts?metric=profits", "admin_get_home_chart_v1"]]) test(`GET ${endpoint} uses writable cookies, one RPC and private no-store`, async () => {
  const h = harness(), response = await h.routes[endpoint.split("?")[0]](new Request("https://admin.example.test/api/home/" + endpoint));
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /private.*no-store/); assert.equal(response.headers.get("vary"), "Cookie"); assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(h.calls.length, 3); assert.equal(h.calls[0], "writable"); assert.equal(h.calls[2].name, expected);
  if (endpoint === "activity") assert.equal(h.calls[2].args.p_query.limit, 5);
});
for (const endpoint of ["summary?limit=1", "activity?limit=30", "charts", "charts?metric=users&metric=pending", "charts?metric=users&x=1", "charts?metric=Users", "charts?metric=", "charts?metric=all"]) test(`invalid query ${endpoint} makes no data or Auth request`, async () => {
  const h = harness(), response = await h.routes[endpoint.split("?")[0]](new Request("https://admin.example.test/api/home/" + endpoint));
  assert.equal(response.status, 400); assert.match(response.headers.get("cache-control"), /no-store/); assert.equal(h.calls.length, 0);
});
test("revocation is verified again across repeated GETs including profits", async () => {
  const h = harness(); assert.equal((await h.routes.summary(new Request("https://admin.example.test/api/home/summary"))).status, 200);
  h.revoke();
  for (const endpoint of ["summary", "activity", "charts?metric=profits"]) {
    const response = await h.routes[endpoint.split("?")[0]](new Request("https://admin.example.test/api/home/" + endpoint)); assert.equal(response.status, 403); assert.match(response.headers.get("cache-control"), /no-store/); assert(!("summary" in await response.json()));
  }
  assert.equal(h.calls.filter(c => c?.name).length, 4);
});
test("HTTP status mapping and cache headers also cover unavailable and invalid responses", async () => {
  const l = adminServerLoader({ dependencies: { "@/lib/supabase/server": {} } }), { createHomeHttp } = l("apps/admin/src/features/home/server/http.ts");
  for (const [status, code] of [["ok", 200], ["invalid", 400], ["denied", 403], ["unavailable", 503]]) {
    const h = createHomeHttp({ async summary() { return { status }; }, async activity() { return { status }; }, async chart() { return { status }; } });
    for (const [method, url] of [["summary", ""], ["activity", ""], ["chart", "?metric=profits"]]) {
      const response = await h[method](new Request("https://admin.example.test/api/home/" + method + url)); assert.equal(response.status, code); assert.match(response.headers.get("cache-control"), /private.*no-store/); assert.equal(response.headers.get("vary"), "Cookie");
    }
  }
});

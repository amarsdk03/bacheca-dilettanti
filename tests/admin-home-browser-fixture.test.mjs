import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createSessionFixture, FIXTURE_EMAIL, FIXTURE_PASSWORD, FIXTURE_PUBLIC_KEY } from "../scripts/dashboard-browser/session-fixture.mjs";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const load = adminServerLoader();
const { parseHomeChart, parseHomeSummary } = load("apps/admin/src/features/home/response-validation.ts");
const { parseAuditPage } = load("apps/admin/src/features/audit/server/read-response.ts");
async function setup(t) {
  const fixture = await createSessionFixture({ home: true }); t.after(fixture.close);
  const client = createClient(fixture.origin, FIXTURE_PUBLIC_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const login = await client.auth.signInWithPassword({ email: FIXTURE_EMAIL, password: FIXTURE_PASSWORD }); assert.equal(login.error, null);
  return { fixture, client };
}
async function held(fixture, block, expected = 1) {
  for (let i = 0; i < 100 && fixture.home.stats.held[block] !== expected; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(fixture.home.stats.held[block], expected);
}

test("rich Home fixture passes real parsers for all metrics, empty states and five audit events", async t => {
  const { fixture, client } = await setup(t);
  for (const dataset of ["populated", "empty"]) {
    fixture.home.setDataset(dataset);
    const summary = parseHomeSummary((await client.rpc("admin_get_home_summary_v1")).data);
    assert.equal(summary.users, dataset === "empty" ? 0 : 120);
    for (const metric of ["users", "announcements", "pending", "profits"]) {
      const result = await client.rpc("admin_get_home_chart_v1", { p_metric: metric }); assert.equal(result.error, null);
      const chart = parseHomeChart(result.data, metric); assert.equal(chart.available, metric !== "profits");
      if (chart.available) assert.equal(chart.population, summary[metric]);
      if (metric === "users" && dataset === "populated") assert.equal(chart.distributionTotal, 150);
    }
    const activity = await client.rpc("admin_list_audit_events_v1", { p_query: { limit: 5 } });
    const page = parseAuditPage(activity.data, { limit: 5 }); assert.equal(page.items.length, dataset === "empty" ? 0 : 5);
  }
  assert.equal(fixture.stats.unexpected, 0);
});

test("held Home responses are independent, snapshot their data and permit late completion", async t => {
  const { fixture, client } = await setup(t), home = fixture.home;
  home.hold("summary"); home.hold("chart:users");
  const summary = Promise.resolve(client.rpc("admin_get_home_summary_v1"));
  const chart = Promise.resolve(client.rpc("admin_get_home_chart_v1", { p_metric: "users" }));
  await held(fixture, "summary"); await held(fixture, "chart:users");
  assert.equal((await client.rpc("admin_list_audit_events_v1", { p_query: { limit: 5 } })).data.items.length, 5);
  home.setDataset("empty"); home.release("summary"); assert.equal((await summary).data.users, 120);
  assert.equal(home.stats.held["chart:users"], 1);
  assert.equal((await client.rpc("admin_get_home_chart_v1", { p_metric: "pending" })).data.population, 0);
  home.release("chart:users"); assert.equal((await chart).data.population, 120);
});

test("Home fault controls fail one block only and support successful retries", async t => {
  const { fixture, client } = await setup(t), home = fixture.home;
  for (const [block, rpc, args] of [["summary", "admin_get_home_summary_v1", {}], ["activity", "admin_list_audit_events_v1", { p_query: { limit: 5 } }], ["chart:users", "admin_get_home_chart_v1", { p_metric: "users" }]]) {
    home.setFailure(block, true); assert.equal((await client.rpc(rpc, args)).error.code, "TEST_HOME_UNAVAILABLE");
    assert.equal((await client.rpc("admin_get_home_chart_v1", { p_metric: "profits" })).data.available, false);
    home.setFailure(block, false); assert.equal((await client.rpc(rpc, args)).error, null);
  }
  assert.throws(() => home.hold("unknown"), /BROWSER_HOME_BLOCK/);
  assert.throws(() => home.release("unknown"), /BROWSER_HOME_BLOCK/);
  assert.throws(() => home.setDataset("remote"), /BROWSER_HOME_DATASET/);
  for (const value of [-1, 5001, 1.5]) assert.throws(() => home.setDelay("summary", value), /BROWSER_HOME_DELAY/);
  const stats = home.stats; stats.calls.summary = -1; assert(home.stats.calls.summary > 0);
});

test("Home transport cancellation releases waiters; exact role and session still gate every rich RPC", async t => {
  const { fixture, client } = await setup(t), controller = new AbortController();
  fixture.home.hold("chart:users");
  const cancelled = Promise.resolve(client.rpc("admin_get_home_chart_v1", { p_metric: "users" }).abortSignal(controller.signal));
  await held(fixture, "chart:users"); controller.abort(); assert((await cancelled).error);
  await held(fixture, "chart:users", 0); fixture.home.release("chart:users");
  const before = fixture.home.stats.calls.summary;
  fixture.setRole("admin"); assert.equal((await client.rpc("admin_get_home_summary_v1")).error.code, "42501");
  fixture.setRole("Admin"); fixture.revoke(); assert.equal((await client.rpc("admin_get_home_summary_v1")).error.code, "42501");
  assert.equal(fixture.home.stats.calls.summary, before);
  assert.equal(fixture.stats.unexpected, 0);
});

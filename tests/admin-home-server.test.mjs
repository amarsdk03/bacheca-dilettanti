import assert from "node:assert/strict";
import { test } from "node:test";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
const base = "apps/admin/src/features/home/", load = adminServerLoader();
const { createHomeQueries } = load(base + "server/service.ts");
const { parseHomeSummary, parseHomeChart } = load(base + "server/response.ts");
const id = "eeeeeeee-eeee-4eee-8eee-000000000001", asOf = "2026-10-25T01:30:00.123456Z";
const claims = () => ({ sub: id, session_id: id, role: "authenticated", exp: Date.now() / 1000 + 3600 });
const summary = { asOf, users: 10, announcements: 20, pending: 5, profits: { available: false } };
const emptyAudit = { items: [], hasMore: false, nextCursor: null };
function chart(metric = "users") {
  const common = { metric, asOf, timezone: "Europe/Rome", available: metric !== "profits" };
  if (metric === "profits") return common;
  const counts = { population: 2, excludedDates: { missingOrNonFinite: 0, future: 0 }, distributionTotal: 2, distribution: [{ key: metric === "users" ? "giocatore" : metric === "pending" ? "annuncio_giocatore" : "pubblicato", count: 2 }] };
  if (metric === "pending") return { ...common, ...counts, age: ["0_2", "3_7", "8_30", "over_30", "unknown"].map((key, i) => ({ key, count: i === 0 ? 2 : 0 })) };
  return { ...common, ...counts, period: { from: "2025-10-31T23:00:00.000000Z", to: asOf }, series: Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(2025, 10 + i, 1)); return { month: d.toISOString().slice(0, 7), count: i === 11 ? 2 : 0 };
  }) };
}
function service(options = {}) {
  const calls = [], logs = [];
  const q = createHomeQueries({ log(...args) { logs.push(args); }, async getClient() {
    calls.push("client"); if (options.throws) throw new Error("secret credentials");
    return {
      auth: { async getClaims() { calls.push("claims"); return { data: options.claims === null ? null : { claims: options.claims ?? claims() }, error: options.authError ?? null }; } },
      async rpc(name, args) { calls.push({ name, args }); return { data: options.data !== undefined ? options.data : name === "admin_get_home_summary_v1" ? summary : name === "admin_get_home_chart_v1" ? chart(args.p_metric) : emptyAudit, error: options.error ?? null }; },
    };
  } }); return { q, calls, logs };
}
test("summary uses one verified functional RPC and no chart/audit requests", async () => {
  const h = service(), result = await h.q.summary(); assert.equal(result.status, "ok"); assert.deepEqual(result.summary, summary);
  assert.deepEqual(h.calls, ["client", "claims", { name: "admin_get_home_summary_v1", args: {} }]); assert.equal(h.logs.length, 0);
});
for (const metric of ["users", "announcements", "pending", "profits"]) test(`only requested metric ${metric} is loaded and projected`, async () => {
  const h = service(), result = await h.q.chart(metric); assert.equal(result.status, "ok"); assert.equal(result.chart.metric, metric);
  assert.deepEqual(h.calls, ["client", "claims", { name: "admin_get_home_chart_v1", args: { p_metric: metric } }]);
  if (metric === "profits") { assert.equal(result.chart.available, false); assert.equal(result.chart.reason, "FINANCIAL_SOURCE_NOT_CONFIGURED"); assert(!("population" in result.chart)); }
  else if (metric === "pending") { assert.equal(result.chart.definition, "PENDING_BY_CREATION_DATE"); assert(!("series" in result.chart)); }
  else assert.equal(result.chart.series.length, 12);
});
for (const input of [null, undefined, "", "Users", "users ", "all", {}, ["users"], 5, "profits;DROP"]) test(`invalid metric rejected before client: ${JSON.stringify(input)}`, async () => {
  const h = service(); assert.equal((await h.q.chart(input)).status, "invalid"); assert.equal(h.calls.length, 0); assert.equal(h.logs.length, 0);
});
test("activity reuses the audited read contract, fixed limit five and no detail request", async () => {
  const h = service(); const result = await h.q.activity(); assert.equal(result.status, "ok"); assert.deepEqual(result.page, emptyAudit);
  assert.equal(h.calls.length, 3); assert.equal(h.calls[2].name, "admin_list_audit_events_v1"); assert.equal(h.calls[2].args.p_query.limit, 5);
});
for (const identity of [null, { ...claims(), exp: 1 }, { ...claims(), role: "service_role" }, { ...claims(), session_id: undefined }]) test(`unverified claims never reach Home RPCs: ${JSON.stringify(identity)}`, async () => {
  for (const method of ["summary", "activity", "chart"]) {
    const h = service({ claims: identity }); const result = await h.q[method]("profits"); assert.equal(result.status, "denied"); assert.equal(h.calls.length, 2); assert.equal(h.logs.length, 0);
  }
});
for (const [error, status] of [[{ code: "42501", message: "ADMIN_ACCESS_DENIED" }, "denied"], [{ code: "42501", message: "ADMIN_SESSION_POLICY_UNVERIFIED" }, "unavailable"], [{ code: "22023", message: "secret" }, "invalid"], [{ code: "XX000", message: "secret" }, "unavailable"]]) test(`RPC ${error.code}/${error.message} maps to ${status}`, async () => {
  const h = service({ error }), result = await h.q.chart("profits"); assert.equal(result.status, status); assert(!JSON.stringify(result).includes("secret")); assert.equal(h.logs.length, status === "unavailable" ? 1 : 0);
});
test("infrastructure failures are bounded and activity failure does not hide summary", async () => {
  const h = service({ throws: true }); assert.equal((await h.q.summary()).status, "unavailable"); assert.equal(h.logs[0].length, 2);
  const offline = service({ authError: { code: "unexpected", message: "secret" } }); assert.equal((await offline.q.chart("users")).status, "unavailable"); assert.equal(offline.calls.length, 2);
  const activity = service({ data: null }); assert.equal((await activity.q.activity()).status, "unavailable"); assert.equal((await service().q.summary()).status, "ok");
});
for (const patch of [{ users: -1 }, { users: 1.5 }, { users: "10" }, { users: Number.MAX_SAFE_INTEGER + 1 }, { pending: 21 }, { asOf: "yesterday" }, { profits: { available: true, amount: 0 } }, { profits: null }]) test(`malformed summary fails closed: ${JSON.stringify(patch)}`, async () => {
  assert.throws(() => parseHomeSummary({ ...summary, ...patch })); assert.equal((await service({ data: { ...summary, ...patch } }).q.summary()).status, "unavailable");
});
test("summary DTO strips extra fields, including financial data", () => {
  const parsed = parseHomeSummary({ ...summary, secret: "private", profits: { available: false, amount: 100, account: "private" } }); assert.deepEqual(parsed, summary); assert(!JSON.stringify(parsed).includes("private"));
});
for (const patch of [{ metric: "pending" }, { timezone: "UTC" }, { available: false }, { population: -1 }, { excludedDates: { missingOrNonFinite: 3, future: 0 } }, { distributionTotal: "2" }, { distribution: [{ key: "email", count: 2 }] }, { distribution: [{ key: "giocatore", count: 1 }, { key: "giocatore", count: 1 }] }, { distribution: [{ key: "giocatore", count: 3 }] }, { series: [] }, { period: { from: "2025-11-01T00:00:00.000000Z", to: asOf } }]) test(`malformed chart fails closed: ${Object.keys(patch)}`, () => assert.throws(() => parseHomeChart({ ...chart(), ...patch }, "users")));
test("monthly series rejects wrong order, impossible/missing month and overcount", () => {
  for (const mutation of [c => c.series.reverse(), c => { c.series[0].month = "2025-13"; }, c => { c.series[0].count = 3; }, c => { c.series[0].count = Number.MAX_SAFE_INTEGER; c.series[1].count = 1; }]) {
    const c = chart(); mutation(c); assert.throws(() => parseHomeChart(c, "users"));
  }
});
test("profile distribution denominator is independent from user count", () => {
  const c = chart(); c.distributionTotal = 5; c.distribution = [{ key: "giocatore", count: 5 }]; assert.equal(parseHomeChart(c, "users").distributionTotal, 5);
  const ann = chart("announcements"); ann.distributionTotal = 5; ann.distribution = [{ key: "pubblicato", count: 5 }]; assert.throws(() => parseHomeChart(ann, "announcements"));
});
test("queue has exactly five ordered buckets and unknown count equals excluded dates", () => {
  const c = chart("pending");
  assert.throws(() => parseHomeChart({ ...c, age: c.age.slice(1) }, "pending")); assert.throws(() => parseHomeChart({ ...c, age: [...c.age].reverse() }, "pending"));
  assert.throws(() => parseHomeChart({ ...c, excludedDates: { missingOrNonFinite: 1, future: 0 } }, "pending"));
});
test("available charts project trusted definitions, limitations and numeric fields only", () => {
  const c = chart(); c.secret = "private"; c.distribution[0].email = "private"; c.series[0].email = "private"; c.excludedDates.email = "private"; c.period.email = "private"; c.limitations = ["private"];
  const parsed = parseHomeChart(c, "users"); assert(!JSON.stringify(parsed).includes("private")); assert(parsed.limitations.includes("LEGACY_REGISTRATION_DATES")); assert(parsed.limitations.includes("PROFILES_NOT_USERS"));
});
test("profits DTO strips other populations and financial fields", () => {
  const parsed = parseHomeChart({ ...chart("profits"), amount: 0, population: 100, series: chart().series }, "profits"); assert(!("amount" in parsed)); assert(!("population" in parsed)); assert(!("series" in parsed));
});
test("RSC adapters exclusively use read client and make independent requests", async () => {
  let reads = 0, writes = 0;
  const transport = { auth: { async getClaims() { return { data: { claims: claims() }, error: null }; } }, async rpc(name, args) { return { data: name === "admin_get_home_summary_v1" ? summary : name === "admin_get_home_chart_v1" ? chart(args.p_metric) : emptyAudit, error: null }; } };
  const l = adminServerLoader({ dependencies: { "@/lib/supabase/server": { async createReadClient() { reads++; return transport; }, async createClient() { writes++; throw new Error("wrong client"); } } } });
  const q = l(base + "server/queries.ts"); assert.equal((await q.getAdminHomeSummary()).status, "ok"); assert.equal((await q.getAdminHomeChart("users")).status, "ok"); assert.equal((await q.getAdminHomeActivity()).status, "ok");
  assert.equal(reads, 3); assert.equal(writes, 0);
});

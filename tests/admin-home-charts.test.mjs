import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
import { homeUiLoader } from "./helpers/admin-home-ui-loader.mjs";
const require = createRequire(import.meta.url), base = "apps/admin/src/features/home/";
const load = adminServerLoader(), { createHomeSession } = load(base + "client/session.ts"), { createHomeChartController } = load(base + "client/chart-controller.ts");
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const denied = { status: "denied", code: "ACCESS_DENIED" };
const chart = metric => ({ metric, available: false, asOf: "2026-10-24T12:00:00.000000Z", timezone: "Europe/Rome", limitations: [], reason: "FINANCIAL_SOURCE_NOT_CONFIGURED" });
function harness() {
  const redirects = [], session = createHomeSession(() => redirects.push(1)), requests = [];
  const c = createHomeChartController(session, (metric, signal) => new Promise((resolve, reject) => requests.push({ metric, signal, resolve, reject })));
  session.subscribe(c.sync); const disconnect = session.register(c);
  return { session, c, requests, redirects, disconnect };
}
test("mount requests users once; same selection and repeated start do not request again", async () => {
  const h = harness(); h.c.start(); h.c.start(); await flush(); assert.deepEqual(h.requests.map(r => r.metric), ["users"]);
  h.session.select("users"); await flush(); assert.equal(h.requests.length, 1);
});
test("rapid selection clears previous result and fetches only the last selection in the same turn", async () => {
  const h = harness(); h.c.start(); await flush(); h.requests[0].resolve({ status: "ok", chart: chart("users") }); await flush();
  assert.equal(h.c.getSnapshot().result.status, "ok"); h.session.select("announcements"); h.session.select("pending");
  assert.equal(h.c.getSnapshot().result, null); assert(h.c.getSnapshot().pending); await flush();
  assert.deepEqual(h.requests.map(r => r.metric), ["users", "pending"]); assert(h.requests[0].signal.aborted);
});
for (const stale of [denied, { status: "ok", chart: chart("users") }, { status: "unavailable", code: "HOME_UNAVAILABLE", correlationId: "old" }]) test(`stale ${stale.status} cannot override a different active metric`, async () => {
  const h = harness(); h.c.start(); await flush(); h.session.select("profits"); await flush();
  h.requests[1].resolve({ status: "ok", chart: chart("profits") }); await flush(); h.requests[0].resolve(stale); await flush();
  assert.equal(h.c.getSnapshot().result.chart.metric, "profits"); assert.equal(h.redirects.length, 0);
});
test("late rejection after a new success is ignored", async () => {
  const h = harness(); h.c.start(); await flush(); h.session.select("profits"); await flush(); h.requests[1].resolve({ status: "ok", chart: chart("profits") }); await flush();
  h.requests[0].reject(Error("old")); await flush(); assert.equal(h.c.getSnapshot().result.status, "ok");
});
test("current denial clears every registered block, aborts charts and redirects once", async () => {
  const h = harness(); let cleared = 0; h.session.register({ cancel() {}, clear() { cleared++; }, refresh() {} }); h.c.start(); await flush();
  h.requests[0].resolve(denied); await flush(); assert.equal(cleared, 1); assert.equal(h.c.getSnapshot().result, null); assert(h.requests[0].signal.aborted);
  h.session.deny(); h.c.refresh(); h.session.select("pending"); await flush(); assert.equal(h.redirects.length, 1); assert.equal(h.requests.length, 1);
});
test("unmount rejects stale denial; StrictMode reconnect starts exactly one effective request", async () => {
  const h = harness(); h.c.start(); h.disconnect(); h.session.register(h.c); h.c.start(); await flush(); assert.equal(h.requests.length, 1);
  h.c.cancel(); h.requests[0].resolve(denied); await flush(); assert.equal(h.redirects.length, 0);
  h.c.start(); await flush(); assert.equal(h.requests.length, 2);
});
test("BFcache refreshes selected chart and revisiting a metric fetches fresh data", async () => {
  const h = harness(); h.c.start(); await flush(); h.session.select("pending"); await flush(); h.session.resume(); await flush();
  assert.deepEqual(h.requests.map(r => r.metric), ["users", "pending", "pending"]); h.session.select("users"); await flush(); assert.equal(h.requests.length, 4);
});
test("mismatched response becomes a retryable panel error", async () => {
  const h = harness(); h.c.start(); await flush(); h.requests[0].resolve({ status: "ok", chart: chart("profits") }); await flush();
  assert.equal(h.c.getSnapshot().result.status, "unavailable"); h.c.refresh(); await flush(); assert.equal(h.requests.length, 2);
});
for (const source of ["charts", "summary", "activity"]) test(`${source} denial clears all three actual Home controllers`, async () => {
  const h = harness(), { createHomeBlockController } = load(base + "client/block-controller.ts"), blocks = {}, requests = {};
  for (const key of ["summary", "activity"]) {
    blocks[key] = createHomeBlockController({ status: "ok", [key]: {} }, { session: h.session, unavailable: () => ({ status: "unavailable" }),
      request: signal => new Promise(resolve => { requests[key] = { signal, resolve }; }) });
    h.session.register(blocks[key]); blocks[key].refresh();
  }
  h.c.start(); await flush(); (source === "charts" ? h.requests[0] : requests[source]).resolve(denied); await flush();
  assert.equal(h.c.getSnapshot().result, null); for (const key of ["summary", "activity"]) { assert.equal(blocks[key].getSnapshot().result, null); assert(requests[key].signal.aborted); }
  assert(h.requests[0].signal.aborted); assert.equal(h.redirects.length, 1);
});
async function transport(response, metric = "profits") {
  const calls = [], l = adminServerLoader({ fetch: async (...args) => { calls.push(args); return response; } });
  return { result: await l(base + "client/chart-transport.ts").readHomeChart(metric, new AbortController().signal), calls };
}
const response = (status, value, type = "application/json") => ({ status, headers: new Headers({ "content-type": type }), json: async () => value });
test("transport uses one private no-store request and projects profit DTO", async () => {
  const r = await transport(response(200, { status: "ok", chart: { ...chart("profits"), privateValue: "secret" } }));
  assert.equal(r.calls[0][0], "/api/home/charts?metric=profits"); assert.equal(r.calls[0][1].cache, "no-store"); assert.equal(r.calls[0][1].credentials, "same-origin"); assert(!("privateValue" in r.result.chart));
});
test("403 HTML is denial; non-JSON success and inconsistent statuses fail closed", async () => {
  assert.deepEqual((await transport(response(403, {}, "text/html"))).result, denied);
  for (const r of [response(200, {}, "text/html"), response(503, { status: "ok", chart: chart("profits") }), response(200, { status: "ok", chart: chart("users") })]) await assert.rejects(transport(r));
});
const asOf = "2026-10-24T12:00:00.000000Z";
const pending = { metric: "pending", available: true, asOf, timezone: "Europe/Rome", population: 0, distributionTotal: 0, distribution: [], excludedDates: { missingOrNonFinite: 0, future: 0 }, age: ["0_2", "3_7", "8_30", "over_30", "unknown"].map(key => ({ key, count: 0 })), limitations: ["CURRENT_RECORDS_ONLY", "CREATION_NOT_REVIEW_ENTRY"] };
const users = { ...pending, metric: "users", population: 1, distributionTotal: 2, distribution: [{ key: "giocatore", count: 1 }, { key: "squadra", count: 1 }], period: { from: "2025-10-31T23:00:00.000000Z", to: asOf }, series: Array.from({ length: 12 }, (_, i) => ({ month: `${i < 2 ? 2025 : 2026}-${String(i < 2 ? i + 11 : i - 1).padStart(2, "0")}`, count: i === 0 ? 1 : 0 })), limitations: ["PROFILES_NOT_USERS"] };
test("browser transport reuses strict server parsing for complete monthly data and rejects counts/period tampering", async () => {
  assert.equal((await transport(response(200, { status: "ok", chart: users }), "users")).result.chart.series.length, 12);
  for (const changed of [{ ...users, population: -1 }, { ...users, series: users.series.slice(1) }, { ...users, distributionTotal: 99 }]) await assert.rejects(transport(response(200, { status: "ok", chart: changed }), "users"));
});
test("adapters preserve integer zero, Italian year labels, category counts and stable colors", () => {
  const p = load(base + "chart-presentation.ts"), rows = p.primaryRows(users); assert.equal(rows.length, 12); assert.match(rows[0].label, /2025/); assert.equal(rows[1].count, 0);
  const d = p.distributionRows(users); assert.equal(d[0].label, "Giocatore"); assert.equal(d[0].fill, p.distributionRows({ ...users, distribution: [...users.distribution].reverse() })[1].fill);
  assert.match(p.primaryRows(pending).at(-1).label, /Data non disponibile/);
});
function renderer() { return homeUiLoader({ recharts: require("recharts") })(base + "components/HomeCharts.tsx"); }
test("empty pending population has an explicit state and never invents charts", () => {
  const html = renderToStaticMarkup(React.createElement(renderer().default, { chart: pending })); assert.match(html, /Nessun annuncio da approvare/); assert(!html.includes('data-slot="chart"')); assert.match(html, /non dall’ingresso in revisione/);
});
test("monthly dataset renders real chart containers, separate denominators and accessible tables", () => {
  const html = renderToStaticMarkup(React.createElement(renderer().default, { chart: users }));
  assert.equal((html.match(/data-slot="chart"/g) ?? []).length, 2); assert.equal((html.match(/<details/g) ?? []).length, 2); assert.match(html, /Totale profili: 2/); assert.match(html, /Popolazione: 1/); assert.match(html, /uno stesso utente/); assert.match(html, /Giocatore: 1/);
});
test("zero monthly events retain twelve rows and empty distribution does not render a dummy pie", () => {
  const value = { ...users, population: 0, distributionTotal: 0, distribution: [], series: users.series.map(r => ({ ...r, count: 0 })) };
  const html = renderToStaticMarkup(React.createElement(renderer().default, { chart: value })); assert.equal((html.match(/data-slot="chart"/g) ?? []).length, 1); assert.match(html, /Nessun evento nel periodo/); assert.match(html, /Nessun dato nella distribuzione/); assert.equal((html.match(/<tr/g) ?? []).length, 14);
});
test("profit panel and retryable failure render without importing the chart library", () => {
  for (const result of [{ status: "ok", chart: chart("profits") }, { status: "unavailable", code: "HOME_UNAVAILABLE", correlationId: "failure-id" }]) {
    const l = homeUiLoader({ "./useHomeChart": { useHomeChart: () => ({ selected: "profits", pending: false, result, refresh() {} }) } });
    const html = renderToStaticMarkup(React.createElement(l(base + "components/HomeChartPanel.tsx").HomeChartPanel));
    assert.match(html, result.status === "ok" ? /I dati sui profitti non sono disponibili/ : /failure-id/); assert(!html.includes('data-slot="chart"'));
  }
});

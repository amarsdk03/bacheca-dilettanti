import assert from "node:assert/strict";
import { test } from "node:test";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
const base = "apps/admin/src/features/home/", load = adminServerLoader();
const { createHomeSession } = load(base + "client/session.ts");
const { createHomeBlockController } = load(base + "client/block-controller.ts");
const summary = { status: "ok", summary: { asOf: "2026-10-24T12:00:00.000000Z", users: 1, announcements: 2, pending: 0, profits: { available: false } } };
const activity = { status: "ok", page: { items: [], nextCursor: null, hasMore: false } };
const failure = { status: "unavailable", code: "HOME_UNAVAILABLE", correlationId: "client" }, denied = { status: "denied", code: "ACCESS_DENIED" };
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function harness() {
  const redirects = [], session = createHomeSession(() => redirects.push("/accesso"));
  const requests = { summary: [], activity: [] }, blocks = {};
  for (const [key, initial] of [["summary", summary], ["activity", activity]]) blocks[key] = createHomeBlockController(initial, { session, unavailable: () => failure,
    request(signal) { const d = deferred(); requests[key].push({ ...d, signal }); return d.promise; } });
  return { session, redirects, blocks, requests };
}
test("SSR seeds each controller and registration performs no hydration fetch", () => {
  const h = harness(); for (const c of Object.values(h.blocks)) h.session.register(c);
  assert.deepEqual(h.blocks.summary.getSnapshot().result, summary); assert.deepEqual(h.blocks.activity.getSnapshot().result, activity);
  assert.equal(h.requests.summary.length, 0); assert.equal(h.requests.activity.length, 0);
});
test("selection defaults to users, never empty or invalid, and survives independent refresh", async () => {
  const h = harness(); assert.equal(h.session.getSnapshot().selected, "users"); h.session.select("pending"); h.session.select(""); h.session.select("future");
  assert.equal(h.session.getSnapshot().selected, "pending"); h.blocks.summary.refresh(); await flush(); h.requests.summary[0].resolve(summary); await flush(); assert.equal(h.session.getSnapshot().selected, "pending");
});
test("separate requests and failures never clear the other block", async () => {
  const h = harness(); h.blocks.summary.refresh(); await flush(); assert(h.blocks.summary.getSnapshot().pending); assert.deepEqual(h.blocks.activity.getSnapshot().result, activity);
  h.requests.summary[0].reject(new Error("offline")); await flush(); assert.equal(h.blocks.summary.getSnapshot().result.status, "unavailable"); assert.deepEqual(h.blocks.activity.getSnapshot().result, activity);
  h.blocks.summary.refresh(); await flush(); h.requests.summary[1].resolve(summary); await flush(); assert.equal(h.blocks.summary.getSnapshot().result.status, "ok"); assert.equal(h.requests.activity.length, 0);
});
test("stale success, error and denial cannot replace a newer response", async () => {
  for (const outcome of [summary, failure, denied]) {
    const h = harness(); h.blocks.summary.refresh(); await flush(); h.blocks.summary.refresh(); await flush();
    assert(h.requests.summary[0].signal.aborted); h.requests.summary[1].resolve(summary); await flush(); h.requests.summary[0].resolve(outcome); await flush();
    assert.deepEqual(h.blocks.summary.getSnapshot().result, summary); assert.equal(h.redirects.length, 0);
  }
});
test("a late rejected transport cannot replace a newer success", async () => {
  const h = harness(); h.blocks.summary.refresh(); await flush(); h.blocks.summary.refresh(); await flush();
  h.requests.summary[1].resolve(summary); await flush(); h.requests.summary[0].reject(new Error("late offline")); await flush();
  assert.deepEqual(h.blocks.summary.getSnapshot().result, summary); assert.equal(h.redirects.length, 0);
});
for (const key of ["summary", "activity"]) test(`current ${key} denial clears both, aborts requests and redirects once`, async () => {
  const h = harness(); for (const block of Object.values(h.blocks)) h.session.register(block);
  h.blocks.summary.refresh(); h.blocks.activity.refresh(); await flush(); h.requests[key][0].resolve(denied); await flush();
  assert.equal(h.session.getSnapshot().denied, true); assert.equal(h.blocks.summary.getSnapshot().result, null); assert.equal(h.blocks.activity.getSnapshot().result, null);
  assert(h.requests.summary[0].signal.aborted); assert(h.requests.activity[0].signal.aborted); assert.deepEqual(h.redirects, ["/accesso"]);
  h.session.deny(); h.session.resume(); h.blocks.summary.refresh(); await flush(); assert.equal(h.requests.summary.length, 1); assert.equal(h.redirects.length, 1);
  h.session.select("profits"); assert.equal(h.session.getSnapshot().selected, "users");
});
test("unregister aborts and late replies cannot redirect or update", async () => {
  const h = harness(), disconnect = h.session.register(h.blocks.summary); h.blocks.summary.refresh(); await flush(); disconnect();
  assert(h.requests.summary[0].signal.aborted); h.requests.summary[0].resolve(denied); await flush(); assert.equal(h.redirects.length, 0);
  h.session.resume(); await flush(); assert.equal(h.requests.summary.length, 1);
});
test("BFcache refreshes both mounted blocks; late streamed blocks also revalidate", async () => {
  const h = harness(); h.session.register(h.blocks.summary); h.session.resume(); await flush(); assert.equal(h.requests.summary.length, 1); assert.equal(h.requests.activity.length, 0);
  h.session.register(h.blocks.activity); await flush(); assert.equal(h.requests.activity.length, 1);
});
test("late registration after denial clears its initial data without fetching", async () => {
  const h = harness(); h.session.deny(); h.session.register(h.blocks.activity); await flush(); assert.equal(h.blocks.activity.getSnapshot().result, null); assert.equal(h.requests.activity.length, 0);
});
test("same-tick cancel or denial prevents a scheduled request from starting", async () => {
  const h = harness(); h.blocks.summary.refresh(); h.blocks.summary.cancel(); await flush(); assert.equal(h.requests.summary.length, 0);
  h.blocks.activity.refresh(); h.session.deny(); await flush(); assert.equal(h.requests.activity.length, 0);
});
test("unsubscribed listeners stop receiving changes and server snapshot stays stable", () => {
  const h = harness(); let calls = 0; const initial = h.session.getServerSnapshot(); const off = h.session.subscribe(() => calls++);
  h.session.select("profits"); assert.equal(calls, 1); off(); h.session.select("announcements"); assert.equal(calls, 1); assert.equal(h.session.getServerSnapshot(), initial);
});
test("transport only requests summary/activity with same-origin no-store and redirect error", async () => {
  const calls = []; let response = Response.json(summary);
  const l = adminServerLoader({ fetch: async (...args) => { calls.push(args); return response; } }), t = l(base + "client/transport.ts").homeTransport, signal = new AbortController().signal;
  assert.deepEqual(await t.summary(signal), summary); response = Response.json(activity); assert.deepEqual(await t.activity(signal), activity);
  assert.deepEqual(calls.map(c => c[0]), ["/api/home/summary", "/api/home/activity"]);
  assert(calls.every(([, args]) => args.signal === signal && args.cache === "no-store" && args.credentials === "same-origin" && args.redirect === "error"));
  response = new Response("denied", { status: 403 }); assert.deepEqual(await t.summary(signal), denied);
  for (const invalid of [new Response("<html>Login</html>", { headers: { "content-type": "text/html" } }), Response.json({ status: "ok" }, { status: 503 }), Response.json({ status: "ok", summary: { ...summary.summary, users: -1 } })]) { response = invalid; await assert.rejects(t.summary(signal)); }
  response = Response.json({ ...activity, page: { ...activity.page, items: Array(6).fill({}) } }); await assert.rejects(t.activity(signal));
});

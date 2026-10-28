import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homeUiLoader, resolveHomeServerTree } from "./helpers/admin-home-ui-loader.mjs";
const base = "apps/admin/src/features/home/", pagePath = "apps/admin/src/app/(dashboard)/page.tsx";
const asOf = "2026-10-24T12:00:00.000000Z", id = "eeeeeeee-eeee-4eee-8eee-000000000001";
const summary = { status: "ok", summary: { asOf, users: 1234, announcements: 2000, pending: 0, profits: { available: false } } };
const row = { id, occurredAt: asOf, action: "auth.login", outcome: "success", actor: { authId: id, userId: id, email: "<script>admin@example.test</script>" } };
const activity = { status: "ok", page: { items: [row], hasMore: false, nextCursor: null } };
const failure = { status: "unavailable", code: "HOME_UNAVAILABLE", correlationId: "test-correlation" };
const require = createRequire(import.meta.url);
function setup(options = {}) {
  const calls = [];
  const l = homeUiLoader({ "@/features/dashboard/server/guard": { async requireAdminPageContext() { calls.push("guard"); if (options.denied) throw new Error("REDIRECT:/accesso"); } },
    "@/features/home/server/queries": { getAdminHomeSummary() { calls.push("summary"); return options.summary ?? Promise.resolve(summary); }, getAdminHomeActivity() { calls.push("activity"); return options.activity ?? Promise.resolve(activity); }, getAdminHomeChart() { assert.fail("No charts in step 14"); } },
  }); return { l, calls, page: l(pagePath).default };
}
function deferred() { let resolve; const promise = new Promise(a => { resolve = a; }); return { promise, resolve }; }
test("page authorizes before starting both reads and does not wait for either result", async () => {
  const s = deferred(), a = deferred(), h = setup({ summary: s.promise, activity: a.promise });
  const tree = await h.page(); assert.deepEqual(h.calls, ["guard", "summary", "activity"]);
  const children = React.Children.toArray(tree.props.children.props.children), boundaries = children.filter(c => c.type === React.Suspense);
  assert.equal(boundaries.length, 2); assert.equal(boundaries[0].props.children.props.result, s.promise); assert.equal(boundaries[1].props.children.props.result, a.promise);
  s.resolve(summary); const ready = await boundaries[0].props.children.type(boundaries[0].props.children.props); assert.equal(ready.props.initialResult, summary);
  a.resolve(activity); assert.equal((await boundaries[1].props.children.type(boundaries[1].props.children.props)).props.initialResult, activity);
});
test("guard denial prevents both functional requests", async () => { const h = setup({ denied: true }); await assert.rejects(h.page(), /REDIRECT:\/accesso/); assert.deepEqual(h.calls, ["guard"]); });
for (const block of ["HomeKpiSection", "HomeActivitySection"]) test(`SSR ${block} redirects an independently denied read`, async () => {
  const h = setup(), component = h.l(base + "server/blocks.tsx")[block]; await assert.rejects(component({ result: Promise.resolve({ status: "denied", code: "ACCESS_DENIED" }) }), /REDIRECT:\/accesso/);
});
test("complete resolved Home renders four KPI, formatted counts, exact zero and shared audit table", async () => {
  const h = setup(), html = renderToStaticMarkup(await resolveHomeServerTree(await h.page()));
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1); const heading = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/)[0]; assert.match(heading, /Bentornato, admin!/); assert(!heading.includes("<svg"));
  for (const title of ["Utenti totali", "Annunci totali", "Annunci da approvare", "Profitti totali"]) assert(html.includes(title));
  assert.match(html, /1\.234/); assert.match(html, /2\.000/); assert.match(html, /id="home-pending-value"[^>]*>0<\/div>/); assert.match(html, /Non disponibile/);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1); assert.match(html, /aria-label="Metrica dei grafici"/);
  assert.equal((html.match(/<th\s/g) ?? []).length, 3); assert.match(html, /&lt;script&gt;/); assert(!html.includes("<script>")); assert(!html.includes("Mostra dettagli"));
  assert(!html.includes("<form")); assert.match(html, /Date in Europe\/Rome/); assert.deepEqual(h.calls, ["guard", "summary", "activity"]);
});
test("quick actions and registry link navigate internally without prefetch or invented counts", async () => {
  const h = setup(), tree = await resolveHomeServerTree(await h.page()), html = renderToStaticMarkup(tree);
  assert.match(html, /href="\/annunci\?status=in_revisione"/); assert.match(html, /href="\/segnalazioni"/); assert.match(html, /href="\/registro-attivita"/);
  const disabled = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(m => m[0]).find(b => b.includes("Crea profilo limitato")); assert(disabled.includes('disabled=""')); assert.match(disabled, /Presto/);
  assert(!html.includes("href=\"http")); assert(!html.includes("Esporta")); assert(!html.includes("Segnalazioni aperte ("));
  const actions = h.l(base + "components/HomeQuickActions.tsx").HomeQuickActions();
  const buttons = React.Children.toArray(actions.props.children[1].props.children).slice(0, 2); assert(buttons.every(b => b.props.render.props.prefetch === false));
});
test("summary error keeps activity and profit unavailability visible without fictitious zero", async () => {
  const h = setup({ summary: Promise.resolve(failure) }), html = renderToStaticMarkup(await resolveHomeServerTree(await h.page()));
  assert.match(html, /Impossibile caricare gli indicatori/); assert.match(html, /test-correlation/); assert.match(html, /<table/); assert.match(html, /Non disponibile/);
  assert(!/id="home-users-value"[^>]*>0<\/div>/.test(html)); assert.match(html, /Riprova/);
});
test("activity error leaves KPI usable and preserves full registry link", async () => {
  const h = setup({ activity: Promise.resolve({ ...failure, code: "AUDIT_UNAVAILABLE" }) }), html = renderToStaticMarkup(await resolveHomeServerTree(await h.page()));
  assert.match(html, /1\.234/); assert.match(html, /Impossibile caricare le ultime operazioni/); assert.match(html, /Vedi registro completo/); assert(!html.includes("<table"));
});
test("empty history shows explanatory state rather than placeholder rows", async () => {
  const h = setup({ activity: Promise.resolve({ status: "ok", page: { items: [], hasMore: false, nextCursor: null } }) });
  const html = renderToStaticMarkup(await resolveHomeServerTree(await h.page())); assert.match(html, /Nessuna operazione registrata/); assert.match(html, /precedente all’attivazione/); assert(!html.includes("<table"));
});
test("five events render with no details, accounts without identity and verified-only failures stay distinct", async () => {
  const items = Array.from({ length: 5 }, (_, i) => ({ ...row, id: id.slice(0, -1) + (i + 1), outcome: "failure", actor: i === 0 ? { authId: null, userId: null, email: null } : i === 1 ? { authId: id, userId: null, email: null } : row.actor }));
  const h = setup({ activity: Promise.resolve({ status: "ok", page: { items, hasMore: true, nextCursor: "cursor-unused" } }) });
  const html = renderToStaticMarkup(await resolveHomeServerTree(await h.page())); assert.equal((html.match(/<tr\b/g) ?? []).length, 6); assert.match(html, /Non identificato/); assert.match(html, /Account verificato, senza identità Admin attestata/); assert(!html.includes("cursor-unused")); assert(!html.includes("Mostra dettagli"));
});
for (const [metric, title] of [["users", "Utenti totali"], ["announcements", "Annunci totali"], ["pending", "Annunci da approvare"], ["profits", "Profitti totali"]]) test(`local selection ${metric} updates the panel with its initial loading state`, async () => {
  const h = setup(), session = h.l(base + "client/session.ts").createHomeSession(() => {}); session.select(metric);
  const l = homeUiLoader({ react: { ...React, useSyncExternalStore: (_subscribe, snapshot) => snapshot() }, "./HomeSessionProvider": { useHomeSession: () => session } }), Panel = l(base + "components/HomeChartPanel.tsx").HomeChartPanel;
  const html = renderToStaticMarkup(React.createElement(Panel)); assert(html.includes("Grafici - " + title)); assert(!html.includes("<canvas"));
  assert.match(html, /Caricamento grafico/); assert.match(html, /Aggiorna grafici/);
});
test("skeletons match KPI and five-row three-column activity blocks", () => {
  const l = homeUiLoader(), { HomeKpiSkeleton, HomeActivitySkeleton } = l(base + "components/HomeSkeletons.tsx");
  const kpis = renderToStaticMarkup(React.createElement(HomeKpiSkeleton)); assert.match(kpis, /aria-busy="true"/); assert.equal((kpis.match(/data-slot="card"/g) ?? []).length, 4); assert.match(kpis, /Non disponibile/);
  const audit = renderToStaticMarkup(React.createElement(HomeActivitySkeleton)); assert.equal((audit.match(/<tr\b/g) ?? []).length, 5); assert.equal((audit.match(/<td\b/g) ?? []).length, 15);
});
test("pending KPI keeps four choices and static profits while only three values have skeletons", () => {
  const l = homeUiLoader({ "./useHomeBlock": { useHomeBlock: () => ({ pending: true, result: null, refresh() {} }) } });
  const Provider = l(base + "components/HomeSessionProvider.tsx").HomeSessionProvider, Kpis = l(base + "components/HomeKpis.tsx").HomeKpis;
  const html = renderToStaticMarkup(React.createElement(Provider, null, React.createElement(Kpis, { initialResult: summary })));
  assert.equal((html.match(/data-slot="skeleton"/g) ?? []).length, 3); assert.equal((html.match(/aria-controls="home-chart-panel"/g) ?? []).length, 4);
  assert.match(html, /Non disponibile/); assert.match(html, /Aggiornamento indicatori in corso/); assert.match(html, /disabled/);
});
test("pending activity replaces stale rows with a five-row skeleton", () => {
  const l = homeUiLoader({ "./useHomeBlock": { useHomeBlock: () => ({ pending: true, result: null, refresh() {} }) } }), Activity = l(base + "components/HomeActivity.tsx").HomeActivity;
  const html = renderToStaticMarkup(React.createElement(Activity, { initialResult: activity })); assert.equal((html.match(/<tr\b/g) ?? []).length, 5); assert(!html.includes(row.actor.email)); assert.match(html, /aria-busy="true"/);
});
test("actual selection handler rejects deselection and multiple values while preserving one metric", () => {
  let onChange; const actualGroup = require("@base-ui/react/toggle-group").ToggleGroup;
  const h = setup(), session = h.l(base + "client/session.ts").createHomeSession(() => {});
  const l = homeUiLoader({ "./HomeSessionProvider": { useHomeSession: () => session },
    "@base-ui/react/toggle-group": { ToggleGroup: props => { onChange = props.onValueChange; return React.createElement(actualGroup, props); } } });
  const Kpis = l(base + "components/HomeKpis.tsx").HomeKpis;
  renderToStaticMarkup(React.createElement(Kpis, { initialResult: summary }));
  onChange([]); assert.equal(session.getSnapshot().selected, "users"); onChange(["profits"]); assert.equal(session.getSnapshot().selected, "profits");
  onChange(["users", "pending"]); assert.equal(session.getSnapshot().selected, "profits"); onChange(["invalid"]); assert.equal(session.getSnapshot().selected, "profits");
});
test("shared table preserves Registry detail action, focus trigger and three-column Home variant", () => {
  const l = homeUiLoader(), Table = l("apps/admin/src/features/audit/components/AuditSummaryTable.tsx").AuditSummaryTable;
  const html = renderToStaticMarkup(React.createElement(Table, { items: [row], caption: "Registry", onShowDetails() {} })); assert.equal((html.match(/<th\s/g) ?? []).length, 4); assert.match(html, /Mostra dettagli/);
  // Invoke the actual row button from the presentation tree to verify the trigger contract.
  let seen; const tree = Table({ items: [row], caption: "Registry", onShowDetails: (...args) => { seen = args; } });
  const rowTree = tree.props.children[2].props.children[0], cells = React.Children.toArray(rowTree.props.children), button = cells.at(-1).props.children, trigger = {};
  button.props.onClick({ currentTarget: trigger }); assert.deepEqual(seen, [id, trigger]);
});
test("provider removes all Home content after denial and wiring only reacts to persisted pageshow", () => {
  const l = homeUiLoader({ react: { ...React, useSyncExternalStore: () => ({ denied: true, selected: "users" }) } });
  const Provider = l(base + "components/HomeSessionProvider.tsx").HomeSessionProvider;
  assert.equal(renderToStaticMarkup(React.createElement(Provider, null, "private KPI and activity")), "");
  const source = readFileSync(new URL("../apps/admin/src/features/home/components/HomeSessionProvider.tsx", import.meta.url), "utf8"); assert.match(source, /event.persisted/); assert.match(source, /removeEventListener/); assert(!source.includes("setInterval"));
});

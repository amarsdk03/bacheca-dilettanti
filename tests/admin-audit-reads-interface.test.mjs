import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
const require = createRequire(import.meta.url), base = "apps/admin/src/features/audit/", load = adminServerLoader();
const { parseAuditUrl, auditHref, auditSearchParams } = load(base + "read-url.ts");
const { createAuditController } = load(base + "client/read-controller.ts");
const { auditActorLabel, auditDate } = load(base + "read-presentation.ts");
const id = "eeeeeeee-eeee-4eee-8eee-000000000001";
const empty = { status: "ok", page: { items: [], hasMore: false, nextCursor: null } }, denied = { status: "denied", code: "ACCESS_DENIED" };
const row = { id, occurredAt: "2026-10-23T12:00:00.123456Z", action: "auth.login", outcome: "success", actor: { authId: id, userId: id, email: "<script>admin@example.test</script>" } };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function controller(search = "", result = empty) {
  const lists = [], details = [], history = [], redirects = [];
  const c = createAuditController(parseAuditUrl(search), result, {
    list(q, signal) { const d = deferred(); lists.push({ ...d, q, signal }); return d.promise; },
    detail(id, signal) { const d = deferred(); details.push({ ...d, id, signal }); return d.promise; },
    navigate(href) { history.push(href); }, denied() { redirects.push("/accesso"); },
  });
  return { c, lists, details, history, redirects, state: c.getSnapshot };
}
function uiLoader(overrides = {}) {
  const dependencies = { react: React, "react/jsx-runtime": require("react/jsx-runtime"), ...overrides };
  for (const name of ["@base-ui/react/button", "@base-ui/react/input", "@base-ui/react/separator", "@base-ui/react/tooltip", "@base-ui/react/dialog", "@base-ui/react/select", "@base-ui/react/merge-props", "@base-ui/react/use-render", "class-variance-authority", "clsx", "tailwind-merge", "lucide-react"]) dependencies[name] = require(name);
  return adminServerLoader({ dependencies });
}
test("URL normalizes exact email, date and selectors and omits defaults", () => {
  const q = parseAuditUrl("?operator=%20ADMIN%40Example.Test%20&from=2026-10-01&to=2026-10-24&action=auth.login&outcome=success");
  assert(q.valid); assert.equal(q.filters.operator, "admin@example.test"); assert.equal(parseAuditUrl(q.href.slice(18)).key, q.key);
  assert.equal(auditHref(parseAuditUrl("").filters), "/registro-attivita");
  assert.equal(parseAuditUrl("operator=" + id.toUpperCase()).filters.operator, id);
});
for (const search of ["from=2026-02-30", "from=0000-01-01", "from=2026-10-24&to=2026-10-01", "operator=partial", "operator=a%40b", "action=all", "outcome=Success", "from=2026-10-01&from=2026-10-02", "limit=30", "cursor=", "cursor=%3D"]) test(`invalid URL remains explicit: ${search}`, () => { const q = parseAuditUrl(search); assert(!q.valid); assert(!parseAuditUrl(q.href.slice(18)).valid); });
test("Next arrays retain duplicate rejection", () => assert(!parseAuditUrl(auditSearchParams({ outcome: ["success", "failure"], unused: undefined })).valid));
test("initial SSR results trigger no duplicate request or detail prefetch", () => { const h = controller(); h.c.sync(""); assert.equal(h.lists.length, 0); assert.equal(h.details.length, 0); assert.deepEqual(h.state().list.result, empty); });
test("filters apply together, reset cursor, and invalid drafts make no requests", () => {
  const h = controller("cursor=YWJj"); h.c.draft({ from: "2026-10-24", to: "2026-10-01" }); h.c.apply(); assert(h.state().error); assert.equal(h.lists.length, 0);
  h.c.draft({ to: "2026-10-25", operator: "admin@example.test", outcome: "success" }); h.c.apply();
  assert.equal(h.lists.length, 1); assert.equal(h.lists[0].q.cursor, null); assert.equal(h.lists[0].q.filters.operator, "admin@example.test"); assert(h.state().list.pending); assert.equal(h.state().list.result, null); h.c.cancel();
});
test("newer list invalidates older success and denial even if transport ignores abort", async () => {
  const h = controller(); h.c.draft({ outcome: "success" }); h.c.apply(); h.c.draft({ outcome: "failure" }); h.c.apply();
  assert(h.lists[0].signal.aborted); h.lists[1].resolve(empty); await flush(); h.lists[0].resolve(denied); await flush();
  assert.equal(h.redirects.length, 0); assert.deepEqual(h.state().list.result, empty); h.c.cancel();
});
test("detail loads only on open; rapid replacement, close and refresh reject stale responses", async () => {
  const h = controller(); assert.equal(h.details.length, 0); h.c.open(id); h.c.open(id.replace(/1$/, "2"));
  assert(h.details[0].signal.aborted); h.details[0].resolve(denied); await flush(); assert.equal(h.redirects.length, 0);
  h.c.close(); h.details[1].resolve({ status: "ok", detail: row }); await flush(); assert.equal(h.state().detail.result, null);
  h.c.open(id); h.c.refresh(); assert(h.details[2].signal.aborted); assert.equal(h.state().detail.id, null); h.c.cancel();
});
test("current denial from either request clears private data and redirects once", async () => {
  for (const source of ["list", "detail"]) {
    const h = controller(); h.c.refresh(); h.c.open(id);
    (source === "list" ? h.lists[0] : h.details[0]).resolve(denied); await flush();
    assert.equal(h.state().list.result, null); assert.equal(h.state().detail.id, null); assert.deepEqual(h.redirects, ["/accesso"]); assert(h.lists[0].signal.aborted); assert(h.details[0].signal.aborted);
    h.lists[0].resolve(empty); h.details[0].resolve(denied); await flush(); assert.equal(h.redirects.length, 1);
  }
});
test("pagination supports next, previous, first and browser URL changes", async () => {
  const page = { status: "ok", page: { items: [row], hasMore: true, nextCursor: "YWJj" } }, h = controller("", page);
  h.c.next(); assert.equal(h.lists[0].q.cursor, "YWJj"); assert(h.state().canPrevious); h.lists[0].resolve(empty); await flush();
  h.c.previous(); assert.equal(h.lists[1].q.cursor, null); h.lists[1].resolve(page); await flush(); h.c.next(); h.lists[2].resolve(empty); await flush();
  h.c.sync(""); assert.equal(h.state().query.cursor, null); h.lists[3].resolve(page); await flush(); h.c.first(); assert.equal(h.state().query.cursor, null);
  h.c.sync("outcome=failure"); assert.equal(h.state().canPrevious, false); h.c.cancel();
});
test("invalid popstate clears data without requesting; BFcache force triggers validation again", () => {
  const h = controller(); h.c.sync("limit=99"); assert.equal(h.state().list.result.status, "invalid"); assert.equal(h.lists.length, 0);
  h.c.sync("", true); assert.equal(h.lists.length, 1); h.c.cancel();
});
test("transport failure supports retry and unmount suppresses both late responses", async () => {
  const h = controller(); h.c.refresh(); h.lists[0].reject(new Error("offline")); await flush(); assert.equal(h.state().list.result.status, "unavailable");
  h.c.refresh(); h.c.open(id); h.c.cancel(); assert(h.lists[1].signal.aborted); assert(h.details[0].signal.aborted);
  h.lists[1].resolve(denied); h.details[0].resolve(denied); await flush(); assert.equal(h.redirects.length, 0);
});
test("actor labels prefer current email then stored app/Auth UUID and distinguish anonymous", () => {
  assert.equal(auditActorLabel(row.actor), row.actor.email);
  assert.match(auditActorLabel({ ...row.actor, email: null }), /^Utente eeeeeeee/);
  assert.match(auditActorLabel({ authId: id, userId: null, email: null }), /^Account verificato/);
  assert.equal(auditActorLabel({ authId: null, userId: null, email: null }), "Non identificato");
  assert.match(auditDate("2026-10-23T12:00:00.123456Z"), /14:00:00/);
});
test("actual UI renders three informative columns and detail action, escaped text, bounded explanation", () => {
  const Workspace = uiLoader()(base + "components/AuditWorkspace.tsx").AuditWorkspace;
  const html = renderToStaticMarkup(React.createElement(Workspace, { initialQuery: parseAuditUrl(""), initialResult: { status: "ok", page: { items: [row], hasMore: false, nextCursor: null } } }));
  assert.equal((html.match(/<th\s/g) ?? []).length, 4); assert.match(html, /Data e ora/); assert.match(html, /Amministratore/); assert.match(html, /Operazione/); assert.match(html, /Mostra dettagli/);
  assert.match(html, /&lt;script&gt;/); assert(!html.includes("<script>")); assert.match(html, /30 eventi/); assert.match(html, /Email attuali/); assert.match(html, /Europe\/Rome/);
  assert(!html.includes("Elimina")); assert(!html.includes("Esporta pagina")); assert(!html.includes("mailto:")); assert(!html.includes("<a "));
});
for (const [result, message] of [[empty, "Nessun evento disponibile"], [{ status: "invalid", code: "INVALID_QUERY" }, "Filtri o cursore non validi"], [{ status: "unavailable", code: "AUDIT_UNAVAILABLE", correlationId: "client" }, "Impossibile caricare il registro"]]) test(`actual UI distinguishes ${message}`, () => {
  const Workspace = uiLoader()(base + "components/AuditWorkspace.tsx").AuditWorkspace;
  const html = renderToStaticMarkup(React.createElement(Workspace, { initialQuery: parseAuditUrl(""), initialResult: result })); assert(html.includes(message)); assert(!html.includes("<table"));
});
test("detail renders forensic fields as text, old export absence and complete IDs without fetches", () => {
  const Content = uiLoader()(base + "components/AuditDetailContent.tsx").AuditDetailContent;
  const detail = { ...row, resourceType: "announcement_export", resourceId: null, correlationId: id, reason: "<img src=x onerror=alert(1)>", failureCode: null, changes: { hidden: { before: false, after: true } }, export: { rowCount: 1, columns: null, announcementIds: null } };
  const html = renderToStaticMarkup(React.createElement(Content, { detail })); assert.match(html, /&lt;img/); assert(!html.includes("<img")); assert(!html.includes("<a "));
  assert.match(html, /ID non disponibili per questo evento storico/); assert.match(html, /UUID account Auth/); assert.match(html, /Correlazione/); assert.match(html, /non una copia storica/); assert.match(html, /false → true/); assert.match(html, /Timestamp UTC/); assert(html.includes(row.occurredAt));
});
test("protected SSR page guards before reading and redirects if functional read denies", async () => {
  let access = false, calls = 0, result = empty;
  const l = uiLoader({ "next/navigation": { redirect(href) { throw new Error("REDIRECT:" + href); } },
    "@/features/dashboard/server/guard": { async requireAdminPageContext() { if (!access) throw new Error("REDIRECT:/accesso"); } },
    "@/features/audit/server/read-queries": { async listAdminAuditEvents(q) { calls++; assert.equal(q.limit, 30); return result; } },
  }), Page = l("apps/admin/src/app/(dashboard)/registro-attivita/page.tsx").default;
  await assert.rejects(Page({ searchParams: Promise.resolve({}) }), /REDIRECT:\/accesso/); assert.equal(calls, 0);
  access = true; const tree = await Page({ searchParams: Promise.resolve({ outcome: "failure" }) }); assert.equal(calls, 1);
  const workspace = React.Children.toArray(tree.props.children)[1]; assert.equal(workspace.props.initialQuery.filters.outcome, "failure");
  await Page({ searchParams: Promise.resolve({ outcome: ["success", "failure"] }) }); assert.equal(calls, 1);
  result = denied; await assert.rejects(Page({ searchParams: Promise.resolve({}) }), /REDIRECT:\/accesso/);
});
test("transport uses no-store/same origin, rejects HTML and inconsistent status and treats 403 as denied", async () => {
  let response = Response.json(empty), seen;
  const l = adminServerLoader({ fetch: async (...args) => { seen = args; return response; } }), transport = l(base + "client/read-transport.ts").auditTransport, signal = new AbortController().signal;
  assert.deepEqual(await transport.list(parseAuditUrl("outcome=failure"), signal), empty); assert.equal(seen[0], "/api/registro-attivita?outcome=failure"); assert.equal(seen[1].cache, "no-store"); assert.equal(seen[1].credentials, "same-origin"); assert.equal(seen[1].signal, signal);
  response = new Response("denied", { status: 403 }); assert.deepEqual(await transport.detail(id, signal), denied);
  response = new Response("<html>Login</html>", { headers: { "content-type": "text/html" } }); await assert.rejects(transport.detail(id, signal));
  response = Response.json({ status: "ok" }, { status: 503 }); await assert.rejects(transport.detail(id, signal));
});
test("workspace wires BFcache, focus return, dialog name and read-only retention state", () => {
  const source = readFileSync(new URL("../apps/admin/src/features/audit/components/AuditWorkspace.tsx", import.meta.url), "utf8");
  assert.match(source, /event.persisted/); assert.match(source, /initialFocus=\{panelTitle\}/); assert.match(source, /finalFocus=.*isConnected/); assert.match(source, /Evento non più disponibile/); assert.match(source, /Aggiorna elenco/);
});

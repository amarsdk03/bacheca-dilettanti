import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const require = createRequire(import.meta.url);
const base = "apps/admin/src/features/annunci/";
const load = adminServerLoader();
const { parseAnnunciUrl, annunciHref, annunciSearchParams } = load(base + "url-state.ts");
const { createAnnunciController } = load(base + "client/controller.ts");
const empty = { status: "ok", page: { items: [], hasMore: false, nextCursor: null } };
const denied = { status: "denied", code: "ACCESS_DENIED" };
const id = "eeeeeeee-eeee-4eee-8eee-000000000001";
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function controller(search = "", result = empty) {
  const lists = [], details = [], history = [], redirects = [];
  const c = createAnnunciController(parseAnnunciUrl(search), result, {
    list(query, signal) { const d = deferred(); lists.push({ ...d, query, signal }); return d.promise; },
    detail(id, signal) { const d = deferred(); details.push({ ...d, id, signal }); return d.promise; },
    navigate(...args) { history.push(args); }, denied() { redirects.push("/accesso"); },
  });
  return { c, lists, details, history, redirects, state: c.getSnapshot };
}

test("URL roundtrip preserves literal Unicode search and exact selectors, omits defaults", () => {
  const query = parseAnnunciUrl("?search=%20Équipe%20100%25_%20&status=in_revisione&type=annuncio_giocatore&visibility=hidden&cursor=YWJj");
  assert(query.valid); assert.equal(query.filters.search, "Équipe 100%_");
  assert.equal(parseAnnunciUrl(query.href.slice(8)).key, query.key);
  assert.equal(annunciHref(parseAnnunciUrl("").filters), "/annunci");
  assert.equal(parseAnnunciUrl("search=" + id.toUpperCase()).filters.search, id);
});
for (const search of ["status=Admin", "status=pubblicato&status=in_revisione", "limit=100", "visibility=private", "cursor=", "cursor=%3D", "search=" + "x".repeat(201)]) {
  test(`invalid URL is explicit and retained for retry: ${search.slice(0, 45)}`, () => {
    const query = parseAnnunciUrl(search); assert.equal(query.valid, false);
    assert.equal(parseAnnunciUrl(query.href.slice(8)).valid, false);
  });
}
test("Next search-param arrays retain duplicate rejection", () => {
  assert(!parseAnnunciUrl(annunciSearchParams({ status: ["pubblicato", "rifiutato"], missing: undefined })).valid);
});
test("initial server result makes no client request or preview request", () => {
  const h = controller(); assert.deepEqual(h.state().list.result, empty);
  h.c.sync(""); assert.equal(h.lists.length, 0); assert.equal(h.details.length, 0);
});
test("search debounces, replaces history and resets cursor; submit flushes immediately", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = controller("cursor=YWJj");
  h.c.setSearch("old"); t.mock.timers.tick(200); h.c.setSearch("new"); t.mock.timers.tick(349);
  assert.equal(h.lists.length, 0); t.mock.timers.tick(1);
  assert.deepEqual(h.history, [["/annunci?search=new", "replace"]]);
  assert.equal(h.lists[0].query.cursor, null); assert(h.state().list.pending);
  h.lists[0].resolve(empty); await flush(); assert(!h.state().list.pending);
  h.c.setSearch("immediate"); h.c.submitSearch(); t.mock.timers.tick(400);
  assert.equal(h.lists.length, 2); h.c.cancel();
});
test("debounced URL normalization preserves spaces while a user pauses between words", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); const h = controller();
  h.c.setSearch("sintetico "); t.mock.timers.tick(350);
  assert.equal(h.state().draft.search, "sintetico ");
  assert.equal(h.state().query.filters.search, "sintetico");
  h.lists[0].resolve(empty); await flush();
  h.c.setSearch(h.state().draft.search + "11"); t.mock.timers.tick(350);
  assert.equal(h.state().query.filters.search, "sintetico 11");
  h.lists[1].resolve(empty); await flush();
  h.c.setSearch("sintetico 11 "); t.mock.timers.tick(350);
  assert.equal(h.state().draft.search, "sintetico 11 "); assert.equal(h.lists.length, 2);
  h.c.setFilter({ status: "in_revisione" }); assert.equal(h.state().draft.search, "sintetico 11"); h.c.cancel();
});
test("overlong search retains results and never schedules a request", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); const h = controller();
  h.c.setSearch("😀".repeat(201)); t.mock.timers.tick(500); h.c.submitSearch();
  assert(h.state().searchError); assert.equal(h.lists.length, 0); assert.deepEqual(h.state().list.result, empty);
  h.c.reset(); assert.equal(h.state().searchError, null); assert.equal(h.state().draft.search, "");
});
test("filter applies latest typed search immediately and cancels its debounce", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); const h = controller("cursor=YWJj");
  h.c.setSearch("draft"); h.c.setFilter({ status: "in_revisione" }); t.mock.timers.tick(500);
  assert.equal(h.lists.length, 1); assert.equal(h.lists[0].query.filters.search, "draft");
  assert.equal(h.lists[0].query.cursor, null); assert.equal(h.history[0][1], "push"); h.c.cancel();
});
test("stale list success and stale denial cannot replace newer results or redirect", async () => {
  const h = controller(); h.c.setFilter({ status: "pubblicato" }); h.c.setFilter({ status: "in_revisione" });
  assert(h.lists[0].signal.aborted); h.lists[1].resolve(empty); await flush();
  h.lists[0].resolve(denied); await flush(); assert.deepEqual(h.state().list.result, empty); assert.equal(h.redirects.length, 0);
});
test("active list denial clears list and pending preview before redirect", async () => {
  const h = controller(); h.c.refresh(); h.c.openPreview(id); h.lists[0].resolve(denied); await flush();
  assert.equal(h.state().list.result, null); assert.equal(h.state().preview.id, null);
  assert(h.details[0].signal.aborted); assert.deepEqual(h.redirects, ["/accesso"]);
  h.details[0].resolve({ status: "ok", detail: {} }); await flush(); assert.equal(h.state().preview.id, null);
});
test("preview is on demand, last request wins and reopening fetches again", async () => {
  const h = controller(); h.c.openPreview("a"); h.c.openPreview("b");
  assert(h.details[0].signal.aborted); h.details[1].resolve({ status: "not_found", code: "ANNOUNCEMENT_NOT_FOUND" }); await flush();
  h.details[0].resolve({ status: "ok", detail: {} }); await flush(); assert.equal(h.state().preview.id, "b");
  assert.equal(h.state().preview.result.status, "not_found"); h.c.closePreview(); h.c.openPreview("b");
  assert.equal(h.details.length, 3); h.c.cancel();
});
test("preview retry, network failure, denial and close never expose obsolete data", async () => {
  const h = controller(); h.c.openPreview(id); h.details[0].reject(new Error("private provider error")); await flush();
  assert.equal(h.state().preview.result.status, "unavailable"); assert(!JSON.stringify(h.state()).includes("private provider"));
  h.c.retryPreview(); h.details[1].resolve(denied); await flush(); assert.equal(h.state().list.result, null);
  assert.equal(h.state().preview.id, null); assert.equal(h.redirects.length, 1);
});
test("list navigation closes preview and ignores a transport that resolves after close", async () => {
  const h = controller(); h.c.openPreview(id); h.c.setFilter({ visibility: "hidden" });
  assert.equal(h.state().preview.id, null); assert(h.details[0].signal.aborted);
  h.details[0].resolve(denied); await flush(); assert.equal(h.redirects.length, 0); h.c.cancel();
});
test("cursor trail supports previous and first without persistent page data", async () => {
  const first = { status: "ok", page: { items: [], hasMore: true, nextCursor: "YWJj" } };
  const h = controller("", first); h.c.next(); assert.equal(h.state().query.cursor, "YWJj"); assert(h.state().canPrevious);
  h.lists[0].resolve(empty); await flush(); h.c.previous(); assert.equal(h.state().query.cursor, null);
  assert(!h.state().canPrevious); assert.equal(h.lists.length, 2); h.c.cancel();
  const shared = controller("cursor=YWJj", first); shared.c.previous(); assert.equal(shared.lists.length, 0);
  shared.c.first(); assert.equal(shared.state().query.cursor, null); shared.c.cancel();
});
test("popstate/BFcache force refresh even the same URL, invalid URL never broadens", async () => {
  const h = controller(); h.c.sync("", true); h.c.sync("", true); assert(h.lists[0].signal.aborted);
  h.lists[1].resolve(empty); await flush(); h.c.sync("limit=999", true);
  assert.equal(h.state().list.result.status, "invalid"); h.c.refresh(); assert.equal(h.lists.length, 2);
  h.c.reset(); assert.equal(h.lists.length, 3); h.c.cancel();
});
test("cleanup aborts both request types and suppresses late updates", async () => {
  const h = controller(); h.c.refresh(); h.c.openPreview(id); h.c.cancel();
  assert(h.lists[0].signal.aborted); assert(h.details[0].signal.aborted);
  h.lists[0].resolve(denied); h.details[0].resolve(denied); await flush(); assert.equal(h.redirects.length, 0);
  h.c.refresh(); assert.equal(h.lists.length, 2); h.c.cancel();
});

function uiLoader(overrides = {}) {
  const dependencies = { react: React, "react/jsx-runtime": require("react/jsx-runtime"), "@/features/annunci/server/actions": { moderateAnnouncementAction() { throw new Error("Unexpected mutation"); } }, ...overrides };
  for (const name of ["@base-ui/react/button", "@base-ui/react/input", "@base-ui/react/separator", "@base-ui/react/tooltip", "@base-ui/react/dialog", "@base-ui/react/alert-dialog", "@base-ui/react/select", "@base-ui/react/menu", "@base-ui/react/merge-props", "@base-ui/react/use-render", "class-variance-authority", "clsx", "tailwind-merge", "lucide-react"]) dependencies[name] = require(name);
  return adminServerLoader({ dependencies });
}
const row = { id, title: "<script>alert(1)</script>", type: "annuncio_giocatore", status: "in_revisione", hidden: false, private: null, creatorId: null, createdAt: null, updatedAt: null, rowFingerprint: "secret-fingerprint", author: { profileId: null, userId: null, displayName: "Profilo non disponibile", anonymous: false, available: false } };
test("actual UI renders semantic seven-column table, escaped content and disabled future actions", () => {
  const l = uiLoader(), Workspace = l(base + "components/AnnunciWorkspace.tsx").AnnunciWorkspace;
  const html = renderToStaticMarkup(React.createElement(Workspace, { initialQuery: parseAnnunciUrl(""), initialResult: { status: "ok", page: { items: [row], hasMore: false, nextCursor: null } } }));
  assert.equal((html.match(/<th\s/g) ?? []).length, 7); assert.match(html, /&lt;script&gt;/);
  assert(!html.includes("secret-fingerprint")); assert(!html.includes("<script>"));
  assert.match(html, /Anteprima:/); assert.match(html, /Crea annuncio/); assert.match(html, /Esporta pagina/);
  assert.match(html, /disabled/); assert.match(html, /Paginazione annunci/);
});
test("CSV export is enabled only for a nonempty current page and remains an internal button", () => {
  for(const items of [[row],[]]) {
    const Workspace=uiLoader()(base+"components/AnnunciWorkspace.tsx").AnnunciWorkspace;
    const html=renderToStaticMarkup(React.createElement(Workspace,{initialQuery:parseAnnunciUrl(""),initialResult:{status:"ok",page:{items,hasMore:false,nextCursor:null}}}));
    const buttons=[...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(m=>m[0]);
    const button=buttons.find(b=>b.includes("Esporta pagina CSV"));assert(button);assert.equal(button.includes('disabled=""'),items.length===0);
    assert.match(html,/fino a 30 risultati/);assert(!button.includes('href='));
  }
});
for (const [search, message, result] of [
  ["", "Nessun annuncio presente", empty], ["search=test", "Nessun annuncio corrisponde ai filtri", empty],
  ["cursor=YWJj", "Nessun risultato in questa pagina", empty], ["limit=99", "Filtri o cursore non validi", { status: "invalid", code: "INVALID_QUERY" }],
  ["", "Impossibile caricare gli annunci", { status: "unavailable", code: "ANNOUNCEMENTS_UNAVAILABLE", correlationId: "client" }],
]) test(`actual UI distinguishes state: ${message}`, () => {
  const l = uiLoader(); const html = renderToStaticMarkup(React.createElement(l(base + "components/AnnunciWorkspace.tsx").AnnunciWorkspace, { initialQuery: parseAnnunciUrl(search), initialResult: result }));
  assert(html.includes(message)); assert(!html.includes("<table"));
});
test("all eleven detail types render typed content, no raw HTML or implicit media requests", () => {
  const l = uiLoader(); const { DETAIL_FIELDS } = l(base + "detail-fields.ts");
  const Content = l(base + "components/AnnouncementDetailContent.tsx").AnnouncementDetailContent;
  const Provider = l("apps/admin/src/features/navigation/ExternalNavigation.tsx").ExternalNavigationProvider;
  for (const [type, fields] of Object.entries(DETAIL_FIELDS)) {
    const values = Object.fromEntries(Object.entries(fields).map(([key, kind]) => [key, { text: "<img src=x onerror=alert(1)>", number: 10, boolean: true, strings: ["Calcio"], history: [{ titolo: "Esperienza", ente: "Squadra", periodoA: "oggi", periodoDa: "2020", descrizione: "Test" }], schedule: [{ giorno: "lunedì", attivo: true, dalle: "09:00", alle: "18:00" }], prizes: [{ posto: "1", titoloPremio: "Coppa" }] }[kind]]));
    const detail = { summary: { ...row, type }, content: { type, fields: values }, metadata: { moderationInfo: null, level: null, priorityActive: false, priorityStartsAt: null, priorityEndsAt: null, updatedById: null }, locations: [], contacts: [{ id: "1", kind: "email", value: "test@example.test", valid: true, referent: null }], links: [{ id: "2", platform: "Sito", value: "https://example.test", url: "https://example.test" }], media: [{ id: "3", mimeType: "image/svg+xml", value: "javascript:alert(1)", url: null }], complete: false, issues: ["MISSING_AUTHOR"], contentFingerprint: "secret-content-hash" };
    const html = renderToStaticMarkup(React.createElement(Provider, null, React.createElement(Content, { detail })));
    assert.match(html, /Riepilogo e stato/); assert.match(html, /Metadati amministrativi/);
    assert(!html.includes("<img")); assert(!html.includes("mailto:")); assert(!html.includes("tel:")); assert(!html.includes("secret-content-hash"));
    assert(!html.includes('href="javascript:')); assert.match(html, /Alcune informazioni/);
    assert.match(html, /href="https:\/\/example.test"/); assert.match(html, /Collegamento non apribile/);
  }
});

test("protected initial page rejects denied context before functional query and seeds valid URL", async () => {
  let status = "denied", calls = 0;
  const l = uiLoader({ "next/navigation": { redirect(href) { throw new Error("REDIRECT:" + href); } },
    "@/features/dashboard/server/guard": { async requireAdminPageContext() { if (status === "denied") throw new Error("REDIRECT:/accesso"); } },
    "@/features/annunci/server/queries": { async listAdminAnnouncements(input) { calls++; assert.equal(input.limit, 30); return empty; } },
  });
  const page = l("apps/admin/src/app/(dashboard)/annunci/page.tsx").default;
  await assert.rejects(page({ searchParams: Promise.resolve({}) }), /REDIRECT:\/accesso/); assert.equal(calls, 0);
  status = "admin"; const tree = await page({ searchParams: Promise.resolve({ status: "in_revisione" }) });
  const workspace = React.Children.toArray(tree.props.children)[1]; assert.equal(calls, 1);
  assert.equal(workspace.props.initialQuery.filters.status, "in_revisione"); assert(workspace.key.includes("in_revisione"));
  await page({ searchParams: Promise.resolve({ status: ["a", "b"] }) }); assert.equal(calls, 1);
});

test("actual GET routes use writable session client, one functional RPC and no response cache", async () => {
  const calls = []; let revoke = false;
  const client = { auth: { async getClaims() { calls.push("claims"); return { data: { claims: { sub: id, session_id: id, role: "authenticated", exp: Date.now() / 1000 + 3600 } }, error: null }; } },
    async rpc(name, args) { calls.push({ name, args }); return { data: name === "admin_list_announcements_v1" ? empty.page : null, error: revoke ? { code: "42501", message: "ADMIN_REQUIRED" } : null }; } };
  const l = adminServerLoader({ dependencies: { "@/lib/supabase/server": { async createClient() { calls.push("writable-client"); return client; }, createReadClient() { throw new Error("Wrong client"); } } } });
  const list = l("apps/admin/src/app/api/annunci/route.ts").GET;
  const detail = l("apps/admin/src/app/api/annunci/[id]/route.ts").GET;
  const response = await list(new Request("https://admin.example.test/api/annunci?status=in_revisione"));
  assert.equal(response.status, 200); assert.match(response.headers.get("cache-control"), /private.*no-store/); assert.equal(response.headers.get("vary"), "Cookie");
  assert.equal(calls.length, 3); assert.equal(calls[2].name, "admin_list_announcements_v1"); assert.equal(calls[2].args.p_query.limit, 30);
  const invalid = await list(new Request("https://admin.example.test/api/annunci?limit=100")); assert.equal(invalid.status, 400); assert.equal(calls.length, 3);
  const notFound = await detail(new Request("https://admin.example.test/api/annunci/" + id), { params: Promise.resolve({ id }) }); assert.equal(notFound.status, 404);
  assert.equal(calls[5].name, "admin_get_announcement_v1"); revoke = true;
  const revoked = await list(new Request("https://admin.example.test/api/annunci")); assert.equal(revoked.status, 403);
  assert.equal(calls.filter((v) => v?.name).length, 3);
});
test("HTTP maps every result status with no-store including failures", async () => {
  const l = adminServerLoader({ dependencies: { "@/lib/supabase/server": {} } });
  const { createAnnouncementHttp } = l(base + "server/http.ts");
  for (const [status, expected] of [["ok", 200], ["invalid", 400], ["denied", 403], ["not_found", 404], ["unavailable", 503]]) {
    const h = createAnnouncementHttp({ list: async () => ({ status }), detail: async () => ({ status }) });
    const r = await h.detail(id); assert.equal(r.status, expected); assert.match(r.headers.get("cache-control"), /no-store/);
  }
});
test("browser transport uses same-origin no-store, denies 403 and rejects HTML redirects", async () => {
  let response = Response.json(empty), seen;
  const l = adminServerLoader({ fetch: async (...args) => { seen = args; return response; } });
  const t = l(base + "client/transport.ts").announcementTransport; const signal = new AbortController().signal;
  assert.deepEqual(await t.list(parseAnnunciUrl("search=literal"), signal), empty);
  assert.equal(seen[0], "/api/annunci?search=literal"); assert.equal(seen[1].cache, "no-store"); assert.equal(seen[1].signal, signal);
  response = new Response("login", { status: 403 }); assert.deepEqual(await t.detail(id, signal), denied);
  response = new Response("<html>Login</html>", { headers: { "content-type": "text/html" } });
  await assert.rejects(t.list(parseAnnunciUrl(""), signal), /ANNOUNCEMENTS_UNAVAILABLE/);
});

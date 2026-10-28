import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
const require = createRequire(import.meta.url), base = "apps/admin/src/features/annunci/";
const load = adminServerLoader();
const { createAnnunciController } = load(base + "client/controller.ts"), { parseAnnunciUrl } = load(base + "url-state.ts");
const id = "eeeeeeee-eeee-4eee-8eee-000000001000";
const initial = { status: "ok", page: { items: [], hasMore: false, nextCursor: null } };
const detail = () => ({ summary: { id, title: "Annuncio di prova", status: "in_revisione", hidden: false }, complete: true, contentFingerprint: "content-v1:"+"a".repeat(64), moderation: { adminHidden: false, capabilities: Object.fromEntries(["approve", "reject", "hide", "show", "trash", "restore"].map(op => [op, { allowed: true, reason: null }])) } });
const ok = { status: "ok", id, eventId: id, correlationId: id };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function harness() {
  const reads = [], writes = [], lists = [], redirects = [];
  const c = createAnnunciController(parseAnnunciUrl("status=in_revisione&cursor=YWJj"), initial, {
    detail(id, signal) { const p = deferred(); reads.push({ ...p, id, signal }); return p.promise; },
    list(query, signal) { const p = deferred(); lists.push({ ...p, query, signal }); return p.promise; },
    moderate(input) { const p = deferred(); writes.push({ ...p, input }); return p.promise; }, navigate() {}, denied() { redirects.push(true); },
  });
  return { c, reads, writes, lists, redirects, state: c.getSnapshot };
}
test("table command freshly reads detail before allowing confirmation", async () => {
  const h = harness(); h.c.beginModeration(id, "approve"); assert.equal(h.state().moderation.phase, "loading"); await h.c.confirmModeration(); assert.equal(h.writes.length, 0);
  h.reads[0].resolve({ status: "ok", detail: detail() }); await flush(); assert.equal(h.state().moderation.phase, "ready");
});
test("reason validation, double submission and pending close are guarded in the controller", async () => {
  const h = harness(); h.c.beginModeration(id, "reject"); h.reads[0].resolve({ status: "ok", detail: detail() }); await flush();
  await h.c.confirmModeration(); assert.equal(h.writes.length, 0); assert(h.state().moderation.error);
  h.c.setReason("Motivo pubblico"); const pending = h.c.confirmModeration(); await h.c.confirmModeration(); h.c.closeModeration();
  assert.equal(h.writes.length, 1); assert.equal(h.state().moderation.phase, "submitting"); h.c.setReason("changed"); assert.equal(h.state().moderation.reason, "Motivo pubblico");
  h.writes[0].resolve(ok); await pending; assert.equal(h.state().moderation.result.status, "ok"); h.c.cancel();
});
test("success refetches current list and open preview without changing filters/cursor", async () => {
  const h = harness(); h.c.openPreview(id); h.reads[0].resolve({ status: "ok", detail: detail() }); await flush();
  h.c.beginModeration(id, "approve"); h.reads[1].resolve({ status: "ok", detail: detail() }); await flush();
  const pending = h.c.confirmModeration(); assert.equal(h.writes[0].input.fingerprint, detail().contentFingerprint);
  h.writes[0].resolve(ok); await pending;
  assert.equal(h.lists.length, 1); assert.equal(h.lists[0].query.cursor, "YWJj"); assert.equal(h.lists[0].query.filters.status, "in_revisione");
  assert.equal(h.reads.length, 3); assert(h.state().preview.pending);
  h.lists[0].reject(new Error("read failed")); h.reads[2].reject(new Error("read failed")); await flush();
  assert.equal(h.state().moderation.result.status, "ok"); assert.equal(h.state().list.result.status, "unavailable"); assert.equal(h.state().preview.result.status, "unavailable"); h.c.cancel();
});
for (const status of ["conflict", "unavailable", "not_allowed", "not_found"]) test(`${status} never auto retries or reports success; reload requires fresh confirmation`, async () => {
  const h = harness(); h.c.beginModeration(id, "approve"); h.reads[0].resolve({ status: "ok", detail: detail() }); await flush();
  const pending = h.c.confirmModeration(); h.writes[0].resolve({ status, reason: "PAYMENT_REQUIRED", correlationId: id }); await pending;
  assert.equal(h.state().moderation.phase, "result"); await h.c.confirmModeration(); assert.equal(h.writes.length, 1); assert.equal(h.lists.length, 0);
  h.c.reloadModeration(); assert.equal(h.reads.length, 2); assert.equal(h.state().moderation.phase, "loading"); h.c.cancel();
});
test("unknown network outcome forces reread, never a blind second mutation", async () => {
  const h = harness(); h.c.beginModeration(id, "approve"); h.reads[0].resolve({ status: "ok", detail: detail() }); await flush();
  const pending = h.c.confirmModeration(); h.writes[0].reject(new Error("lost response after commit")); await pending; await h.c.confirmModeration();
  assert.equal(h.writes.length, 1); assert.equal(h.state().moderation.result.status, "unavailable");
});
test("denial clears all local results and ignores late mutation results", async () => {
  const h = harness(); h.c.beginModeration(id, "approve"); h.reads[0].resolve({ status: "ok", detail: detail() }); await flush();
  const pending = h.c.confirmModeration(); h.writes[0].resolve({ status: "denied", correlationId: id }); await pending;
  assert.equal(h.state().moderation, null); assert.equal(h.state().list.result, null); assert.equal(h.state().preview.id, null); assert.equal(h.redirects.length, 1);
});
test("stale detail and canceled requests cannot enable an obsolete confirmation", async () => {
  const h = harness(); h.c.beginModeration(id, "approve"); h.c.beginModeration(id, "hide"); assert(h.reads[0].signal.aborted);
  h.reads[0].resolve({ status: "ok", detail: detail() }); await flush(); assert.equal(h.state().moderation.phase, "loading");
  h.c.closeModeration(); h.reads[1].resolve({ status: "denied" }); await flush(); assert.equal(h.state().moderation, null); assert.equal(h.redirects.length, 0);
});
test("unsupported/incomplete capability cannot be submitted even programmatically", async () => {
  const h = harness(); h.c.beginModeration(id, "approve"); h.reads[0].resolve({ status: "ok", detail: { ...detail(), complete: false } }); await flush();
  await h.c.confirmModeration(); assert.equal(h.writes.length, 0);
});
test("cleanup suppresses late success even though a server mutation cannot be aborted", async () => {
  const h = harness(); h.c.beginModeration(id, "approve"); h.reads[0].resolve({ status: "ok", detail: detail() }); await flush();
  const pending = h.c.confirmModeration(); h.c.cancel(); h.writes[0].resolve(ok); await pending; assert.equal(h.lists.length, 0);
});
function uiLoader(react = React) {
  const dependencies = { react, "react/jsx-runtime": require("react/jsx-runtime") };
  for (const name of ["@base-ui/react/button", "@base-ui/react/input", "@base-ui/react/separator", "@base-ui/react/alert-dialog", "@base-ui/react/merge-props", "@base-ui/react/use-render", "class-variance-authority", "clsx", "tailwind-merge", "lucide-react"]) dependencies[name] = require(name);
  return adminServerLoader({ dependencies });
}
test("detail controls expose server denial reasons and keep incomplete approvals disabled", () => {
  const l = uiLoader(), Actions = l(base + "components/ModerateActions.tsx").ModerateActions;
  const html = renderToStaticMarkup(React.createElement(Actions, { detail: { ...detail(), complete: false }, onChoose() {} }));
  assert.match(html, /Approva/); assert.match(html, /Rifiuta/); assert.match(html, /Nascondi/); assert.match(html, /incompleto/); assert.match(html, /disabled/);
});

test("trashed controls expose only restore, including legacy incomplete content", () => {
  const Actions=uiLoader()(base+"components/ModerateActions.tsx").ModerateActions;
  const html=renderToStaticMarkup(React.createElement(Actions,{detail:{...detail(),complete:false,summary:{...detail().summary,trashed:true}},onChoose(){}}));
  assert.match(html,/Ripristina dal cestino/); assert.doesNotMatch(html,/Approva|Rifiuta|Nascondi| disabled=""/);
});

test("trash confirmation labels the reason as internal and blocks an empty submission", async () => {
  const h=harness(); h.c.beginModeration(id,"trash");h.reads[0].resolve({status:"ok",detail:detail()});await flush();
  await h.c.confirmModeration();assert.equal(h.writes.length,0);
  const Dialog=uiLoader({...React,useRef:()=>({current:null})})(base+"components/ModerationDialog.tsx").ModerationDialog;
  const tree=Dialog({state:h.state().moderation,controller:h.c,finalFocus:()=>null});
  const elements=[];const visit=n=>{if(!React.isValidElement(n))return;elements.push(n);React.Children.forEach(n.props.children,visit);};visit(tree);
  assert(elements.some(n=>n.props.children==="Motivazione interna"));assert(!elements.some(n=>n.props.children==="Motivazione visibile all’autore"));
  h.c.setReason("Controllo interno"); const pending=h.c.confirmModeration();assert.equal(h.writes[0].input.operation,"trash");h.writes[0].resolve(ok);await pending;assert.equal(h.lists.length,1);h.c.cancel();
});
test("confirmation has cancel focus, visible-author reason field and no confirm while pending", () => {
  const l = uiLoader({ ...React, useRef: () => ({ current: null }) });
  const Dialog = l(base + "components/ModerationDialog.tsx").ModerationDialog;
  const state = { id, operation: "reject", phase: "ready", detail: detail(), reason: "", result: null, error: null };
  const finalFocus = () => null, controller = harness().c;
  const tree = Dialog({ state, controller, finalFocus }); const content = tree.props.children;
  assert.equal(content.props.finalFocus, finalFocus); assert(content.props.initialFocus);
  const elements = []; const visit = (n) => { if (!React.isValidElement(n)) return; elements.push(n); React.Children.forEach(n.props.children, visit); }; visit(content);
  assert(elements.some(n => n.props.children === "Motivazione visibile all’autore")); assert(elements.some(n => n.props.id === "moderation-reason"));
  const pending = Dialog({ state: { ...state, phase: "submitting" }, controller, finalFocus }); const footer = React.Children.toArray(pending.props.children.props.children).at(-1);
  const buttons = React.Children.toArray(footer.props.children); assert(buttons.every(n => n.props.disabled === true));
});

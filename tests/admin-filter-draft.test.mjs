import assert from "node:assert/strict";
import {test} from "node:test";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";

test("directory controls preserve pending search until submit and restore committed URL state", () => {
  let state, url = new URL("http://localhost/utenti?search=old"), navigations = [], refreshes = 0;
  const load = adminServerLoader({dependencies: {
    react: {useState(initial) {state ??= initial; return [state, next => {state = next;}];}},
    "next/navigation": {useRouter: () => ({push(href) {navigations.push(href);}}), usePathname: () => url.pathname, useSearchParams: () => url.searchParams},
  }});
  const {useFilterDraft} = load("apps/admin/src/features/dashboard/useFilterDraft.ts");
  const {parsePeopleQuery, parsePeopleUrl, peopleHref} = load("apps/admin/src/features/people/contracts.ts");
  const render = () => useFilterDraft(parsePeopleUrl("users", url.searchParams).query, q => parsePeopleQuery("users", q), q => peopleHref("users", q), () => refreshes++);
  render().search("new draft ");
  assert.equal(navigations.length, 0);
  render().filter({registration: "complete"});
  assert.equal(new URL(navigations.at(-1), url).searchParams.get("search"), "old");
  url = new URL(navigations.at(-1), url);
  assert.equal(render().draft.search, "new draft ");
  render().submit();
  url = new URL(navigations.at(-1), url);
  assert.equal(render().draft.search, "new draft");
  render().submit(); assert.equal(refreshes, 1);
  render().search("discarded"); url = new URL("http://localhost/utenti?search=previous");
  assert.equal(render().draft.search, "previous");
  const before = navigations.length;
  render().filter({from: "2026-11-16", to: "2026-11-15"});
  assert.equal(navigations.length, before); assert.ok(render().error);
  render().reset({}); url = new URL(navigations.at(-1), url);
  assert.equal(url.search, ""); assert.equal(render().draft.search, "");
});

test("invitations URL is shareable and legacy user links populate profile search", () => {
  const load = adminServerLoader();
  const {parseInvitationsUrl, invitationsHref, parseReportsUrl} = load("apps/admin/src/features/community/reports-url.ts");
  const {parsePeopleUrl} = load("apps/admin/src/features/people/contracts.ts");
  const href = invitationsHref({search: "hello@example.test", pending: true, offset: 30});
  assert.deepEqual(parseInvitationsUrl(new URL(href, "http://localhost").searchParams), {valid: true, query: {search: "hello@example.test", pending: true, offset: 30}});
  for (const invalid of ["pending=maybe", "pending=true&pending=false", "offset=1", "extra=1"]) assert.equal(parseInvitationsUrl(new URLSearchParams(invalid)).valid, false);
  assert.equal(parseReportsUrl(new URLSearchParams()).query.status, "all");
  assert.equal(parseReportsUrl(new URLSearchParams("status=active")).query.status, "active");
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-000000000001";
  const q = parsePeopleUrl("profiles", new URLSearchParams({user: id}));
  assert.equal(q.query.search, id); assert.equal(q.query.user, undefined);
  assert.equal(parsePeopleUrl("profiles", new URLSearchParams("sort=invalid")).valid, false);
});

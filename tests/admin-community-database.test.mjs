import assert from "node:assert/strict";
import {before, after, beforeEach, test} from "node:test";
import {createCommunityFixture} from "./helpers/admin-community-fixture.mjs";
import {listActor, listClaims, listId} from "./helpers/admin-announcements-fixture.mjs";
let h;
before(async () => {h = await createCommunityFixture();});
after(async () => {await h?.db.close();});
beforeEach(async () => {await h.reset();});
const list = (query = {}) => h.call("admin_list_reports_v1", [JSON.stringify(query)]);
test("pre-existing defaults, private projection, detail and profile links", async () => {
  const id = await h.report(301, {anonymous: true});
  const page = await list(); assert.equal(page.items.length, 1); assert.equal(page.items[0].status, "open");
  assert.equal(page.items[0].reporterEmail, null); assert(!JSON.stringify(page).includes("a".repeat(64)));
  const detail = await h.call("admin_get_report_v1", [id]); assert.equal(detail.id, id); assert.equal(typeof detail.number, "string");
  const profile = await h.report(301, {profile: true});
  assert((await h.call("admin_get_report_v1", [profile])).profileTypes.includes("squadra"));
});
test("status, date bounds in Rome, literal search, and bounded pagination", async () => {
  for (let i = 0; i < 32; i++) await h.report();
  const page = await list(); assert.equal(page.items.length, 30); assert.equal(page.hasMore, true);
  const second = await list({offset: 30}); assert.equal(second.items.length, 2); assert(!second.items.some(x => page.items.some(y => x.id === y.id)));
  assert.equal((await list({from: "2026-11-15"})).items.length, 0);
  assert.equal((await list({search: "%"})).items.length, 0);
  assert.equal((await list({search: listId(301)})).items.length, 30);
  assert.equal((await list({search: "author-secret@example.test"})).items.length, 30);
  await h.db.exec("update private.segnalazioni set creato_il='2026-11-13T23:30:00Z'");
  assert.equal((await list({from: "2026-11-14", to: "2026-11-14"})).items.length, 30);
});
test("report transitions, notes, conflicts, no-op, reopening and atomic audit", async () => {
  const id = await h.report();
  const update = (state, note, version) => h.call("admin_update_report_v1", [id, state, note, version]);
  assert.equal((await update("working", "Solo amministratori", 0)).status, "ok");
  assert.equal((await update("resolved", "stale", 0)).status, "conflict");
  assert.equal((await update("working", "Solo amministratori", 1)).changed, false);
  assert.equal((await update("resolved", "Solo amministratori", 1)).status, "ok");
  assert.equal((await list()).items.length, 0);
  assert.equal((await update("open", "Solo amministratori", 2)).status, "ok");
  assert.equal((await h.db.query("select count(*)::int n from private.admin_audit_event_v1 where action='report.update'")).rows[0].n, 3);
  assert(!(await h.db.query("select changes::text||details::text payload from private.admin_audit_event_v1 where action='report.update'")).rows.some(x => x.payload.includes("Solo amministratori")));
  const audit = await h.auditList({action: "report.update"}); assert.equal(audit.items.length, 3);
  assert.equal((await h.auditDetail(audit.items[0].id)).resourceType, "report");
  await h.db.exec("create function private.reject_community_audit() returns trigger language plpgsql as $$begin raise exception 'synthetic failure'; end$$; create trigger reject_community_audit before insert on private.admin_audit_event_v1 for each row execute function private.reject_community_audit()");
  try {await assert.rejects(update("archived", "new", 3)); assert.equal((await h.call("admin_get_report_v1", [id])).status, "open");}
  finally {await h.db.exec("drop trigger reject_community_audit on private.admin_audit_event_v1; drop function private.reject_community_audit()");}
});
test("codes include zero invites and counts include only confirmed invitations", async () => {
  await h.invitation(401, true); await h.invitation(402, false);
  const page = await h.call("admin_list_invitation_codes_v1", ["{}"]);
  assert.equal(page.items.length, 2); const owner = page.items.find(x => x.id === listActor.authorId);
  assert.equal(owner.total, 1); assert.equal(owner.pending, 1);
  assert.equal(page.items.find(x => x.id !== listActor.authorId).total, 0);
  const detail = await h.call("admin_get_invitation_code_v1", [listActor.authorId, "{}"]);
  assert.equal(detail.items.length, 1); assert.equal(detail.items[0].considered, false);
  assert.equal((await h.call("admin_list_invitation_codes_v1", ['{"pending":true}'])).items.length, 1);
});
test("considered is reversible, idempotent, confirmed-only and audited", async () => {
  const id = await h.invitation(401, true), unconfirmed = await h.invitation(402, false);
  const update = (value, expected) => h.call("admin_consider_invitation_v1", [id, value, expected]);
  assert.equal((await update(true, false)).status, "ok"); assert.equal((await update(true, false)).changed, false);
  assert.equal((await h.call("admin_consider_invitation_v1", [unconfirmed, true, false])).status, "not_found");
  assert.equal((await update(false, true)).status, "ok");
  const events = await h.auditList({action: "invitation.consider"}); assert.equal(events.items.length, 2);
  const detail = await h.auditDetail(events.items[0].id); assert.equal(detail.resourceType, "invitation"); assert.equal(typeof detail.changes.considered.after, "boolean");
  assert.equal((await h.call("admin_get_invitation_code_v1", [listActor.authorId, "{}"])).owner.pending, 1);
});
test("denies non-admin, anonymous and technical callers, and direct tables", async () => {
  for (const name of ["admin_list_reports_v1", "admin_list_invitation_codes_v1"]) {
    await assert.rejects(h.call(name, ["{}"], listClaims({sub: listId(2), session_id: listId(502)})), /ADMIN_ACCESS_DENIED/);
    for (const role of ["anon", "service_role"]) await assert.rejects(h.call(name, ["{}"], {role}, role), /permission denied/);
  }
  for (const table of ["private.segnalazioni", "public.invito"]) await assert.rejects(h.callAs("authenticated", listClaims(), `select * from ${table}`), /permission denied/);
});
test("private definer bridges and invoker wrappers keep bounded privileges", async () => {
  const functions = (await h.db.query(`select n.nspname,p.proname,p.prosecdef,p.proconfig,
    has_function_privilege('anon',p.oid,'EXECUTE') anon_access,
    has_function_privilege('service_role',p.oid,'EXECUTE') technical_access,
    has_function_privilege('authenticated',p.oid,'EXECUTE') human_access
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname in
    ('admin_reports_v1','admin_update_report_v1','admin_invitations_v1','admin_consider_invitation_v1','admin_list_reports_v1','admin_get_report_v1','admin_list_invitation_codes_v1','admin_get_invitation_code_v1')`)).rows;
  assert.equal(functions.length, 10);
  for (const fn of functions) {assert.equal(fn.prosecdef, fn.nspname === "private"); assert.equal(fn.anon_access, false); assert.equal(fn.technical_access, false); assert.equal(fn.human_access, true); assert(fn.proconfig.some(v => v.startsWith("search_path=")));}
  assert.equal((await h.db.query("select relrowsecurity from pg_class where oid='private.segnalazioni'::regclass")).rows[0].relrowsecurity, true);
});
test("query and note validation reject malformed inputs", async () => {
  for (const q of [{offset: -1}, {offset: 1000001}, {offset: 0.5}, {status: "invented"}, {from: "2026-02-30"}, {from: "2026-11-15", to: "2026-11-14"}, {search: null}, {unexpected: true}]) await assert.rejects(list(q), /INVALID_QUERY/);
  const id = await h.report(); await assert.rejects(h.call("admin_update_report_v1", [id, "open", "x".repeat(1001), 0]), /INVALID_INPUT/);
});
test("backend failure attestations keep the correct new resource kind", async () => {
  for (const [action, resourceType] of [["report.update", "report"], ["invitation.consider", "invitation"]]) {
    const eventId = await h.call("admin_record_server_audit_v1", [action, "failure", listId(9998), listActor.authId, listActor.userId, listId(9997), "OPERATION_FAILED"], {role: "service_role"}, "service_role");
    const event = await h.auditDetail(eventId); assert.equal(event.resourceType, resourceType); assert.equal(event.outcome, "failure");
  }
});
test("invitation audit failure rolls back consideration and counts", async () => {
  const id = await h.invitation();
  await h.db.exec("create function private.reject_invite_audit() returns trigger language plpgsql as $$begin raise exception 'synthetic audit failure'; end$$; create trigger reject_invite_audit before insert on private.admin_audit_event_v1 for each row execute function private.reject_invite_audit()");
  try {
    await assert.rejects(h.call("admin_consider_invitation_v1", [id, true, false]));
    const detail = await h.call("admin_get_invitation_code_v1", [listActor.authorId, "{}"]); assert.equal(detail.owner.pending, 1); assert.equal(detail.items[0].considered, false);
  } finally {await h.db.exec("drop trigger reject_invite_audit on private.admin_audit_event_v1; drop function private.reject_invite_audit()");}
});

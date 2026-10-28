import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuditReadsFixture } from "./helpers/admin-audit-reads-fixture.mjs";
import { listActor as actor, listId as id, listClaims } from "./helpers/admin-announcements-fixture.mjs";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
const loader = adminServerLoader(), base = "apps/admin/src/features/audit/";
const { createAuditQueries } = loader(base + "server/read-service.ts");
test("audit list and detail on synthetic PostgreSQL", async t => {
  const h = await createAuditReadsFixture(), { db } = h; t.after(() => db.close());
  const scenario = async (name, fn) => t.test(name, async () => { await h.reset(); await fn(); });
  await scenario("private table and Auth remain inaccessible; wrapper/bridge use minimal ACL", async () => {
    for (const role of ["anon", "authenticated", "service_role"]) {
      for (const table of ["private.admin_audit_event_v1", "auth.users"]) {
        assert.equal((await db.query("select has_table_privilege($1,$2,'select') allowed", [role, table])).rows[0].allowed, false);
      }
      for (const fn of ["public.admin_list_audit_events_v1(jsonb)", "private.admin_list_audit_events_bridge_v1(jsonb)", "public.admin_get_audit_event_v1(uuid)", "private.admin_get_audit_event_bridge_v1(uuid)"]) {
        assert.equal((await db.query("select has_function_privilege($1,$2,'execute') allowed", [role, fn])).rows[0].allowed, role === "authenticated");
      }
    }
    const functions = (await db.query("select n.nspname,p.prosecdef,p.proconfig,pg_get_userbyid(p.proowner) owner from pg_proc p join pg_namespace n on n.oid=p.pronamespace where proname in ('admin_list_audit_events_v1','admin_get_audit_event_v1','admin_list_audit_events_bridge_v1','admin_get_audit_event_bridge_v1')")).rows;
    assert.equal(functions.length, 4); assert(functions.every(f => f.owner === "postgres" && f.prosecdef === (f.nspname === "private") && f.proconfig.includes('search_path=""')));
    const index = (await db.query("select indexdef from pg_indexes where indexname='admin_audit_event_auth_time_v1'")).rows[0].indexdef;
    assert.match(index, /actor_auth_user_uuid.*occurred_at DESC.*event_uuid DESC/); assert.match(index, /IS NOT NULL/);
  });
  await scenario("empty history is real and never creates a read event", async () => {
    assert.deepEqual(await h.auditList(), { items: [], hasMore: false, nextCursor: null }); assert.equal(await h.auditDetail(id(999)), null);
    assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, 0);
  });
  await scenario("authorized reads work in a read-only transaction and owner calls without user role fail", async () => {
    await h.event(1000);
    await assert.rejects(db.query("select public.admin_list_audit_events_v1('{}')"), /ADMIN_ACCESS_DENIED/);
    await db.exec("begin read only; set local role authenticated");
    try {
      await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(listClaims())]);
      assert.equal((await db.query("select public.admin_list_audit_events_v1('{}') p")).rows[0].p.items.length, 1);
      assert.equal((await db.query("select public.admin_get_audit_event_v1($1) p", [id(1000)])).rows[0].p.id, id(1000));
    } finally { await db.exec("rollback"); }
  });
  for (const limit of [1, 30]) await scenario(`bounded ${limit}-row pages, equal microseconds and deterministic UUID ties`, async () => {
    for (let n = 0; n < 35; n++) await h.event(1000 + n);
    const ids = []; let cursor = null;
    do { const page = await h.auditList({ limit, cursor }); assert(page.items.length <= limit); ids.push(...page.items.map(e => e.id)); cursor = page.nextCursor; } while (cursor);
    assert.equal(ids.length, 35); assert.equal(new Set(ids).size, 35); assert.deepEqual(ids, [...ids].sort().reverse());
    const page = await h.auditList(); assert.equal(page.items[0].occurredAt, "2026-10-23T12:00:00.123456Z");
    assert.deepEqual(Object.keys(page.items[0]).sort(), ["action", "actor", "id", "occurredAt", "outcome"]);
  });
  await scenario("microseconds remain distinct across the cursor boundary", async () => {
    await h.event(1000, { at: "2026-10-23T12:00:00.123457Z" }); await h.event(1001);
    const page = await h.auditList({ limit: 1 }); assert.equal(page.items[0].id, id(1000));
    assert.equal((await h.auditList({ limit: 1, cursor: page.nextCursor })).items[0].id, id(1001));
    await assert.rejects(h.auditList({ outcome: "success", cursor: page.nextCursor }), /INVALID_QUERY/);
  });
  for (const [day, start, end] of [["2026-03-29", "2026-03-28T23:00:00.000000Z", "2026-03-29T22:00:00.000000Z"], ["2026-10-25", "2026-10-24T22:00:00.000000Z", "2026-10-25T23:00:00.000000Z"]]) {
    await scenario(`Europe/Rome inclusive day ${day} handles DST with half-open boundaries`, async () => {
      await h.event(1000, { at: start }); await h.event(1001, { at: end });
      await h.event(1002, { at: new Date(Date.parse(start) - 1).toISOString().replace(".999Z", ".999999Z") });
      assert.deepEqual((await h.auditList({ from: day, to: day })).items.map(e => e.id), [id(1000)]);
    });
  }
  await scenario("current email, exact UUID filters and actor role changes", async () => {
    await h.event(1000, { authId: id(2), userId: actor.authorId });
    await db.query("update auth.users set email='New.Email@example.test' where id=$1", [id(2)]);
    const event = (await h.auditList({ operator: " NEW.EMAIL@example.test " })).items[0];
    assert.equal(event.actor.email, "New.Email@example.test"); assert.equal(event.actor.userId, actor.authorId);
    assert.equal((await h.auditList({ operator: "author-secret@example.test" })).items.length, 0);
    assert.equal((await h.auditList({ operator: id(2) })).items.length, 1); assert.equal((await h.auditList({ operator: actor.authorId })).items.length, 1);
    assert.equal((await h.auditDetail(id(1000))).actor.email, "New.Email@example.test");
    await db.query("delete from auth.sessions where user_id=$1", [id(2)]);
    await db.query("update public.utente set auth_user_uuid=null where utente_uuid=$1", [actor.authorId]);
    await db.query("delete from auth.users where id=$1", [id(2)]);
    const deleted = (await h.auditList()).items[0]; assert.equal(deleted.actor.email, null); assert.equal(deleted.actor.authId, id(2)); assert.equal(deleted.actor.userId, actor.authorId);
  });
  await scenario("unknown and verified Auth-only failure actors are distinct", async () => {
    const failure = { outcome: "failure", failureCode: "ACCESS_DENIED", resourceId: null, userId: null };
    await h.event(1000, { ...failure, authId: null }); await h.event(1001, { ...failure, authId: id(2), action: "auth.access_denied" });
    const unknown = await h.auditList({ operator: "unknown" }); assert.equal(unknown.items.length, 1); assert.equal(unknown.items[0].id, id(1000));
    const known = await h.auditList({ operator: id(2), action: "auth.access_denied", outcome: "failure", from: "2026-10-23", to: "2026-10-23" });
    assert.equal(known.items.length, 1); assert.equal(known.items[0].actor.userId, null); assert.equal(known.items[0].actor.email, "author-secret@example.test");
  });
  await scenario("detail projects only approved changes, IDs, failure and export metadata", async () => {
    await h.event(1000, { action: "announcement.hide", resourceType: "announcement", resourceId: id(5000), reason: "<script>Test</script>", changes: { hidden: { before: false, after: true } } });
    const detail = await h.auditDetail(id(1000)); assert.equal(detail.reason, "<script>Test</script>"); assert.deepEqual(detail.changes, { hidden: { before: false, after: true } }); assert.equal(detail.export, null);
    assert(!("details" in detail)); assert(!("email_confirmed_at" in detail.actor));
    for (const [n, details] of [[1001, { row_count: 1 }], [1002, { row_count: 1, columns: ["title"], announcement_ids: [id(5000)] }]]) {
      await h.event(n, { action: "announcement.export", resourceType: "announcement_export", resourceId: null, details });
      const e = (await h.auditDetail(id(n))).export; assert.equal(e.rowCount, 1); assert.deepEqual(e.announcementIds, details.announcement_ids ?? null); assert.deepEqual(e.columns, details.columns ?? null);
    }
  });
  for (const role of ["Utente", "admin", "ADMIN", "Admin "]) await scenario(`exact Admin check rejects ${JSON.stringify(role)} on both wrappers and direct bridges`, async () => {
    await h.event(1000); await db.query("update public.utente set tipologia_utente=$1 where utente_uuid=$2", [role, actor.userId]);
    for (const sql of ["select public.admin_list_audit_events_v1('{}')", `select public.admin_get_audit_event_v1('${id(1000)}')`, "select private.admin_list_audit_events_bridge_v1('{}')", `select private.admin_get_audit_event_bridge_v1('${id(1000)}')`]) await assert.rejects(h.callAs("authenticated", listClaims(), sql), /ADMIN_ACCESS_DENIED/);
    assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, 1);
  });
  await scenario("revoked or expired sessions and technical roles cannot read", async () => {
    await h.event(1000);
    for (const role of ["anon", "service_role"]) { await assert.rejects(h.auditList({}, listClaims(), role), /permission denied|ADMIN_ACCESS_DENIED/); await assert.rejects(h.auditDetail(id(1000), listClaims(), role), /permission denied|ADMIN_ACCESS_DENIED/); }
    await assert.rejects(h.auditList({}, listClaims({ exp: 1 })), /ADMIN_ACCESS_DENIED/);
    await db.query("delete from auth.sessions where id=$1", [actor.sessionId]);
    await assert.rejects(h.auditList(), /ADMIN_ACCESS_DENIED/); await assert.rejects(h.auditDetail(id(1000)), /ADMIN_ACCESS_DENIED/);
  });
  const invalid = [null, [], { x: 1 }, { limit: 31 }, { limit: 0 }, { limit: 1.5 }, { limit: "30" }, { from: null }, { from: "2026-02-30" }, { to: "2026-13-01" }, { from: "0000-01-01" }, { from: "2026-11-01", to: "2026-01-01" }, { operator: "%" }, { action: "all" }, { outcome: "Success" }, { cursor: {} }, { cursor: { v: 1 } }];
  for (const input of invalid) await scenario(`invalid SQL query rejected: ${JSON.stringify(input)}`, async () => { await assert.rejects(h.auditList(input), /INVALID_QUERY/); });
  await scenario("retention between list and detail produces unavailable event and bounded empty refresh", async () => {
    await h.event(1000); const row = (await h.auditList()).items[0]; await db.query("delete from private.admin_audit_event_v1 where event_uuid=$1", [row.id]);
    assert.equal(await h.auditDetail(row.id), null); assert.equal((await h.auditList()).items.length, 0);
  });
  await scenario("real service composes with SQL using one functional RPC per request and bound cursors", async () => {
    for (let n = 0; n < 31; n++) await h.event(1000 + n);
    const calls = [], queries = createAuditQueries({ log() { assert.fail("Unexpected error"); }, async getClient() { return {
      auth: { async getClaims() { return { data: { claims: listClaims() }, error: null }; } },
      async rpc(name, args) { calls.push(name); return { data: name === "admin_list_audit_events_v1" ? await h.auditList(args.p_query) : await h.auditDetail(args.p_id), error: null }; },
    }; } });
    const first = await queries.list(); assert.equal(first.status, "ok"); assert.equal(first.page.items.length, 30);
    const second = await queries.list({ cursor: first.page.nextCursor }); assert.equal(second.status, "ok"); assert.equal(second.page.items.length, 1);
    const detail = await queries.detail(first.page.items[0].id); assert.equal(detail.status, "ok");
    assert.deepEqual(calls, ["admin_list_audit_events_v1", "admin_list_audit_events_v1", "admin_get_audit_event_v1"]);
    assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, 31);
  });
});

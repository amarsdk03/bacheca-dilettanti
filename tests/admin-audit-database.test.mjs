import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createAdminDatabaseFixture } from "./helpers/admin-database-fixture.mjs";

const migration = readFileSync(new URL("../supabase/migrations/20261024104822_admin_audit_foundation.sql", import.meta.url), "utf8");
const schedule = readFileSync(new URL("../supabase/scripts/dashboard_admin_audit_schedule_retention.sql", import.meta.url), "utf8");
const id = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
const authId = id(1), userId = id(101), sessionId = id(501), resourceId = id(901), correlationId = id(1001);
const helper = "private.append_admin_audit_event_v1(uuid,uuid,text,text,uuid,text,uuid,text,text,jsonb,jsonb)";
const claims = (extra = {}) => ({ role: "authenticated", sub: authId, session_id: sessionId,
  exp: Math.floor(Date.now() / 1000) + 3600, ...extra });

test("Admin audit database on synthetic PostgreSQL only", async (t) => {
  const { db } = await createAdminDatabaseFixture();
  t.after(() => db.close());
  await db.exec(migration);
  // TEST-ONLY mutation ingress: exercises the real authorization helper once,
  // changes an ordinary user's announcement, then writes audit atomically.
  await db.exec(`
    create function public.test_admin_approve_v1(p_resource uuid,p_correlation uuid)
    returns uuid language plpgsql security definer set search_path='' as $$
    declare v_auth uuid; v_user uuid; v_before text;
    begin
      select auth_user_uuid,utente_uuid into v_auth,v_user from private.require_admin_context_v1();
      select stato_annuncio into v_before from public.annuncio where uuid=p_resource for update;
      if not found or v_before is distinct from 'in_revisione' then raise exception 'TEST_STATE_CONFLICT'; end if;
      update public.annuncio set stato_annuncio='pubblicato' where uuid=p_resource;
      return private.append_admin_audit_event_v1(v_auth,v_user,'announcement.approve',
        'announcement',p_resource,'success',p_correlation,null,null,
        jsonb_build_object('status',jsonb_build_object('before',v_before,'after','pubblicato')));
    end;
    $$;
    revoke all on function public.test_admin_approve_v1(uuid,uuid) from public,anon,service_role;
    grant execute on function public.test_admin_approve_v1(uuid,uuid) to authenticated;
    create function private.test_reject_audit() returns trigger language plpgsql as $$
      begin raise exception 'TEST_AUDIT_STORAGE_FAILURE'; end;
    $$;
    revoke all on function private.test_reject_audit() from public,anon,authenticated,service_role;
    -- Ensure permission tests reach ACLs, rather than merely failing schema USAGE.
    grant usage on schema private to anon,supabase_auth_admin;
  `);

  const reset = async () => {
    await db.exec(`
      drop trigger if exists test_reject_audit on private.admin_audit_event_v1;
      truncate private.admin_audit_event_v1,auth.refresh_tokens,auth.sessions,
        public.annuncio,public.profilo,public.utente,auth.users,private.registration_intent cascade;
      update private.admin_session_policy_v1 set verified_at=statement_timestamp(),
        unsupported_auth_settings=false,single_session_per_user=false,
        timebox_seconds=null,inactivity_timeout_seconds=null;
      set timezone='UTC';
    `);
    await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'admin@example.test',now()),($2,'ordinary@example.test',now())", [authId, id(2)]);
    await db.query("insert into public.utente(utente_uuid,auth_user_uuid,tipologia_utente) values($1,$2,'Admin'),($3,$4,'Utente')", [userId, authId, id(102), id(2)]);
    await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [sessionId, authId]);
    await db.query("insert into public.annuncio(uuid,creato_da,titolo_annuncio) values($1,$2,'Synthetic announcement')", [resourceId, id(102)]);
  };
  const scenario = (name, run) => t.test(name, async () => { await reset(); await run(); });
  const events = async () => (await db.query("select * from private.admin_audit_event_v1 order by occurred_at,event_uuid")).rows;
  const add = async (overrides = {}) => {
    const value = { actorAuth: authId, actorUser: userId, action: "auth.login", resourceType: "session",
      resource: sessionId, outcome: "success", correlation: correlationId,
      reason: null, failureCode: null, changes: {}, details: {}, ...overrides };
    return (await db.query(`select private.append_admin_audit_event_v1(
      $1::uuid,$2::uuid,$3::text,$4::text,$5::uuid,$6::text,$7::uuid,$8::text,$9::text,$10::jsonb,$11::jsonb) as id`,
    [value.actorAuth,value.actorUser,value.action,value.resourceType,value.resource,value.outcome,value.correlation,
      value.reason,value.failureCode,JSON.stringify(value.changes),JSON.stringify(value.details)])).rows[0].id;
  };
  const callAs = async (role, sql, params = [], jwt = claims()) => {
    assert(["anon", "authenticated", "service_role", "supabase_auth_admin"].includes(role));
    await db.exec(`begin; set local role ${role};`);
    try {
      await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(jwt)]);
      const result = await db.query(sql, params);
      await db.exec("commit");
      return result;
    } catch (error) { await db.exec("rollback"); throw error; }
  };
  const approve = (jwt) => callAs("authenticated", "select public.test_admin_approve_v1($1,$2)", [resourceId,correlationId], jwt);
  const mutation = () => db.query("select stato_annuncio from public.annuncio where uuid=$1", [resourceId]);

  await scenario("migration is empty, private, RLS enabled, with no scheduler dependency or foreign keys", async () => {
    assert.deepEqual(await events(), []);
    const table = (await db.query("select relrowsecurity,relowner::regrole::text as owner from pg_class where oid='private.admin_audit_event_v1'::regclass")).rows[0];
    assert.equal(table.relrowsecurity, true); assert.equal(table.owner, "postgres");
    assert.equal((await db.query("select count(*)::int as n from pg_constraint where conrelid='private.admin_audit_event_v1'::regclass and contype='f'")).rows[0].n, 0);
    assert.equal((await db.query("select to_regnamespace('cron') as schema")).rows[0].schema, null);
    const functions = (await db.query("select prosecdef,proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and (p.proname like '%admin_audit%' or p.proname='purge_admin_audit_events_v1')")).rows;
    assert.equal(functions.length, 4);
    assert(functions.every((fn) => !fn.prosecdef && fn.proconfig.some((item) => item.startsWith("search_path="))));
  });

  await scenario("internal append generates event/time and preserves distinct operator IDs and correlation", async () => {
    const eventId = await add(); const row = (await events())[0];
    assert.equal(row.event_uuid, eventId); assert.notEqual(eventId, correlationId);
    assert.equal(row.actor_auth_user_uuid, authId); assert.equal(row.actor_utente_uuid, userId);
    assert.notEqual(row.actor_auth_user_uuid, row.actor_utente_uuid);
    assert.equal(row.correlation_uuid, correlationId); assert(row.occurred_at instanceof Date);
    assert.deepEqual(row.details, {}); assert.deepEqual(row.changes, {});
  });
  await scenario("real Admin context and mutation commit together without accepting browser actor IDs", async () => {
    await approve(claims({ user_metadata: { actorId: id(999), role: "Admin" } }));
    assert.equal((await mutation()).rows[0].stato_annuncio, "pubblicato");
    const row = (await events())[0];
    assert.equal(row.actor_utente_uuid, userId);
    assert.deepEqual(row.changes, { status: { before: "in_revisione", after: "pubblicato" } });
  });
  await scenario("audit storage failure rolls back the actual mutation", async () => {
    await db.exec("create trigger test_reject_audit before insert on private.admin_audit_event_v1 for each row execute function private.test_reject_audit()");
    await assert.rejects(approve(), /TEST_AUDIT_STORAGE_FAILURE/);
    assert.equal((await mutation()).rows[0].stato_annuncio, "in_revisione");
    assert.deepEqual(await events(), []);
  });
  await scenario("a later transaction failure rolls back both completed mutation and audit", async () => {
    await db.exec("begin; set local role authenticated");
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(claims())]);
    await db.query("select public.test_admin_approve_v1($1,$2)", [resourceId,correlationId]);
    await assert.rejects(db.exec("select 1/0"), /division by zero/);
    await db.exec("rollback");
    assert.equal((await mutation()).rows[0].stato_annuncio, "in_revisione");
    assert.deepEqual(await events(), []);
  });
  await scenario("failure event survives when written in a new transaction after rollback", async () => {
    await db.exec("create trigger test_reject_audit before insert on private.admin_audit_event_v1 for each row execute function private.test_reject_audit()");
    await assert.rejects(approve(), /TEST_AUDIT_STORAGE_FAILURE/);
    await db.exec("drop trigger test_reject_audit on private.admin_audit_event_v1; begin");
    await add({ action: "announcement.approve", resourceType: "announcement", resource: resourceId,
      outcome: "failure", failureCode: "OPERATION_FAILED" });
    await db.exec("commit");
    assert.equal((await events())[0].outcome, "failure");
    assert.equal((await mutation()).rows[0].stato_annuncio, "in_revisione");
  });
  for (const [name, sql] of [
    ["role revoked", "update public.utente set tipologia_utente='Utente' where tipologia_utente='Admin'"],
    ["session revoked", "delete from auth.sessions"],
    ["session policy unverified", "update private.admin_session_policy_v1 set verified_at=null"],
  ]) await scenario(`${name} prevents mutation and success audit`, async () => {
    await db.exec(sql);
    await assert.rejects(approve(), /ADMIN_ACCESS_DENIED|ADMIN_SESSION_POLICY_UNVERIFIED/);
    assert.equal((await mutation()).rows[0].stato_annuncio, "in_revisione");
    assert.deepEqual(await events(), []);
  });

  for (const role of ["anon", "authenticated", "service_role", "supabase_auth_admin"]) {
    await scenario(`${role} cannot read, forge, edit, delete, truncate or invoke audit helpers`, async () => {
      await add();
      for (const sql of [
        "select * from private.admin_audit_event_v1",
        "insert into private.admin_audit_event_v1 default values",
        "update private.admin_audit_event_v1 set reason='forged'",
        "delete from private.admin_audit_event_v1", "truncate private.admin_audit_event_v1",
        `select private.append_admin_audit_event_v1('${authId}','${userId}','auth.login','session','${sessionId}','success','${correlationId}')`,
        "select private.purge_admin_audit_events_v1()",
        "select private.admin_audit_retention_cutoff_v1(now())",
        "select private.admin_audit_payload_valid_v1('auth.login','success',null,null,'{}','{}')",
      ]) await assert.rejects(callAs(role, sql), /permission denied/);
      assert.equal((await events()).length, 1);
      assert.equal((await db.query("select has_function_privilege($1,$2,'execute') as allowed", [role,helper])).rows[0].allowed, false);
    });
  }
  await scenario("events survive deletion of the operator and correlation may group multiple events", async () => {
    await add(); await add({ action: "auth.logout" });
    await db.query("delete from auth.sessions where user_id=$1", [authId]);
    await db.query("delete from public.utente where utente_uuid=$1", [userId]);
    await db.query("delete from auth.users where id=$1", [authId]);
    const rows = await events(); assert.equal(rows.length, 2);
    assert(rows.every((row) => row.actor_auth_user_uuid === authId && row.actor_utente_uuid === userId));
    assert.equal(new Set(rows.map((row) => row.event_uuid)).size, 2);
    assert.equal(new Set(rows.map((row) => row.correlation_uuid)).size, 1);
  });
  await scenario("unattributed authentication failures do not invent an actor from the attempted email", async () => {
    await add({ actorAuth: null, actorUser: null, resource: null, outcome: "failure", failureCode: "INVALID_CREDENTIALS" });
    const row = (await events())[0];
    assert.equal(row.actor_auth_user_uuid, null); assert.equal(row.actor_utente_uuid, null);
    assert.equal(row.failure_code, "INVALID_CREDENTIALS"); assert.deepEqual(row.details, {});
  });
  await scenario("verified Auth subject can be recorded without an application mapping on failure", async () => {
    await add({ actorUser: null, resource: null, outcome: "failure", failureCode: "ACCESS_DENIED" });
    assert.equal((await events())[0].actor_auth_user_uuid, authId);
  });

  const invalid = [
    ["unknown action", { action: "announcement.read" }],
    ["case variant", { action: "Auth.Login" }],
    ["unknown outcome", { outcome: "ok" }],
    ["null action", { action: null }], ["null outcome", { outcome: null }],
    ["success without operator", { actorAuth: null, actorUser: null }],
    ["application ID without Auth ID", { actorAuth: null }],
    ["null correlation", { correlation: null }],
    ["wrong resource type", { resourceType: "announcement" }],
    ["success without session resource", { resource: null }],
    ["denied access as success", { action: "auth.access_denied" }],
    ["failure without code", { outcome: "failure" }],
    ["raw exception as code", { outcome: "failure", failureCode: "password authentication failed for user" }],
    ["success carrying failure code", { failureCode: "OPERATION_FAILED" }],
    ["failure carrying raw error text", { outcome: "failure", failureCode: "OPERATION_FAILED", reason: "raw technical error" }],
    ["null changes", { changes: null }], ["array details", { details: [] }],
    ["attempted email", { details: { email: "person@example.test" } }],
    ["auth credentials", { details: { password: "synthetic-secret" } }],
    ["failure snapshot", { outcome: "failure", failureCode: "VALIDATION_FAILED", changes: { hidden: { before: false, after: true } } }],
  ];
  for (const [name, value] of invalid) await scenario(`rejects ${name}`, async () => {
    await assert.rejects(add(value), /admin_audit_.*v1|not-null/i);
    assert.deepEqual(await events(), []);
  });

  const moderation = (action, changes, reason = null) => ({ action: `announcement.${action}`,
    resourceType: "announcement", resource: resourceId, changes, reason });
  for (const [action, changes, reason] of [
    ["approve", { status: { before: "in_revisione", after: "pubblicato" } }, null],
    ["reject", { status: { before: "in_revisione", after: "rifiutato" } }, "Fuori tema"],
    ["hide", { hidden: { before: null, after: true } }, "Contenuto da verificare"],
    ["show", { hidden: { before: true, after: false } }, null],
    ["trash", { trashed: { before: false, after: true }, hidden: { before: false, after: true } }, "Duplicato"],
    ["restore", { trashed: { before: true, after: false } }, null],
  ]) await scenario(`accepts bounded ${action} semantic changes`, async () => {
    await add(moderation(action, changes, reason));
    assert.deepEqual((await events())[0].changes, changes);
  });
  const validHide = moderation("hide", { hidden: { before: false, after: true } }, "Motivazione");
  for (const [name, overrides] of [
    ["missing required reason", { reason: null }], ["whitespace reason", { reason: " \t\n" }],
    ["oversized reason", { reason: "a".repeat(1001) }],
    ["complete personal snapshot", { changes: { ...validHide.changes, contact: "person@example.test" } }],
    ["nested sensitive key", { changes: { hidden: { before: false, after: true, token: "secret" } } }],
    ["missing before", { changes: { hidden: { after: true } } }],
    ["wrong scalar type", { changes: { hidden: { before: false, after: "true" } } }],
    ["null after", { changes: { hidden: { before: false, after: null } } }],
    ["no actual change", { changes: { hidden: { before: true, after: true } } }],
    ["wrong semantic change", { changes: { trashed: { before: false, after: true } } }],
    ["oversized details", { details: { payload: "a".repeat(17000) } }],
  ]) await scenario(`rejects moderation ${name}`, async () => {
    await assert.rejects(add({ ...validHide, ...overrides }), /admin_audit_payload_v1/);
  });
  const exportEvent = { action: "announcement.export", resourceType: "announcement_export", resource: null,
    details: { row_count: 30, columns: ["title", "author", "status"] } };
  await scenario("export logs bounded counts/columns, with no search query, contacts or records", async () => {
    await add(exportEvent); assert.deepEqual((await events())[0].details, exportEvent.details);
  });
  for (const details of [{ row_count: 31 }, { row_count: -1 }, { row_count: "3" }, { row_count: 1.5 },
    { row_count: null }, {}, { row_count: 1, columns: ["email"] }, { row_count: 1, columns: [null] },
    { row_count: 1, columns: [] }, { row_count: 1, query: "person@example.test" }]) {
    await scenario(`rejects export detail shape ${JSON.stringify(details)}`, async () => {
      await assert.rejects(add({ ...exportEvent, details }), /admin_audit_payload_v1/);
    });
  }

  await scenario("retention uses calendar months and UTC even under another session timezone", async () => {
    await db.exec("set timezone='Pacific/Kiritimati'");
    for (const [reference, expected] of [
      ["2024-02-29T12:34:56Z", "2023-02-28T12:34:56.000Z"],
      ["2025-02-28T12:34:56Z", "2024-02-28T12:34:56.000Z"],
      ["2025-03-01T00:00:00Z", "2024-03-01T00:00:00.000Z"],
      ["2024-03-31T23:59:59Z", "2023-03-31T23:59:59.000Z"],
      ["2024-03-01T00:30:00+01:00", "2023-02-28T23:30:00.000Z"],
    ]) {
      const date = (await db.query("select private.admin_audit_retention_cutoff_v1($1::timestamptz) as cutoff", [reference])).rows[0].cutoff;
      assert.equal(date.toISOString(), expected);
    }
  });
  await scenario("purge deletes strictly before cutoff, preserves exact boundary, and is idempotent", async () => {
    await db.exec("begin");
    try {
      const ids = [await add(), await add(), await add(), await add()];
      for (const [index, offset] of [[0, "- interval '1 microsecond'"], [1, ""], [2, "+ interval '1 microsecond'"]]) {
        await db.query(`update private.admin_audit_event_v1 set occurred_at=private.admin_audit_retention_cutoff_v1(now()) ${offset} where event_uuid=$1`, [ids[index]]);
      }
      await db.exec("set local timezone='America/New_York'");
      assert.equal((await db.query("select private.purge_admin_audit_events_v1() as n")).rows[0].n, 1);
      assert.deepEqual(new Set((await events()).map((row) => row.event_uuid)), new Set(ids.slice(1)));
      assert.equal((await db.query("select private.purge_admin_audit_events_v1() as n")).rows[0].n, 0);
      await db.exec("commit");
    } catch (error) { await db.exec("rollback"); throw error; }
  });
  await scenario("nonfinite timestamps cannot evade retention", async () => {
    const event = await add();
    await assert.rejects(db.query("update private.admin_audit_event_v1 set occurred_at='infinity' where event_uuid=$1", [event]), /check constraint/);
  });
  await scenario("time lookup can use the retention/list index without a row-by-row authorization query", async () => {
    await add(); await db.exec("set enable_seqscan=off");
    try {
      const plan = await db.query("explain select event_uuid from private.admin_audit_event_v1 where occurred_at < now() order by occurred_at desc,event_uuid desc limit 30");
      assert.match(JSON.stringify(plan.rows), /admin_audit_event_time_v1/);
    } finally { await db.exec("reset enable_seqscan"); }
  });
  await scenario("manual schedule refuses missing pg_cron without deleting audit or installing a substitute", async () => {
    await add();
    await assert.rejects(db.exec(schedule), /ADMIN_AUDIT_PG_CRON_REQUIRED/);
    await db.exec("rollback");
    assert.equal((await events()).length, 1);
    assert.equal((await db.query("select to_regnamespace('cron') as schema")).rows[0].schema, null);
  });
});

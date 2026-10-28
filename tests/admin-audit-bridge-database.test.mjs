import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createAdminDatabaseFixture } from "./helpers/admin-database-fixture.mjs";

const readMigration = (name) => readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
const auditMigration = readMigration("20261024104822_admin_audit_foundation");
const bridgeMigration = readMigration("20261024110910_admin_audit_server_bridge");
const id = (n) => `bbbbbbbb-bbbb-4bbb-8bbb-${String(n).padStart(12, "0")}`;
const authId = id(1), userId = id(101), sessionId = id(501), correlationId = id(1001);
const signature = "(text,text,uuid,uuid,uuid,uuid,text)";

test("server audit bridge on synthetic PostgreSQL", async (t) => {
  const { db } = await createAdminDatabaseFixture();
  t.after(() => db.close());
  await db.exec(auditMigration);
  await db.exec("revoke usage on schema private from service_role");
  await db.exec(bridgeMigration);
  await db.exec(`
    grant usage on schema private to anon,supabase_auth_admin;
    create function public.test_audit_bridge_proxy() returns uuid
    language sql security definer set search_path='' as $$
      select private.record_admin_server_audit_v1('auth.login','success','${correlationId}',
        '${authId}','${userId}','${sessionId}',null);
    $$;
    revoke all on function public.test_audit_bridge_proxy() from public;
    grant execute on function public.test_audit_bridge_proxy() to authenticated,service_role;
  `);
  const asRole = async (role, sql, params = [], jwt = { role }) => {
    assert(["anon", "authenticated", "service_role", "supabase_auth_admin"].includes(role));
    await db.exec(`begin; set local role ${role}`);
    try {
      await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(jwt)]);
      const result = await db.query(sql, params);
      await db.exec("commit"); return result;
    } catch (error) { await db.exec("rollback"); throw error; }
  };
  const record = (overrides = {}, role = "service_role", jwt) => {
    const event = { action: "auth.login", outcome: "success", actorAuth: authId,
      actorUser: userId, resource: sessionId, failureCode: null, correlation: correlationId, ...overrides };
    return asRole(role, "select public.admin_record_server_audit_v1($1,$2,$3,$4,$5,$6,$7) as event_id",
      [event.action,event.outcome,event.correlation,event.actorAuth,event.actorUser,event.resource,event.failureCode], jwt);
  };
  const events = async () => (await db.query("select * from private.admin_audit_event_v1")).rows;
  const scenario = (name, run) => t.test(name, async () => {
    await db.exec("truncate private.admin_audit_event_v1"); await run();
  });

  await scenario("public wrapper is invoker, private bridge is definer, both have explicit owners/search path", async () => {
    for (const [name, definer] of [["public.admin_record_server_audit_v1", false], ["private.record_admin_server_audit_v1", true]]) {
      const fn = (await db.query("select prosecdef,proowner::regrole::text as owner,proconfig from pg_proc where oid=$1::regprocedure", [name + signature])).rows[0];
      assert.equal(fn.prosecdef, definer); assert.equal(fn.owner, "postgres");
      assert(fn.proconfig.some((config) => config.startsWith("search_path=")));
      for (const role of ["anon", "authenticated", "supabase_auth_admin", "service_role"]) {
        assert.equal((await db.query("select has_function_privilege($1,$2,'EXECUTE') as allowed", [role,name + signature])).rows[0].allowed, role === "service_role");
      }
    }
  });
  for (const action of ["auth.login", "auth.logout"]) await scenario(`trusted backend can attest ${action}`, async () => {
    const result = await record({ action }); const row = (await events())[0];
    assert.equal(row.event_uuid, result.rows[0].event_id);
    assert.equal(row.actor_auth_user_uuid, authId); assert.equal(row.actor_utente_uuid, userId);
    assert.equal(row.resource_type, "session"); assert.equal(row.resource_uuid, sessionId);
    assert.equal(row.reason, null); assert.deepEqual(row.changes, {}); assert.deepEqual(row.details, {});
  });
  await scenario("anonymous failure and verified subject without application mapping are supported", async () => {
    await record({ action: "auth.login", outcome: "failure", actorAuth: null, actorUser: null, resource: null, failureCode: "INVALID_CREDENTIALS" });
    await record({ action: "auth.access_denied", outcome: "failure", actorUser: null, failureCode: "ACCESS_DENIED" });
    assert.equal((await events()).length, 2);
  });
  for (const action of ["announcement.approve", "announcement.reject", "announcement.hide", "announcement.show",
    "announcement.trash", "announcement.restore", "announcement.export"]) {
    await scenario(`${action} allows only failure reports, never functional success`, async () => {
      await assert.rejects(record({ action }), /ADMIN_SERVER_AUDIT_EVENT_INVALID/);
      await record({ action, outcome: "failure", failureCode: "OPERATION_FAILED", resource: action.endsWith("export") ? null : sessionId });
      const row = (await events())[0];
      assert.equal(row.outcome, "failure"); assert.deepEqual(row.changes, {});
      assert.equal(row.resource_type, action.endsWith("export") ? "announcement_export" : "announcement");
    });
  }
  for (const role of ["anon", "authenticated", "supabase_auth_admin"]) {
    await scenario(`${role} cannot invoke the bridge even with forged service claims`, async () => {
      await assert.rejects(record({}, role, { role: "service_role" }), /permission denied/);
      await assert.rejects(asRole(role, "select private.record_admin_server_audit_v1('auth.login','success',$1,$2,$3,$4,null)",
        [correlationId,authId,userId,sessionId], { role: "service_role" }), /permission denied/);
      assert.deepEqual(await events(), []);
    });
  }
  await scenario("a privileged proxy cannot conceal the authenticated outer SQL role", async () => {
    await assert.rejects(asRole("authenticated", "select public.test_audit_bridge_proxy()", [], { role: "service_role" }), /ADMIN_SERVER_AUDIT_BACKEND_REQUIRED/);
    assert.deepEqual(await events(), []);
  });
  for (const jwt of [{}, { role: "authenticated" }, { user_metadata: { role: "service_role" } }]) {
    await scenario(`SQL service role also requires trusted technical claims ${JSON.stringify(jwt)}`, async () => {
      await assert.rejects(record({}, "service_role", jwt), /ADMIN_SERVER_AUDIT_BACKEND_REQUIRED/);
    });
  }
  await scenario("service key does not acquire direct table/helper access or human Admin context", async () => {
    for (const sql of ["select * from private.admin_audit_event_v1", "insert into private.admin_audit_event_v1 default values",
      "update private.admin_audit_event_v1 set reason='forged'", "delete from private.admin_audit_event_v1",
      "select private.append_admin_audit_event_v1(null,null,'auth.login','session',null,'failure',null)",
      "select private.purge_admin_audit_events_v1()", "select public.admin_get_context_v1()"])
      await assert.rejects(asRole("service_role", sql), /permission denied/);
  });
  for (const overrides of [{ outcome: null }, { outcome: "ok" }, { action: "unknown", outcome: "failure", failureCode: "OPERATION_FAILED" },
    { actorUser: null }, { actorAuth: null }, { resource: null }, { correlation: null }, { failureCode: "INVALID_CREDENTIALS" },
    { outcome: "failure", failureCode: null }, { outcome: "failure", failureCode: "raw exception secret" }]) {
    await scenario(`invalid attestation rejected ${JSON.stringify(overrides)}`, async () => {
      await assert.rejects(record(overrides), /ADMIN_SERVER_AUDIT_EVENT_INVALID|admin_audit_.*v1|not-null/i);
      assert.deepEqual(await events(), []);
    });
  }
  await scenario("logout can preserve its verified actor after revocation without pretending to reauthorize it", async () => {
    await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'admin@example.test',now())", [authId]);
    await db.query("insert into public.utente(utente_uuid,auth_user_uuid,tipologia_utente) values($1,$2,'Admin')", [userId,authId]);
    await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [sessionId,authId]);
    await db.query("delete from auth.sessions where id=$1", [sessionId]);
    await record({ action: "auth.logout" });
    assert.equal((await events())[0].actor_utente_uuid, userId);
  });
});

test("bridge migration fails transactionally without the audit foundation", async (t) => {
  const { db } = await createAdminDatabaseFixture(); t.after(() => db.close());
  await assert.rejects(db.exec(bridgeMigration), /ADMIN_AUDIT_FOUNDATION_REQUIRED/);
  await db.exec("rollback");
  assert.equal((await db.query("select to_regprocedure('public.admin_record_server_audit_v1(text,text,uuid,uuid,uuid,uuid,text)') as fn")).rows[0].fn, null);
});

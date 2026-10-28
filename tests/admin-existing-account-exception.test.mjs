import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createAdminDatabaseFixture } from "./helpers/admin-database-fixture.mjs";

const migration = readFileSync(new URL("../supabase/migrations/20261027104339_admin_existing_account_exception.sql", import.meta.url), "utf8");
const authId = "0b889a5b-a5a5-49ce-a8b7-c1c899f0e391";
const userId = "aaaaaaaa-aaaa-4aaa-8aaa-000000000101";
const otherAuth = "aaaaaaaa-aaaa-4aaa-8aaa-000000000002";
const otherUser = "aaaaaaaa-aaaa-4aaa-8aaa-000000000102";
const readPolicy = () => readFileSync(new URL("../supabase/scripts/dashboard_admin_verify_session_policy.sql", import.meta.url), "utf8");

async function setup(t) {
  const { db } = await createAdminDatabaseFixture();
  t.after(() => db.close());
  await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'operator@example.test',now()),($2,'ordinary@example.test',now())", [authId, otherAuth]);
  await db.query("insert into public.utente(utente_uuid,auth_user_uuid,registrato_il) values($1,$2,now()),($3,$4,now())", [userId, authId, otherUser, otherAuth]);
  await db.query("insert into public.profilo(uuid_utente) values($1),($2)", [userId, otherUser]);
  await db.query("insert into public.annuncio(creato_da,titolo_annuncio) values($1,'Preserve existing content'),($2,'Ordinary content')", [userId, otherUser]);
  await db.exec(readPolicy());
  return db;
}

async function execute(db, source = migration) {
  try { await db.exec(source); } catch (error) { await db.exec("rollback"); throw error; }
}

test("one-time existing Admin promotion preserves all account fields/content and restores exact protections", async (t) => {
  const db = await setup(t);
  const snapshot = async () => (await db.query("select (select jsonb_agg(to_jsonb(u) order by utente_uuid) from public.utente u) as accounts,(select jsonb_agg(to_jsonb(p) order by uuid) from public.profilo p) as profiles,(select jsonb_agg(to_jsonb(a) order by uuid) from public.annuncio a) as announcements")).rows[0];
  const before = await snapshot();
  const guard = async () => (await db.query("select pg_get_functiondef(oid) as definition,proacl,proowner from pg_proc where oid='private.protect_admin_account_v1()'::regprocedure")).rows[0];
  const oldGuard = await guard();
  await execute(db);
  const after = await snapshot();
  assert.deepEqual(await guard(), oldGuard);
  assert.deepEqual(after.profiles, before.profiles);
  assert.deepEqual(after.announcements, before.announcements);
  const oldTarget = before.accounts.find((u) => u.utente_uuid === userId);
  const newTarget = after.accounts.find((u) => u.utente_uuid === userId);
  assert.equal(newTarget.tipologia_utente, "Admin");
  for (const key of Object.keys(oldTarget).filter((key) => !["tipologia_utente", "ultima_modifica_il"].includes(key))) assert.deepEqual(newTarget[key], oldTarget[key], key);
  assert.deepEqual(after.accounts.find((u) => u.utente_uuid === otherUser), before.accounts.find((u) => u.utente_uuid === otherUser));
  assert.equal((await db.query("select convalidated from pg_constraint where conrelid='public.utente'::regclass and conname='admin_account_not_registered_v1'")).rows[0].convalidated, true);
  const sessionId = "aaaaaaaa-aaaa-4aaa-8aaa-000000000501";
  await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [sessionId, authId]);
  await db.exec("begin; set local role authenticated;");
  try {
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ role: "authenticated", sub: authId, session_id: sessionId, exp: Math.floor(Date.now() / 1000) + 3600 })]);
    assert.equal((await db.query("select * from public.admin_get_context_v1()")).rows[0].auth_user_uuid, authId);
  } finally { await db.exec("rollback"); }
  await assert.rejects(execute(db), /TARGET_STATE_CHANGED_DO_NOT_REPLAY/);
  await assert.rejects(db.query("insert into public.profilo(uuid_utente) values($1)", [userId]), /ADMIN_PERSONAL_ACCOUNT_FORBIDDEN/);
  await assert.rejects(db.query("insert into public.annuncio(creato_da) values($1)", [userId]), /ADMIN_PERSONAL_ACCOUNT_FORBIDDEN/);
  await assert.rejects(db.query("update public.utente set tipologia_utente='Admin' where utente_uuid=$1", [otherUser]), /ADMIN_ACCOUNT_NOT_DEDICATED/);
  await assert.rejects(db.query("select private.assert_not_admin_account_v1($1)", [authId]), /ADMIN_PERSONAL_ACCOUNT_FORBIDDEN/);
  // Revocation remains possible; ordinary promotion cannot reapply the bypass.
  await db.query("update public.utente set tipologia_utente='Utente' where utente_uuid=$1", [userId]);
  await assert.rejects(db.query("update public.utente set tipologia_utente='Admin' where utente_uuid=$1", [userId]), /ADMIN_ACCOUNT_NOT_DEDICATED/);
});

test("exception transaction rolls back schema and account when any post-promotion operation fails", async (t) => {
  const db = await setup(t);
  const constraint = async () => (await db.query("select pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.utente'::regclass and conname='admin_account_not_registered_v1'")).rows[0].definition;
  const oldConstraint = await constraint();
  const guard = async () => (await db.query("select pg_get_functiondef('private.protect_admin_account_v1()'::regprocedure) as definition")).rows[0].definition;
  const oldGuard = await guard();
  await assert.rejects(execute(db, migration.replace("commit;", () => "do $$ begin raise exception 'SYNTHETIC_ABORT'; end $$; commit;")), /SYNTHETIC_ABORT/);
  assert.equal((await db.query("select tipologia_utente from public.utente where auth_user_uuid=$1", [authId])).rows[0].tipologia_utente, "Utente");
  assert.equal(await constraint(), oldConstraint);
  assert.equal(await guard(), oldGuard);
});

test("promotion requires operator context, verified policy and ready email identity", async (t) => {
  const db = await setup(t);
  await db.exec("update private.admin_session_policy_v1 set verified_at=null");
  await assert.rejects(execute(db), /VERIFIED_POLICY_REQUIRED/);
  await db.exec(readPolicy());
  await db.query("update auth.users set email_confirmed_at=null where id=$1", [authId]);
  await assert.rejects(execute(db), /ADMIN_AUTH_IDENTITY_NOT_READY/);
  await db.query("update auth.users set email_confirmed_at=now() where id=$1", [authId]);
  await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({ role: "service_role" })]);
  await assert.rejects(execute(db), /ADMIN_EXCEPTION_OPERATOR_REQUIRED/);
  await db.query("select set_config('request.jwt.claims','',false)");
  await execute(db);
});

test("registration exception cannot be transferred to another Auth/application pair or NULL identity", async (t) => {
  const db = await setup(t);
  await execute(db);
  // A registered account without content still fails the ordinary constraint.
  await db.query("delete from public.profilo where uuid_utente=$1", [otherUser]);
  await db.query("delete from public.annuncio where creato_da=$1", [otherUser]);
  await assert.rejects(db.query("update public.utente set tipologia_utente='Admin' where utente_uuid=$1", [otherUser]), /admin_account_not_registered_v1/);
  await assert.rejects(db.exec("insert into public.utente(tipologia_utente,registrato_il) values('Admin',now())"), /admin_account_not_registered_v1/);
  // The exception is bound to the original internal UUID, not Auth ID alone.
  await db.query("update public.utente set tipologia_utente='Utente',auth_user_uuid=null where utente_uuid=$1", [userId]);
  await db.query("insert into public.utente(auth_user_uuid,registrato_il) values($1,now())", [authId]);
  await assert.rejects(db.query("update public.utente set tipologia_utente='Admin' where auth_user_uuid=$1", [authId]), /admin_account_not_registered_v1/);
});

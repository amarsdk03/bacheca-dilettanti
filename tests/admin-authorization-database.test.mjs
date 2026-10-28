import { PGlite } from "./helpers/pglite.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createAdminDatabaseFixture } from "./helpers/admin-database-fixture.mjs";

// Deliberately in-memory. Never load .env, accept a database URL, or skip silently.
const readMigration = (name) => readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
const migration = readMigration("20261024095639_admin_authorization_foundation");
const id = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
const authId = id(1), userId = id(101), sessionId = id(501);
const claims = (overrides = {}) => ({
  role: "authenticated", sub: authId, session_id: sessionId,
  exp: Math.floor(Date.now() / 1000) + 3600, ...overrides,
});

test("Admin authorization migration on isolated PostgreSQL", async (t) => {
  const { db, publicationBefore: before } = await createAdminDatabaseFixture();
  t.after(() => db.close());
  const initialPolicy = (await db.query("select verified_at,unsupported_auth_settings from private.admin_session_policy_v1")).rows[0];
  assert.equal(initialPolicy.verified_at, null);
  assert.equal(initialPolicy.unsupported_auth_settings, true);

  const callAs = async (role, jwt, sql = "select * from public.admin_get_context_v1()", params = []) => {
    assert(["authenticated", "anon", "service_role"].includes(role));
    await db.exec(`begin; set local role ${role};`);
    try {
      await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(jwt)]);
      const result = await db.query(sql, params);
      await db.exec("commit");
      return result;
    } catch (error) {
      await db.exec("rollback");
      throw error;
    }
  };
  const context = (jwt = claims()) => callAs("authenticated", jwt);
  const reset = async ({ kind = "Admin", activate = true } = {}) => {
    await db.exec(`
      truncate auth.refresh_tokens, auth.sessions, public.annuncio, public.profilo,
        public.utente, auth.users, private.registration_intent cascade;
      update private.admin_session_policy_v1 set verified_at=null,
        timebox_seconds=null,inactivity_timeout_seconds=null,
        single_session_per_user=false,unsupported_auth_settings=true;
    `);
    await db.query("insert into auth.users(id,email,email_confirmed_at) values ($1,'admin@example.test',now()),($2,'other@example.test',now())", [authId, id(2)]);
    await db.query("insert into public.utente(utente_uuid,auth_user_uuid,tipologia_utente,indirizzo_email) values($1,$2,$3,'admin@example.test')", [userId, authId, kind]);
    await db.query("insert into auth.sessions(id,user_id) values ($1,$2)", [sessionId, authId]);
    if (activate) await db.exec("update private.admin_session_policy_v1 set verified_at=now(),unsupported_auth_settings=false");
  };
  const scenario = (name, run) => t.test(name, async () => { await reset(); await run(); });
  const denied = (promise, pattern = /ADMIN_ACCESS_DENIED/) => assert.rejects(promise, pattern);

  await scenario("default migration policy blocks access until verification", async () => {
    await reset({ activate: false });
    await denied(context(), /ADMIN_SESSION_POLICY_UNVERIFIED/);
  });
  await scenario("valid Admin with distinct Auth/application IDs, no profile", async () => {
    assert.deepEqual((await context()).rows, [{ auth_user_uuid: authId, utente_uuid: userId }]);
    assert.equal((await db.query("select count(*)::int as n from public.profilo")).rows[0].n, 0);
  });
  for (const kind of ["Utente", "admin", "ADMIN", " Admin", "Admin ", "Admin\t", null]) {
    await scenario(`denies role ${JSON.stringify(kind)}`, async () => {
      await reset({ kind });
      await denied(context(claims({ user_metadata: { role: "Admin" }, app_metadata: { role: "Admin" } })));
    });
  }
  await scenario("missing application mapping", async () => {
    await db.exec("delete from public.utente"); await denied(context());
  });
  for (const [name, sql] of [
    ["unconfirmed email", "update auth.users set email_confirmed_at=null"],
    ["missing email", "update auth.users set email=null"],
    ["banned identity", "update auth.users set banned_until=now()+interval '1 day'"],
    ["deleted identity", "update auth.users set deleted_at=now()"],
    ["anonymous Auth identity", "update auth.users set is_anonymous=true"],
    ["revoked session", "delete from auth.sessions"],
    ["another user's session", `update auth.sessions set user_id='${id(2)}'`],
    ["expired session not_after", "update auth.sessions set not_after=now()-interval '1 second'"],
  ]) await scenario(name, async () => { await db.exec(sql); await denied(context()); });

  for (const [name, jwt] of [
    ["expired JWT", claims({ exp: 1 })], ["absent session claim", claims({ session_id: undefined })],
    ["malformed session claim", claims({ session_id: "invalid" })],
    ["malformed subject", claims({ sub: "invalid" })], ["absent expiry", claims({ exp: undefined })],
    ["string expiry", claims({ exp: "999999999999" })], ["negative expiry", claims({ exp: -1 })],
    ["future not-before", claims({ nbf: 999999999999 })], ["invalid not-before", claims({ nbf: "invalid" })],
    ["JWT role service_role", claims({ role: "service_role" })],
  ]) await scenario(name, () => denied(context(jwt)));

  await scenario("anon and service_role cannot call public RPC", async () => {
    await denied(callAs("anon", {}), /permission denied/);
    await denied(callAs("service_role", claims({ role: "service_role" })), /permission denied/);
  });
  await scenario("private helper cannot bypass current role", async () => {
    await reset({ kind: "Utente" });
    await denied(callAs("authenticated", claims(), "select * from private.require_admin_context_v1()"));
  });
  await scenario("role revocation affects the next statement", async () => {
    await context();
    await db.exec("update public.utente set tipologia_utente='Utente'");
    await denied(context());
  });
  await scenario("session revocation affects the next statement", async () => {
    await context(); await db.exec("delete from auth.sessions"); await denied(context());
  });
  await scenario("policy removal/unsupported settings/future verification deny", async () => {
    await db.exec("update private.admin_session_policy_v1 set verified_at=now()+interval '1 day'");
    await denied(context(), /UNVERIFIED/);
    await db.exec("update private.admin_session_policy_v1 set verified_at=now(),single_session_per_user=true");
    await denied(context(), /UNVERIFIED/);
    await db.exec("update private.admin_session_policy_v1 set single_session_per_user=false,unsupported_auth_settings=true");
    await denied(context(), /UNVERIFIED/);
    await db.exec("delete from private.admin_session_policy_v1"); await denied(context(), /UNVERIFIED/);
    await db.exec("insert into private.admin_session_policy_v1(singleton) values(true)");
  });
  await scenario("timebox checked independently of session existence", async () => {
    await db.exec("update private.admin_session_policy_v1 set timebox_seconds=3600; update auth.sessions set created_at=now()-interval '2 hours'");
    await denied(context());
    await db.exec("update auth.sessions set created_at=now()-interval '30 minutes'"); await context();
  });
  await scenario("inactivity uses server refresh timestamp, not token iat", async () => {
    await db.exec("update private.admin_session_policy_v1 set inactivity_timeout_seconds=3600; update auth.sessions set created_at=now()-interval '3 hours',refreshed_at=now()-interval '2 hours'");
    await denied(context(claims({ iat: Math.floor(Date.now() / 1000) })));
    await db.exec("update auth.sessions set refreshed_at=now()-interval '10 minutes'"); await context();
  });
  await scenario("legacy refresh timestamp fallback and timezone independence", async () => {
    await db.exec("update private.admin_session_policy_v1 set inactivity_timeout_seconds=3600; update auth.sessions set created_at=now()-interval '3 hours'");
    await denied(context());
    await db.query("insert into auth.refresh_tokens(session_id,updated_at,revoked) values($1,now()-interval '10 minutes',true)", [sessionId]);
    await denied(context());
    await db.exec("update auth.refresh_tokens set revoked=false; set timezone='Europe/Rome'");
    await context();
    await db.exec("set timezone='UTC'");
  });
  await scenario("ordinary API cannot write role or private policy/Auth data", async () => {
    for (const sql of [
      "update public.utente set tipologia_utente='Admin'", "insert into public.utente(tipologia_utente) values('Admin')",
      "update private.admin_session_policy_v1 set verified_at=now()", "select * from auth.sessions", "select * from auth.users",
    ]) await denied(callAs("authenticated", claims(), sql), /permission denied/);
  });
  await scenario("privileged RPC cannot assign role on behalf of caller", async () => {
    await reset({ kind: "Utente" });
    await db.exec(`create function public.test_role_escalation_v1() returns void language plpgsql security definer set search_path='' as $$
begin
  update public.utente set tipologia_utente='Admin' where auth_user_uuid=(select auth.uid());
end;
$$; grant execute on function public.test_role_escalation_v1() to authenticated,service_role;`);
    for (const role of ["authenticated", "service_role"]) {
      await denied(callAs(role, claims({ role }), "select public.test_role_escalation_v1()"), /ACCOUNT_ROLE_WRITE_FORBIDDEN/);
    }
    assert.equal((await db.query("select tipologia_utente from public.utente")).rows[0].tipologia_utente, "Utente");
  });
  await scenario("service_role cannot create an Admin or relink Admin identity", async () => {
    await denied(callAs("service_role", claims({ role: "service_role" }), "insert into public.utente(auth_user_uuid,tipologia_utente) values($1,'Admin')", [id(2)]), /ACCOUNT_ROLE_WRITE_FORBIDDEN/);
    await denied(callAs("service_role", claims({ role: "service_role" }), "update public.utente set auth_user_uuid=$1", [id(2)]), /ACCOUNT_ROLE_WRITE_FORBIDDEN/);
  });
  await scenario("Admin cannot become registered or own personal content", async () => {
    await denied(db.exec("update public.utente set registrato_il=now()"), /admin_account_not_registered_v1/);
    await denied(db.query("insert into public.profilo(uuid_utente) values($1)", [userId]), /ADMIN_PERSONAL_ACCOUNT_FORBIDDEN/);
    await denied(db.query("insert into public.annuncio(creato_da) values($1)", [userId]), /ADMIN_PERSONAL_ACCOUNT_FORBIDDEN/);
  });
  await scenario("ordinary content cannot be promoted into an Admin account", async () => {
    await reset({ kind: "Utente" });
    await db.query("insert into public.profilo(uuid_utente) values($1)", [userId]);
    await denied(db.exec("update public.utente set tipologia_utente='Admin'"), /ADMIN_ACCOUNT_NOT_DEDICATED/);
    await db.exec("delete from public.profilo");
    await db.query("insert into public.annuncio(creato_da) values($1)", [userId]);
    await denied(db.exec("update public.utente set tipologia_utente='Admin'"), /ADMIN_ACCOUNT_NOT_DEDICATED/);
  });
  await scenario("Admin direct registration/publication/profile/provisioning calls are rejected", async () => {
    await denied(callAs("authenticated", claims(), "select public.complete_registration_v1($1)", [id(900)]), /ADMIN_PERSONAL_ACCOUNT_FORBIDDEN/);
    await denied(callAs("authenticated", claims(), "select public.publish_announcement_v2($1,$2::jsonb,'terms','privacy','gratuito')", [id(901), JSON.stringify({ role: "Utente" })]), /ADMIN_PERSONAL_ACCOUNT_FORBIDDEN/);
    await denied(callAs("service_role", claims({ role: "service_role" }), "select private.registered_internal_user_id($1)", [authId]), /ADMIN_PERSONAL_ACCOUNT_FORBIDDEN/);
    await denied(callAs("service_role", claims({ role: "service_role" }), "select private.provision_auth_user($1,'admin@example.test',null)", [authId]), /ADMIN_PERSONAL_ACCOUNT_FORBIDDEN/);
  });
  await scenario("ordinary helper/provisioning and publication validation remain intact", async () => {
    await reset({ kind: "Utente" });
    await db.exec("update public.utente set registrato_il=now()");
    assert.equal((await callAs("service_role", claims({ role: "service_role" }), "select private.registered_internal_user_id($1) as id", [authId])).rows[0].id, userId);
    await callAs("service_role", claims({ role: "service_role" }), "select private.provision_auth_user($1,'other@example.test',null)", [id(2)]);
    assert.equal((await db.query("select tipologia_utente from public.utente where auth_user_uuid=$1", [id(2)])).rows[0].tipologia_utente, "Utente");
    await denied(callAs("authenticated", claims(), "select public.publish_announcement_v2($1,'{}','terms','privacy','invalid')", [id(901)]), /PRIORITY_PUBLICATION_DISABLED/);
    const after = (await db.query("select pg_get_functiondef('public.publish_announcement_v2(uuid,jsonb,text,text,text)'::regprocedure) as body")).rows[0].body;
    assert.equal(after.replace(/  perform private\.assert_not_admin_account_v1\(\(select auth\.uid\(\)\)\);\r?\n/, ""), before);
  });
  await scenario("indexed lookup reused and helper privilege boundary", async () => {
    const indexes = (await db.query("select indexname from pg_indexes where tablename='utente'")).rows;
    assert(!indexes.some((i) => i.indexname === "utente_admin_auth_lookup_v1"), "Existing unique index should be reused");
    await db.exec("set enable_seqscan=off");
    const plan = await db.query("explain select utente_uuid from public.utente where auth_user_uuid=$1", [authId]);
    assert.match(JSON.stringify(plan.rows), /Index Scan/);
    await db.exec("reset enable_seqscan");
    assert.equal((await db.query("select has_function_privilege('anon','private.require_admin_context_v1()','EXECUTE') as allowed")).rows[0].allowed, false);
    assert.equal((await db.query("select prosecdef from pg_proc where oid='public.admin_get_context_v1()'::regprocedure")).rows[0].prosecdef, false);
  });
  const script = (name) => readFileSync(new URL(`../supabase/scripts/${name}.sql`, import.meta.url), "utf8");
  const runScript = async (sql) => {
    try { return await db.exec(sql); }
    catch (error) { await db.exec("rollback"); throw error; }
  };
  await scenario("manual provisioning template refuses placeholders and creates only dedicated accounts", async () => {
    const source = script("dashboard_admin_provision");
    await denied(runScript(source), /ADMIN_AUTH_UUID_REQUIRED/);
    const filled = source.replace("v_auth_user_id uuid := null", `v_auth_user_id uuid := '${id(2)}'`);
    await runScript(filled);
    const row = (await db.query("select tipologia_utente,registrato_il from public.utente where auth_user_uuid=$1", [id(2)])).rows[0];
    assert.equal(row.tipologia_utente, "Admin"); assert.equal(row.registrato_il, null);
    await runScript(filled); // Repeat safely without changing the mapping.
  });
  await scenario("manual provisioning cannot convert an ordinary registered account", async () => {
    await reset({ kind: "Utente" }); await db.exec("update public.utente set registrato_il=now()");
    await denied(runScript(script("dashboard_admin_provision").replace("v_auth_user_id uuid := null", `v_auth_user_id uuid := '${authId}'`)), /ADMIN_REQUIRES_DEDICATED_ACCOUNT/);
  });
  await scenario("manual policy verification requires explicit reviewed settings", async () => {
    await reset({ activate: false });
    // Operator templates may be configured locally: test synthetic settings
    // without changing the user's reviewed project values on disk.
    const source = script("dashboard_admin_verify_session_policy")
      .replace(/v_configuration_reviewed boolean := [^;]+;/, "v_configuration_reviewed boolean := false;")
      .replace(/v_timebox_seconds integer := [^;]+;/, "v_timebox_seconds integer := null;")
      .replace(/v_inactivity_timeout_seconds integer := [^;]+;/, "v_inactivity_timeout_seconds integer := null;")
      .replace(/v_single_session_per_user boolean := [^;]+;/, "v_single_session_per_user boolean := null;")
      .replace(/v_other_auth_limits_present boolean := [^;]+;/, "v_other_auth_limits_present boolean := null;");
    await denied(runScript(source), /ADMIN_AUTH_SETTINGS_REVIEW_REQUIRED/);
    const reviewed = source.replace("v_configuration_reviewed boolean := false", "v_configuration_reviewed boolean := true")
      .replace("v_single_session_per_user boolean := null", "v_single_session_per_user boolean := false")
      .replace("v_other_auth_limits_present boolean := null", "v_other_auth_limits_present boolean := false");
    await denied(runScript(reviewed.replace("v_single_session_per_user boolean := false", "v_single_session_per_user boolean := true")), /ADMIN_AUTH_SETTINGS_NOT_SUPPORTED_YET/);
    await denied(context(), /ADMIN_SESSION_POLICY_UNVERIFIED/);
    await runScript(reviewed); await context();
  });
});

test("migration fails transactionally on an existing non-dedicated Admin", async (t) => {
  const db = await PGlite.create(); t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema private;
    create table public.utente(utente_uuid uuid,tipologia_utente text,registrato_il timestamptz);
    create table public.profilo(uuid_utente uuid);
    create table public.annuncio(creato_da uuid);
    insert into public.utente values('${userId}','Admin',now());
  `);
  await assert.rejects(db.exec(migration), /ADMIN_ACCOUNT_NOT_DEDICATED/);
  await db.exec("rollback");
  assert.equal((await db.query("select to_regclass('private.admin_session_policy_v1') as table_name")).rows[0].table_name, null);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { createHomeFixture, homeMigration } from "./helpers/admin-home-fixture.mjs";
import { listId as id, listActor as actor, listClaims } from "./helpers/admin-announcements-fixture.mjs";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
const load = adminServerLoader(), base = "apps/admin/src/features/home/";
const { createHomeQueries } = load(base + "server/service.ts");
const { parseHomeChart } = load(base + "server/response.ts");
const metrics = ["users", "announcements", "pending", "profits"];
test("Home aggregates on synthetic PostgreSQL", async t => {
  const h = await createHomeFixture(), { db } = h; t.after(() => db.close());
  const scenario = async (name, fn) => t.test(name, async () => { await h.reset(); await fn(); });
  await scenario("explicit minimal ACL, stable wrappers and private bridges with one authorization each", async () => {
    const rows = (await db.query("select n.nspname,p.prosecdef,p.provolatile,p.proconfig,pg_get_userbyid(p.proowner) owner,pg_get_functiondef(p.oid) body from pg_proc p join pg_namespace n on n.oid=p.pronamespace where proname in ('admin_get_home_summary_v1','admin_get_home_chart_v1','admin_get_home_summary_bridge_v1','admin_get_home_chart_bridge_v1')")).rows;
    assert.equal(rows.length, 4);
    for (const r of rows) {
      assert.equal(r.owner, "postgres"); assert.equal(r.provolatile, "s"); assert.equal(r.prosecdef, r.nspname === "private"); assert(r.proconfig.includes('search_path=""'));
      if (r.prosecdef) assert.equal((r.body.match(/perform private.require_admin_context_v1\(\)/g) ?? []).length, 1);
    }
    for (const fn of ["public.admin_get_home_summary_v1()", "public.admin_get_home_chart_v1(text)", "private.admin_get_home_summary_bridge_v1()", "private.admin_get_home_chart_bridge_v1(text)"]) {
      for (const role of ["anon", "authenticated", "service_role"]) assert.equal((await db.query("select has_function_privilege($1,$2,'execute') allowed", [role, fn])).rows[0].allowed, role === "authenticated");
    }
    assert(!/grant\s+select|create\s+index|auth\.users|(?:from|join)\s+(?:public|private)\.(?:pagamento|payment|stripe)/i.test(homeMigration));
  });
  await scenario("empty populations give real zero and twelve empty months, without audit writes", async () => {
    const summary = await h.summary(); assert.deepEqual({ ...summary, asOf: "clock" }, { asOf: "clock", users: 0, announcements: 0, pending: 0, profits: { available: false } });
    for (const metric of metrics) {
      const chart = parseHomeChart(await h.chart(metric), metric);
      if (metric === "profits") assert.equal(chart.available, false);
      else {
        assert.equal(chart.population, 0); assert.equal(chart.distributionTotal, 0); assert.deepEqual(chart.distribution, []);
        if (metric !== "pending") { assert.equal(chart.series.length, 12); assert(chart.series.every(e => e.count === 0)); }
        else { assert.equal(chart.age.length, 5); assert(chart.age.every(e => e.count === 0)); }
      }
    }
    assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, 0);
  });
  await scenario("only exact Utente with completed registration, regardless of profile or account visibility", async () => {
    await h.user(5000); await h.user(5001, { registered: null });
    for (const [n, type] of [[5002, "admin"], [5003, "ADMIN"], [5004, "Utente "], [5005, "utente"], [5006, "FutureRole"]]) await h.user(n, { type });
    assert.equal((await h.summary()).users, 1); const chart = await h.chart("users"); assert.equal(chart.population, 1); assert.equal(chart.distributionTotal, 0);
    await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1", [id(5000)]); assert.equal((await h.summary()).users, 1);
  });
  await scenario("profile denominator counts base profiles, excludes hidden/orphan/incomplete owners", async () => {
    const a = await h.user(5000), b = await h.user(5001), incomplete = await h.user(5002, { registered: null });
    const hidden = await h.user(5003), future = await h.user(5004); await h.user(5005);
    await h.profile(6000, a); await h.profile(6001, b, { type: null }); await h.profile(6002, hidden, { hidden: true });
    await h.profile(6003, null); await h.profile(6004, incomplete); await h.profile(6005, future, { type: "future-type" });
    await db.query("insert into public.profilo_giocatore(uuid_profilo,nome,cognome) values($1,'Nome','Pubblico')", [id(6000)]);
    await db.query("insert into public.profilo_staff_sportivo(uuid_profilo,nome,cognome) values($1,'Nome','Pubblico')", [id(6000)]);
    const c = await h.chart("users"); assert.equal(c.population, 5); assert.equal(c.distributionTotal, 3);
    assert.deepEqual(c.distribution, [{ key: "giocatore", count: 1 }, { key: "other", count: 1 }, { key: "unspecified", count: 1 }]);
  });
  await scenario("missing required schema aborts migration without partial changes", async () => {
    await db.exec("alter table public.profilo rename column tipologia_principale to home_missing_type");
    try { await assert.rejects(db.exec(homeMigration), /ADMIN_HOME_SCHEMA_REQUIRED/); }
    finally { await db.exec("rollback; alter table public.profilo rename column home_missing_type to tipologia_principale"); }
    assert.equal((await h.summary()).users, 0);
  });
  await scenario("all non-trashed announcements count, including private, hidden and unknown states", async () => {
    for (const [n, status] of [[1000, "in_revisione"], [1001, "pubblicato"], [1002, "rifiutato"], [1003, "in_attesa_pagamento"], [1004, null], [1005, "FutureState"], [1006, "in_revisione"]]) await h.insert(n, { status, hidden: true, private: true });
    await db.query("update public.annuncio set eliminato_il=now(),eliminato_da=$2,oscurato_da_admin=true where uuid=$1", [id(1006), actor.userId]);
    const s = await h.summary(); assert.equal(s.announcements, 6); assert.equal(s.pending, 1);
    const c = await h.chart("announcements"); assert.equal(c.population, 6); assert.equal(c.distribution.reduce((n, e) => n + e.count, 0), 6);
    assert(c.distribution.some(e => e.key === "unspecified" && e.count === 1)); assert(c.distribution.some(e => e.key === "other" && e.count === 1));
  });
  await scenario("missing, non-finite and future dates do not fabricate temporal measurements", async () => {
    await h.user(5000, { registered: "infinity" }); await h.user(5001, { registered: "-infinity" }); await h.user(5002, { registered: "9999-01-01T00:00:00Z" });
    const users = await h.chart("users"); assert.equal(users.population, 3); assert.deepEqual(users.excludedDates, { missingOrNonFinite: 2, future: 1 }); assert(users.series.every(e => e.count === 0));
    for (const [i, at] of [null, "infinity", "-infinity", "9999-01-01T00:00:00Z"].entries()) await h.insert(1000 + i, { createdAt: at });
    const ann = await h.chart("announcements"); assert.equal(ann.population, 4); assert.deepEqual(ann.excludedDates, { missingOrNonFinite: 3, future: 1 }); assert(ann.series.every(e => e.count === 0));
    const pending = await h.chart("pending"); assert.equal(pending.age.at(-1).count, 4); parseHomeChart(pending, "pending");
  });
  await scenario("pending distribution includes every configured type and bounds unknown values", async () => {
    const { ADMIN_ANNOUNCEMENT_TYPES: types } = load("apps/admin/src/features/annunci/contracts.ts");
    for (const [i, type] of [...types, "future-type"].entries()) await h.insert(1000 + i, { type });
    const c = parseHomeChart(await h.chart("pending"), "pending"); assert.equal(c.distributionTotal, 12); assert.equal(c.distribution.length, 12); assert(c.distribution.some(e => e.key === "other" && e.count === 1));
  });
  for (const instant of ["2026-01-01T00:30:00.123456Z", "2026-03-29T01:30:00.123456Z", "2026-10-25T01:30:00.123456Z"]) await scenario(`calendar and month window at ${instant}`, async () => {
    await h.withClock(instant, async () => {
      const window = await h.chart("users");
      await h.user(5000, { registered: window.period.from });
      await h.user(5001, { registered: new Date(Date.parse(window.period.from) - 1).toISOString() });
      await h.user(5002, { registered: instant });
      await h.user(5003, { registered: new Date(Date.parse(instant) + 1000).toISOString() });
      const chart = parseHomeChart(await h.chart("users"), "users"); assert.equal(chart.asOf, instant); assert.equal(chart.population, 4);
      assert.equal(chart.series[0].count, 1); assert.equal(chart.series.at(-1).count, 1); assert.equal(chart.excludedDates.future, 1);
      assert.equal(chart.series.reduce((n, e) => n + e.count, 0), 2); assert.equal(chart.series.length, 12);
    });
  });
  await scenario("UTC year boundary is grouped using Rome local month", async () => {
    await h.withClock("2026-02-10T12:00:00.000000Z", async () => {
      await h.user(5000, { registered: "2025-12-31T22:59:59.999999Z" }); await h.user(5001, { registered: "2025-12-31T23:00:00.000000Z" });
      await h.insert(1000, { createdAt: "2025-12-31T23:00:00.000000Z" });
      const c = await h.chart("users"); assert.equal(c.series.find(e => e.month === "2025-12").count, 1); assert.equal(c.series.find(e => e.month === "2026-01").count, 1);
      assert.equal((await h.chart("announcements")).series.find(e => e.month === "2026-01").count, 1);
    });
  });
  for (const instant of ["2026-03-30T12:00:00.000000Z", "2026-10-26T12:00:00.000000Z"]) await scenario(`queue age uses calendar days across DST at ${instant}`, async () => {
    await h.withClock(instant, async () => {
      for (const [i, days] of [0, 2, 3, 7, 8, 30, 31].entries()) {
        const at = (await db.query("select ((($1::timestamptz at time zone 'Europe/Rome')::date-$2::int)::timestamp+time '00:00') at time zone 'Europe/Rome' as at", [instant, days])).rows[0].at;
        await h.insert(1000 + i, { createdAt: at });
      }
      await h.insert(1007, { createdAt: null }); await h.insert(1008, { createdAt: "9999-01-01T00:00:00Z" });
      const c = parseHomeChart(await h.chart("pending"), "pending"); assert.deepEqual(c.age.map(e => e.count), [2, 2, 2, 1, 2]); assert.equal(c.population, 9);
      assert.deepEqual(c.distribution, [{ key: "annuncio_giocatore", count: 9 }]); assert(!("series" in c));
    });
  });
  for (const type of ["Utente", "admin", "ADMIN", "Admin "]) await scenario(`exact Admin authorization rejects ${JSON.stringify(type)} for every metric and bridge`, async () => {
    await db.query("update public.utente set tipologia_utente=$1 where utente_uuid=$2", [type, actor.userId]);
    await assert.rejects(h.summary(), /ADMIN_ACCESS_DENIED/);
    for (const metric of metrics) await assert.rejects(h.chart(metric), /ADMIN_ACCESS_DENIED/);
    await assert.rejects(h.callAs("authenticated", listClaims(), "select private.admin_get_home_summary_bridge_v1()"), /ADMIN_ACCESS_DENIED/);
    await assert.rejects(h.callAs("authenticated", listClaims(), "select private.admin_get_home_chart_bridge_v1('profits')"), /ADMIN_ACCESS_DENIED/);
  });
  await scenario("technical callers, revoked/expired/unconfirmed sessions denied even for profits", async () => {
    for (const role of ["anon", "service_role"]) { await assert.rejects(h.summary(listClaims(), role), /permission denied|ADMIN_ACCESS_DENIED/); await assert.rejects(h.chart("profits", listClaims(), role), /permission denied|ADMIN_ACCESS_DENIED/); }
    await assert.rejects(h.summary(listClaims({ exp: 1 })), /ADMIN_ACCESS_DENIED/);
    await db.query("update auth.users set email_confirmed_at=null where id=$1", [actor.authId]); await assert.rejects(h.chart("users"), /ADMIN_ACCESS_DENIED/);
    await db.query("update auth.users set email_confirmed_at=now() where id=$1", [actor.authId]);
    await db.query("delete from auth.sessions where id=$1", [actor.sessionId]); await assert.rejects(h.summary(), /ADMIN_ACCESS_DENIED/); await assert.rejects(h.chart("profits"), /ADMIN_ACCESS_DENIED/);
  });
  await scenario("owner without user SQL role is not an Admin reader", async () => { await assert.rejects(db.query("select public.admin_get_home_summary_v1()"), /ADMIN_ACCESS_DENIED/); await assert.rejects(db.query("select private.admin_get_home_chart_bridge_v1('users')"), /ADMIN_ACCESS_DENIED/); });
  await scenario("profits has no dependency on announcement aggregates", async () => {
    await db.exec("alter table public.annuncio rename to home_unavailable_announcements");
    try { assert.equal((await h.chart("profits")).available, false); await assert.rejects(h.chart("announcements"), /does not exist/); }
    finally { await db.exec("alter table public.home_unavailable_announcements rename to annuncio"); }
  });
  for (const metric of [null, "", "Users", "users ", "all", "profits;drop table public.utente"]) await scenario(`invalid metric ${JSON.stringify(metric)} rejected`, async () => { await assert.rejects(h.chart(metric), /INVALID_METRIC/); });
  await scenario("authorized functions work read-only and never record audit", async () => {
    await db.exec("begin read only; set local role authenticated");
    try {
      await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(listClaims())]);
      await db.query("select public.admin_get_home_summary_v1()"); for (const metric of metrics) await db.query("select public.admin_get_home_chart_v1($1)", [metric]);
    } finally { await db.exec("rollback"); }
    assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, 0);
  });
  await scenario("production service composes with SQL and reuses five-row audit without details or N+1", async () => {
    await h.user(5000); await h.insert(1000); for (let n = 0; n < 7; n++) await h.event(7000 + n);
    const calls = [], q = createHomeQueries({ log() { assert.fail("unexpected diagnostics"); }, async getClient() { return {
      auth: { async getClaims() { return { data: { claims: listClaims() }, error: null }; } },
      async rpc(name, args) { calls.push({ name, args }); return { error: null, data: name === "admin_get_home_summary_v1" ? await h.summary() : name === "admin_get_home_chart_v1" ? await h.chart(args.p_metric) : await h.auditList(args.p_query) }; },
    }; } });
    assert.equal((await q.summary()).status, "ok"); assert.equal(calls.length, 1);
    assert.equal((await q.chart("users")).status, "ok"); assert.equal(calls.length, 2);
    const activity = await q.activity(); assert.equal(activity.status, "ok"); assert.equal(activity.page.items.length, 5); assert.equal(calls.length, 3); assert.equal(calls[2].args.p_query.limit, 5);
    assert.deepEqual(calls.map(c => c.name), ["admin_get_home_summary_v1", "admin_get_home_chart_v1", "admin_list_audit_events_v1"]);
    assert.equal(activity.page.items[0].id, id(7006)); assert.equal((await db.query("select count(*)::int n from private.admin_audit_event_v1")).rows[0].n, 7);
  });
  await scenario("bounded aggregate output and sampled query plans on 6000 synthetic records", async () => {
    await db.exec(`insert into auth.users(id,email,email_confirmed_at)
      select ('dddddddd-dddd-4ddd-8ddd-'||lpad(g::text,12,'0'))::uuid,'bulk-'||g||'@example.test',now() from generate_series(1,6000) g;
      insert into public.utente(utente_uuid,auth_user_uuid,tipologia_utente,registrato_il)
      select ('cccccccc-cccc-4ccc-8ccc-'||lpad(g::text,12,'0'))::uuid,('dddddddd-dddd-4ddd-8ddd-'||lpad(g::text,12,'0'))::uuid,'Utente',now()-(g%730)*interval '1 day' from generate_series(1,6000) g;
      insert into public.profilo(uuid,uuid_utente,tipologia_principale,nascosto)
      select ('aaaaaaaa-aaaa-4aaa-8aaa-'||lpad(g::text,12,'0'))::uuid,('cccccccc-cccc-4ccc-8ccc-'||lpad(g::text,12,'0'))::uuid,case when g%2=0 then 'giocatore' else 'squadra' end,false from generate_series(1,6000) g;
      insert into public.annuncio(uuid,creato_da,autore_annuncio,stato_annuncio,creato_il)
      select ('bbbbbbbb-bbbb-4bbb-8bbb-'||lpad(g::text,12,'0'))::uuid,'${actor.authorId}','${actor.profileId}',case when g%3=0 then 'in_revisione' else 'pubblicato' end,now()-(g%730)*interval '1 day' from generate_series(1,6000) g;
      analyze public.utente; analyze public.annuncio; analyze public.profilo;`);
    const s = await h.summary(); assert.equal(s.users, 6000); assert.equal(s.announcements, 6000); assert.equal(s.pending, 2000);
    const sizes = {};
    for (const metric of metrics) { const c = await h.chart(metric); parseHomeChart(c, metric); sizes[metric] = Buffer.byteLength(JSON.stringify(c)); assert(sizes[metric] < 4096); }
    assert.equal((await h.chart("users")).distributionTotal, 6000);
    const plans = [];
    for (const sql of ["select count(*) from public.utente where tipologia_utente collate \"C\"='Utente' and registrato_il is not null", "select count(*),count(*) filter(where stato_annuncio collate \"C\"='in_revisione') from public.annuncio where eliminato_il is null", "select date_trunc('month',creato_il at time zone 'Europe/Rome'),count(*) from public.annuncio where eliminato_il is null and isfinite(creato_il) and creato_il >= ((date_trunc('month',statement_timestamp() at time zone 'Europe/Rome')-interval '11 months') at time zone 'Europe/Rome') and creato_il<=statement_timestamp() group by 1", "select p.tipologia_principale,count(*) from public.profilo p join public.utente u on u.utente_uuid=p.uuid_utente where p.nascosto is false and u.tipologia_utente collate \"C\"='Utente' and u.registrato_il is not null group by 1"]) {
      const plan = (await db.query("explain (analyze,buffers,format json) " + sql)).rows[0]["QUERY PLAN"][0];
      assert(plan.Plan["Actual Rows"] <= 12); plans.push({ node: plan.Plan["Node Type"], input: plan.Plan.Plans?.[0]?.["Node Type"], rows: plan.Plan["Actual Rows"], executionMs: plan["Execution Time"] });
    }
    t.diagnostic(JSON.stringify({ syntheticRecordsPerTable: 6000, bytesPerMetric: sizes, sampledPlans: plans }));
  });
});

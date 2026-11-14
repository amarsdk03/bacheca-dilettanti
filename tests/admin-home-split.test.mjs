import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {createHomeFixture} from "./helpers/admin-home-fixture.mjs";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
const load = adminServerLoader(), base = "apps/admin/src/features/home/";
const {parseHomeChart} = load(base + "response-validation.ts");
const {homePeriod} = load(base + "period.ts");
const {splitHomeRows} = load(base + "split-presentation.ts");
const migration = readFileSync(new URL("../supabase/migrations/20261114115027_admin_home_category_series.sql", import.meta.url), "utf8");
const usersMigration = readFileSync(new URL("../supabase/migrations/20261114135428_admin_home_user_profile_series.sql", import.meta.url), "utf8");

test("category aggregates match monthly/age totals and preserve authorization on local PostgreSQL", async t => {
  const h = await createHomeFixture(); t.after(() => h.db.close());
  await h.reset();
  // Old databases continue to render the total view.
  assert.equal(parseHomeChart(await h.chart("announcements"), "announcements").breakdown, undefined);
  await h.db.exec(migration);
  await h.withClock("2026-11-14T12:00:00.000000Z", async () => {
    await h.insert(1000, {createdAt: "2026-10-15T12:00:00Z", status: "pubblicato"});
    await h.insert(1001, {createdAt: "2026-11-13T12:00:00Z", type: "annuncio_squadra_cerca_staff"});
    await h.insert(1002, {createdAt: null, type: "new_type"});
    await h.insert(1003, {createdAt: "9999-01-01T00:00:00Z"});
    await h.insert(1004, {createdAt: "2026-03-15T12:00:00Z", status: "pubblicato"});
    for (const metric of ["announcements", "pending"]) {
      const raw = await h.chart(metric), chart = parseHomeChart(raw, metric);
      const totals = metric === "pending" ? chart.age : chart.series.map(r => ({key:r.month,count:r.count}));
      assert.equal(chart.breakdown.length, totals.length);
      chart.breakdown.forEach((b,i) => assert.equal(b.counts.reduce((n,c)=>n+c.count,0),totals[i].count));
      const bad = structuredClone(raw); bad.breakdown[0].counts = [{key: "other", count: 999}];
      assert.throws(() => parseHomeChart(bad, metric), /INVALID_HOME_RESPONSE/);
      const duplicate = structuredClone(raw); duplicate.breakdown[1].key = duplicate.breakdown[0].key;
      assert.throws(() => parseHomeChart(duplicate, metric), /INVALID_HOME_RESPONSE/);
    }
    const monthly = parseHomeChart(await h.chart("announcements"), "announcements");
    for (const aggregation of ["monthly", "quarterly", "yearly"]) {
      const period = homePeriod(monthly, {from:"2026-10",to:"2026-11"}, aggregation);
      const split = splitHomeRows(monthly, period.rows, aggregation, period.range);
      for (const row of split.rows) assert.equal(split.categories.reduce((n,c)=>n+row[`category_${c.key}`],0),row.count);
      assert.equal(split.rows.reduce((n,r)=>n+r.count,0),2);
    }
    const pending = parseHomeChart(await h.chart("pending"), "pending");
    assert.equal(pending.breakdown.find(r=>r.key==="unknown").counts.reduce((n,c)=>n+c.count,0),2);
    assert(pending.breakdown.flatMap(r=>r.counts).some(r=>r.key==="other"));
  });
  for (const role of ["anon", "service_role"]) await assert.rejects(h.chart("pending", undefined, role), /permission denied|ADMIN_ACCESS_DENIED/);
  await assert.rejects(h.chart("pending", {}), /ADMIN_ACCESS_DENIED/);
});

test("user series counts each current primary profile once, including hidden and missing profiles", async t => {
  const h = await createHomeFixture(); t.after(() => h.db.close()); await h.reset();
  await h.db.exec(migration); await h.db.exec(usersMigration);
  await h.withClock("2026-11-14T12:00:00.000000Z", async () => {
    const player = await h.user(5000, {registered: "2026-11-01T12:00:00Z"});
    const hidden = await h.user(5001, {registered: "2026-11-02T12:00:00Z"});
    await h.user(5002, {registered: "2026-11-03T12:00:00Z"});
    await h.profile(6000, player, {type:"giocatore"});
    await h.profile(6001, hidden, {type:"squadra",hidden:true});
    const raw = await h.chart("users"), chart = parseHomeChart(raw, "users"), bucket = chart.breakdown.at(-1);
    assert.equal(chart.population, 3); assert.equal(chart.series.at(-1).count, 3);
    assert.deepEqual(bucket.counts, [{key:"giocatore",count:1},{key:"squadra",count:1},{key:"unspecified",count:1}]);
    const period = homePeriod(chart, null, "monthly"), split = splitHomeRows(chart, period.rows, "monthly");
    assert.deepEqual(split.categories.map(c=>c.key), ["giocatore","squadra","unspecified"]);
    assert.equal(split.categories.reduce((n,c)=>n+split.rows.at(-1)[`category_${c.key}`],0),3);
    const invalid = structuredClone(raw); invalid.breakdown.at(-1).counts[0].count++;
    assert.throws(()=>parseHomeChart(invalid,"users"), /INVALID_HOME_RESPONSE/);
  });
  for (const role of ["anon", "service_role"]) await assert.rejects(h.chart("users", undefined, role), /permission denied|ADMIN_ACCESS_DENIED/);
});

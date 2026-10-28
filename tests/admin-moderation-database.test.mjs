import assert from "node:assert/strict";
import { test } from "node:test";
import { createModerationFixture } from "./helpers/admin-moderation-fixture.mjs";
import { listId as id, listActor as actor, listClaims, announcementTypes } from "./helpers/admin-announcements-fixture.mjs";

test("Admin moderation on synthetic PostgreSQL", async (t) => {
  const h = await createModerationFixture(); const { db } = h; t.after(() => db.close());
  await h.reset();
  const fresh = async (n = 1000, options = {}) => { await h.insert(n, options); await h.child(id(n), options.type ?? "annuncio_giocatore"); return h.detail(id(n)); };
  const base = async (n) => (await db.query("select * from public.annuncio where uuid=$1", [id(n)])).rows[0];
  const audit = async () => (await db.query("select * from private.admin_audit_event_v1 order by occurred_at,event_uuid")).rows;
  await t.test("private raw helpers are inaccessible; wrapper is invoker and human-only", async () => {
    const p = (await db.query("select prosecdef,proconfig from pg_proc where oid='public.admin_moderate_announcement_v1(uuid,text,text,text)'::regprocedure")).rows[0];
    assert.equal(p.prosecdef, false); assert(p.proconfig.includes('search_path=""'));
    for (const role of ["anon", "authenticated", "service_role"]) for (const helper of ["private.project_admin_announcement_v1(jsonb)", "private.admin_moderation_capabilities_v1(jsonb,jsonb)", "private.admin_review_issues_v1(jsonb)", "private.lock_announcement_child_parent_v1()", "private.guard_admin_announcement_visibility_v1()"])
      assert.equal((await db.query("select has_function_privilege($1,$2,'execute') as ok", [role,helper])).rows[0].ok, false, role+" "+helper);
    for (const role of ["anon", "service_role"]) await assert.rejects(h.moderate(id(9999), "hide", "content-v1:"+"a".repeat(64), "Motivo", listClaims(), role), /permission denied/);
  });
  await t.test("approves only current review, stamps operator and writes one atomic audit", async () => {
    const d = await fresh(); assert.equal(d.moderation.capabilities.approve.allowed, true);
    const r = await h.moderate(id(1000), "approve", d.contentFingerprint); assert.equal(r.status, "ok");
    const b = await base(1000); assert.equal(b.stato_annuncio, "pubblicato"); assert.equal(b.ultima_modifica_da, actor.userId);
    assert.equal(b.nascosto, false); assert.equal(b.privato, false); assert(b.ultima_modifica_il);
    const events = await audit(); assert.equal(events.length, 1); assert.equal(events[0].action, "announcement.approve");
    assert.equal(events[0].actor_utente_uuid, actor.userId); assert.equal(events[0].event_uuid, r.eventId);
    assert.equal((await h.moderate(id(1000), "approve", d.contentFingerprint)).status, "conflict"); assert.equal((await audit()).length, 1);
  });
  await t.test("hide/show preserves status/privacy and reason is author-visible", async () => {
    const d = await fresh(1001, { private: true });
    assert.equal((await h.moderate(id(1001), "hide", d.contentFingerprint, " Dati da correggere ")).status, "ok");
    let b = await base(1001); assert(b.nascosto); assert(b.oscurato_da_admin); assert(b.info_stato_annuncio.includes("Dati da correggere")); assert(b.privato);
    const hidden = await h.detail(id(1001)); assert.equal(hidden.moderation.adminHidden, true);
    assert.equal((await h.moderate(id(1001), "show", hidden.contentFingerprint)).status, "ok");
    b = await base(1001); assert(!b.nascosto); assert(!b.oscurato_da_admin); assert(b.privato); assert.equal(b.stato_annuncio, "in_revisione");
  });
  await t.test("required reason, unsupported action and extra reason never mutate", async () => {
    const d = await fresh(1002);
    for (const [op, reason] of [["reject", null], ["hide", "  \n\t"], ["hide", "x".repeat(1001)], ["approve", "secret"], ["trash", null]])
      assert.equal((await h.moderate(id(1002), op, d.contentFingerprint, reason)).status, "invalid");
    assert.equal((await base(1002)).stato_annuncio, "in_revisione");
  });
  for (const status of ["pubblicato", "rifiutato", "in_attesa_pagamento", null]) await t.test(`approval/rejection cannot transition ${status}`, async () => {
    const n = status === null ? 1013 : 1010 + ["pubblicato", "rifiutato", "in_attesa_pagamento"].indexOf(status);
    const d = await fresh(n, { status });
    for (const op of ["approve", "reject"]) assert.equal((await h.moderate(id(n), op, d.contentFingerprint, op === "reject" ? "Motivo" : null)).status, "not_allowed");
  });
  for (const type of announcementTypes) await t.test(`supported review ${type}`, async () => {
    const n = 1100 + announcementTypes.indexOf(type); const d = await fresh(n, { type });
    if (type === "annuncio_servizi_consulenze") {
      assert.equal(d.moderation.capabilities.approve.reason, "REGIONS_REQUIRED");
      await db.query("insert into public.localita_annuncio(uuid_annuncio,regione) values($1,'Lazio')", [id(n)]);
    }
    assert.equal((await h.detail(id(n))).moderation.capabilities.approve.allowed, true);
  });
  await t.test("missing/unsupported content allows only reducing exposure", async () => {
    await h.insert(1200); let d = await h.detail(id(1200)); assert(!d.complete); assert(!d.moderation.capabilities.approve.allowed);
    assert.equal((await h.moderate(id(1200), "hide", d.contentFingerprint, "Dati mancanti")).status, "ok");
    d = await h.detail(id(1200)); assert(!d.moderation.capabilities.show.allowed);
    assert.equal((await h.moderate(id(1200), "show", d.contentFingerprint)).status, "not_allowed");
    assert.equal((await h.moderate(id(1200), "reject", d.contentFingerprint, "Dati mancanti")).status, "ok");
    await h.insert(1201, { type: "legacy" }); d = await h.detail(id(1201));
    assert.equal((await h.moderate(id(1201), "reject", d.contentFingerprint, "Non supportato")).status, "ok");
  });
  await t.test("child edits invalidate fingerprint, including relation insert/update/delete", async () => {
    let d = await fresh(1202);
    await db.query("insert into public.link_social_annuncio(uuid_annuncio,sublink) values($1,'https://example.test')", [id(1202)]);
    assert.equal((await h.moderate(id(1202), "approve", d.contentFingerprint)).status, "conflict");
    d = await h.detail(id(1202)); await db.query("update public.annuncio_giocatore set descrizione_aggiuntiva='changed' where uuid_annuncio=$1", [id(1202)]);
    assert.equal((await h.moderate(id(1202), "approve", d.contentFingerprint)).status, "conflict");
    d = await h.detail(id(1202)); await db.query("delete from public.link_social_annuncio where uuid_annuncio=$1", [id(1202)]);
    assert.equal((await h.moderate(id(1202), "approve", d.contentFingerprint)).status, "conflict");
  });
  await t.test("bad contact, unsafe URL and bad schedule prevent exposure in SQL", async () => {
    let d = await fresh(1203);
    await db.query("insert into public.contatto_annuncio(uuid_annuncio,tipo,valore) values($1,'email','bad')", [id(1203)]);
    d = await h.detail(id(1203)); assert(d.issues.includes("INVALID_CONTACT")); assert(!d.moderation.capabilities.approve.allowed);
    await db.query("delete from public.contatto_annuncio where uuid_annuncio=$1", [id(1203)]);
    await db.query("insert into public.media_annuncio(uuid_annuncio,link_media) values($1,'javascript:alert(1)')", [id(1203)]);
    d = await h.detail(id(1203)); assert(!d.moderation.capabilities.approve.allowed);
    await fresh(1204, { type: "annuncio_campo_impianto" });
    await db.query("update public.annuncio_campo_impianto set orari=$2::jsonb where uuid_annuncio=$1", [id(1204), JSON.stringify([{ giorno: "bad", attivo: true, dalle: "26:00", alle: "18:00" }])]);
    d = await h.detail(id(1204)); assert(!d.complete); assert(!d.moderation.capabilities.approve.allowed);
  });
  await t.test("URL SQL review gate accepts common web links and rejects unsafe authorities", async () => {
    for (const [value, expected] of [["https://example.test/path?q=x#ok", true], ["http://127.0.0.1:3000", true], ["https://[::1]/", true],
      ["https://user:password@example.test", false], ["javascript:alert(1)", false], ["https://example.test:99999/", false], ["https://999.999.999.999/", false], ["https://[::1/128]/", false], ["https://example.test\n", false]])
      assert.equal((await db.query("select private.admin_review_url_valid_v1($1) as ok", [value])).rows[0].ok, expected, value);
  });
  await t.test("Unicode and numeric bounds agree with JS without making malformed content approvable", async () => {
    assert.equal((await db.query("select private.admin_utf16_length_v1('a😀') as n")).rows[0].n, 3);
    await fresh(12040, { type: "annuncio_squadra_cerca_staff" });
    await db.query("update public.annuncio_squadra_cerca_staff set requisiti=$2,compenso_mensile=1e400::numeric where uuid_annuncio=$1", [id(12040), "😀".repeat(3000)]);
    const d = await h.detail(id(12040)); assert(!d.complete); assert(!d.moderation.capabilities.approve.allowed);
    assert.equal(d.content.fields.compenso_mensile, null); assert.equal(d.content.fields.requisiti, null);
    assert.equal((await h.moderate(id(12040), "reject", d.contentFingerprint, "Dati da correggere")).status, "ok");
  });
  await t.test("Admin role/session revocation is checked again at mutation", async () => {
    const d = await fresh(1205); await db.query("delete from auth.sessions where id=$1", [actor.sessionId]);
    await assert.rejects(h.moderate(id(1205), "approve", d.contentFingerprint), /ADMIN_ACCESS_DENIED/);
    await db.query("insert into auth.sessions(id,user_id) values($1,$2)", [actor.sessionId, actor.authId]);
    await db.query("update public.utente set tipologia_utente='admin' where utente_uuid=$1", [actor.userId]);
    await assert.rejects(h.moderate(id(1205), "approve", d.contentFingerprint), /ADMIN_ACCESS_DENIED/);
    await db.query("update public.utente set tipologia_utente='Admin' where utente_uuid=$1", [actor.userId]);
  });
  await t.test("owner/technical writers cannot clear hold or unhide it", async () => {
    let d = await fresh(1206); await h.moderate(id(1206), "hide", d.contentFingerprint, "Verifica amministrativa");
    await db.exec("grant update(nascosto,oscurato_da_admin) on public.annuncio to service_role");
    await assert.rejects(h.callAs("service_role", { role: "service_role" }, "update public.annuncio set nascosto=false where uuid=$1", [id(1206)]), /ADMIN_ANNOUNCEMENT_HIDDEN/);
    await assert.rejects(h.callAs("service_role", { role: "service_role" }, "update public.annuncio set oscurato_da_admin=false where uuid=$1", [id(1206)]), /ADMIN_VISIBILITY_HOLD_PROTECTED/);
    await assert.rejects(h.moderate(id(1206), "show", (await h.detail(id(1206))).contentFingerprint, null, listClaims(), "service_role"), /permission denied/);
  });
  await t.test("audit failure rolls back mutation and priority side effects", async () => {
    const d = await fresh(1207);
    await db.exec("create function private.test_fail_audit() returns trigger language plpgsql as $$begin raise exception 'synthetic audit failure'; end$$; create trigger test_fail_audit before insert on private.admin_audit_event_v1 for each row execute function private.test_fail_audit()");
    assert.equal((await h.moderate(id(1207), "approve", d.contentFingerprint)).status, "unavailable");
    assert.equal((await base(1207)).stato_annuncio, "in_revisione");
    await db.exec("drop trigger test_fail_audit on private.admin_audit_event_v1; drop function private.test_fail_audit()");
  });
  await t.test("existing status notification includes public reason; hiding adds no status notification", async () => {
    await db.query("update public.utente set registrato_il=now() where utente_uuid=$1", [actor.authorId]);
    let d = await fresh(1208);
    await db.exec("truncate private.notifiche");
    assert.equal((await h.moderate(id(1208), "reject", d.contentFingerprint, "Motivo visibile all’autore")).status, "ok");
    let rows = (await db.query("select * from private.notifiche")).rows; assert.equal(rows.length, 1);
    assert.equal(rows[0].tipo, "stato_annuncio"); assert(rows[0].dati.info.includes("Motivo visibile all’autore"));
    d = await fresh(1209); await db.exec("truncate private.notifiche");
    assert.equal((await h.moderate(id(1209), "hide", d.contentFingerprint, "Verifica")).status, "ok");
    rows = (await db.query("select * from private.notifiche")).rows; assert.equal(rows.length, 0);
  });
  await t.test("failed audit rolls back priority and existing notifications too", async () => {
    await fresh(1213); await db.query("update public.annuncio set livello_annuncio='prioritario' where uuid=$1", [id(1213)]);
    await db.query("insert into private.announcement_submission(submission_id,announcement_id,requested_visibility,paid_at,stripe_amount_total) values($1,$2,'prioritario',now(),799)", [id(2213), id(1213)]);
    const d = await h.detail(id(1213)); await db.exec("truncate private.notifiche");
    await db.exec("create function private.test_fail_audit() returns trigger language plpgsql as $$begin raise exception 'synthetic audit failure'; end$$; create trigger test_fail_audit before insert on private.admin_audit_event_v1 for each row execute function private.test_fail_audit()");
    assert.equal((await h.moderate(id(1213), "approve", d.contentFingerprint)).status, "unavailable");
    assert.equal((await base(1213)).priorita_inizio_il, null); assert.equal((await db.query("select count(*)::integer as n from private.notifiche")).rows[0].n, 0);
    await db.exec("drop trigger test_fail_audit on private.admin_audit_event_v1; drop function private.test_fail_audit()");
  });
  await t.test("payment completion preserves a hold and still records paid receipt", async () => {
    let d = await fresh(1214, { status: "in_attesa_pagamento", hidden: false, private: true });
    await db.query("update public.annuncio set livello_annuncio='prioritario' where uuid=$1", [id(1214)]);
    await db.query("insert into private.announcement_submission(submission_id,announcement_id,utente_id,requested_visibility) values($1,$2,$3,'prioritario')", [id(2214), id(1214), actor.authorId]);
    d = await h.detail(id(1214)); assert.equal((await h.moderate(id(1214), "hide", d.contentFingerprint, "Verifica pagamento")).status, "ok");
    const payment = await db.query("select public.record_priority_checkout_event_v1($1,$2,'cs_test','price_test',799,799,'complete','paid','pi_test',true) as result", [id(1214),id(2214)]);
    assert.equal(payment.rows[0].result.status, "success"); const b = await base(1214); assert(b.oscurato_da_admin); assert(b.nascosto); assert.equal(b.stato_annuncio, "in_revisione"); assert(b.info_stato_annuncio.includes("Verifica pagamento"));
    assert((await db.query("select paid_at from private.announcement_submission where announcement_id=$1", [id(1214)])).rows[0].paid_at);
  });
  await t.test("priority starts seven days on approval; reject requests existing refund workflow", async () => {
    for (const n of [1210, 1211, 1212]) {
      await fresh(n); await db.query("update public.annuncio set livello_annuncio='prioritario' where uuid=$1", [id(n)]);
      await db.query("insert into private.announcement_submission(submission_id,announcement_id,requested_visibility,paid_at,stripe_amount_total) values($1,$2,'prioritario',$3,799)", [id(n+1000),id(n),n===1212?null:new Date().toISOString()]);
    }
    let d = await h.detail(id(1210)); assert.equal((await h.moderate(id(1210), "approve", d.contentFingerprint)).status, "ok");
    const b = await base(1210); assert(b.priorita_attiva); assert.equal(new Date(b.priorita_fine_il)-new Date(b.priorita_inizio_il), 7*86400000);
    d = await h.detail(id(1211)); assert.equal((await h.moderate(id(1211), "reject", d.contentFingerprint, "Contenuto non approvato")).status, "ok");
    assert((await db.query("select refund_required_at from private.announcement_submission where announcement_id=$1", [id(1211)])).rows[0].refund_required_at);
    d = await h.detail(id(1212)); assert.equal((await h.moderate(id(1212), "approve", d.contentFingerprint)).status, "not_allowed");
    assert.equal(d.moderation.capabilities.approve.reason, "PAYMENT_REQUIRED");
    assert.equal((await base(1212)).stato_annuncio, "in_revisione");
  });
  await t.test("child guard covers every relation and cascade deletes remain valid", async () => {
    const triggers = (await db.query("select tgrelid::regclass::text as name from pg_trigger where tgname='admin_lock_parent_v1'")).rows;
    assert.equal(triggers.length, 15);
    await db.query("delete from public.annuncio where uuid=$1", [id(1202)]);
    assert.equal((await h.moderate(id(1202), "hide", "content-v1:"+"a".repeat(64), "Assente")).status, "not_found");
  });
});

import assert from "node:assert/strict";
import {test} from "node:test";
import {createPeopleFixture} from "./helpers/admin-people-fixture.mjs";
import {listActor as actor, listId as id, listClaims} from "./helpers/admin-announcements-fixture.mjs";
import {readFileSync} from "node:fs";

test("domain exclusions are enforced before pagination and preserve users without email", async () => {
  const h = await createPeopleFixture();
  try {
    await h.reset();
    await h.db.exec(readFileSync(new URL("../supabase/migrations/20261116194901_admin_users_excluded_domains.sql", import.meta.url), "utf8"));
    await h.db.query("update auth.users set email='AUTHOR@GMAIL.COM' where id=(select auth_user_uuid from public.utente where utente_uuid=$1)", [actor.authorId]);
    assert.ok(!(await h.call("admin_list_users_v1", [{excludedDomains: "gmail.com"}])).items.some(u => u.id === actor.authorId));
    assert.ok((await h.call("admin_list_users_v1", [{excludedDomains: "other.com"}])).items.some(u => u.id === actor.authorId));
    assert.equal((await h.call("admin_get_user_v1", [actor.authorId])).id, actor.authorId);
    await h.db.query("update auth.users set email='user@mail.gmail.com' where id=(select auth_user_uuid from public.utente where utente_uuid=$1)", [actor.authorId]);
    assert.ok((await h.call("admin_list_users_v1", [{excludedDomains: "gmail.com"}])).items.some(u => u.id === actor.authorId));
    await h.db.query("update auth.users set email=null where id=(select auth_user_uuid from public.utente where utente_uuid=$1)", [actor.authorId]);
    await h.db.query("update public.utente set indirizzo_email=null where utente_uuid=$1", [actor.authorId]);
    assert.ok((await h.call("admin_list_users_v1", [{excludedDomains: "gmail.com"}])).items.some(u => u.id === actor.authorId));
    await assert.rejects(h.call("admin_list_users_v1", [{excludedDomains: "bad domain"}]));
    await assert.rejects(h.call("admin_list_users_v1", [{excludedDomains: Array(51).fill("a.it").join(",")} ]));
    await assert.rejects(h.callAs("anon", listClaims(), "select public.admin_list_users_v1('{}')"));
    for (let n = 2000; n < 2064; n++) {
      await h.db.query("insert into public.utente(utente_uuid,tipologia_utente,indirizzo_email,creato_il) values($1,'Utente',$2,now()+($3::text || ' seconds')::interval)", [id(n), n % 2 ? `x${n}@gmail.com` : `x${n}@other.test`, n]);
    }
    const first = await h.call("admin_list_users_v1", [{excludedDomains: "gmail.com"}]);
    const second = await h.call("admin_list_users_v1", [{excludedDomains: "gmail.com", offset: 30}]);
    assert.equal(first.items.length, 30); assert.equal(first.hasMore, true);
    assert.ok(second.items.length > 0);
    assert.ok([...first.items, ...second.items].every(u => !u.email?.toLowerCase().endsWith("@gmail.com")));
    assert.equal(new Set([...first.items, ...second.items].map(u => u.id)).size, first.items.length + second.items.length);
  } finally {await h.db.close();}
});

test("profile ranking counts public publications and exact-type followers before pagination", async () => {
  const h = await createPeopleFixture();
  try {
    await h.reset();
    const reportId = await h.report(301);
    await h.db.query("update private.segnalazioni set stato='resolved' where admin_uuid=$1", [reportId]);
    await h.report(301);
    assert.equal((await h.call("admin_list_reports_v1", [{}])).items.length, 2);
    assert.equal((await h.call("admin_list_reports_v1", [{status: "active"}])).items.length, 1);
    await h.db.query("update public.profilo set creato_il='2026-01-01' where uuid=$1", [actor.profileId]);
    await h.db.query("insert into public.profilo(uuid,creato_il) values($1,'2026-11-01')", [id(901)]);
    await h.db.query("insert into public.profilo_giocatore(uuid_profilo,nome) values($1,'Nuovo')", [id(901)]);
    for (const n of [310, 311, 312]) await h.insert(n, {status: "pubblicato"});
    await h.db.query("update public.annuncio set gruppo_pubblicazione=$1 where uuid in ($2,$3)", [id(800), id(310), id(311)]);
    await h.insert(313, {status: "pubblicato", private: true});
    await h.insert(314, {status: "pubblicato", hidden: true});
    await h.insert(315, {status: "rifiutato"});
    await h.insert(316, {status: "pubblicato", type: "annuncio_squadra_cerca_staff"});
    await h.db.query("insert into public.profilo_follow(uuid_profilo_follower,uuid_profilo_seguito,sottoprofilo_seguito,sottoprofilo_follower) values($1,$2,'squadra','giocatore')", [id(901), actor.profileId]);
    let player = await h.call("admin_get_profile_v1", [actor.profileId, "giocatore"]);
    const team = await h.call("admin_get_profile_v1", [actor.profileId, "squadra"]);
    assert.equal(player.publicAnnouncementCount, 2); assert.equal(player.followerCount, 0);
    assert.equal(team.publicAnnouncementCount, 1); assert.equal(team.followerCount, 1);
    assert.equal((await h.call("admin_list_profiles_v1", [{sort: "announcements"}])).items[0].type, "giocatore");
    assert.equal((await h.call("admin_list_profiles_v1", [{sort: "followers"}])).items[0].type, "squadra");
    assert.equal((await h.call("admin_list_profiles_v1", [{sort: "newest", type: "giocatore"}])).items[0].profileId, id(901));
    assert.equal((await h.call("admin_list_profiles_v1", [{sort: "oldest", type: "giocatore"}])).items[0].profileId, actor.profileId);
    await h.call("admin_moderate_profile_v1", [actor.profileId, "giocatore", "hide", player.version, "Controllo"]);
    player = await h.call("admin_get_profile_v1", [actor.profileId, "giocatore"]);
    assert.equal(player.publicAnnouncementCount, 0);
    await assert.rejects(h.call("admin_list_profiles_v1", [{sort: "invalid"}]));
    await assert.rejects(h.callAs("authenticated", listClaims(), "select private.admin_profile_metrics_v1($1,'giocatore')", [actor.profileId]));
    for (let n = 920; n < 952; n++) {
      await h.db.query("insert into public.profilo(uuid) values($1)", [id(n)]);
      await h.db.query("insert into public.profilo_giocatore(uuid_profilo) values($1)", [id(n)]);
    }
    const first = await h.call("admin_list_profiles_v1", [{sort: "followers"}]);
    const second = await h.call("admin_list_profiles_v1", [{sort: "followers", offset: 30}]);
    assert.equal(first.hasMore, true); assert.equal(new Set([...first.items, ...second.items].map(p => p.id)).size, first.items.length + second.items.length);
  } finally {await h.db.close();}
});

test("profile migration follows creation/WhatsApp wrappers and preserves enrichment and visibility filters", async () => {
  const h = await createPeopleFixture({wrappedList: true});
  try {
    await h.reset();
    const profile = await h.call('admin_get_profile_v1', [actor.profileId, 'giocatore']);
    await h.call('admin_moderate_profile_v1', [actor.profileId, 'giocatore', 'hide', profile.version, 'Controllo']);
    const page = await h.list();
    assert.equal(page.items[0].hidden, true);
    assert.equal(page.items[0].fromWhatsApp, true);
    assert.equal(page.items[0].whatsappStatus, 'imported');
    assert.equal((await h.list({visibility: 'shown'})).items.length, 0);
    assert.equal((await h.list({visibility: 'hidden'})).items.length, 1);
  } finally {await h.db.close();}
});

test("legacy badge reset flushes deferred profile activity before altering the profile table", async () => {
  const h = await createPeopleFixture({apply: false});
  try {
    await h.reset();
    await h.db.query("update public.profilo set verificato_il=now() where uuid=$1", [actor.profileId]);
    // Same timing/table as the installed profile_activity_change constraint
    // trigger; the counter proves it runs rather than being disabled or dropped.
    await h.db.exec(`create table private.fixture_profile_activity_runs(n integer);
      insert into private.fixture_profile_activity_runs values(0);
      create function private.fixture_deferred_profile_activity() returns trigger language plpgsql as $$
        begin update private.fixture_profile_activity_runs set n=n+1; return new; end $$;
      create constraint trigger profile_activity_change after update on public.profilo
        deferrable initially deferred for each row execute function private.fixture_deferred_profile_activity();`);
    await h.migrate();
    assert.equal((await h.db.query("select verificato_il from public.profilo where uuid=$1", [actor.profileId])).rows[0].verificato_il, null);
    assert.equal((await h.db.query("select n from private.fixture_profile_activity_runs")).rows[0].n, 1);
    assert.equal((await h.db.query("select tgdeferrable,tginitdeferred from pg_trigger where tgname='profile_activity_change'")).rows[0].tginitdeferred, true);
  } finally {await h.db.close();}
});

test("people migration resets legacy badges; new special profiles verify only their own type", async () => {
  const h = await createPeopleFixture({apply: false});
  try {
    await h.reset();
    await h.db.query("update public.profilo set verificato_il=now() where uuid=$1", [actor.profileId]);
    await h.migrate();
    assert.equal((await h.call("admin_list_profiles_v1", [{}])).items.length, 8);
    assert.equal((await h.call("admin_list_profiles_v1", [{verification: "verified"}])).items.length, 0);
    await h.db.query("delete from public.profilo_creator where uuid_profilo=$1", [actor.profileId]);
    await h.db.query("insert into public.profilo_creator(uuid_profilo,nome_creator) values($1,'Nuovo contenuto')", [actor.profileId]);
    assert.equal((await h.call("admin_get_profile_v1", [actor.profileId, "creators"])).verifiedAt, null); // legacy/revoked identity is never re-verified by recreation
    await h.db.query("insert into public.profilo(uuid) values($1)", [id(900)]);
    await h.db.query("insert into public.profilo_creator(uuid_profilo) values($1)", [id(900)]);
    assert.ok((await h.call("admin_get_profile_v1", [id(900), "creators"])).verifiedAt);
    await h.db.query("delete from public.profilo_creator where uuid_profilo=$1", [id(900)]);
    await h.db.query("insert into public.profilo_creator(uuid_profilo) values($1)", [id(900)]);
    let special = await h.call("admin_get_profile_v1", [id(900), "creators"]);
    assert.ok(special.verifiedAt); // Ordinary recreation retains the special automatic policy.
    await h.call("admin_moderate_profile_v1", [id(900), "creators", "unverify", special.version, "Verifica revocata"]);
    await h.db.query("delete from public.profilo_creator where uuid_profilo=$1", [id(900)]);
    await h.db.query("insert into public.profilo_creator(uuid_profilo) values($1)", [id(900)]);
    special = await h.call("admin_get_profile_v1", [id(900), "creators"]);
    assert.equal(special.verifiedAt, null); // A revocation cannot be bypassed by recreation.
    await h.db.query("insert into public.profilo_giocatore(uuid_profilo) values($1)", [id(900)]);
    assert.equal((await h.call("admin_get_profile_v1", [id(900), "giocatore"])).verifiedAt, null);
  } finally {await h.db.close();}
});
test("user/profile reads filter ordinary incomplete users and project bounded private details", async () => {
  const h = await createPeopleFixture();
  try {
    await h.reset();
    const users = await h.call("admin_list_users_v1", [{}]);
    assert.equal(users.items.length, 2); assert.ok(!users.items.some(u => u.id === actor.userId));
    await h.db.query("update public.utente set registrato_il=null,num_telefono='+39123456789' where utente_uuid=$1", [id(103)]);
    assert.equal((await h.call("admin_list_users_v1", [{registration: "incomplete"}])).items.length, 1);
    assert.equal((await h.call("admin_list_users_v1", [{search: "123456789"}])).items[0].id, id(103));
    const detail = await h.call("admin_get_user_v1", [actor.authorId]);
    assert.equal(detail.profiles.length, 8); assert.equal(detail.profileCount, 8); assert.ok(detail.authId);
    assert.equal(users.items[0].authId, undefined);
    assert.equal(await h.call("admin_get_user_v1", [actor.userId]), null);
    const profiles = await h.call("admin_list_profiles_v1", [{user: actor.authorId, type: "squadra"}]);
    assert.equal(profiles.items.length, 1); assert.equal(profiles.items[0].type, "squadra");
    assert.equal((await h.call("admin_list_profiles_v1", [{search: "Pubblico"}])).items.length, 7);
    await assert.rejects(h.call("admin_list_users_v1", [{offset: 1}]));
    await assert.rejects(h.call("admin_list_profiles_v1", [{type: "inventato"}]));
    for (const [role, claims] of [["anon", {}], ["authenticated", listClaims({sub: id(2), session_id: id(502)})], ["service_role", listClaims()]]) await assert.rejects(h.call("admin_list_users_v1", [{}], claims, role));
  } finally {await h.db.close();}
});
test("profile moderation is isolated, atomic, audited and propagates to every linked announcement", async () => {
  const h = await createPeopleFixture();
  try {
    await h.reset(); await h.insert(302, {type: "annuncio_squadra_cerca_staff", status: "pubblicato"}); await h.insert(303, {status: "pubblicato", private: true});
    let profile = await h.call("admin_get_profile_v1", [actor.profileId, "giocatore"]);
    const verified = await h.call("admin_moderate_profile_v1", [actor.profileId, "giocatore", "verify", profile.version, null]);
    assert.equal(verified.status, "ok");
    assert.equal((await h.auditDetail(verified.eventId)).changes.verified.after, true);
    assert.equal((await h.call("admin_get_profile_v1", [actor.profileId, "squadra"])).verifiedAt, null);
    profile = await h.call("admin_get_profile_v1", [actor.profileId, "giocatore"]);
    const result = await h.call("admin_moderate_profile_v1", [actor.profileId, "giocatore", "hide", profile.version, "Verifica necessaria"]);
    assert.equal(result.status, "ok");
    const rows = (await h.db.query("select uuid,profile_admin_hidden,nascosto,privato,stato_annuncio from public.annuncio order by uuid")).rows;
    assert.equal(rows.find(r => r.uuid === id(302)).profile_admin_hidden, false);
    assert.equal(rows.find(r => r.uuid === id(303)).profile_admin_hidden, true);
    assert.equal(rows.find(r => r.uuid === id(303)).privato, true); assert.equal(rows.find(r => r.uuid === id(303)).nascosto, false);
    await h.insert(304, {status: "pubblicato"});
    assert.equal((await h.db.query("select profile_admin_hidden from public.annuncio where uuid=$1", [id(304)])).rows[0].profile_admin_hidden, true);
    assert.equal((await h.call("admin_moderate_profile_v1", [actor.profileId, "giocatore", "show", profile.version, null])).status, "conflict");
    profile = await h.call("admin_get_profile_v1", [actor.profileId, "giocatore"]);
    assert.equal((await h.call("admin_moderate_profile_v1", [actor.profileId, "giocatore", "show", profile.version, null])).status, "ok");
    assert.equal((await h.db.query("select profile_admin_hidden,privato from public.annuncio where uuid=$1", [id(303)])).rows[0].privato, true);
    const event = (await h.db.query("select * from private.admin_audit_event_v1 where event_uuid=$1", [result.eventId])).rows[0];
    assert.equal(event.action, "profile.hide"); assert.equal(event.details.profile_type, "giocatore");
    assert.equal((await h.auditDetail(result.eventId)).profileType, "giocatore");
    assert.equal((await h.auditList({action: "profile.hide"})).items.length, 1);
    await h.db.exec("create function private.fail_people_audit() returns trigger language plpgsql as $$ begin raise exception 'AUDIT_DOWN'; end $$; create trigger fail_people_audit before insert on private.admin_audit_event_v1 for each row execute function private.fail_people_audit()");
    profile = await h.call("admin_get_profile_v1", [actor.profileId, "giocatore"]);
    await assert.rejects(h.call("admin_moderate_profile_v1", [actor.profileId, "giocatore", "hide", profile.version, "Motivo"]));
    assert.equal((await h.call("admin_get_profile_v1", [actor.profileId, "giocatore"])).adminHidden, false);
    assert.equal((await h.db.query("select profile_admin_hidden from public.annuncio where uuid=$1", [id(304)])).rows[0].profile_admin_hidden, false);
  } finally {await h.db.close();}
});

test("Admin holds survive child recreation and cannot be cleared by writers or unrelated moderation", async () => {
  const h = await createPeopleFixture();
  try {
    await h.reset();
    const profile = await h.call("admin_get_profile_v1", [actor.profileId, "giocatore"]);
    await h.call("admin_moderate_profile_v1", [actor.profileId, "giocatore", "hide", profile.version, "Controllo"]);
    await h.db.query("delete from public.profilo_giocatore where uuid_profilo=$1", [actor.profileId]);
    await h.db.query("insert into public.profilo_giocatore(uuid_profilo,nome) values($1,'Ricreato')", [actor.profileId]);
    assert.equal((await h.call("admin_get_profile_v1", [actor.profileId, "giocatore"])).adminHidden, true);
    await h.db.query("update public.annuncio set profile_admin_hidden=false where uuid=$1", [id(301)]);
    assert.equal((await h.db.query("select profile_admin_hidden from public.annuncio where uuid=$1", [id(301)])).rows[0].profile_admin_hidden, true);
    const ad = await h.call("admin_get_announcement_v1", [id(301)]);
    assert.equal(ad.summary.hidden, true); assert.equal(ad.moderation.profileHidden, true);
    assert.equal(ad.moderation.capabilities.approve.allowed, false); assert.equal(ad.moderation.capabilities.show.reason, "PROFILE_HIDDEN");
    const list = await h.list(); assert.equal(list.items.find(r => r.id === id(301)).hidden, true);
    await assert.rejects(h.callAs("authenticated", listClaims(), "update public.profile_type_state set admin_hidden=false"));
    await assert.rejects(h.callAs("service_role", {}, "update public.profile_type_state set verified_at=now()"));
    await assert.rejects(h.db.query("update public.profilo set verificato_il=now() where uuid=$1", [actor.profileId]));
    const definition = (await h.db.query("select pg_get_functiondef('public.submit_manifestazione_interesse_v1(uuid,text,text,uuid,text,text,text,boolean,boolean,text)'::regprocedure) d")).rows[0].d;
    assert.match(definition, /profile_admin_hidden is false/);
  } finally {await h.db.close();}
});

test("directory pagination and Rome dates are bounded; public policies preserve owner access", async () => {
  const h = await createPeopleFixture();
  try {
    await h.reset();
    for (let n = 700; n < 735; n++) await h.db.query("insert into public.utente(utente_uuid,indirizzo_email,creato_il) values($1,$2,'2026-11-14T23:30:00Z')", [id(n), `pagination-${n}@example.test`]);
    const first = await h.call("admin_list_users_v1", [{search: "pagination-", from: "2026-11-15", to: "2026-11-15"}]);
    const second = await h.call("admin_list_users_v1", [{search: "pagination-", offset: 30}]);
    assert.equal(first.items.length, 30); assert.equal(first.hasMore, true); assert.equal(second.items.length, 5);
    assert.equal(new Set([...first.items, ...second.items].map(r => r.id)).size, 35);
    assert.equal((await h.call("admin_list_users_v1", [{search: "pagination-", to: "2026-11-14"}])).items.length, 0);
    await h.db.exec("grant select on public.annuncio,public.profilo_giocatore to anon,authenticated; grant select on public.profilo,public.utente to authenticated; revoke all on public.profilo,public.utente from anon; create policy fixture_public_ad on public.annuncio for select to anon,authenticated using(true); create policy fixture_public_child on public.profilo_giocatore for select to anon,authenticated using(true); create policy fixture_owner_base on public.profilo for select to authenticated using(true)");
    const profile = await h.call("admin_get_profile_v1", [actor.profileId, "giocatore"]);
    await h.call("admin_moderate_profile_v1", [actor.profileId, "giocatore", "hide", profile.version, "Controllo"]);
    assert.equal((await h.callAs("anon", {}, "select uuid from public.annuncio")).rows.length, 0);
    assert.equal((await h.callAs("anon", {}, "select id from public.profilo_giocatore")).rows.length, 0);
    assert.equal((await h.callAs("authenticated", listClaims({sub: id(2), session_id: id(502)}), "select uuid from public.annuncio")).rows.length, 1);
  } finally {await h.db.close();}
});

import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";
const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const types = ["giocatore", "squadra", "staff-sportivo", "arbitro", "torneo-evento", "campi-impianti-sportivi", "servizi-consulenze", "creators"];
const tables = ["giocatore", "squadra", "staff_sportivo", "arbitro", "torneo_evento", "campi_impianti", "servizi_consulenze", "creator"];
const announcementTables = ["giocatore", "squadra_cerca_giocatore", "squadra_cerca_staff", "squadra_cerca_partita", "squadra_cerca_sponsor", "staff_sportivo", "arbitro", "torneo_evento", "campo_impianto", "servizi_consulenze", "creator"];
const migration = name => readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8");

test("subprofile follows and significant activity: migration, quota, notifications, privacy", {skip: !existsSync(engineUrl)}, async t => {
  const {PGlite} = await import(engineUrl.href);
  const db = await PGlite.create();
  t.after(() => db.close());
  await db.exec(`
    set timezone='UTC';
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema private; create schema auth; grant usage on schema private to service_role;
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create table public.utente(utente_uuid uuid primary key, auth_user_uuid uuid, registrato_il timestamptz default now());
    create table public.profilo(uuid uuid primary key, uuid_utente uuid unique references public.utente, nascosto boolean default false,
      tipologia_principale text default 'giocatore', link_foto_profilo text, ultima_modifica_il timestamptz default '2020-01-01', creato_il timestamptz default '2020-01-01');
    create table public.annuncio(uuid uuid primary key, autore_annuncio uuid references public.profilo, tipologia_annuncio text default 'annuncio_giocatore',
      titolo_annuncio text, stato_annuncio text, info_stato_annuncio text, nascosto boolean default false, privato boolean default false,
      creato_il timestamptz default '2020-01-01', ultima_modifica_il timestamptz, priorita_attiva boolean default false);
    create table public.restricted_profile_access(profile_id uuid references public.profilo, profile_type text, enabled_at timestamptz, primary key(profile_id,profile_type));
    create table private.segnalazioni(id bigint generated always as identity primary key,uuid_annuncio uuid,uuid_profilo uuid,uuid_utente_segnalatore uuid);
    create table private.manifestazioni_interesse(id bigint generated always as identity primary key,uuid_utente_destinatario uuid,
      uuid_profilo_mittente uuid,sottoprofilo_mittente text,uuid_annuncio uuid,uuid_profilo_destinatario uuid,sottoprofilo_destinatario text,
      email text,telefono text,creato_il timestamptz default now());
    create table public.localita_profilo(id bigint generated always as identity primary key,uuid_profilo uuid,sottoprofilo text,regione text,citta text);
    create table public.media_profilo(id bigint generated always as identity primary key,uuid_profilo uuid,sottoprofilo text,formato_media text,link_media text);
    create table public.link_social_profilo(id bigint generated always as identity primary key,uuid_profilo uuid,sottoprofilo text,piattaforma text,sublink text);
    create table public.localita_annuncio(id bigint generated always as identity primary key,uuid_annuncio uuid,regione text,citta text);
    create table public.media_annuncio(id bigint generated always as identity primary key,uuid_annuncio uuid,formato_media text,link_media text);
    create table public.link_social_annuncio(id bigint generated always as identity primary key,uuid_annuncio uuid,piattaforma text,sublink text);
  `);
  for (const table of tables) await db.exec(`create table public.profilo_${table}(id bigint generated always as identity primary key,uuid_profilo uuid unique references public.profilo on delete cascade,nascosto boolean default false,nome text,cognome text,nome_societa text,nome_creator text,nome_organizzazione text,presentazione text)`);
  for (const table of announcementTables) await db.exec(`create table public.annuncio_${table}(uuid_annuncio uuid primary key references public.annuncio on delete cascade,descrizione text)`);
  await db.exec(migration("20260919115906_profile_follows_and_saved_announcements"));
  for (let n = 1; n <= 36; n++) {
    await db.query("insert into public.utente(utente_uuid,auth_user_uuid) values($1,$2)", [id(n), id(n + 1000)]);
    await db.query("insert into public.profilo(uuid,uuid_utente) values($1,$2)", [id(n + 100), id(n)]);
    await db.query("insert into public.profilo_giocatore(uuid_profilo,nome) values($1,$2)", [id(n + 100), `Player ${n}`]);
  }
  await db.query("insert into public.profilo_squadra(uuid_profilo,nome_societa) values($1,'Sender Club'),($2,'Recipient Club')", [id(101), id(102)]);
  await db.query("insert into public.profilo_follow(uuid_profilo_follower,uuid_profilo_seguito,creato_il) values($1,$2,'2021-01-01')", [id(101), id(102)]);
  await db.query("update public.profilo set tipologia_principale='creators' where uuid=$1", [id(134)]);
  await db.query("delete from public.profilo_giocatore where uuid_profilo=$1", [id(135)]);
  await db.query("insert into public.profilo_follow(uuid_profilo_follower,uuid_profilo_seguito,creato_il) values($1,$2,'2022-01-01'),($1,$3,'2022-02-01')", [id(133), id(134), id(135)]);
  await db.exec(migration("20261005130030_centro_notifiche"));
  await db.exec(migration("20261005140622_profile_follow_identities_and_activity"));
  await db.exec("grant select,insert,update,delete on all tables in schema public to service_role; grant select on private.manifestazioni_interesse to service_role; grant usage,select on all sequences in schema public to service_role; set role service_role");
  const follow = (target = 102, sourceType = "squadra", targetType = "squadra", active = true, user = 1) => db.query("select public.set_profile_follow_v2($1,$2,$3,$4,$5) result", [id(user), id(target), targetType, sourceType, active]);
  const count = async (user = 2, type = "follower") => Number((await db.query("select count(*) from private.notifiche where destinatario=$1 and tipo=$2", [id(user), type])).rows[0].count);
  const activity = async (profile = 101, type = "giocatore") => (await db.query("select last_activity from private.profile_activity where profile_id=$1 and profile_type=$2", [id(profile), type])).rows[0]?.last_activity?.toISOString();
  const used = async () => Number((await db.query("select coalesce(sum(used),0) count from private.follow_daily_usage where sender=$1 and day=(clock_timestamp() at time zone 'Europe/Rome')::date", [id(1)])).rows[0].count);

  await t.test("legacy follows retain original dates and principal identities without notifying", async () => {
    const row = (await db.query("select * from public.profilo_follow")).rows[0];
    assert.equal(row.sottoprofilo_follower, "giocatore");
    assert.equal(row.sottoprofilo_seguito, "giocatore");
    assert.match(row.creato_il.toISOString(), /^2021-01-01/);
    assert.equal(await count(), 0);
    assert.equal(await used(), 0);
    assert.match(await activity(), /^2020-01-01/);
    assert.equal((await db.query("select sottoprofilo_seguito from public.profilo_follow where uuid_profilo_seguito=$1", [id(134)])).rows[0].sottoprofilo_seguito, "giocatore");
    assert.equal(Number((await db.query("select count(*) from private.follow_legacy_archive")).rows[0].count), 1);
  });
  await t.test("unavailable, unregistered and foreign identities are rejected without consuming quota", async () => {
    await assert.rejects(() => follow(102, "creators"), /FOLLOW_PROFILE_UNAVAILABLE/);
    await assert.rejects(() => follow(102, "giocatore", "invented"), /FOLLOW_PROFILE_UNAVAILABLE/);
    await assert.rejects(() => follow(102, "giocatore", "giocatore", true, 1001), /FOLLOW_PROFILE_UNAVAILABLE/);
    await db.query("update public.utente set registrato_il=null where utente_uuid=$1", [id(36)]);
    await assert.rejects(() => follow(136, "giocatore", "giocatore"), /FOLLOW_PROFILE_UNAVAILABLE/);
    assert.equal(await used(), 0);
  });
  await t.test("one sender identity per destination; duplicates are silent and self-follow is blocked", async () => {
    const before = await activity();
    await follow();
    assert.equal(await count(), 1);
    const duplicate = (await follow(102, "giocatore")).rows[0].result;
    assert.equal(duplicate.sourceType, "squadra");
    assert.equal(await count(), 1);
    assert.equal(await used(), 1);
    assert.equal(await activity(), before);
    await assert.rejects(() => follow(101), /FOLLOW_SELF/);
    const notice = (await db.query("select dati from private.notifiche where tipo='follower'")).rows[0].dati;
    assert.equal(notice.actor.type, "squadra");
    assert.equal(notice.actor.label, "Sender Club");
    assert.equal(notice.target.type, "squadra");
    const items = (await db.query("select public.get_notifications_v1($1,20,null,null) result", [id(2)])).rows[0].result.items;
    assert.match(items[0].actor.href, /type=squadra/);
  });
  await t.test("only the followed subprofile's first public announcements notify", async () => {
    await follow(102, null, "giocatore", false);
    await db.query("insert into public.annuncio(uuid,autore_annuncio,tipologia_annuncio,titolo_annuncio,stato_annuncio) values($1,$2,'annuncio_giocatore','Player announcement','pubblicato')", [id(500), id(102)]);
    assert.equal(await count(1, "annuncio_seguito"), 0);
    await db.query("insert into public.annuncio(uuid,autore_annuncio,tipologia_annuncio,titolo_annuncio,stato_annuncio) values($1,$2,'annuncio_squadra_cerca_giocatore','Club announcement','pubblicato')", [id(501), id(102)]);
    assert.equal(await count(1, "annuncio_seguito"), 1);
    await db.query("update public.annuncio set nascosto=true where uuid=$1", [id(501)]);
    await db.query("update public.annuncio set nascosto=false where uuid=$1", [id(501)]);
    assert.equal(await count(1, "annuncio_seguito"), 1);
  });
  await t.test("significant profile edits are scoped; no-op save and technical timestamps do not boost", async () => {
    const teamBefore = await activity(101, "squadra");
    await db.query("update public.profilo_giocatore set presentazione='New player information' where uuid_profilo=$1", [id(101)]);
    assert.notEqual(await activity(), "2020-01-01T00:00:00.000Z");
    assert.equal(await activity(101, "squadra"), teamBefore);
    await db.query("insert into public.localita_profilo(uuid_profilo,sottoprofilo,regione,citta) values($1,'giocatore','Lazio','Roma')", [id(101)]);
    const before = await activity();
    await db.exec(`begin; update public.profilo_giocatore set presentazione=presentazione where uuid_profilo='${id(101)}';
      delete from public.localita_profilo where uuid_profilo='${id(101)}';
      insert into public.localita_profilo(uuid_profilo,sottoprofilo,regione,citta) values('${id(101)}','giocatore','Lazio','Roma');
      update public.profilo set ultima_modifica_il=now(),tipologia_principale='squadra' where uuid='${id(101)}'; commit;`);
    assert.equal(await activity(), before);
    assert.equal(await activity(101, "squadra"), teamBefore);
  });
  await t.test("announcement content edits boost its author subtype, technical updates and visibility do not", async () => {
    const before = await activity(102, "squadra");
    await db.query("update public.annuncio set priorita_attiva=true,ultima_modifica_il=now(),info_stato_annuncio='Technical' where uuid=$1", [id(501)]);
    assert.equal(await activity(102, "squadra"), before);
    await db.query("insert into public.annuncio_squadra_cerca_giocatore values($1,'Real content change')", [id(501)]);
    assert.notEqual(await activity(102, "squadra"), before);
    const after = await activity(102, "squadra");
    await db.query("update public.annuncio set nascosto=true where uuid=$1", [id(501)]);
    await db.query("update public.annuncio set nascosto=false where uuid=$1", [id(501)]);
    assert.equal(await activity(102, "squadra"), after);
    await db.query("update public.annuncio set stato_annuncio='in_revisione' where uuid=$1", [id(501)]);
    await db.query("update public.annuncio_squadra_cerca_giocatore set descrizione='Pending edit' where uuid_annuncio=$1", [id(501)]);
    assert.equal(await activity(102, "squadra"), after);
    await db.query("update public.annuncio set stato_annuncio='pubblicato' where uuid=$1", [id(501)]);
    assert.notEqual(await activity(102, "squadra"), after);
  });
  await t.test("scoped photos and links affect only their profile; identical rewritten links and metadata do not", async () => {
    const teamBefore = await activity(101, "squadra");
    await db.query("insert into public.media_profilo(uuid_profilo,sottoprofilo,formato_media,link_media) values($1,'giocatore','foto_profilo','https://example.test/photo.webp')", [id(101)]);
    assert.equal(await activity(101, "squadra"), teamBefore);
    await db.query("insert into public.link_social_profilo(uuid_profilo,sottoprofilo,piattaforma,sublink) values($1,'giocatore','website','https://example.test')", [id(101)]);
    const before = await activity();
    await db.exec(`begin; delete from public.link_social_profilo where uuid_profilo='${id(101)}';
      insert into public.link_social_profilo(uuid_profilo,sottoprofilo,piattaforma,sublink) values('${id(101)}','giocatore','website','https://example.test'); commit;`);
    assert.equal(await activity(), before);
    await db.query("insert into public.media_profilo(uuid_profilo,formato_media,link_media) values($1,'video_highlights','https://example.test/video')", [id(101)]);
    assert.notEqual(await activity(), before);
    assert.equal(await activity(101, "squadra"), teamBefore);
  });
  await t.test("quota is shared across identities, permits 30, blocks 31; unfollow does not restore quota", async () => {
    for (let target = 103; target <= 131; target++) await follow(target, target % 2 ? "giocatore" : "squadra", "giocatore");
    assert.equal(await used(), 30);
    await assert.rejects(() => follow(132, "giocatore", "giocatore"), /FOLLOW_DAILY_LIMIT/);
    await follow(103, null, "giocatore", false);
    await assert.rejects(() => follow(103, "squadra", "giocatore"), /FOLLOW_DAILY_LIMIT/);
    assert.equal(await used(), 30);
    assert.equal((await follow()).rows[0].result.active, true);
    // An earlier calendar day has no bearing on the current day's counter.
    await db.query("update private.follow_daily_usage set day=day-1 where sender=$1", [id(1)]);
    await follow(132, "giocatore", "giocatore");
    assert.equal(await used(), 1);
  });
  await t.test("all eight profile types can follow and deletion cleans exact relations", async () => {
    for (let index = 2; index < types.length; index++) {
      await db.query(`insert into public.profilo_${tables[index]}(uuid_profilo,nome) values($1,'Extra sender'),($2,'Extra recipient')`, [id(101), id(102)]);
      await follow(102, types[index], types[index]);
    }
    await db.query("delete from public.profilo_creator where uuid_profilo=$1", [id(101)]);
    assert.equal(Number((await db.query("select count(*) from public.profilo_follow where sottoprofilo_follower='creators'")).rows[0].count), 0);
    await db.query("delete from public.profilo_squadra where uuid_profilo=$1", [id(102)]);
    assert.equal(Number((await db.query("select count(*) from public.profilo_follow where sottoprofilo_seguito='squadra'")).rows[0].count), 0);
  });
  await t.test("hidden recipients can be unfollowed; refollow uses quota and notifies again; parent deletion cascades", async () => {
    await follow(133, "giocatore", "giocatore");
    const before = await used();
    await db.query("update public.profilo set nascosto=true where uuid=$1", [id(133)]);
    await follow(133, null, "giocatore", false);
    assert.equal(await used(), before);
    await db.query("update public.profilo set nascosto=false where uuid=$1", [id(133)]);
    await follow(133, "squadra", "giocatore");
    assert.equal(await used(), before + 1);
    assert.equal(await count(33), 2);
    await db.query("delete from public.profilo where uuid=$1", [id(134)]);
    assert.equal(Number((await db.query("select count(*) from public.profilo_follow where uuid_profilo_seguito=$1", [id(134)])).rows[0].count), 0);
    assert.equal(Number((await db.query("select count(*) from private.profile_activity where profile_id=$1", [id(134)])).rows[0].count), 0);
  });
  await t.test("private counters/activity and RPCs are inaccessible to browser roles", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`reset role; set role ${role}`);
      await assert.rejects(() => db.query("select public.set_profile_follow_v2($1,$2,'giocatore','giocatore',true)", [id(1), id(102)]), {code: "42501"});
      await assert.rejects(() => db.query("select * from public.get_profile_activity_v1($1)", [[id(101)]]), {code: "42501"});
      await assert.rejects(() => db.query("select * from private.follow_daily_usage"), {code: "42501"});
    }
  });
});

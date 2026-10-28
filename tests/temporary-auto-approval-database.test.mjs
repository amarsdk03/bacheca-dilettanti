import { PGlite } from "./helpers/pglite.mjs";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const script = readFileSync(new URL("../supabase/scripts/auto_approve_announcements_until_2026_10_25.sql", import.meta.url), "utf8");
const migration = name => readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
// Only the clock is replaced in the isolated database; the shipped SQL has no
// configurable clock, deadline argument or public RPC that can extend its life.
const mockedScript = script.replace("v_now timestamptz := pg_catalog.clock_timestamp();", "v_now timestamptz := private.test_now();");

test("temporary approval: deferred publication, deadline, notifications and payment lifecycle", async t => {
  const db = await PGlite.create();
  t.after(() => db.close());
  await db.exec(`
    set timezone = 'UTC';
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema private; create schema auth; grant usage on schema private to service_role;
    create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
    create table public.utente(utente_uuid uuid primary key, auth_user_uuid uuid, registrato_il timestamptz default now());
    create table public.profilo(uuid uuid primary key, uuid_utente uuid unique references public.utente, nascosto boolean default false,
      tipologia_principale text default 'giocatore', link_foto_profilo text, ultima_modifica_il timestamptz default '2020-01-01', creato_il timestamptz default '2020-01-01');
    create table public.annuncio(uuid uuid primary key, autore_annuncio uuid references public.profilo, tipologia_annuncio text default 'annuncio_giocatore',
      titolo_annuncio text, stato_annuncio text, info_stato_annuncio text, nascosto boolean default false, privato boolean default false,
      creato_il timestamptz default now(), ultima_modifica_il timestamptz, livello_annuncio text default 'gratuito',
      priorita_attiva boolean default false, priorita_inizio_il timestamptz, priorita_fine_il timestamptz);
    create table public.restricted_profile_access(profile_id uuid references public.profilo, profile_type text, enabled_at timestamptz, primary key(profile_id,profile_type));
    create table private.segnalazioni(id bigint generated always as identity primary key, uuid_annuncio uuid, uuid_profilo uuid, uuid_utente_segnalatore uuid);
    create table private.manifestazioni_interesse(id bigint generated always as identity primary key, uuid_utente_destinatario uuid,
      uuid_profilo_mittente uuid, sottoprofilo_mittente text, uuid_annuncio uuid, uuid_profilo_destinatario uuid, sottoprofilo_destinatario text,
      email text, telefono text, creato_il timestamptz default now());
    create table public.localita_profilo(id bigint generated always as identity primary key, uuid_profilo uuid, sottoprofilo text, regione text, citta text);
    create table public.media_profilo(id bigint generated always as identity primary key, uuid_profilo uuid, sottoprofilo text, formato_media text, link_media text);
    create table public.link_social_profilo(id bigint generated always as identity primary key, uuid_profilo uuid, sottoprofilo text, piattaforma text, sublink text);
    create table public.localita_annuncio(id bigint generated always as identity primary key, uuid_annuncio uuid, regione text, citta text);
    create table public.media_annuncio(id bigint generated always as identity primary key, uuid_annuncio uuid, formato_media text, link_media text);
    create table public.link_social_annuncio(id bigint generated always as identity primary key, uuid_annuncio uuid, piattaforma text, sublink text);
    create table private.test_clock(value timestamptz not null);
    insert into private.test_clock values ('2026-10-20T12:00:00Z');
    create function private.test_now() returns timestamptz language sql volatile set search_path = ''
      as $$ select value from private.test_clock $$;
    create table private.announcement_submission(announcement_id uuid primary key references public.annuncio on delete cascade,
      requested_visibility text, paid_at timestamptz, refund_required_at timestamptz, refunded_at timestamptz, stripe_amount_total integer);
  `);
  for (const table of ["giocatore", "squadra", "staff_sportivo", "arbitro", "torneo_evento", "campi_impianti", "servizi_consulenze", "creator"]) {
    await db.exec(`create table public.profilo_${table}(id bigint generated always as identity primary key, uuid_profilo uuid unique references public.profilo on delete cascade,
      nascosto boolean default false, nome text, cognome text, nome_societa text, nome_creator text, nome_organizzazione text, presentazione text)`);
  }
  for (const table of ["giocatore", "squadra_cerca_giocatore", "squadra_cerca_staff", "squadra_cerca_partita", "squadra_cerca_sponsor", "staff_sportivo", "arbitro", "torneo_evento", "campo_impianto", "servizi_consulenze", "creator"]) {
    await db.exec(`create table public.annuncio_${table}(uuid_annuncio uuid primary key references public.annuncio on delete cascade, descrizione text)`);
  }
  await db.exec(migration("20260919115906_profile_follows_and_saved_announcements"));
  await db.exec(migration("20261005130030_centro_notifiche"));
  await db.exec(migration("20261005140622_profile_follow_identities_and_activity"));
  await db.exec(migration("20261016193020_notification_labels_and_filters"));
  const lifecycle = migration("20260914130000_reconcile_priority_checkout_amount_rpc")
    .match(/create or replace function private\.manage_priority_announcement_lifecycle_v1\(\)[\s\S]*?\n\$\$;/)?.[0];
  assert.ok(lifecycle);
  await db.exec(lifecycle);
  await db.exec(`create trigger manage_priority_announcement_lifecycle_v1 before update or delete on public.annuncio
    for each row execute function private.manage_priority_announcement_lifecycle_v1()`);
  for (const n of [1, 2]) {
    await db.query("insert into public.utente(utente_uuid) values ($1)", [id(n)]);
    await db.query("insert into public.profilo(uuid, uuid_utente) values ($1, $2)", [id(n + 10), id(n)]);
    await db.query("insert into public.profilo_giocatore(uuid_profilo, nome) values ($1, $2)", [id(n + 10), `Player ${n}`]);
  }
  await db.query("insert into public.profilo_follow(uuid_profilo_follower, uuid_profilo_seguito, sottoprofilo_follower, sottoprofilo_seguito) values ($1, $2, 'giocatore', 'giocatore')", [id(12), id(11)]);
  const insert = (n, state = "in_revisione") => db.query("insert into public.annuncio(uuid, autore_annuncio, stato_annuncio) values ($1, $2, $3)", [id(n), id(11), state]);
  const row = async n => (await db.query("select * from public.annuncio where uuid = $1", [id(n)])).rows[0];
  const clock = value => db.query("update private.test_clock set value = $1", [value]);
  await insert(90); // Existing queue must never be approved by installation.

  await t.test("the unchanged SQL installs twice and exposes no callable function", async () => {
    await db.exec(script);
    await db.exec(script);
    const trigger = (await db.query("select tgdeferrable, tginitdeferred from pg_trigger where tgname = 'auto_approve_new_announcement_until_v1'")).rows;
    assert.deepEqual(trigger, [{tgdeferrable: true, tginitdeferred: true}]);
    for (const role of ["anon", "authenticated", "service_role"]) {
      const result = await db.query("select has_function_privilege($1, 'private.auto_approve_new_announcement_until_v1()', 'EXECUTE') allowed", [role]);
      assert.equal(result.rows[0].allowed, false);
    }
    assert.equal((await row(90)).stato_annuncio, "in_revisione");
    assert.notEqual(mockedScript, script);
    await db.exec(mockedScript);
  });

  await t.test("approval waits for final details and sends a single complete follower notification", async () => {
    await db.exec("begin");
    await insert(100);
    assert.equal((await row(100)).stato_annuncio, "in_revisione");
    await db.query("insert into public.annuncio_giocatore values ($1, 'Esperienza completa')", [id(100)]);
    await db.query("update public.annuncio set titolo_annuncio = 'Cerco squadra' where uuid = $1", [id(100)]);
    await db.exec("commit");
    const announcement = await row(100);
    assert.equal(announcement.stato_annuncio, "pubblicato");
    assert.equal(announcement.nascosto, false);
    assert.equal(announcement.privato, false);
    assert.equal(announcement.ultima_modifica_il.toISOString(), "2026-10-20T12:00:00.000Z");
    const notifications = (await db.query("select tipo, dati from private.notifiche where dati->'target'->>'id' = $1", [id(100)])).rows;
    const follower = notifications.filter(n => n.tipo === "annuncio_seguito");
    assert.equal(follower.length, 1);
    assert.equal(follower[0].dati.target.label, "Cerco squadra");
    assert.equal(notifications.filter(n => n.tipo === "stato_annuncio" && n.dati.state === "pubblicato").length, 1);
    assert.equal(Number((await db.query("select count(*) from private.announcement_activity where announcement_id = $1", [id(100)])).rows[0].count), 1);
    await db.query("update public.annuncio set nascosto = true where uuid = $1", [id(100)]);
    await db.query("update public.annuncio set nascosto = false where uuid = $1", [id(100)]);
    assert.equal(Number((await db.query("select count(*) from private.notifiche where tipo = 'annuncio_seguito' and dati->'target'->>'id' = $1", [id(100)])).rows[0].count), 1);
  });

  await t.test("current state wins over the INSERT snapshot; visibility is preserved", async () => {
    await db.exec("begin");
    await insert(101);
    await db.query("update public.annuncio set stato_annuncio = 'rifiutato' where uuid = $1", [id(101)]);
    await insert(102);
    await db.query("update public.annuncio set nascosto = true, privato = true where uuid = $1", [id(102)]);
    await insert(103, "in_attesa_pagamento");
    await insert(104, "pubblicato");
    await db.exec("commit");
    assert.equal((await row(101)).stato_annuncio, "rifiutato");
    assert.equal((await row(102)).stato_annuncio, "pubblicato");
    assert.equal((await row(102)).nascosto, true);
    assert.equal((await row(102)).privato, true);
    assert.equal((await row(103)).stato_annuncio, "in_attesa_pagamento");
    assert.equal((await row(104)).stato_annuncio, "pubblicato");
    assert.equal((await row(104)).info_stato_annuncio, null);
  });

  await t.test("a rollback or deletion before commit leaves no announcement or follower event", async () => {
    await db.exec("begin");
    await insert(105);
    await db.exec("rollback");
    assert.equal(await row(105), undefined);
    await db.exec("begin");
    await insert(106);
    await db.query("delete from public.annuncio where uuid = $1", [id(106)]);
    await db.exec("commit");
    assert.equal(await row(106), undefined);
    assert.equal(Number((await db.query("select count(*) from private.notifiche where tipo = 'annuncio_seguito' and dati->'target'->>'id' in ($1, $2)", [id(105), id(106)])).rows[0].count), 0);
  });

  await t.test("priority payment guard still rejects unpaid publication and activates paid priority", async () => {
    await db.exec("begin");
    await insert(107);
    await db.query("update public.annuncio set livello_annuncio = 'prioritario' where uuid = $1", [id(107)]);
    await assert.rejects(() => db.exec("commit"), /PRIORITY_PAYMENT_REQUIRED/);
    await db.exec("rollback");
    assert.equal(await row(107), undefined);
    await db.exec("begin");
    await insert(108);
    await db.query("update public.annuncio set livello_annuncio = 'prioritario' where uuid = $1", [id(108)]);
    await db.query("insert into private.announcement_submission(announcement_id, requested_visibility, paid_at) values ($1, 'prioritario', now())", [id(108)]);
    await db.exec("commit");
    assert.equal((await row(108)).stato_annuncio, "pubblicato");
    assert.equal((await row(108)).priorita_attiva, true);
  });

  await t.test("the inclusive Rome deadline is independent of the session timezone, including DST", async () => {
    for (const [index, timezone] of ["UTC", "Pacific/Honolulu", "Europe/Rome"].entries()) {
      await db.query("select set_config('TimeZone', $1, false)", [timezone]);
      await clock("2026-10-25T22:59:59.999999Z");
      await insert(120 + index * 2);
      assert.equal((await row(120 + index * 2)).stato_annuncio, "pubblicato");
      await clock("2026-10-25T23:00:00Z");
      await insert(121 + index * 2);
      assert.equal((await row(121 + index * 2)).stato_annuncio, "in_revisione");
    }
  });

  await t.test("crossing the deadline before commit or inserting later does not approve", async () => {
    await clock("2026-10-25T22:59:59Z");
    await db.exec("begin");
    await insert(130);
    await clock("2026-10-25T23:00:00Z");
    await db.exec("commit");
    assert.equal((await row(130)).stato_annuncio, "in_revisione");
    await clock("2026-10-27T10:00:00Z");
    await insert(131);
    assert.equal((await row(131)).stato_annuncio, "in_revisione");
    assert.equal((await row(100)).stato_annuncio, "pubblicato");
    await db.query("update public.annuncio set titolo_annuncio = 'Vecchio annuncio aggiornato' where uuid = $1", [id(90)]);
    assert.equal((await row(90)).stato_annuncio, "in_revisione");
  });
});

test("temporary approval executes at commit after an authenticated publishing RPC returns", async t => {
  const db = await PGlite.create();
  t.after(() => db.close());
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema private;
    create table public.annuncio(uuid uuid primary key, stato_annuncio text, info_stato_annuncio text, ultima_modifica_il timestamptz);
    alter table public.annuncio enable row level security;
    alter table public.annuncio force row level security;
    revoke all on public.annuncio from public, anon, authenticated, service_role;
    create function private.test_now() returns timestamptz language sql as $$ select timestamptz '2026-10-20T12:00:00Z' $$;
    create function public.test_publish(p_id uuid) returns void language sql security definer set search_path = ''
      as $$ insert into public.annuncio(uuid, stato_annuncio) values(p_id, 'in_revisione') $$;
    revoke all on function public.test_publish(uuid) from public;
    grant execute on function public.test_publish(uuid) to authenticated;
  `);
  await db.exec(mockedScript);
  await db.exec("set role authenticated; begin");
  await db.query("select public.test_publish($1)", [id(1)]);
  await db.exec("commit; reset role");
  const result = await db.query("select stato_annuncio from public.annuncio where uuid = $1", [id(1)]);
  assert.equal(result.rows[0].stato_annuncio, "pubblicato");
});

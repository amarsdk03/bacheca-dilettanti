import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {test} from "node:test";
const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);

const migration = readFileSync(new URL("../supabase/migrations/20261005121608_manifestazioni_interesse.sql", import.meta.url), "utf8");
const id = (group, n) => `${group}0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const tables = ["profilo_giocatore", "profilo_squadra", "profilo_staff_sportivo", "profilo_arbitro", "profilo_torneo_evento", "profilo_campi_impianti", "profilo_servizi_consulenze", "profilo_creator"];

test("interests migration enforces contacts, ownership, privacy, per-user quotas and Italian calendar days", {skip: !existsSync(engineUrl) && "PGlite runner unavailable (see docs/follow-e-annunci-salvati.md)"}, async (t) => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	t.after(() => db.close());
	await db.exec(`
		create role anon; create role authenticated; create role service_role bypassrls;
		create schema private;
		create table public.utente (utente_uuid uuid primary key, registrato_il timestamptz);
		create table public.profilo (uuid uuid primary key, uuid_utente uuid references public.utente, nascosto boolean default false);
		create table public.annuncio (uuid uuid primary key, autore_annuncio uuid references public.profilo, stato_annuncio text default 'pubblicato', nascosto boolean default false, privato boolean default false);
		create table private.test_clock (instant timestamptz);
		insert into private.test_clock values ('2026-10-05T10:00:00Z');
		create function private.test_now() returns timestamptz language sql security invoker as $$select instant from private.test_clock$$;
		grant usage on schema public, private to service_role;
		grant select on private.test_clock to service_role;
		grant execute on function private.test_now() to service_role;
	`);
	for (const table of tables) await db.exec(`create table public.${table} (id bigint generated always as identity primary key, uuid_profilo uuid references public.profilo, nascosto boolean default false)`);
	for (let n = 1; n <= 3; n++) {
		await db.query("insert into public.utente values ($1, now())", [id(1, n)]);
		await db.query("insert into public.profilo values ($1, $2, false)", [id(2, n), id(1, n)]);
		for (const table of tables) await db.query(`insert into public.${table} (uuid_profilo) values ($1)`, [id(2, n)]);
	}
	for (let n = 1; n <= 30; n++) await db.query("insert into public.annuncio (uuid, autore_annuncio) values ($1, $2)", [id(3, n), id(2, 2)]);
	await db.exec("grant select, update on all tables in schema public to service_role");
	// Inject a clock only in the isolated database; deploy the unchanged RPC.
	await db.exec(migration.replace("pg_catalog.clock_timestamp()", "private.test_now()"));
	async function as(role) {await db.exec(`reset role; set role ${role}`);}
	async function clock(value) {await db.exec("reset role"); await db.query("update private.test_clock set instant = $1", [value]); await as("service_role");}
	async function clear() {await db.exec("reset role; truncate private.manifestazioni_interesse restart identity"); await as("service_role");}
	async function send(options = {}) {
		const values = {sender: id(1, 1), type: "giocatore", kind: "annuncio", target: id(3, 1), targetType: null,
			email: " user@example.com ", phone: null, ownership: true, sharing: true, version: "2026-10-05-v1", ...options};
		return (await db.query("select public.submit_manifestazione_interesse_v1($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as result", Object.values(values))).rows[0].result;
	}
	await as("service_role");

	await t.test("both consents and at least one valid contact are enforced in PostgreSQL", async () => {
		for (const options of [{ownership: false}, {sharing: false}, {ownership: null}, {email: null}, {email: "bad"}, {phone: "123"}, {phone: "CALLME"}, {version: "forged"}]) {
			await assert.rejects(() => send(options), {code: "22023"});
		}
		assert.equal((await send({email: null, phone: "+39 (333) 123-4567"})).status, "success");
		const row = (await db.query("select * from private.manifestazioni_interesse")).rows[0];
		assert.equal(row.uuid_utente_destinatario, id(1, 2));
		assert.equal(row.conferma_titolarita, true);
		assert.equal(row.consenso_condivisione, true);
		assert.equal(row.email, null);
		await clear();
		assert.equal((await send()).status, "success");
		assert.equal((await db.query("select email from private.manifestazioni_interesse")).rows[0].email, "user@example.com");
	});

	await t.test("an owned active sender subprofile and registered non-self recipient are required", async () => {
		await clear();
		assert.equal((await send({target: id(2, 1), kind: "profilo", targetType: "giocatore"})).status, "own_target");
		assert.equal((await send({target: id(3, 100)})).status, "invalid_target");
		assert.equal((await send({type: "invented"})).status, "invalid_sender");
		await db.exec("reset role");
		await db.query("update public.profilo_giocatore set nascosto = true where uuid_profilo = $1", [id(2, 1)]);
		await as("service_role");
		assert.equal((await send()).status, "invalid_sender");
		assert.equal((await send({type: "squadra"})).status, "success");
		await db.exec("reset role");
		await db.query("update public.profilo_giocatore set nascosto = false where uuid_profilo = $1", [id(2, 1)]);
		await db.query("update public.utente set registrato_il = null where utente_uuid = $1", [id(1, 2)]);
		await as("service_role");
		assert.equal((await send({target: id(3, 2)})).status, "invalid_target");
		await db.exec("reset role");
		await db.query("update public.utente set registrato_il = now() where utente_uuid = $1", [id(1, 2)]);
		await db.query("update public.annuncio set privato = true where uuid = $1", [id(3, 2)]);
		await as("service_role");
		assert.equal((await send({target: id(3, 2)})).status, "invalid_target");
	});

	await t.test("ten daily sends span sender subprofiles and targets, with the eleventh rejected", async () => {
		await clear();
		for (let n = 3; n <= 12; n++) assert.equal((await send({target: id(3, n), type: n % 2 ? "giocatore" : "squadra"})).status, "success");
		const result = await send({target: id(3, 13), type: "squadra"});
		assert.equal(result.status, "daily_limit");
		assert.equal(new Date(result.retryAt).toISOString(), "2026-10-05T22:00:00.000Z");
		assert.equal((await send({sender: id(1, 3), target: id(3, 13)})).status, "success");
	});

	await t.test("the 60-day cooldown is per target and sender account, independent of chosen sender type", async () => {
		await clear();
		await clock("2026-10-05T10:00:00Z");
		assert.equal((await send()).status, "success");
		assert.equal((await send({type: "squadra"})).status, "target_limit");
		assert.equal((await send({kind: "profilo", target: id(2, 2), targetType: "squadra"})).status, "success");
		assert.equal((await send({kind: "profilo", target: id(2, 2), targetType: "giocatore"})).status, "success");
		assert.equal((await send({kind: "profilo", target: id(2, 2), targetType: "squadra", type: "squadra"})).status, "target_limit");
		await clock("2026-12-04T09:59:59Z");
		assert.equal((await send()).status, "target_limit");
		await clock("2026-12-04T10:00:00Z");
		assert.equal((await send()).status, "success");
	});

	await t.test("Italian midnight resets the daily quota across both daylight-saving changes", async () => {
		for (const [before, after] of [["2026-03-29T21:59:59Z", "2026-03-29T22:00:00Z"], ["2026-10-25T22:59:59Z", "2026-10-25T23:00:00Z"]]) {
			await clear(); await clock(before);
			for (let n = 3; n <= 12; n++) assert.equal((await send({target: id(3, n)})).status, "success");
			const blocked = await send({target: id(3, 13)});
			assert.equal(blocked.status, "daily_limit");
			assert.equal(new Date(blocked.retryAt).toISOString(), new Date(after).toISOString());
			await clock(after);
			assert.equal((await send({target: id(3, 13)})).status, "success");
		}
	});

	await t.test("serialized parallel requests stop at ten and the sender advisory lock lasts until commit", async () => {
		await clear();
		const results = await Promise.all(Array.from({length: 15}, (_, n) => send({target: id(3, n + 3)})));
		assert.equal(results.filter((result) => result.status === "success").length, 10);
		assert.equal(results.filter((result) => result.status === "daily_limit").length, 5);
		await db.exec("begin");
		await send({target: id(3, 20)});
		const locks = (await db.query("select count(*)::int as n from pg_catalog.pg_locks where locktype = 'advisory' and granted")).rows[0].n;
		assert.ok(locks >= 1);
		await db.exec("rollback");
	});

	await t.test("anonymous and authenticated clients cannot read contacts or invoke either function", async () => {
		for (const role of ["anon", "authenticated"]) {
			await as(role);
			await assert.rejects(() => db.query("select * from private.manifestazioni_interesse"), {code: "42501"});
			await assert.rejects(() => send(), {code: "42501"});
			await assert.rejects(() => db.query("select private.interest_subprofile_id($1, 'giocatore')", [id(2, 1)]), {code: "42501"});
		}
	});
});

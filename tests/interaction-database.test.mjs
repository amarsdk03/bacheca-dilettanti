import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {test} from "node:test";

// Optional isolated PostgreSQL runner; see docs/follow-e-annunci-salvati.md.
// It never connects to the application's Supabase project.
const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260919115906_profile_follows_and_saved_announcements.sql", import.meta.url);
const id = (group, n) => `${group}0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("follow/bookmark migration on isolated PostgreSQL", {skip: !existsSync(engineUrl) && "Install the optional PGlite runner described in docs/follow-e-annunci-salvati.md"}, async (t) => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	t.after(() => db.close());
	// Minimal existing schema + real owner-only policy semantics from this repo.
	await db.exec(`
		create role anon;
		create role authenticated;
		create role service_role bypassrls;
		create schema auth;
		create function auth.uid() returns uuid language sql stable as
		$$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
		grant usage on schema public, auth to anon, authenticated, service_role;
		create table public.utente (utente_uuid uuid primary key, auth_user_uuid uuid not null unique, registrato_il timestamptz);
		create table public.profilo (uuid uuid primary key, uuid_utente uuid references public.utente(utente_uuid));
		create table public.annuncio (uuid uuid primary key);
		alter table public.utente enable row level security;
		alter table public.profilo enable row level security;
		grant select on public.utente, public.profilo to authenticated;
		create policy utente_select_own on public.utente for select to authenticated
		using (auth_user_uuid = (select auth.uid()));
		create policy profilo_select_own on public.profilo for select to authenticated
		using (exists (select 1 from public.utente u where u.utente_uuid = uuid_utente and u.auth_user_uuid = (select auth.uid())));
	`);
	for (let n = 1; n <= 3; n++) {
		await db.query("insert into public.utente values ($1, $2, now())", [id(1, n), id(0, n)]);
		await db.query("insert into public.profilo values ($1, $2)", [id(2, n), id(1, n)]);
		await db.query("insert into public.annuncio values ($1)", [id(3, n)]);
	}
	await db.exec(readFileSync(migrationUrl, "utf8"));
	async function as(role, n = 1) {
		await db.exec(`reset role; set role ${role}`);
		await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id(0, n)]);
	}
	async function count(table) {
		return (await db.query(`select count(*)::integer as n from public.${table}`)).rows[0].n;
	}
	await as("service_role");
	await db.query("insert into public.profilo_follow (uuid_profilo_follower, uuid_profilo_seguito) values ($1, $2)", [id(2, 1), id(2, 2)]);
	await db.query("insert into public.annuncio_salvato values ($1, $2, '2020-01-01T10:00:00Z')", [id(1, 1), id(3, 1)]);
	await db.query("insert into public.annuncio_salvato values ($1, $2, '2021-01-01T10:00:00Z')", [id(1, 1), id(3, 2)]);

	await t.test("anonymous users cannot read either table", async () => {
		await as("anon");
		await assert.rejects(() => count("profilo_follow"), {code: "42501"});
		await assert.rejects(() => count("annuncio_salvato"), {code: "42501"});
	});
	await t.test("RLS maps distinct Auth/app/profile IDs and only exposes participant relationships", async () => {
		for (const [n, follows, saves] of [[1, 1, 2], [2, 1, 0], [3, 0, 0]]) {
			await as("authenticated", n);
			assert.equal(await count("profilo_follow"), follows);
			assert.equal(await count("annuncio_salvato"), saves);
		}
		await db.exec("reset role");
		await db.query("update public.utente set registrato_il = null where utente_uuid = $1", [id(1, 1)]);
		await as("authenticated", 1);
		assert.equal(await count("profilo_follow"), 0);
		assert.equal(await count("annuncio_salvato"), 0);
		await db.exec("reset role");
		await db.query("update public.utente set registrato_il = now() where utente_uuid = $1", [id(1, 1)]);
	});
	await t.test("authenticated clients cannot insert, update or delete even their own relationships", async () => {
		await as("authenticated", 1);
		for (const statement of [
			`insert into public.profilo_follow (uuid_profilo_follower, uuid_profilo_seguito) values ('${id(2, 1)}', '${id(2, 3)}')`,
			"delete from public.profilo_follow", "update public.profilo_follow set creato_il = now()",
			`insert into public.annuncio_salvato (uuid_utente, uuid_annuncio) values ('${id(1, 1)}', '${id(3, 3)}')`,
			"delete from public.annuncio_salvato", "update public.annuncio_salvato set salvato_il = now()",
		]) await assert.rejects(() => db.exec(statement), {code: "42501"});
	});
	await t.test("self-follow, duplicates and dangling references are rejected by PostgreSQL", async () => {
		await as("service_role");
		await assert.rejects(() => db.query("insert into public.profilo_follow values ($1, $1, now())", [id(2, 1)]), {code: "23514"});
		await assert.rejects(() => db.query("insert into public.profilo_follow values ($1, $2, now())", [id(2, 1), id(2, 2)]), {code: "23505"});
		await assert.rejects(() => db.query("insert into public.annuncio_salvato values ($1, $2, now())", [id(1, 1), id(3, 1)]), {code: "23505"});
		await assert.rejects(() => db.query("insert into public.annuncio_salvato values ($1, $2, now())", [id(1, 1), id(3, 9)]), {code: "23503"});
		await assert.rejects(() => db.exec("update public.annuncio_salvato set salvato_il = now()"), {code: "42501"});
	});
	await t.test("retries preserve timestamps; removing and saving again updates the chronological order", async () => {
		await as("service_role");
		await db.query("insert into public.annuncio_salvato (uuid_utente, uuid_annuncio) values ($1, $2) on conflict (uuid_utente, uuid_annuncio) do nothing", [id(1, 1), id(3, 1)]);
		const ordered = async () => (await db.query("select uuid_annuncio, salvato_il from public.annuncio_salvato order by salvato_il desc, uuid_annuncio desc")).rows;
		const before = await ordered();
		assert.deepEqual(before.map((row) => row.uuid_annuncio), [id(3, 2), id(3, 1)]);
		assert.equal(before[1].salvato_il.toISOString(), "2020-01-01T10:00:00.000Z");
		await db.query("delete from public.annuncio_salvato where uuid_utente = $1 and uuid_annuncio = $2", [id(1, 1), id(3, 1)]);
		await db.query("insert into public.annuncio_salvato (uuid_utente, uuid_annuncio) values ($1, $2)", [id(1, 1), id(3, 1)]);
		assert.equal((await ordered())[0].uuid_annuncio, id(3, 1));
	});
	await t.test("deleting announcements, profiles and users cascades their relationships", async () => {
		await db.exec("reset role");
		await db.query("delete from public.annuncio where uuid = $1", [id(3, 1)]);
		assert.equal(await count("annuncio_salvato"), 1);
		await db.query("delete from public.profilo where uuid = $1", [id(2, 2)]);
		assert.equal(await count("profilo_follow"), 0);
		await db.query("delete from public.profilo where uuid = $1", [id(2, 1)]);
		await db.query("delete from public.utente where utente_uuid = $1", [id(1, 1)]);
		assert.equal(await count("annuncio_salvato"), 0);
	});
});

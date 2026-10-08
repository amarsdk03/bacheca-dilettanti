import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20261008165007_verify_new_special_profile_accounts.sql", import.meta.url);
const accessMigrationUrl = new URL("../supabase/migrations/20261001160000_restricted_profiles_and_service_publication.sql", import.meta.url);
const id = number => `aaaaaaaa-aaaa-4aaa-8aaa-${String(number).padStart(12, "0")}`;

test("special profile creation verifies only new accounts atomically and preserves admin access guards", {
	skip: !existsSync(engineUrl) && "PGlite runner unavailable",
}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon; create role authenticated; create role service_role bypassrls;
			create schema private;
			create table public.utente (utente_uuid uuid primary key, registrato_il timestamptz);
			create table public.profilo (uuid uuid primary key, uuid_utente uuid references public.utente, confermato_il timestamptz, verificato_il timestamptz);
			create table public.restricted_profile_access (profile_id uuid references public.profilo, profile_type text);
			create table public.profilo_creator (uuid_profilo uuid primary key references public.profilo, nome_creator text);
			create table public.profilo_servizi_consulenze (uuid_profilo uuid primary key references public.profilo);
			create table public.profilo_giocatore (uuid_profilo uuid references public.profilo);
			grant usage on schema public, private to service_role;
			grant select, insert, update, delete on all tables in schema public to service_role;
			alter table public.profilo enable row level security;
			alter table public.profilo_creator enable row level security;
			alter table public.profilo_servizi_consulenze enable row level security;
		`);
		// Use the real pre-existing access guard, rather than reproducing its logic.
		const accessMigration = readFileSync(accessMigrationUrl, "utf8");
		await db.exec(accessMigration.match(/create function private\.assert_restricted_profile_access_v1\(\)[\s\S]*?\$\$;/)[0]);
		await db.exec(accessMigration.match(/create trigger restricted_service_profile_guard[\s\S]*?;/)[0]);
		await db.exec(accessMigration.match(/create trigger restricted_creator_profile_guard[\s\S]*?;/)[0]);
		for (let number = 1; number <= 7; number++) {
			await db.query("insert into public.utente values ($1, now())", [id(number)]);
			await db.query("insert into public.profilo(uuid, uuid_utente, confermato_il) values ($1, $1, '2026-10-01T10:00:00Z')", [id(number)]);
			if (number !== 5) {
				await db.query("insert into public.restricted_profile_access values ($1, 'creators'), ($1, 'servizi-consulenze')", [id(number)]);
			}
		}
		await db.query("update public.profilo set verificato_il = '2026-09-01T10:00:00Z' where uuid = $1", [id(3)]);
		await db.query("insert into public.profilo_creator values ($1, 'Creator esistente')", [id(4)]);
		await db.exec(readFileSync(migrationUrl, "utf8"));
		const verification = async number => (await db.query("select verificato_il from public.profilo where uuid = $1", [id(number)])).rows[0].verificato_il;
		assert.equal(await verification(4), null);
		await db.exec("set role service_role");
		await db.query("insert into public.profilo_creator(uuid_profilo) values ($1)", [id(1)]);
		await db.query("insert into public.profilo_servizi_consulenze values ($1)", [id(2)]);
		assert.ok(await verification(1));
		assert.ok(await verification(2));
		await db.query("insert into public.profilo_creator(uuid_profilo) values ($1)", [id(3)]);
		assert.equal(new Date(await verification(3)).toISOString(), "2026-09-01T10:00:00.000Z");
		await db.query("update public.profilo_creator set nome_creator = 'Aggiornato' where uuid_profilo = $1", [id(4)]);
		assert.equal(await verification(4), null);
		await assert.rejects(db.query("insert into public.profilo_creator(uuid_profilo) values ($1)", [id(5)]), /PROFILE_ACCESS_DENIED/);
		assert.equal(await verification(5), null);
		await db.query("insert into public.profilo_giocatore values ($1)", [id(6)]);
		assert.equal(await verification(6), null); // An access grant and an ordinary profile are insufficient.
		await db.exec("begin");
		await db.query("insert into public.profilo_creator(uuid_profilo) values ($1)", [id(7)]);
		assert.ok(await verification(7));
		await assert.rejects(db.query("insert into public.profilo_creator(uuid_profilo) values ($1)", [id(7)]), /duplicate key/);
		await db.exec("rollback");
		assert.equal(await verification(7), null);
		const firstVerification = await verification(1);
		await db.query("insert into public.profilo_servizi_consulenze values ($1)", [id(1)]);
		await db.query("delete from public.profilo_creator where uuid_profilo = $1", [id(1)]);
		assert.equal(new Date(await verification(1)).toISOString(), new Date(firstVerification).toISOString());
		assert.equal(new Date((await db.query("select confermato_il from public.profilo where uuid = $1", [id(1)])).rows[0].confermato_il).toISOString(), "2026-10-01T10:00:00.000Z");
		await db.exec("reset role; set role authenticated");
		await assert.rejects(db.query("insert into public.profilo_creator(uuid_profilo) values ($1)", [id(7)]), /permission denied/);
		await assert.rejects(db.query("select private.verify_new_special_profile_account_v1()"), /permission denied/);
	} finally {
		await db.close();
	}
});

import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260924193443_distinguish_profile_verification.sql", import.meta.url);
const uuid = (suffix) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(suffix).padStart(12, "0")}`;

for (const schema of ["legacy", "already-refactored"]) {
	test(`profile verification migration preserves ${schema} data and follows email confirmation`, {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
		const {PGlite} = await import(engineUrl.href);
		const db = await PGlite.create();
		try {
			await db.exec(`
				create role anon;
				create role authenticated;
				create role service_role bypassrls;
				create schema private;
				create schema auth;
				create table auth.users (id uuid primary key, email_confirmed_at timestamptz);
				create table public.utente (utente_uuid uuid primary key, auth_user_uuid uuid not null references auth.users(id));
				create table public.profilo (
					uuid uuid primary key,
					uuid_utente uuid references public.utente(utente_uuid),
					${schema === "legacy" ? "verificato_il timestamptz" : "confermato_il timestamptz, verificato_il timestamptz"}
				);
				insert into auth.users (id, email_confirmed_at) values
					('${uuid(1)}', '2026-09-01T10:00:00Z'),
					('${uuid(2)}', null),
					('${uuid(3)}', '2026-09-03T10:00:00Z');
				insert into public.utente (utente_uuid, auth_user_uuid) values
					('${uuid(1)}', '${uuid(1)}'),
					('${uuid(2)}', '${uuid(2)}'),
					('${uuid(3)}', '${uuid(3)}');
				insert into public.profilo (uuid, uuid_utente, ${schema === "legacy" ? "verificato_il" : "confermato_il, verificato_il"}) values
					('${uuid(11)}', '${uuid(1)}', ${schema === "legacy" ? "'2026-01-01T10:00:00Z'" : "'2026-01-01T10:00:00Z', '2026-02-01T10:00:00Z'"});
			`);
			await db.exec(readFileSync(migrationUrl, "utf8"));

			const current = (await db.query("select confermato_il, verificato_il from public.profilo where uuid = $1", [uuid(11)])).rows[0];
			assert.equal(new Date(current.confermato_il).toISOString(), "2026-09-01T10:00:00.000Z");
			assert.equal(current.verificato_il === null ? null : new Date(current.verificato_il).toISOString(), schema === "legacy" ? null : "2026-02-01T10:00:00.000Z");

			await db.query("insert into public.profilo (uuid, uuid_utente) values ($1, $2)", [uuid(12), uuid(2)]);
			assert.equal((await db.query("select confermato_il from public.profilo where uuid = $1", [uuid(12)])).rows[0].confermato_il, null);
			await db.query("update auth.users set email_confirmed_at = $1 where id = $2", ["2026-09-02T10:00:00Z", uuid(2)]);
			assert.equal(new Date((await db.query("select confermato_il from public.profilo where uuid = $1", [uuid(12)])).rows[0].confermato_il).toISOString(), "2026-09-02T10:00:00.000Z");
			await db.query("update auth.users set email_confirmed_at = null where id = $1", [uuid(2)]);
			assert.equal((await db.query("select confermato_il from public.profilo where uuid = $1", [uuid(12)])).rows[0].confermato_il, null);

			await db.query("insert into public.profilo (uuid) values ($1)", [uuid(13)]);
			await db.query("update public.profilo set uuid_utente = $1 where uuid = $2", [uuid(3), uuid(13)]);
			assert.equal(new Date((await db.query("select confermato_il from public.profilo where uuid = $1", [uuid(13)])).rows[0].confermato_il).toISOString(), "2026-09-03T10:00:00.000Z");
		} finally {
			await db.close();
		}
	});
}

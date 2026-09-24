import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260924173632_invitation_codes.sql", import.meta.url);
const userId = (suffix) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(suffix).padStart(12, "0")}`;

test("invitation migration attributes one verified registration and protects rewards", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role bypassrls;
			create schema private;
			create schema auth;
			create table auth.users (id uuid primary key, email text not null, email_confirmed_at timestamptz);
			create table public.utente (
				utente_uuid uuid primary key,
				auth_user_uuid uuid not null unique references auth.users(id),
				indirizzo_email text,
				registrato_il timestamptz
			);
			create function public.prepare_registration(p_email text, p_payload jsonb)
			returns uuid language sql security invoker set search_path = '' as $$
				select pg_catalog.gen_random_uuid()
			$$;
			create function private.provision_auth_user(p_user_id uuid, p_email text, p_payload jsonb default null)
			returns void language plpgsql security definer set search_path = '' as $$
			begin
				insert into public.utente (utente_uuid, auth_user_uuid, indirizzo_email, registrato_il)
				values (p_user_id, p_user_id, p_email, case when p_payload is null then null else now() end)
				on conflict (auth_user_uuid) do update set registrato_il = now();
			end;
			$$;
			insert into auth.users (id, email, email_confirmed_at)
			values ('${userId(1)}', 'inviter@example.test', now()),
			       ('${userId(2)}', 'publisher@example.test', now());
			insert into public.utente (utente_uuid, auth_user_uuid, indirizzo_email, registrato_il)
			values ('${userId(1)}', '${userId(1)}', 'inviter@example.test', now()),
			       ('${userId(2)}', '${userId(2)}', 'publisher@example.test', null);
		`);
		await db.exec(readFileSync(migrationUrl, "utf8"));

		const inviter = (await db.query("select codice_invito from public.utente where utente_uuid = $1", [userId(1)])).rows[0];
		assert.match(inviter.codice_invito, /^[0-9A-F]{16}$/);
		await assert.rejects(
			() => db.query("update public.utente set codice_invito = $1 where utente_uuid = $2", ["AAAAAAAAAAAAAAAA", userId(1)]),
			/INVITATION_CODE_IMMUTABLE/,
		);
		assert.equal((await db.query("select codice_invito from public.utente where utente_uuid = $1", [userId(2)])).rows[0].codice_invito, null);

		await assert.rejects(
			() => db.query("select public.prepare_registration($1, $2::jsonb)", ["new@example.test", JSON.stringify({inviteCode: "BADCODE"})]),
			/INVALID_INVITATION_CODE/,
		);
		await assert.rejects(
			() => db.query("select public.prepare_registration($1, $2::jsonb)", ["inviter@example.test", JSON.stringify({inviteCode: inviter.codice_invito})]),
			/INVALID_INVITATION_CODE/,
		);
		await db.query("select public.prepare_registration($1, $2::jsonb)", ["new@example.test", JSON.stringify({inviteCode: inviter.codice_invito.toLowerCase()})]);

		await db.query("insert into auth.users (id, email) values ($1, $2)", [userId(3), "new@example.test"]);
		await db.query("select private.provision_auth_user($1, $2, $3::jsonb)", [userId(3), "new@example.test", JSON.stringify({inviteCode: inviter.codice_invito})]);
		const pending = (await db.query("select * from public.invito where uuid_invitato = $1", [userId(3)])).rows[0];
		assert.equal(pending.uuid_invitante, userId(1));
		assert.equal(pending.codice_invito, inviter.codice_invito);
		assert.equal(pending.confermato_il, null);
		assert.equal(pending.considerato, false);
		await assert.rejects(() => db.query("update public.invito set considerato = true where uuid_invitato = $1", [userId(3)]), /invito_considerato_confermato_check/);

		await db.query("update auth.users set email_confirmed_at = now() where id = $1", [userId(3)]);
		await db.query("update auth.users set email_confirmed_at = email_confirmed_at where id = $1", [userId(3)]);
		const confirmed = (await db.query("select confermato_il, considerato from public.invito where uuid_invitato = $1", [userId(3)])).rows[0];
		assert.ok(confirmed.confermato_il instanceof Date);
		assert.equal(confirmed.considerato, false);
		assert.equal((await db.query("select count(*)::integer as total from public.invito where uuid_invitante = $1 and confermato_il is not null", [userId(1)])).rows[0].total, 1);
		await assert.rejects(
			() => db.query("select private.provision_auth_user($1, $2, $3::jsonb)", [userId(3), "new@example.test", JSON.stringify({inviteCode: inviter.codice_invito})]),
			/duplicate key value/,
		);
		assert.equal((await db.query("select count(*)::integer as total from public.invito where uuid_invitato = $1", [userId(3)])).rows[0].total, 1);
		await db.query("update public.invito set considerato = true where uuid_invitato = $1", [userId(3)]);
		assert.equal((await db.query("select count(*)::integer as total from public.invito where uuid_invitante = $1 and confermato_il is not null", [userId(1)])).rows[0].total, 1);
		await db.exec("set role authenticated");
		await assert.rejects(() => db.query("select * from public.invito"), /permission denied/);
		await db.exec("reset role");

		await db.query("insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())", [userId(4), "verified@example.test"]);
		await db.query("select private.provision_auth_user($1, $2, $3::jsonb)", [userId(4), "verified@example.test", JSON.stringify({inviteCode: inviter.codice_invito})]);
		assert.ok((await db.query("select confermato_il from public.invito where uuid_invitato = $1", [userId(4)])).rows[0].confermato_il instanceof Date);

		await db.query("insert into auth.users (id, email, email_confirmed_at) values ($1, $2, now())", [userId(5), "plain@example.test"]);
		await db.query("select private.provision_auth_user($1, $2, $3::jsonb)", [userId(5), "plain@example.test", JSON.stringify({})]);
		assert.match((await db.query("select codice_invito from public.utente where utente_uuid = $1", [userId(5)])).rows[0].codice_invito, /^[0-9A-F]{16}$/);
		assert.equal((await db.query("select count(*)::integer as total from public.invito where uuid_invitato = $1", [userId(5)])).rows[0].total, 0);
	} finally {
		await db.close();
	}
});

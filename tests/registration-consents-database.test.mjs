import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260923105600_registration_legal_and_newsletter_consents.sql", import.meta.url);

const userId = (suffix) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(suffix).padStart(12, "0")}`;
const consents = (legalAccepted, newsletterSubscribed) => ({
	legalAccepted,
	newsletterSubscribed,
	termsVersion: "2026-09-23",
	privacyVersion: "2026-09-23",
	cookiePolicyVersion: "2026-09-23",
});

test("registration consent migration on isolated PostgreSQL", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role bypassrls;
			create schema private;
			create table public.utente (
				utente_uuid uuid primary key default gen_random_uuid(),
				auth_user_uuid uuid not null unique,
				indirizzo_email text,
				num_telefono text,
				tipologia_utente text not null default 'Utente',
				registrato_il timestamptz,
				creato_il timestamptz not null default now(),
				ultima_modifica_il timestamptz not null default now()
			);
			create function private.provision_auth_user(p_user_id uuid, p_email text, p_payload jsonb default null)
			returns void language plpgsql security definer set search_path = '' as $$
			begin
				insert into public.utente (auth_user_uuid, indirizzo_email, registrato_il)
				values (p_user_id, p_email, case when p_payload is null then null else now() end)
				on conflict (auth_user_uuid) do update set
					registrato_il = case when p_payload is null then public.utente.registrato_il else now() end;
			end;
			$$;
		`);
		await db.exec(readFileSync(migrationUrl, "utf8"));

		await db.query("select private.provision_auth_user($1, $2, $3::jsonb)", [
			userId(1), "subscribed@example.test", JSON.stringify({consents: consents(true, true)}),
		]);
		const registered = (await db.query(`
			select consenso_newsletter, consenso_newsletter_aggiornato_il,
				informative_accettate_il, versione_termini, versione_privacy, versione_cookie_policy
			from public.utente where auth_user_uuid = $1
		`, [userId(1)])).rows[0];
		assert.equal(registered.consenso_newsletter, true);
		assert.ok(registered.consenso_newsletter_aggiornato_il instanceof Date);
		assert.ok(registered.informative_accettate_il instanceof Date);
		assert.deepEqual(
			[registered.versione_termini, registered.versione_privacy, registered.versione_cookie_policy],
			["2026-09-23", "2026-09-23", "2026-09-23"],
		);

		await assert.rejects(
			() => db.query("select private.provision_auth_user($1, $2, $3::jsonb)", [
				userId(2), "invalid@example.test", JSON.stringify({consents: consents(false, true)}),
			]),
			/INVALID_REGISTRATION_CONSENTS/,
		);
		assert.equal((await db.query("select count(*)::integer as count from public.utente where auth_user_uuid = $1", [userId(2)])).rows[0].count, 0);

		await db.query("select private.provision_auth_user($1, $2, null)", [userId(3), "existing@example.test"]);
		const existing = (await db.query("select consenso_newsletter, informative_accettate_il from public.utente where auth_user_uuid = $1", [userId(3)])).rows[0];
		assert.equal(existing.consenso_newsletter, false);
		assert.equal(existing.informative_accettate_il, null);
	} finally {
		await db.close();
	}
});

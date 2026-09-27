import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260926180000_player_profile_fields.sql", import.meta.url);

test("player migration keeps historical preferences and saves new fields independently", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema private;
			create table public.profilo_giocatore (
				uuid_profilo uuid primary key, categorie_ricercate text[], disponibilita text,
				piede_principale text
			);
			insert into public.profilo_giocatore values
				('11111111-1111-4111-8111-111111111111', array['Calcio 11 (Maschile)::Eccellenza'], 'disponibile-subito', 'Ambipiede');
		`);
		const migration = readFileSync(migrationUrl, "utf8");
		await db.exec(migration);
		const previous = (await db.query("select categorie_ricercate, categoria_attuale, genere, nazionalita, disponibilita, piede_principale from public.profilo_giocatore")).rows[0];
		assert.deepEqual(previous.categorie_ricercate, ["Calcio 11 (Maschile)::Eccellenza"]);
		assert.equal(previous.categoria_attuale, null);
		assert.equal(previous.genere, null);
		assert.equal(previous.disponibilita, "svincolato");
		assert.equal(previous.piede_principale, "Ambidestro");
		const profileId = "11111111-1111-4111-8111-111111111111";
		await db.query("select private.save_player_step04_fields_v1($1::uuid, $2::jsonb)", [profileId, JSON.stringify({genere: "Maschio", anno_nascita: "2000", disponibilita: "sotto-contratto", categoria_attuale: "Calcio 11 (Maschile)::Serie D", nazionalita: "IT"})]);
		let fields = (await db.query("select categoria_attuale, genere, nazionalita from public.profilo_giocatore")).rows[0];
		assert.deepEqual(fields, {categoria_attuale: "Calcio 11 (Maschile)::Serie D", genere: "Maschio", nazionalita: "IT"});
		await db.query("select private.save_player_step04_fields_v1($1::uuid, $2::jsonb)", [profileId, JSON.stringify({genere: "Maschio", anno_nascita: "2000", disponibilita: "svincolato", categoria_attuale: "Calcio 11 (Maschile)::Serie D", nazionalita: "IT"})]);
		fields = (await db.query("select categoria_attuale, categorie_ricercate from public.profilo_giocatore")).rows[0];
		assert.equal(fields.categoria_attuale, null);
		assert.deepEqual(fields.categorie_ricercate, ["Calcio 11 (Maschile)::Eccellenza"]);
		await assert.rejects(() => db.query("select private.save_player_step04_fields_v1($1::uuid, $2::jsonb)", [profileId, JSON.stringify({genere: null, anno_nascita: "", disponibilita: ""})]), /INVALID_PLAYER_PROFILE/);
		await db.exec(`
			create schema auth;
			create function auth.uid() returns uuid language sql stable as $$ select '22222222-2222-4222-8222-222222222222'::uuid $$;
			create table public.profilo (uuid uuid, uuid_utente uuid);
			insert into public.profilo values ('11111111-1111-4111-8111-111111111111', auth.uid());
			create function private.save_owned_subprofile_core_v1(uuid, text, jsonb, jsonb)
			returns jsonb language sql as $$ select '{}'::jsonb $$;
			create function private.save_player_highlights_for_profile_v1(uuid, text, jsonb)
			returns void language plpgsql as $$ begin null; end; $$;
			create function private.save_player_highlights_request_for_profile_v1(uuid, text, boolean)
			returns void language plpgsql as $$ begin null; end; $$;
			create function private.publish_announcement_core_v2(uuid, jsonb, text, text, text)
			returns jsonb language sql as $$ select '{"status":"success","idempotent":false}'::jsonb $$;
			create function private.sync_profile_social_links_v1(uuid, text, jsonb)
			returns void language plpgsql as $$ begin null; end; $$;
			create table private.announcement_submission (submission_id uuid, announcement_id uuid);
			create table public.annuncio (uuid uuid, autore_annuncio uuid);
			insert into public.annuncio values ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111');
			insert into private.announcement_submission values ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333');
		`);
		await db.query("select private.save_owned_subprofile_internal_v1($1::uuid, 'giocatore', $2::jsonb, '[]'::jsonb)", ["22222222-2222-4222-8222-222222222222", JSON.stringify({genere: "Femmina", anno_nascita: "2001", disponibilita: "sotto-contratto", categoria_attuale: "Calcio 11 (Femminile)::Serie A Femminile", nazionalita: "IT"})]);
		assert.equal((await db.query("select genere from public.profilo_giocatore")).rows[0].genere, "Femmina");
		await db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, '2026-09-23', '2026-09-23', 'gratuito')", ["44444444-4444-4444-8444-444444444444", JSON.stringify({profile_type: "giocatore", profile_draft: {genere: "Maschio", anno_nascita: "2000", disponibilita: "svincolato", categoria_attuale: "Calcio 11 (Maschile)::Serie D", nazionalita: "IT"}})]);
		assert.deepEqual((await db.query("select genere, categoria_attuale from public.profilo_giocatore")).rows[0], {genere: "Maschio", categoria_attuale: null});
		assert.match(migration, /function private\.save_owned_subprofile_internal_v1[\s\S]*?save_player_step04_fields_v1\(v_profile_id, p_draft\)/);
		assert.match(migration, /function public\.publish_announcement_v2[\s\S]*?save_player_step04_fields_v1\(v_profile_id, v_draft\)/);
	} finally {
		await db.close();
	}
});

import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260926205141_team_player_year_range.sql", import.meta.url);

test("year range migration preserves non-contiguous legacy years and writes both bounds through publication", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema private;
			create schema auth;
			create function auth.uid() returns uuid language sql stable as $$ select '22222222-2222-4222-8222-222222222222'::uuid $$;
			create table public.annuncio_squadra_cerca_giocatore (
				uuid_annuncio uuid primary key, annate_ricercate text[]
			);
			insert into public.annuncio_squadra_cerca_giocatore values
				('11111111-1111-4111-8111-111111111111', array['2004', '2007']),
				('33333333-3333-4333-8333-333333333333', array[]::text[]);
			create table private.announcement_submission (submission_id uuid, announcement_id uuid);
			insert into private.announcement_submission values
				('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333');
			create table public.annuncio (uuid uuid, autore_annuncio uuid);
			insert into public.annuncio values
				('33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555');
			create function private.publish_announcement_core_v2(uuid, jsonb, text, text, text)
			returns jsonb language sql as $$ select '{"status":"success","idempotent":false}'::jsonb $$;
		`);
		await db.exec(readFileSync(migrationUrl, "utf8"));
		const legacy = (await db.query("select annate_ricercate, annata_da, annata_a from public.annuncio_squadra_cerca_giocatore where uuid_annuncio = '11111111-1111-4111-8111-111111111111'")).rows[0];
		assert.deepEqual(legacy, {annate_ricercate: ["2004", "2007"], annata_da: null, annata_a: null});
		await assert.rejects(() => db.query("select private.save_team_player_year_range_step06_v1($1::uuid, $2::jsonb)", ["44444444-4444-4444-8444-444444444444", JSON.stringify({annata_da: "2007", annata_a: "2004", annate_ricercate: []})]), /INVALID_TEAM_PLAYER_YEARS/);
		await db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, '2026-09-23', '2026-09-23', 'gratuito')", ["44444444-4444-4444-8444-444444444444", JSON.stringify({profile_type: "squadra", announcement_type: "annuncio_squadra_cerca_giocatore", detail: {annata_da: "2004", annata_a: "2008", annate_ricercate: []}})]);
		const published = (await db.query("select annate_ricercate, annata_da, annata_a from public.annuncio_squadra_cerca_giocatore where uuid_annuncio = '33333333-3333-4333-8333-333333333333'")).rows[0];
		assert.deepEqual(published, {annate_ricercate: [], annata_da: 2004, annata_a: 2008});
		await assert.rejects(() => db.query("update public.annuncio_squadra_cerca_giocatore set annata_a = null where uuid_annuncio = '33333333-3333-4333-8333-333333333333'"), /annuncio_squadra_cerca_giocatore_annate_intervallo_check/);
		await db.query("select private.save_team_player_year_range_step06_v1($1::uuid, $2::jsonb)", ["44444444-4444-4444-8444-444444444444", JSON.stringify({annata_da: null, annata_a: null, annate_ricercate: []})]);
		assert.deepEqual((await db.query("select annata_da, annata_a from public.annuncio_squadra_cerca_giocatore where uuid_annuncio = '33333333-3333-4333-8333-333333333333'")).rows[0], {annata_da: null, annata_a: null});
	} finally {
		await db.close();
	}
});

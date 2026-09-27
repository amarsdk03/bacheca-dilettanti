import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260926210517_team_staff_search_fields.sql", import.meta.url);

test("staff search migration preserves legacy text and dates and saves selected figures with season", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon; create role authenticated; create role service_role;
			create schema private; create schema auth;
			create function auth.uid() returns uuid language sql stable as $$ select '22222222-2222-4222-8222-222222222222'::uuid $$;
			create table public.annuncio_squadra_cerca_staff (
				uuid_annuncio uuid primary key, figura_ricercata text, periodo_dal date, periodo_al date
			);
			insert into public.annuncio_squadra_cerca_staff values
				('11111111-1111-4111-8111-111111111111', 'Responsabile tecnico', '2026-10-01', '2027-06-30'),
				('33333333-3333-4333-8333-333333333333', 'Allenatore', null, null);
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
		const legacy = (await db.query("select figura_ricercata, figure_ricercate, stagione, periodo_dal::text, periodo_al::text from public.annuncio_squadra_cerca_staff where uuid_annuncio = '11111111-1111-4111-8111-111111111111'")).rows[0];
		assert.deepEqual(legacy, {figura_ricercata: "Responsabile tecnico", figure_ricercate: null, stagione: null, periodo_dal: "2026-10-01", periodo_al: "2027-06-30"});
		const submission = "44444444-4444-4444-8444-444444444444";
		const detail = {figura_ricercata: "Allenatore", figure_ricercate: ["Allenatore", "Preparatore atletico"], stagione: "2026/27"};
		await assert.rejects(() => db.query("select private.save_team_staff_search_step07_v1($1::uuid, $2::jsonb)", [submission, JSON.stringify({...detail, periodo_dal: "2026-10-01"})]), /INVALID_TEAM_STAFF_SEARCH/);
		await db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, '2026-09-23', '2026-09-23', 'gratuito')", [submission, JSON.stringify({profile_type: "squadra", announcement_type: "annuncio_squadra_cerca_staff", detail})]);
		const published = (await db.query("select figure_ricercate, stagione, periodo_dal, periodo_al from public.annuncio_squadra_cerca_staff where uuid_annuncio = '33333333-3333-4333-8333-333333333333'")).rows[0];
		assert.deepEqual(published, {figure_ricercate: ["Allenatore", "Preparatore atletico"], stagione: "2026/27", periodo_dal: null, periodo_al: null});
	} finally {
		await db.close();
	}
});

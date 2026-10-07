import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const profileMigrationUrl = new URL("../supabase/migrations/20260926220000_staff_profile_experiences.sql", import.meta.url);
const announcementMigrationUrl = new URL("../supabase/migrations/20260927002300_staff_announcement_catalog.sql", import.meta.url);

function staffCategoryKeys() {
	// This test exercises the historical migration, whose catalogue is frozen.
	return [...readFileSync(announcementMigrationUrl, "utf8").matchAll(/\('([^']+)', array\[([^\]]+)\]\)/g)].flatMap(([, group, options]) =>
		[...options.matchAll(/'([^']+)'/g)].map(([, option]) => `${group}::${option}`),
	);
}

test("Staff publication RPC accepts Catalog C and Da valutare but rejects other categories", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema private;
			create schema auth;
			create function auth.uid() returns uuid language sql as $$ select '11111111-1111-4111-8111-111111111111'::uuid $$;
			create table public.profilo (uuid uuid primary key, uuid_utente uuid);
			create table public.profilo_staff_sportivo (uuid_profilo uuid primary key, storico_esperienze jsonb);
			create table public.annuncio (uuid uuid primary key, autore_annuncio uuid);
			create table public.annuncio_staff_sportivo (uuid_annuncio uuid primary key, lista_esperienze jsonb);
			create table private.announcement_submission (submission_id uuid primary key, announcement_id uuid);
			create function private.publish_announcement_core_v2(uuid, jsonb, text, text, text) returns jsonb
			language sql as $$ select '{"status":"success","idempotent":true}'::jsonb $$;
		`);
		await db.exec(readFileSync(profileMigrationUrl, "utf8"));
		await db.exec(readFileSync(announcementMigrationUrl, "utf8"));
		const valid = {categorie_ricercate: ["Calcio 5 (Maschile)::Serie A", "Calcio 5 (Femminile)::Serie A"], disponibilita_spostamento: "Da valutare"};
		assert.equal((await db.query("select private.staff_step11_detail_is_valid($1::jsonb) as valid", [JSON.stringify(valid)])).rows[0].valid, true);
		const allStaffCategories = staffCategoryKeys();
		assert.equal(allStaffCategories.length, 40);
		assert.equal((await db.query("select private.staff_step11_detail_is_valid($1::jsonb) as valid", [JSON.stringify({...valid, categorie_ricercate: allStaffCategories.slice(0, 32)})])).rows[0].valid, true);
		assert.equal((await db.query("select private.staff_step11_detail_is_valid($1::jsonb) as valid", [JSON.stringify({...valid, categorie_ricercate: allStaffCategories.slice(32)})])).rows[0].valid, true);
		for (const category of ["Calcio 11 (Maschile)::Primavera 1", "Serie A", "Calcio 5 (Maschile)::Serie A Femminile"]) {
			assert.equal((await db.query("select private.staff_step11_detail_is_valid($1::jsonb) as valid", [JSON.stringify({...valid, categorie_ricercate: [category]})])).rows[0].valid, false);
		}
		assert.equal((await db.query("select private.staff_step11_detail_is_valid($1::jsonb) as valid", [JSON.stringify({...valid, disponibilita_spostamento: "Forse"})])).rows[0].valid, false);
		const invalidPayload = {announcement_type: "annuncio_staff_sportivo", detail: {...valid, categorie_ricercate: ["Calcio 11 (Maschile)::Primavera 1"]}};
		await assert.rejects(() => db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, 'terms', 'privacy', 'gratuito')", ["22222222-2222-4222-8222-222222222222", JSON.stringify(invalidPayload)]), /INVALID_STAFF_ANNOUNCEMENT_DETAIL/);
	} finally {
		await db.close();
	}
});

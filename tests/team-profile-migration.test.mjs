import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260926190000_team_profile_fields.sql", import.meta.url);

test("team migration keeps legacy sports and only stores explicitly selected current category", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema private;
			create table public.profilo_squadra (
				uuid_profilo uuid primary key, tipologie_sport text[], sede_principale text
			);
			insert into public.profilo_squadra values
				('11111111-1111-4111-8111-111111111111', array['Calcio 5', 'Calcio 11'], 'Roma');
		`);
		const migration = readFileSync(migrationUrl, "utf8");
		await db.exec(migration);
		let row = (await db.query("select tipologie_sport, categoria_attuale from public.profilo_squadra")).rows[0];
		assert.deepEqual(row, {tipologie_sport: ["Calcio 5", "Calcio 11"], categoria_attuale: null});
		const profileId = "11111111-1111-4111-8111-111111111111";
		await assert.rejects(() => db.query("select private.save_team_step05_fields_v1($1::uuid, $2::jsonb)", [profileId, JSON.stringify({tipologie_sport: ["Calcio 5", "Calcio 11"], categoria_attuale: null})]), /INVALID_TEAM_PROFILE/);
		await db.query("select private.save_team_step05_fields_v1($1::uuid, $2::jsonb)", [profileId, JSON.stringify({tipologie_sport: ["Calcio 11"], categoria_attuale: "Calcio 11 (Maschile)::Eccellenza"})]);
		row = (await db.query("select tipologie_sport, categoria_attuale from public.profilo_squadra")).rows[0];
		assert.deepEqual(row, {tipologie_sport: ["Calcio 5", "Calcio 11"], categoria_attuale: "Calcio 11 (Maschile)::Eccellenza"});
		assert.match(migration, /save_team_step05_fields_v1\(v_profile_id, p_draft\)/);
		assert.match(migration, /save_team_step05_fields_v1\(v_profile_id, v_draft\)/);
	} finally {
		await db.close();
	}
});

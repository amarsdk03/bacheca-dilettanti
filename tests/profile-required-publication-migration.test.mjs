import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260927040000_enforce_current_player_team_profile_fields.sql", import.meta.url);

test("publication validates persisted Player and Team profiles without a draft", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	const playerId = "11111111-1111-4111-8111-111111111111";
	const teamId = "22222222-2222-4222-8222-222222222222";
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema private;
			create table public.localita_profilo (uuid_profilo uuid, sottoprofilo text, regione text, citta text);
			create table public.profilo_giocatore (uuid_profilo uuid, nascosto boolean, nome text, genere text, anno_nascita text, disponibilita text, tipologie_sport text[], ruoli_sport jsonb);
			create table public.profilo_squadra (uuid_profilo uuid, nascosto boolean, nome_societa text, tipologie_sport text[]);
			create function private.facility_step13_location_is_valid(uuid) returns boolean language sql as $$ select true $$;
		`);
		await db.exec(readFileSync(migrationUrl, "utf8"));
		await db.query("insert into public.localita_profilo values ($1, 'giocatore', 'Lazio', 'Roma'), ($2, 'squadra', 'Lazio', 'Roma')", [playerId, teamId]);
		await db.query("insert into public.profilo_giocatore values ($1, false, 'Mario', 'Maschio', '2000', 'svincolato', array['Calcio 11'], $2::jsonb)", [playerId, JSON.stringify({principali: ["Difensore"]})]);
		await db.query("insert into public.profilo_squadra values ($1, false, 'Squadra Roma', array['Calcio 11', 'Calcio 5'])", [teamId]);

		await db.query("select private.assert_required_subprofile_fields_v1($1::uuid, 'giocatore')", [playerId]);
		await db.query("update public.profilo_giocatore set genere = null where uuid_profilo = $1", [playerId]);
		await assert.rejects(db.query("select private.assert_required_subprofile_fields_v1($1::uuid, 'giocatore')", [playerId]), /PROFILE_REQUIRED_FIELDS_MISSING/);
		await db.query("update public.profilo_giocatore set genere = 'Maschio', anno_nascita = '1880' where uuid_profilo = $1", [playerId]);
		await assert.rejects(db.query("select private.assert_required_subprofile_fields_v1($1::uuid, 'giocatore')", [playerId]), /PROFILE_REQUIRED_FIELDS_MISSING/);
		await db.query("update public.profilo_giocatore set anno_nascita = '2000', disponibilita = 'disponibile-subito' where uuid_profilo = $1", [playerId]);
		await assert.rejects(db.query("select private.assert_required_subprofile_fields_v1($1::uuid, 'giocatore')", [playerId]), /PROFILE_REQUIRED_FIELDS_MISSING/);

		await assert.rejects(db.query("select private.assert_required_subprofile_fields_v1($1::uuid, 'squadra')", [teamId]), /PROFILE_REQUIRED_FIELDS_MISSING/);
		assert.deepEqual((await db.query("select tipologie_sport from public.profilo_squadra where uuid_profilo = $1", [teamId])).rows[0].tipologie_sport, ["Calcio 11", "Calcio 5"]);
		await db.query("update public.profilo_squadra set tipologie_sport = array['Calcio 11'] where uuid_profilo = $1", [teamId]);
		await db.query("select private.assert_required_subprofile_fields_v1($1::uuid, 'squadra')", [teamId]);
	} finally {
		await db.close();
	}
});

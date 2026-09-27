import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260927050000_repair_team_player_year_range.sql", import.meta.url);

test("repair restores skipped year-range fields without replacing a later publication wrapper", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	const legacyId = "11111111-1111-4111-8111-111111111111";
	const currentId = "33333333-3333-4333-8333-333333333333";
	const submissionId = "44444444-4444-4444-8444-444444444444";
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema private;
			create table public.annuncio_squadra_cerca_giocatore (uuid_annuncio uuid primary key, annate_ricercate text[]);
			create table public.annuncio_squadra_cerca_staff (figure_ricercate text[]);
			create table public.annuncio_campo_impianto (indirizzo text);
			create table private.announcement_submission (submission_id uuid, announcement_id uuid);
			create function public.publish_announcement_v2(uuid, jsonb, text, text, text)
			returns jsonb language plpgsql as $$
			begin
				perform private.save_team_player_year_range_step06_v1($1, $2 -> 'detail');
				return '{"status":"success"}'::jsonb;
			end;
			$$;
		`);
		await db.query("insert into public.annuncio_squadra_cerca_giocatore values ($1, array['2004', '2007']), ($2, array[]::text[])", [legacyId, currentId]);
		await db.query("insert into private.announcement_submission values ($1, $2)", [submissionId, currentId]);
		const wrapperDefinition = (await db.query("select pg_get_functiondef('public.publish_announcement_v2(uuid,jsonb,text,text,text)'::regprocedure) as definition")).rows[0].definition;

		await db.exec(readFileSync(migrationUrl, "utf8"));
		const repairedDefinition = (await db.query("select pg_get_functiondef('public.publish_announcement_v2(uuid,jsonb,text,text,text)'::regprocedure) as definition")).rows[0].definition;
		assert.equal(repairedDefinition, wrapperDefinition);
		assert.deepEqual((await db.query("select annate_ricercate, annata_da, annata_a from public.annuncio_squadra_cerca_giocatore where uuid_annuncio = $1", [legacyId])).rows[0], {
			annate_ricercate: ["2004", "2007"], annata_da: null, annata_a: null,
		});

		const payload = {detail: {annata_da: "2004", annata_a: "2008", annate_ricercate: []}};
		await db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, '', '', '')", [submissionId, JSON.stringify(payload)]);
		assert.deepEqual((await db.query("select annate_ricercate, annata_da, annata_a from public.annuncio_squadra_cerca_giocatore where uuid_annuncio = $1", [currentId])).rows[0], {
			annate_ricercate: [], annata_da: 2004, annata_a: 2008,
		});
		await assert.rejects(
			db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, '', '', '')", [submissionId, JSON.stringify({detail: {annata_da: "2008", annata_a: "2004", annate_ricercate: []}})]),
			/INVALID_TEAM_PLAYER_YEARS/,
		);
		await assert.rejects(
			db.query("update public.annuncio_squadra_cerca_giocatore set annata_a = null where uuid_annuncio = $1", [currentId]),
			/annuncio_squadra_cerca_giocatore_annate_intervallo_check/,
		);
		await db.exec(readFileSync(migrationUrl, "utf8"));
		assert.equal((await db.query("select pg_get_functiondef('public.publish_announcement_v2(uuid,jsonb,text,text,text)'::regprocedure) as definition")).rows[0].definition, wrapperDefinition);
		assert.deepEqual((await db.query("select annata_da, annata_a from public.annuncio_squadra_cerca_giocatore where uuid_annuncio = $1", [currentId])).rows[0], {
			annata_da: 2004, annata_a: 2008,
		});
	} finally {
		await db.close();
	}
});

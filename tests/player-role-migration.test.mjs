import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260921212157_normalize_player_roles.sql", import.meta.url);

test("player-role migration canonicalizes and deduplicates legacy roles", {skip: !existsSync(engineUrl) && "Optional PGlite runner is not installed"}, async (t) => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	t.after(() => db.close());
	await db.exec(`
		create table public.profilo_giocatore (id bigint primary key, ruoli_sport jsonb);
		create table public.annuncio_giocatore (id bigint primary key, ruoli_secondari text[]);
		create table public.annuncio_squadra_cerca_giocatore (id bigint primary key, ruoli_secondari text[]);
		insert into public.profilo_giocatore values (
			1,
			'{"principali":["Attaccante","Centrocampista"],"specifici":["Centravanti","Punta centrale","Centrocampista sinistro","Esterno sinistro","Seconda punta"]}'
		);
		insert into public.annuncio_giocatore values (
			1,
			array['Libero','Difensore centrale','Attaccante destro / Seconda punta destra','Ala destra']
		);
		insert into public.annuncio_squadra_cerca_giocatore values (
			1,
			array['Centrocampista centrale','Centrale','Esterno destro a tutta fascia']
		);
	`);
	const migration = readFileSync(migrationUrl, "utf8");
	await db.exec(migration);
	await db.exec(migration);

	const profile = (await db.query("select ruoli_sport from public.profilo_giocatore where id = 1")).rows[0];
	assert.deepEqual(profile.ruoli_sport, {
		principali: ["Attaccante", "Centrocampista"],
		specifici: ["Punta centrale", "Esterno sinistro", "Seconda Punta"],
	});
	assert.deepEqual(
		(await db.query("select ruoli_secondari from public.annuncio_giocatore where id = 1")).rows[0].ruoli_secondari,
		["Difensore centrale", "Ala destra"],
	);
	assert.deepEqual(
		(await db.query("select ruoli_secondari from public.annuncio_squadra_cerca_giocatore where id = 1")).rows[0].ruoli_secondari,
		["Centrale", "Esterno destro"],
	);
});

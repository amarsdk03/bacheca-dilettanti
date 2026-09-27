import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260921212157_normalize_player_roles.sql", import.meta.url);
const taxonomyMigrationUrl = new URL("../supabase/migrations/20260926170135_normalize_soccer_types_and_player_roles.sql", import.meta.url);

test("player-role migration canonicalizes and deduplicates legacy roles", {skip: !existsSync(engineUrl) && "Optional PGlite runner is not installed"}, async (t) => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	t.after(() => db.close());
	await db.exec(`
		create table public.profilo_giocatore (id bigint primary key, ruoli_sport jsonb, tipologie_sport text[]);
		create table public.annuncio_giocatore (id bigint primary key, ruoli_secondari text[], tipologie_sport text[]);
		create table public.annuncio_professionista_studente (tipologie_sport jsonb);
		create table public.annuncio_squadra_cerca_giocatore (id bigint primary key, ruoli_secondari text[], tipologie_sport text[]);
		create table public.annuncio_arbitro (tipologie_sport text[]);
		create table public.annuncio_campo_impianto (tipologie_sport text[]);
		create table public.annuncio_staff_sportivo (tipologie_sport text[]);
		create table public.annuncio_torneo_evento (tipologie_sport text[]);
		create table public.profilo_campi_impianti (tipologie_sport text[]);
		create table public.profilo_professionista_studente (tipologie_sport text[]);
		create table public.profilo_squadra (tipologie_sport text[]);
		create table public.profilo_torneo_evento (tipologie_sport text[]);
		insert into public.profilo_giocatore values (
			1,
			'{"principali":["Attaccante","Centrocampista"],"specifici":["Centravanti","Punta centrale","Centrocampista sinistro","Esterno sinistro","Seconda punta"]}',
			array['Calcio a 11','Calcio 5']
		);
		insert into public.annuncio_giocatore values (
			1,
			array['Libero','Difensore centrale','Attaccante destro / Seconda punta destra','Ala destra'],
			array['Calcio a 8']
		);
		insert into public.annuncio_squadra_cerca_giocatore values (
			1,
			array['Centrocampista centrale','Centrale','Esterno destro a tutta fascia'],
			array['Calcio a 7']
		);
		insert into public.annuncio_arbitro values (array['Calcio a 5']);
		insert into public.annuncio_professionista_studente values ('["Calcio a 11", "Calcio 5"]'::jsonb);
		insert into public.annuncio_campo_impianto values (array['Calcio a 11']);
		insert into public.annuncio_staff_sportivo values (array['Calcio a 8']);
		insert into public.annuncio_torneo_evento values (array['Calcio a 7']);
		insert into public.profilo_campi_impianti values (array['Calcio a 5']);
		insert into public.profilo_professionista_studente values (array['Calcio a 11']);
		insert into public.profilo_squadra values (array['Calcio a 8']);
		insert into public.profilo_torneo_evento values (array['Calcio a 7']);
	`);
	const migration = readFileSync(migrationUrl, "utf8");
	await db.exec(migration);
	await db.exec(migration);
	const taxonomyMigration = readFileSync(taxonomyMigrationUrl, "utf8");
	await db.exec(taxonomyMigration);
	await db.exec(taxonomyMigration);

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
		["Centrocampista Centrale", "Esterno destro"],
	);
	assert.deepEqual(
		(await db.query("select tipologie_sport from public.profilo_giocatore where id = 1")).rows[0].tipologie_sport,
		["Calcio 11", "Calcio 5"],
	);
	assert.deepEqual(
		(await db.query("select tipologie_sport from public.annuncio_giocatore where id = 1")).rows[0].tipologie_sport,
		["Calcio 8"],
	);
	assert.deepEqual(
		(await db.query("select tipologie_sport from public.annuncio_professionista_studente")).rows[0].tipologie_sport,
		["Calcio 11", "Calcio 5"],
	);
});

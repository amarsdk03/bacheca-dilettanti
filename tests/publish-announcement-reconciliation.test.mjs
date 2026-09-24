import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const originalUrl = new URL("../supabase/migrations/20260824195350_publish_announcement_workflow.sql", import.meta.url);
const wrapperUrl = new URL("../supabase/migrations/20260923222553_enforce_required_subprofile_fields.sql", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260924122000_reconcile_publish_dates_and_profile_snapshots.sql", import.meta.url);

function functionSql(source, name) {
	const start = source.indexOf(`create or replace function ${name}(`);
	assert.notEqual(start, -1, `Missing ${name}`);
	const suffix = source.slice(start);
	const match = /\r?\n\$\$;/.exec(suffix);
	assert.ok(match, `Missing function terminator for ${name}`);
	return suffix.slice(0, match.index + match[0].length);
}

test("publication reconciliation casts typed fields and refreshes updated profile snapshots", {
	skip: !existsSync(engineUrl) && "PGlite runner unavailable",
}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema private;
			create table private.announcement_submission (submission_id uuid);
			create table public.annuncio (uuid uuid primary key, autore_annuncio uuid not null);
			create table public.annuncio_squadra_cerca_staff (periodo_dal date, periodo_al date);
			create table public.annuncio_squadra_cerca_partita (
				periodo_dal date, periodo_al date,
				orario_dalle time without time zone, orario_alle time without time zone
			);
			create table public.profilo_giocatore (uuid_profilo uuid, tipologie_sport text[], ruoli_sport jsonb);
			create table public.annuncio_giocatore (uuid_annuncio uuid, tipologie_sport text[], ruoli_principali text[], ruoli_secondari text[]);
			create table public.profilo_squadra (uuid_profilo uuid, tipologie_sport text[]);
			create table public.annuncio_squadra_cerca_giocatore (uuid_annuncio uuid, tipologie_sport text[]);
			create table public.profilo_staff_sportivo (uuid_profilo uuid, figure_professionali text[], storico_esperienze jsonb, disponibilita text);
			create table public.annuncio_staff_sportivo (uuid_annuncio uuid, figure_professionali text[], lista_esperienze jsonb, disponibilita_occupazione text);
			create table public.profilo_arbitro (uuid_profilo uuid, storico_esperienze jsonb, disponibilita text);
			create table public.annuncio_arbitro (uuid_annuncio uuid, lista_esperienze jsonb, disponibilita_occupazione text);
		`);
		const original = readFileSync(originalUrl, "utf8");
		const core = functionSql(original, "public.publish_announcement_v1")
			.replace("function public.publish_announcement_v1(", "function public.publish_announcement_core_v1(")
			.replaceAll("2026-08-24", "2026-09-23");
		await db.exec(core);
		const wrapper = functionSql(readFileSync(wrapperUrl, "utf8"), "public.publish_announcement_v1");
		await db.exec(wrapper);
		await db.exec(readFileSync(migrationUrl, "utf8"));

		const coreDefinition = (await db.query("select pg_get_functiondef('public.publish_announcement_core_v1(uuid,jsonb,text,text)'::regprocedure) as sql")).rows[0].sql;
		assert.equal((coreDefinition.match(/::date,/g) ?? []).length, 4);
		assert.equal((coreDefinition.match(/::time,/g) ?? []).length, 2);
		assert.equal((coreDefinition.match(/not private\.publish_iso_date_is_valid_v1/g) ?? []).length, 4);
		const wrapperDefinition = (await db.query("select pg_get_functiondef('public.publish_announcement_v1(uuid,jsonb,text,text)'::regprocedure) as sql")).rows[0].sql;
		assert.match(wrapperDefinition, /perform private\.sync_published_profile_snapshot_v1\(v_announcement_id, v_profile_type\)/);

		const dates = await db.query(`
			select private.publish_iso_date_is_valid_v1('2024-02-29') as leap,
				private.publish_iso_date_is_valid_v1('2026-02-29') as impossible,
				private.publish_iso_date_is_valid_v1('0000-01-01') as year_zero
		`);
		assert.deepEqual(dates.rows, [{leap: true, impossible: false, year_zero: false}]);
		await assert.rejects(() => db.query("insert into public.annuncio_squadra_cerca_staff (periodo_dal) values ('2026-09-24'::text)"), /date|42804/i);
		await db.query("insert into public.annuncio_squadra_cerca_staff (periodo_dal, periodo_al) values (nullif('2026-09-24', '')::date, nullif('', '')::date)");
		await db.query("insert into public.annuncio_squadra_cerca_partita (orario_dalle, orario_alle) values (nullif('18:30', '')::time, nullif('', '')::time)");
		assert.deepEqual((await db.query("select periodo_dal::text as start_date, periodo_al from public.annuncio_squadra_cerca_staff")).rows, [{start_date: "2026-09-24", periodo_al: null}]);

		await db.exec(`
			insert into public.annuncio values
				('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'),
				('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'),
				('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'),
				('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4');
			insert into public.profilo_giocatore values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', array['calcio a 11'], '{"principali":["Difensore"],"specifici":[]}'::jsonb);
			insert into public.annuncio_giocatore values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', array['old'], array['old'], array['old']);
			insert into public.profilo_squadra values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', array['calcio a 5']);
			insert into public.annuncio_squadra_cerca_giocatore values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', array['old']);
			insert into public.profilo_staff_sportivo values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', array['Allenatore'], '[{"titolo":"Nuovo"}]'::jsonb, 'disponibile-subito');
			insert into public.annuncio_staff_sportivo values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', array['old'], '[]'::jsonb, 'old');
			insert into public.profilo_arbitro values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', '[{"titolo":"Nuovo"}]'::jsonb, 'disponibile-subito');
			insert into public.annuncio_arbitro values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '[]'::jsonb, 'old');
		`);
		for (const [id, type] of [
			[1, "giocatore"], [2, "squadra"], [3, "staff-sportivo"], [4, "arbitro"],
		]) {
			await db.query("select private.sync_published_profile_snapshot_v1($1::uuid, $2)", [`aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${id}`, type]);
		}
		assert.deepEqual((await db.query("select tipologie_sport, ruoli_principali, ruoli_secondari from public.annuncio_giocatore")).rows, [{tipologie_sport: ["calcio a 11"], ruoli_principali: ["Difensore"], ruoli_secondari: []}]);
		assert.deepEqual((await db.query("select tipologie_sport from public.annuncio_squadra_cerca_giocatore")).rows, [{tipologie_sport: ["calcio a 5"]}]);
		assert.deepEqual((await db.query("select figure_professionali, lista_esperienze, disponibilita_occupazione from public.annuncio_staff_sportivo")).rows, [{figure_professionali: ["Allenatore"], lista_esperienze: [{titolo: "Nuovo"}], disponibilita_occupazione: "disponibile-subito"}]);
		assert.deepEqual((await db.query("select lista_esperienze, disponibilita_occupazione from public.annuncio_arbitro")).rows, [{lista_esperienze: [{titolo: "Nuovo"}], disponibilita_occupazione: "disponibile-subito"}]);
	} finally {
		await db.close();
	}
});

test("publication migration preserves text match-time columns", {
	skip: !existsSync(engineUrl) && "PGlite runner unavailable",
}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema private;
			create table private.announcement_submission (submission_id uuid);
			create table public.annuncio_squadra_cerca_staff (periodo_dal date, periodo_al date);
			create table public.annuncio_squadra_cerca_partita (periodo_dal date, periodo_al date, orario_dalle text, orario_alle text);
		`);
		const original = readFileSync(originalUrl, "utf8");
		await db.exec(functionSql(original, "public.publish_announcement_v1")
			.replace("function public.publish_announcement_v1(", "function public.publish_announcement_core_v1(")
			.replaceAll("2026-08-24", "2026-09-23"));
		await db.exec(functionSql(readFileSync(wrapperUrl, "utf8"), "public.publish_announcement_v1"));
		await db.exec(readFileSync(migrationUrl, "utf8"));
		const definition = (await db.query("select pg_get_functiondef('public.publish_announcement_core_v1(uuid,jsonb,text,text)'::regprocedure) as sql")).rows[0].sql;
		assert.equal((definition.match(/::date,/g) ?? []).length, 4);
		assert.equal((definition.match(/::time,/g) ?? []).length, 0);
	} finally {
		await db.close();
	}
});

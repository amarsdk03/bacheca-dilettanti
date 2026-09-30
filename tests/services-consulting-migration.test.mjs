import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260930162056_rename_services_consulting.sql", import.meta.url);

test("services and consulting migration retains existing profiles and announcements", {
	skip: !existsSync(engineUrl) && "Optional PGlite runner is not installed",
}, async (t) => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	t.after(() => db.close());

	await db.exec(`
		create schema private;
		create table public.profilo (
			id integer primary key,
			tipologia_principale text,
			constraint profilo_tipologia_principale_check check (
				tipologia_principale is null or tipologia_principale in ('giocatore', 'professionisti-studi')
			)
		);
		create table public.profilo_professionista_studente (
			id integer primary key,
			uuid_profilo integer,
			constraint profilo_professionisti_studenti_uuid_profilo_fkey
				foreign key (uuid_profilo) references public.profilo(id)
		);
		create sequence public.profilo_professionisti_studenti_id_seq;
		create unique index profilo_professionista_studente_uuid_profilo_key
			on public.profilo_professionista_studente(uuid_profilo);
		alter table public.profilo_professionista_studente enable row level security;
		create policy profilo_professionista_studente_select_own
			on public.profilo_professionista_studente for select using (true);
		create table public.annuncio (
			id integer primary key,
			tipologia_annuncio text not null
		);
		create table public.annuncio_professionista_studente (
			uuid_annuncio integer primary key references public.annuncio(id)
		);
		create table public.localita_profilo (
			id integer primary key,
			sottoprofilo text,
			id_sottoprofilo integer,
			constraint localita_profilo_sottoprofilo_check check (
				(sottoprofilo is null and id_sottoprofilo is null)
				or (sottoprofilo in ('giocatore', 'professionisti-studi') and id_sottoprofilo is not null)
			)
		);
		create table public.media_profilo (
			id integer primary key,
			sottoprofilo text,
			constraint media_profilo_sottoprofilo_check check (
				sottoprofilo is null or sottoprofilo in ('giocatore', 'professionisti-studi')
			)
		);
		create table public.link_social_profilo (id integer primary key, sottoprofilo text);
		create table private.registration_intent (token integer primary key, payload jsonb not null);
		create function public.sample_professional_type() returns text language plpgsql as $$
		begin
			perform 1 from public.profilo_professionista_studente where id = 1;
			return 'professionisti-studi';
		end;
		$$;
		insert into public.profilo values (1, 'professionisti-studi');
		insert into public.profilo_professionista_studente values (1, 1);
		insert into public.annuncio values (1, 'annuncio_professionisti_studi'), (2, 'annuncio_professionista_studente');
		insert into public.annuncio_professionista_studente values (1);
		insert into public.localita_profilo values (1, 'professionisti-studi', 1);
		insert into public.media_profilo values (1, 'professionisti-studi');
		insert into public.link_social_profilo values (1, 'professionisti-studi');
		insert into private.registration_intent values (
			1,
			'{"primaryProfileType":"professionisti-studi","selectedProfileTypes":["giocatore","professionisti-studi"],"profiles":[{"type":"professionisti-studi","draft":{"presentazione":"professionisti-studi"}}]}'::jsonb
		);
	`);

	await db.exec(readFileSync(migrationUrl, "utf8"));

	const {rows: [tables]} = await db.query(`
		select
			to_regclass('public.profilo_servizi_consulenze') is not null as profile_new,
			to_regclass('public.annuncio_servizi_consulenze') is not null as announcement_new,
			to_regclass('public.profilo_professionista_studente') is null as profile_old_gone,
			to_regclass('public.annuncio_professionista_studente') is null as announcement_old_gone,
			to_regclass('public.profilo_servizi_consulenze_id_seq') is not null as sequence_new
	`);
	assert.deepEqual(Object.values(tables), [true, true, true, true, true]);

	const {rows: [data]} = await db.query(`
		select
			(select tipologia_principale from public.profilo where id = 1) as profile_type,
			(select sottoprofilo from public.localita_profilo where id = 1) as location_type,
			(select sottoprofilo from public.media_profilo where id = 1) as media_type,
			(select sottoprofilo from public.link_social_profilo where id = 1) as social_type,
			(select tipologia_annuncio from public.annuncio where id = 1) as announcement_type,
			(select tipologia_annuncio from public.annuncio where id = 2) as alternate_announcement_type,
			public.sample_professional_type() as function_type,
			(select payload from private.registration_intent where token = 1) as intent
	`);
	for (const key of ["profile_type", "location_type", "media_type", "social_type", "function_type"]) {
		assert.equal(data[key], "servizi-consulenze");
	}
	assert.equal(data.announcement_type, "annuncio_servizi_consulenze");
	assert.equal(data.alternate_announcement_type, "annuncio_servizi_consulenze");
	assert.equal(data.intent.primaryProfileType, "servizi-consulenze");
	assert.deepEqual(data.intent.selectedProfileTypes, ["giocatore", "servizi-consulenze"]);
	assert.equal(data.intent.profiles[0].type, "servizi-consulenze");
	assert.equal(data.intent.profiles[0].draft.presentazione, "professionisti-studi");

	const {rows: [names]} = await db.query(`
		select
			exists(select 1 from pg_policy where polname = 'profilo_servizi_consulenze_select_own') as policy_renamed,
			to_regclass('public.profilo_servizi_consulenze_uuid_profilo_key') is not null as index_renamed,
			exists(select 1 from pg_constraint where conname = 'profilo_servizi_consulenze_uuid_profilo_fkey') as fk_renamed
	`);
	assert.deepEqual(Object.values(names), [true, true, true]);

	await assert.rejects(db.exec("update public.profilo set tipologia_principale = 'professionisti-studi' where id = 1"), /check constraint/i);
});

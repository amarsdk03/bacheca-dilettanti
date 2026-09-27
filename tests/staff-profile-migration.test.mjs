import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260926220000_staff_profile_experiences.sql", import.meta.url);

test("staff profile migration preserves old qualifications and snapshots both new lists", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	const profileId = "11111111-1111-4111-8111-111111111111";
	const announcementId = "22222222-2222-4222-8222-222222222222";
	const submissionId = "33333333-3333-4333-8333-333333333333";
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema private;
			create schema auth;
			create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
			create table public.profilo (uuid uuid primary key, uuid_utente uuid);
			create table public.profilo_staff_sportivo (uuid_profilo uuid primary key, storico_esperienze jsonb);
			create table public.annuncio (uuid uuid primary key, autore_annuncio uuid);
			create table public.annuncio_staff_sportivo (uuid_annuncio uuid primary key, lista_esperienze jsonb);
			create table private.announcement_submission (submission_id uuid primary key, announcement_id uuid);
		`);
		await db.exec(readFileSync(migrationUrl, "utf8"));
		const old = [{id: "old", titolo: "Voce storica", descrizione: "Testo invariato", stato: "non-specificare"}, "testo libero precedente"];
		await db.query("insert into public.profilo_staff_sportivo(uuid_profilo, storico_esperienze) values ($1, $2::jsonb)", [profileId, JSON.stringify(old)]);
		const draft = {disponibile_remoto: true, lista_esperienze: [{id: "job", titolo: "Società", ente: "Dirigenza"}], qualifiche_licenze: [{id: "license", titolo: "Licenza", stato: "conseguito"}]};
		await db.query("select private.save_staff_step10_fields_v1($1::uuid, $2::jsonb)", [profileId, JSON.stringify(draft)]);
		await db.query("insert into public.annuncio values ($1, $2)", [announcementId, profileId]);
		await db.query("insert into public.annuncio_staff_sportivo(uuid_annuncio) values ($1)", [announcementId]);
		await db.query("insert into private.announcement_submission values ($1, $2)", [submissionId, announcementId]);
		await db.query("select private.snapshot_staff_step10_v1($1::uuid, $2::uuid)", [submissionId, profileId]);
		const profile = (await db.query("select storico_esperienze, lista_esperienze, qualifiche_licenze, disponibile_remoto from public.profilo_staff_sportivo")).rows[0];
		const announcement = (await db.query("select lista_esperienze, qualifiche_licenze, disponibile_remoto from public.annuncio_staff_sportivo")).rows[0];
		assert.deepEqual(profile.storico_esperienze, old);
		assert.deepEqual(announcement.lista_esperienze, draft.lista_esperienze);
		assert.deepEqual(announcement.qualifiche_licenze, [...old, ...draft.qualifiche_licenze]);
		assert.equal(announcement.disponibile_remoto, true);
		await assert.rejects(() => db.query("select private.save_staff_step10_fields_v1($1::uuid, $2::jsonb)", [profileId, JSON.stringify({...draft, qualifiche_licenze: [{id: "bad"}]})]), /INVALID_STAFF_QUALIFICATIONS/);
	} finally {
		await db.close();
	}
});

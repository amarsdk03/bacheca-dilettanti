import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260926212640_team_sponsor_optional_location_and_support.sql", import.meta.url);

test("sponsor publication permits no support or location while preserving legacy sponsor rows", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create schema private;
			create table public.localita_annuncio (uuid_annuncio uuid, regione text, citta text);
			create table public.annuncio_squadra_cerca_sponsor (uuid_annuncio uuid primary key, supporto_cercato text, offerta_fornita text);
			insert into public.annuncio_squadra_cerca_sponsor values ('11111111-1111-4111-8111-111111111111', 'Materiale tecnico', 'Visibilità');
			insert into public.localita_annuncio values ('11111111-1111-4111-8111-111111111111', 'Lazio', 'Roma');
			create function private.publish_locations_are_valid(jsonb) returns boolean language sql immutable as $$ select jsonb_typeof($1) = 'array' and jsonb_array_length($1) > 0 $$;
			create function private.publish_text_is_valid(text, boolean, integer) returns boolean language sql immutable as $$ select (not $2 or nullif(btrim($1), '') is not null) and ($1 is null or length($1) <= $3) $$;
			create function public.publish_announcement_core_v1(p_submission_id uuid, p_payload jsonb, p_terms_version text, p_privacy_version text) returns jsonb
			language plpgsql as $$
			declare v_announcement_type text := p_payload ->> 'announcement_type'; v_detail jsonb := p_payload -> 'detail';
			begin
				if false or not private.publish_locations_are_valid(p_payload -> 'announcement_locations') then raise exception 'INVALID_LOCATIONS'; end if;
				if not private.publish_text_is_valid(v_detail ->> 'supporto_cercato', true, 5000) then raise exception 'INVALID_SUPPORT'; end if;
				insert into public.localita_annuncio(uuid_annuncio, regione, citta)
				select p_submission_id, location.value ->> 'regione', location.value ->> 'citta'
				from pg_catalog.jsonb_array_elements(p_payload -> 'announcement_locations') as location(value);
				insert into public.annuncio_squadra_cerca_sponsor values (p_submission_id, v_detail ->> 'supporto_cercato', v_detail ->> 'offerta_fornita');
				return '{"status":"success"}'::jsonb;
			end;
			$$;
		`);
		await db.exec(readFileSync(migrationUrl, "utf8"));
		const announcementId = "22222222-2222-4222-8222-222222222222";
		await db.query("select public.publish_announcement_core_v1($1::uuid, $2::jsonb, 'terms', 'privacy')", [announcementId, JSON.stringify({announcement_type: "annuncio_squadra_cerca_sponsor", detail: {supporto_cercato: null, offerta_fornita: "Visibilità in campo"}, announcement_locations: []})]);
		assert.deepEqual((await db.query("select supporto_cercato, offerta_fornita from public.annuncio_squadra_cerca_sponsor where uuid_annuncio = $1", [announcementId])).rows[0], {supporto_cercato: null, offerta_fornita: "Visibilità in campo"});
		assert.equal((await db.query("select count(*)::int as count from public.localita_annuncio where uuid_annuncio = $1", [announcementId])).rows[0].count, 0);
		assert.deepEqual((await db.query("select supporto_cercato, offerta_fornita from public.annuncio_squadra_cerca_sponsor where uuid_annuncio = '11111111-1111-4111-8111-111111111111'")).rows[0], {supporto_cercato: "Materiale tecnico", offerta_fornita: "Visibilità"});
		assert.equal((await db.query("select count(*)::int as count from public.localita_annuncio where uuid_annuncio = '11111111-1111-4111-8111-111111111111'")).rows[0].count, 1);
		await assert.rejects(() => db.query("select public.publish_announcement_core_v1($1::uuid, $2::jsonb, 'terms', 'privacy')", ["33333333-3333-4333-8333-333333333333", JSON.stringify({announcement_type: "annuncio_squadra_cerca_giocatore", detail: {supporto_cercato: null}, announcement_locations: []})]), /INVALID_LOCATIONS/);
	} finally {
		await db.close();
	}
});

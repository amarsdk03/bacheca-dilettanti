import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20261001160000_restricted_profiles_and_service_publication.sql", import.meta.url);
const owner = "22222222-2222-4222-8222-222222222222";
const profile = "33333333-3333-4333-8333-333333333333";

test("restricted grants, ordinary count, deletion and service publication work in PostgreSQL", {
	skip: !existsSync(engineUrl) && "PGlite runner unavailable",
}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		const setup = `
			create role anon; create role authenticated; create role service_role;
			create schema private;
			create table public.utente (utente_uuid uuid primary key, registrato_il timestamptz);
			create table public.profilo (uuid uuid primary key, uuid_utente uuid, tipologia_principale text);
			create table public.profilo_giocatore (uuid_profilo uuid);
			create table public.profilo_squadra (uuid_profilo uuid);
			create table public.profilo_staff_sportivo (uuid_profilo uuid);
			create table public.profilo_arbitro (uuid_profilo uuid);
			create table public.profilo_torneo_evento (uuid_profilo uuid);
			create table public.profilo_campi_impianti (uuid_profilo uuid);
			create table public.profilo_servizi_consulenze (uuid_profilo uuid, nome text, figure_professionali text[], nascosto boolean);
			create table public.profilo_creator (uuid_profilo uuid, nome_creator text, nascosto boolean);
			create table public.localita_profilo (uuid_profilo uuid, sottoprofilo text);
			create table public.annuncio (uuid uuid primary key, autore_annuncio uuid);
			create table public.annuncio_creator (uuid_annuncio uuid, titolo_post text, descrizione_post text);
			create table public.annuncio_servizi_consulenze (uuid_annuncio uuid, figura_professionale text[], specializzazione text, presentazione_servizi text, tipologie_sport jsonb, descrizione_aggiuntiva text);
			create table private.registration_intent (payload jsonb);
			insert into public.utente values ('${owner}', now());
			insert into public.profilo values ('${profile}', '${owner}', 'giocatore');
			insert into public.profilo_giocatore values ('${profile}');
			insert into public.profilo_squadra values ('${profile}');
			insert into public.profilo_staff_sportivo values ('${profile}');
			insert into public.profilo_arbitro values ('${profile}');
			insert into public.profilo_torneo_evento values ('${profile}');
			create function private.registered_internal_user_id(uuid) returns uuid language sql as $$ select $1 $$;
			create function private.delete_owned_subprofile_internal_v1(p_user_id uuid, p_profile_type text)
			returns text language plpgsql as $$
			begin
			  if p_profile_type = 'creators' then delete from public.profilo_creator where uuid_profilo = (select uuid from public.profilo where uuid_utente = p_user_id); end if;
			  if p_profile_type = 'servizi-consulenze' then delete from public.profilo_servizi_consulenze where uuid_profilo = (select uuid from public.profilo where uuid_utente = p_user_id); end if;
			  return 'giocatore';
			end; $$;
			create function private.save_owned_subprofile_core_v1(p_user_id uuid, p_profile_type text, p_draft jsonb, p_locations jsonb)
			returns jsonb language plpgsql as $$
			declare v_profile_id uuid; v_profile_count integer;
			begin
			  select uuid into v_profile_id from public.profilo where uuid_utente = p_user_id;
			  select (select count(*) from public.profilo_giocatore where uuid_profilo = v_profile_id)
			    + (select count(*) from public.profilo_squadra where uuid_profilo = v_profile_id)
			    + (select count(*) from public.profilo_staff_sportivo where uuid_profilo = v_profile_id)
			    + (select count(*) from public.profilo_arbitro where uuid_profilo = v_profile_id)
			    + (select count(*) from public.profilo_torneo_evento where uuid_profilo = v_profile_id)
			    + (select count(*) from public.profilo_campi_impianti where uuid_profilo = v_profile_id)
			    + (select count(*) from public.profilo_servizi_consulenze where uuid_profilo = v_profile_id)
			    + (select count(*) from public.profilo_creator where uuid_profilo = v_profile_id) into v_profile_count;
			  if v_profile_count >= 5 then raise exception 'PROFILE_LIMIT_REACHED'; end if;
			  return pg_catalog.jsonb_build_object('count', v_profile_count);
			end; $$;
			create function private.publish_text_is_valid(text, boolean, integer) returns boolean language sql as $$ select not $2 or $1 is not null $$;
			create function private.publish_text_array_is_valid(jsonb) returns boolean language sql as $$ select pg_catalog.jsonb_typeof($1) = 'array' $$;
			create function public.publish_announcement_core_v1(p_submission_id uuid, p_payload jsonb, p_terms_version text, p_privacy_version text)
			returns jsonb language plpgsql as $$
			declare v_profile_type text; v_announcement_type text; v_detail jsonb; v_profile_id uuid; v_announcement_id uuid;
			begin
			  v_profile_type := p_payload ->> 'profile_type';
			  v_announcement_type := p_payload ->> 'announcement_type';
			  v_detail := p_payload -> 'detail';
			  v_profile_id := '${profile}'::uuid;
			  v_announcement_id := p_submission_id;
			  if v_profile_type not in ('creators') then raise exception 'PROFILE_TYPE_UNAVAILABLE'; end if;
			  if not (
			    (v_profile_type = 'giocatore' and v_announcement_type = 'annuncio_giocatore')
			    or (v_profile_type = 'creators' and v_announcement_type = 'annuncio_creators')
			  ) then raise exception 'INVALID_TYPE'; end if;
			  if (case v_announcement_type when 'annuncio_creators' then not private.publish_text_is_valid(v_detail ->> 'titolo_post', true, 160) else true end) then raise exception 'INVALID_DETAIL'; end if;
			  case v_profile_type
			    when 'creators' then perform 1 from public.profilo_creator where uuid_profilo = v_profile_id and nascosto = false;
			  end case;
			  insert into public.annuncio values (v_announcement_id, v_profile_id);
			  case v_announcement_type
			    when 'annuncio_creators' then insert into public.annuncio_creator (uuid_annuncio, titolo_post, descrizione_post) values (v_announcement_id, v_detail ->> 'titolo_post', v_detail ->> 'descrizione_post');
			  end case;
			  return '{"status":"success"}'::jsonb;
			end; $$;
		`;
		for (const statement of setup.split(/(?=\n\s*create function )/)) await db.exec(statement);
		await db.exec(readFileSync(migrationUrl, "utf8"));
		const privilege = await db.query("select has_table_privilege('anon', 'public.restricted_profile_access', 'insert') as allowed");
		assert.equal(privilege.rows[0].allowed, false);
		await assert.rejects(db.query("insert into public.profilo_creator (uuid_profilo, nome_creator, nascosto) values ($1, 'Test', false)", [profile]), /PROFILE_ACCESS_DENIED/);
		await db.query("select public.admin_set_restricted_profile_access_v1($1, 'creators', true)", [profile]);
		await db.query("select public.admin_set_restricted_profile_access_v1($1, 'servizi-consulenze', true)", [profile]);
		await db.query("insert into public.profilo_creator (uuid_profilo, nome_creator, nascosto) values ($1, 'Creator', false)", [profile]);
		await db.query("insert into public.profilo_servizi_consulenze (uuid_profilo, nome, figure_professionali, nascosto) values ($1, 'Mario', array['Allenatore'], false)", [profile]);
		const allowed = await db.query("select private.save_owned_subprofile_core_v1($1, 'servizi-consulenze', '{}'::jsonb, '[]'::jsonb) as result", [owner]);
		assert.equal(allowed.rows[0].result.count, 7);
		await assert.rejects(db.query("select private.save_owned_subprofile_core_v1($1, 'campi-impianti-sportivi', '{}'::jsonb, '[]'::jsonb)", [owner]), /PROFILE_LIMIT_REACHED/);
		const payload = {profile_type: "servizi-consulenze", announcement_type: "annuncio_servizi_consulenze", detail: {figura_professionale: ["Allenatore"], specializzazione: "Settore giovanile", presentazione_servizi: "Formazione", tipologie_sport: ["Calcio 11"], descrizione_aggiuntiva: "Dettagli"}};
		const published = await db.query("select public.publish_announcement_core_v1('55555555-5555-4555-8555-555555555555', $1::jsonb, '', '') as result", [JSON.stringify(payload)]);
		assert.equal(published.rows[0].result.status, "success");
		const serviceRow = await db.query("select presentazione_servizi from public.annuncio_servizi_consulenze where uuid_annuncio = '55555555-5555-4555-8555-555555555555'");
		assert.equal(serviceRow.rows[0].presentazione_servizi, "Formazione");
		await db.query("select public.delete_owned_subprofile($1, 'creators')", [owner]);
		const revoked = await db.query("select count(*)::integer as total from public.restricted_profile_access where profile_id = $1 and profile_type = 'creators'", [profile]);
		assert.equal(revoked.rows[0].total, 0);
		await assert.rejects(db.query("insert into public.profilo_creator (uuid_profilo, nome_creator, nascosto) values ($1, 'Again', false)", [profile]), /PROFILE_ACCESS_DENIED/);
	} finally {
		await db.close();
	}
});

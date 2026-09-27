import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260927020000_facility_profile_single_site.sql", import.meta.url);

test("facility profile migration replaces required-field validation without relying on source indentation", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema private;
			create table public.profilo (uuid uuid, uuid_utente uuid);
			create table public.profilo_campi_impianti (uuid_profilo uuid, indirizzo text, nascosto boolean);
			create table public.localita_profilo (uuid_profilo uuid, sottoprofilo text, regione text, citta text);
			create function private.publish_text_is_valid(text, boolean, integer) returns boolean
			language sql immutable as $$ select true $$;
			create function private.create_anonymous_publish_profile(text, jsonb, jsonb) returns uuid
			language plpgsql as $$ begin
				if true or not private.publish_text_is_valid(p_draft ->> 'sede_principale', true, 160) then return null; end if;
				return null;
			end $$;
		`);
		await db.exec(`
			create function private.save_owned_subprofile_internal_v1(p_user_id uuid, p_profile_type text, p_draft jsonb, p_locations jsonb) returns jsonb
			language plpgsql as $$ declare v_result jsonb; v_profile_id uuid; begin return v_result; end $$;
			create function public.publish_announcement_v2(p_submission_id uuid, p_payload jsonb, p_terms_version text, p_privacy_version text, p_visibility text) returns jsonb
			language plpgsql as $$ declare v_profile_type text; v_draft jsonb; v_profile_id uuid; v_result jsonb; begin
				if v_draft is null or pg_catalog.jsonb_typeof(v_draft) <> 'object' then return v_result; end if;
				return v_result;
			end $$;
		`);
		await db.exec(readFileSync(migrationUrl, "utf8"));

		const id = "11111111-1111-4111-8111-111111111111";
		await db.query("insert into public.localita_profilo values ($1, 'campi-impianti-sportivi', 'Lazio', 'Roma')", [id]);
		assert.equal((await db.query("select private.facility_step13_location_is_valid($1::uuid) as valid", [id])).rows[0].valid, true);
		await db.query("insert into public.localita_profilo values ($1, 'campi-impianti-sportivi', 'Lazio', 'Viterbo')", [id]);
		assert.equal((await db.query("select private.facility_step13_location_is_valid($1::uuid) as valid", [id])).rows[0].valid, false);
		const {rows} = await db.query("select pg_catalog.pg_get_functiondef('private.assert_required_subprofile_fields_v1(uuid,text)'::regprocedure) as definition");
		assert.match(rows[0].definition, /facility_step13_location_is_valid/);
	} finally {
		await db.close();
	}
});

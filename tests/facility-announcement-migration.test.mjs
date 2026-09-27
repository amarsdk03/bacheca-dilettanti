import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260927030000_facility_announcement_site_and_hours.sql", import.meta.url);

test("facility announcement migration stores one complete site and the structured schedule", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema private;
			create function private.publish_text_is_valid(p_value text, p_required boolean, p_max integer)
			returns boolean language sql immutable as $$
				select length(coalesce(p_value, '')) <= p_max and (not p_required or nullif(btrim(p_value), '') is not null)
			$$;
			create function private.publish_object_has_only_keys(p_value jsonb, p_allowed text[], p_required text[] default array[]::text[])
			returns boolean language sql immutable as $$
				select jsonb_typeof(p_value) = 'object'
					and not exists (select 1 from jsonb_object_keys(p_value) as key where key <> all(p_allowed))
					and not exists (select 1 from unnest(p_required) as key where not (p_value ? key))
			$$;
			create table public.annuncio_campo_impianto (uuid_annuncio uuid primary key, indirizzo text, orari jsonb);
			create table public.localita_annuncio (uuid_annuncio uuid, regione text, citta text);
			create function public.publish_announcement_core_v1(uuid, jsonb, text, text) returns jsonb
			language plpgsql as $$ declare v_detail jsonb; begin
				if not private.publish_text_is_valid(v_detail ->> 'servizi_inclusi', false, 5000)
					or not private.publish_text_is_valid(v_detail ->> 'descrizione_aggiuntiva', true, 5000) then return null; end if;
				return '{}'::jsonb;
			end $$;
			create function public.publish_announcement_v2(uuid, jsonb, text, text, text) returns jsonb
			language plpgsql as $$ declare v_result jsonb := '{"status":"success","idempotent":true}'::jsonb; begin
				return v_result;
			end $$;
		`);
		await db.exec(readFileSync(migrationUrl, "utf8"));

		const id = "11111111-1111-4111-8111-111111111111";
		const schedule = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"].map((giorno, index) => ({
			giorno, attivo: index === 0, dalle: index === 0 ? "20:00" : "", alle: index === 0 ? "22:00" : "",
		}));
		const detail = {tipologie_sport: ["Calcio 11"], indirizzo: "Via Roma 1", orari: schedule};
		await db.query("insert into public.annuncio_campo_impianto (uuid_annuncio) values ($1)", [id]);
		await db.query("insert into public.localita_annuncio (uuid_annuncio, regione, citta) values ($1, 'Lazio', 'Roma')", [id]);
		await db.query("select private.save_facility_announcement_fields_v1($1::uuid, $2::jsonb)", [id, JSON.stringify(detail)]);
		const saved = (await db.query("select indirizzo, orari from public.annuncio_campo_impianto where uuid_annuncio = $1", [id])).rows[0];
		assert.equal(saved.indirizzo, "Via Roma 1");
		assert.deepEqual(saved.orari, schedule);

		await db.query("update public.localita_annuncio set citta = null where uuid_annuncio = $1", [id]);
		await assert.rejects(() => db.query("select private.save_facility_announcement_fields_v1($1::uuid, $2::jsonb)", [id, JSON.stringify(detail)]), /INVALID_FACILITY_ANNOUNCEMENT/);
	} finally {
		await db.close();
	}
});

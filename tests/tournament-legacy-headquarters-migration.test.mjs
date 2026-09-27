import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260927060000_preserve_tournament_legacy_headquarters.sql", import.meta.url);

test("saving a tournament without a headquarters keeps the historical value", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create schema private;
			create table public.profilo_torneo_evento (
				id bigint generated always as identity primary key,
				uuid_profilo uuid unique not null,
				sport_principale text,
				nome_organizzazione text,
				tipologie_sport text[],
				sede_principale text,
				presentazione text,
				nascosto boolean
			);
			create function private.save_owned_subprofile_core_v1(p_user_id uuid, p_profile_type text, p_draft jsonb, p_locations jsonb)
			returns jsonb language plpgsql as $$
			declare v_profile_id uuid := p_user_id; v_subprofile_id bigint;
			begin
				case p_profile_type
				when 'torneo-evento' then
					insert into public.profilo_torneo_evento (uuid_profilo, sport_principale, nome_organizzazione, tipologie_sport, sede_principale, presentazione, nascosto)
					values (v_profile_id, p_draft ->> 'sport_principale', p_draft ->> 'nome_organizzazione', array(select jsonb_array_elements_text(coalesce(p_draft -> 'tipologie_sport', '[]'::jsonb))), p_draft ->> 'sede_principale', p_draft ->> 'presentazione', false)
					on conflict (uuid_profilo) do update set sport_principale = excluded.sport_principale, nome_organizzazione = excluded.nome_organizzazione, tipologie_sport = excluded.tipologie_sport, sede_principale = excluded.sede_principale, presentazione = excluded.presentazione returning id into v_subprofile_id;
				end case;
				return jsonb_build_object('id', v_subprofile_id);
			end $$;
		`);
		const existingId = "11111111-1111-4111-8111-111111111111";
		const newId = "22222222-2222-4222-8222-222222222222";
		await db.query("insert into public.profilo_torneo_evento (uuid_profilo, sede_principale) values ($1::uuid, 'Roma')", [existingId]);
		await db.exec(readFileSync(migrationUrl, "utf8"));
		const draft = JSON.stringify({sport_principale: "Calcio", nome_organizzazione: "Torneo", tipologie_sport: ["Calcio 11"], presentazione: "Nuova descrizione"});
		await db.query("select private.save_owned_subprofile_core_v1($1::uuid, 'torneo-evento', $2::jsonb, '[]'::jsonb)", [existingId, draft]);
		await db.query("select private.save_owned_subprofile_core_v1($1::uuid, 'torneo-evento', $2::jsonb, '[]'::jsonb)", [newId, draft]);
		const {rows} = await db.query("select sede_principale, presentazione from public.profilo_torneo_evento order by uuid_profilo");
		assert.deepEqual(rows, [
			{sede_principale: "Roma", presentazione: "Nuova descrizione"},
			{sede_principale: null, presentazione: "Nuova descrizione"},
		]);
	} finally {
		await db.close();
	}
});

import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const migration = readFileSync(
	new URL("../supabase/migrations/20260928141148_refactor_profile_publication_fields.sql", import.meta.url),
	"utf8",
);

test("profile publication refactor migrates legacy values and adds the new career fields", () => {
	assert.match(migration, /set genere = 'Uomo' where genere = 'Maschio'/);
	assert.match(migration, /set genere = 'Donna' where genere = 'Femmina'/);
	assert.match(migration, /profilo_arbitro[\s\S]*add column lista_esperienze jsonb not null default '\[\]'::jsonb[\s\S]*add column qualifiche_licenze jsonb not null default '\[\]'::jsonb/);
	assert.match(migration, /profilo_professionista_studente[\s\S]*add column lista_esperienze jsonb not null default '\[\]'::jsonb[\s\S]*add column qualifiche_licenze jsonb not null default '\[\]'::jsonb/);
	assert.match(migration, /update public\.profilo_arbitro[\s\S]*lista_esperienze = case[\s\S]*storico_esperienze = '\[\]'::jsonb/);
	assert.match(migration, /update public\.profilo_professionista_studente[\s\S]*lista_esperienze = case[\s\S]*storico_esperienze = '\[\]'::jsonb/);
});

test("publication wrapper keeps earlier tournament and facility behavior", () => {
	assert.match(migration, /private\.tournament_step12_detail_is_valid/);
	assert.match(migration, /private\.save_facility_step13_address_v1/);
	assert.match(migration, /private\.save_facility_announcement_fields_v1/);
	assert.match(migration, /private\.save_team_player_year_range_step06_v1/);
	assert.match(migration, /private\.save_team_staff_search_step07_v1/);
});

test("creator publication and website links are installed atomically", () => {
	assert.match(migration, /'website', 'instagram', 'facebook', 'youtube', 'linkedin'/);
	assert.match(migration, /v_profile_type = 'creators' and v_announcement_type = 'annuncio_creators'/);
	assert.match(migration, /insert into public\.profilo_creator/);
	assert.match(migration, /insert into public\.annuncio_creator/);
	assert.equal((migration.match(/^begin;$/gm) ?? []).length, 1);
	assert.equal((migration.match(/^commit;$/gm) ?? []).length, 1);
});

import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const originalUrl = new URL("../supabase/migrations/20260824195350_publish_announcement_workflow.sql", import.meta.url);
const wrapperUrl = new URL("../supabase/migrations/20260923222553_enforce_required_subprofile_fields.sql", import.meta.url);
const privateCoreUrl = new URL("../supabase/migrations/20260923212945_restore_publish_announcement_core_v2.sql", import.meta.url);
const publicV2Url = new URL("../supabase/migrations/20260924120000_pause_priority_announcements.sql", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260924122000_reconcile_publish_dates_and_profile_snapshots.sql", import.meta.url);

function functionSql(source, name) {
	const start = source.indexOf(`create or replace function ${name}(`);
	assert.notEqual(start, -1);
	const suffix = source.slice(start);
	const match = /\r?\n\$\$;/.exec(suffix);
	assert.ok(match);
	return suffix.slice(0, match.index + match[0].length);
}

test("all nine announcement types publish through the current free RPC", {
	skip: !existsSync(engineUrl) && "PGlite runner unavailable",
}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema auth;
			create schema private;
			create function auth.uid() returns uuid language sql stable as $$ select '11111111-1111-4111-8111-111111111111'::uuid $$;
			create function auth.jwt() returns jsonb language sql stable as $$ select '{"email":"publisher@example.com"}'::jsonb $$;
			create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
			insert into auth.users values (auth.uid(), 'publisher@example.com', now());
			create table public.utente (
				utente_uuid uuid primary key, auth_user_uuid uuid, indirizzo_email text,
				registrato_il timestamptz, tipologia_utente text, creato_il timestamptz,
				ultima_modifica_il timestamptz
			);
			insert into public.utente (utente_uuid, auth_user_uuid, indirizzo_email, registrato_il)
			values ('22222222-2222-4222-8222-222222222222', auth.uid(), 'publisher@example.com', now());
			create table public.profilo (uuid uuid primary key, uuid_utente uuid, nascosto boolean);
			insert into public.profilo values
				('33333333-3333-4333-8333-333333333331', '22222222-2222-4222-8222-222222222222', false);
			create table public.profilo_giocatore (uuid_profilo uuid, nascosto boolean, nome text, tipologie_sport text[], ruoli_sport jsonb);
			create table public.profilo_squadra (uuid_profilo uuid, nascosto boolean, nome_societa text, tipologie_sport text[]);
			create table public.profilo_staff_sportivo (uuid_profilo uuid, nascosto boolean, nome text, figure_professionali text[], storico_esperienze jsonb, disponibilita text);
			create table public.profilo_arbitro (uuid_profilo uuid, nascosto boolean, nome text, storico_esperienze jsonb, disponibilita text);
			create table public.profilo_torneo_evento (uuid_profilo uuid, nascosto boolean, nome_organizzazione text, tipologie_sport text[]);
			create table public.profilo_campi_impianti (uuid_profilo uuid, nascosto boolean, nome_organizzazione text, sede_principale text, tipologie_sport text[]);
			create table public.localita_profilo (uuid_profilo uuid, sottoprofilo text, regione text);
			insert into public.profilo_giocatore values ('33333333-3333-4333-8333-333333333331', false, 'Mario', array['Calcio a 11'], '{"principali":["Difensore"],"specifici":[]}'::jsonb);
			insert into public.profilo_squadra values ('33333333-3333-4333-8333-333333333331', false, 'Società', array['Calcio a 11']);
			insert into public.profilo_staff_sportivo values ('33333333-3333-4333-8333-333333333331', false, 'Luigi', array['Allenatore'], '[]'::jsonb, 'disponibile-subito');
			insert into public.profilo_arbitro values ('33333333-3333-4333-8333-333333333331', false, 'Anna', '[]'::jsonb, 'disponibile-subito');
			insert into public.profilo_torneo_evento values ('33333333-3333-4333-8333-333333333331', false, 'Ente', array['Calcio a 11']);
			insert into public.profilo_campi_impianti values ('33333333-3333-4333-8333-333333333331', false, 'Impianto', 'Roma', array['Calcio a 11']);
			insert into public.localita_profilo
			select '33333333-3333-4333-8333-333333333331', profile_type, 'Lazio'
			from unnest(array['giocatore','squadra','staff-sportivo','arbitro','torneo-evento','campi-impianti-sportivi']) as profile_type;
			create table public.annuncio (
				uuid uuid primary key default gen_random_uuid(), autore_annuncio uuid, creato_da uuid,
				creato_il timestamptz, info_stato_annuncio text, livello_annuncio text,
				nascosto boolean, privato boolean, stato_annuncio text, tipologia_annuncio text,
				ultima_modifica_da uuid, ultima_modifica_il timestamptz
			);
			create table public.annuncio_giocatore (uuid_annuncio uuid, tipologie_sport text[], ruoli_principali text[], ruoli_secondari text[], categorie_ricercate text[], descrizione_aggiuntiva text);
			create table public.annuncio_squadra_cerca_giocatore (uuid_annuncio uuid, tipologie_sport text[], ruoli_principali text[], ruoli_secondari text[], annate_ricercate text[], stagione text, descrizione_aggiuntiva text);
			create table public.annuncio_squadra_cerca_staff (uuid_annuncio uuid, figura_ricercata text, settore text, compenso_mensile numeric, requisiti text, periodo_dal date, periodo_al date, descrizione_aggiuntiva text);
			create table public.annuncio_squadra_cerca_partita (uuid_annuncio uuid, categorie_avversario text[], periodo_dal date, periodo_al date, orario_dalle time, orario_alle time, disponibilita_trasferta text, descrizione_aggiuntiva text);
			create table public.annuncio_squadra_cerca_sponsor (uuid_annuncio uuid, categoria_settore text, supporto_cercato text, offerta_fornita text, descrizione_aggiuntiva text);
			create table public.annuncio_staff_sportivo (uuid_annuncio uuid, tipologie_sport text[], figure_professionali text[], categorie_ricercate text[], descrizione_aggiuntiva text, lista_esperienze jsonb, disponibilita_occupazione text, disponibilita_spostamento text);
			create table public.annuncio_arbitro (uuid_annuncio uuid, tipologie_sport text[], categorie_ricercate text[], descrizione_aggiuntiva text, lista_esperienze jsonb, disponibilita_occupazione text, disponibilita_spostamento text, automunito text);
			create table public.annuncio_torneo_evento (uuid_annuncio uuid, nome_evento text, tipologie_sport text[], modalita_iscrizione text, annate_ammesse_da text, annate_ammesse_a text, numero_squadre integer, costo_partecipazione numeric, tipo_partecipazione text, lista_premi_trofei jsonb, descrizione_aggiuntiva text);
			create table public.annuncio_campo_impianto (uuid_annuncio uuid, tipologie_sport text[], orari jsonb, costo_partenza numeric, servizi_inclusi text, descrizione_aggiuntiva text);
			create table public.localita_annuncio (uuid_annuncio uuid, regione text, citta text);
			create table public.contatto_annuncio (uuid_annuncio uuid, tipo text, valore text);
			create table private.announcement_submission (
				submission_id uuid primary key, announcement_id uuid, utente_id uuid,
				normalized_email text, anonymous_at_publish boolean,
				terms_version text, privacy_version text, data_confirmed_at timestamptz,
				terms_accepted_at timestamptz, privacy_accepted_at timestamptz,
				created_at timestamptz, requested_visibility text,
				requested_announcement_id uuid, paid_at timestamptz
			);
		`);
		const original = readFileSync(originalUrl, "utf8");
		await db.exec(`
			create function private.save_owned_subprofile_internal_v1(uuid, text, jsonb, jsonb)
			returns jsonb language plpgsql as $$
			begin
				update public.profilo_giocatore
				set tipologie_sport = array(select jsonb_array_elements_text($3 -> 'tipologie_sport')),
					ruoli_sport = $3 -> 'ruoli_sport'
				where uuid_profilo = (select uuid from public.profilo where uuid_utente = $1);
				return '{}'::jsonb;
			end;
			$$;
			create function private.save_player_categories_v2(uuid, text, jsonb)
			returns void language plpgsql as $$ begin null; end; $$;
		`);
		for (const name of [
			"private.publish_object_has_only_keys",
			"private.publish_text_array_is_valid",
			"private.publish_locations_are_valid",
			"private.publish_text_is_valid",
			"private.publish_prizes_are_valid",
		]) await db.exec(functionSql(original, name));
		await db.exec(functionSql(original, "public.publish_announcement_v1")
			.replace("function public.publish_announcement_v1(", "function public.publish_announcement_core_v1(")
			.replaceAll("2026-08-24", "2026-09-23"));
		const wrapperSource = readFileSync(wrapperUrl, "utf8");
		await db.exec(functionSql(wrapperSource, "private.assert_required_subprofile_fields_v1"));
		await db.exec(functionSql(wrapperSource, "public.publish_announcement_v1"));
		await db.exec(functionSql(readFileSync(privateCoreUrl, "utf8"), "private.publish_announcement_core_v2"));
		await db.exec(functionSql(readFileSync(publicV2Url, "utf8"), "public.publish_announcement_v2"));
		await db.exec(readFileSync(migrationUrl, "utf8"));

		const cases = [
			["giocatore", "annuncio_giocatore", {categorie_ricercate: [], descrizione_aggiuntiva: "Cerco una squadra."}],
			["squadra", "annuncio_squadra_cerca_giocatore", {ruoli_principali: ["Difensore"], ruoli_secondari: [], annate_ricercate: [], stagione: null, descrizione_aggiuntiva: "Cerchiamo un giocatore."}],
			["squadra", "annuncio_squadra_cerca_staff", {figura_ricercata: "Allenatore", settore: null, compenso_mensile: 19.99, requisiti: "Esperienza.", periodo_dal: "2026-10-01", periodo_al: "2026-12-31", descrizione_aggiuntiva: null}],
			["squadra", "annuncio_squadra_cerca_partita", {categorie_avversario: ["Under 17"], periodo_dal: "2026-10-01", periodo_al: "2026-12-31", orario_dalle: "18:30", orario_alle: "20:00", disponibilita_trasferta: null, descrizione_aggiuntiva: null}],
			["squadra", "annuncio_squadra_cerca_sponsor", {categoria_settore: "Locale", supporto_cercato: "Supporto.", offerta_fornita: "Visibilità.", descrizione_aggiuntiva: null}],
			["staff-sportivo", "annuncio_staff_sportivo", {tipologie_sport: ["Calcio a 11"], categorie_ricercate: [], disponibilita_spostamento: null, descrizione_aggiuntiva: "Cerco incarico."}],
			["arbitro", "annuncio_arbitro", {tipologie_sport: ["Calcio a 11"], categorie_ricercate: [], automunito: null, disponibilita_spostamento: null, descrizione_aggiuntiva: "Disponibile."}],
			["torneo-evento", "annuncio_torneo_evento", {nome_evento: "Torneo", tipologie_sport: ["Calcio a 11"], modalita_iscrizione: null, annate_ammesse_da: null, annate_ammesse_a: null, numero_squadre: null, costo_partecipazione: null, tipo_partecipazione: "squadra", lista_premi_trofei: [], descrizione_aggiuntiva: "Torneo locale."}],
			["campi-impianti-sportivi", "annuncio_campo_impianto", {tipologie_sport: ["Calcio a 11"], orari: null, costo_partenza: 0.29, servizi_inclusi: null, descrizione_aggiuntiva: "Campo disponibile."}],
		];
		await db.exec("set role authenticated");
		for (const [index, [profileType, announcementType, detail]] of cases.entries()) {
			const payload = {
				profile_type: profileType,
				announcement_type: announcementType,
				profile_draft: null,
				profile_locations: [],
				profile_update: null,
				detail,
				announcement_locations: [{regione: "Lazio", citta: "Roma"}],
				contacts: {email: "public@example.com", phone: null},
				extras: {generic_link: null, video_highlights: null, image_path: null, image_mime: null},
				profile_social_links: null,
			};
			const submissionId = `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${index + 1}`;
			const result = await db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, '2026-09-23', '2026-09-23', 'gratuito') as result", [submissionId, JSON.stringify(payload)]);
			assert.equal(result.rows[0].result.status, "success", announcementType);
			assert.equal(result.rows[0].result.idempotent, false, announcementType);
			if (index === 0) {
				const retry = await db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, '2026-09-23', '2026-09-23', 'gratuito') as result", [submissionId, JSON.stringify(payload)]);
				assert.equal(retry.rows[0].result.idempotent, true);
			}
		}
		const updatedPlayerPayload = {
			profile_type: "giocatore",
			announcement_type: "annuncio_giocatore",
			profile_draft: null,
			profile_locations: [],
			profile_update: {
				profile_type: "giocatore",
				draft: {tipologie_sport: ["Calcio a 5"], ruoli_sport: {principali: ["Portiere"], specifici: []}},
				locations: [{regione: "Lazio", citta: "Roma"}],
			},
			detail: cases[0][2],
			announcement_locations: [{regione: "Lazio", citta: "Roma"}],
			contacts: {email: "public@example.com", phone: null},
			extras: {generic_link: null, video_highlights: null, image_path: null, image_mime: null},
			profile_social_links: null,
		};
		const updatedPlayer = await db.query(
			"select public.publish_announcement_v2('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid, $1::jsonb, '2026-09-23', '2026-09-23', 'gratuito') as result",
			[JSON.stringify(updatedPlayerPayload)],
		);
		assert.equal(updatedPlayer.rows[0].result.status, "success");
		const updatedPlayerId = updatedPlayer.rows[0].result.announcementId;
		const badPayload = {
			profile_type: "squadra",
			announcement_type: "annuncio_squadra_cerca_staff",
			profile_draft: null,
			profile_locations: [],
			profile_update: null,
			detail: {...cases[2][2], periodo_dal: "2026-02-29"},
			announcement_locations: [{regione: "Lazio", citta: "Roma"}],
			contacts: {email: "public@example.com", phone: null},
			extras: {generic_link: null, video_highlights: null, image_path: null, image_mime: null},
			profile_social_links: null,
		};
		await assert.rejects(
			() => db.query("select public.publish_announcement_v2('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, $1::jsonb, '2026-09-23', '2026-09-23', 'gratuito')", [JSON.stringify(badPayload)]),
			/INVALID_PUBLISH_PAYLOAD/,
		);
		await db.exec("reset role");
		assert.deepEqual((await db.query("select tipologie_sport, ruoli_principali from public.annuncio_giocatore where uuid_annuncio = $1::uuid", [updatedPlayerId])).rows, [{tipologie_sport: ["Calcio a 5"], ruoli_principali: ["Portiere"]}]);
		await db.exec(`
			alter table public.utente alter column utente_uuid set default gen_random_uuid();
			alter table public.profilo alter column uuid set default gen_random_uuid();
			alter table public.profilo
				add column creato_il timestamptz,
				add column creato_da uuid,
				add column ultima_modifica_il timestamptz,
				add column ultima_modifica_da uuid,
				add column tipologia_principale text;
			alter table public.profilo_squadra
				add column id bigint generated always as identity,
				add column sport_principale text,
				add column sede_principale text,
				add column presentazione text;
			alter table public.localita_profilo
				add column id_sottoprofilo bigint,
				add column citta text;
			create or replace function auth.uid() returns uuid language sql stable as $$ select '44444444-4444-4444-8444-444444444444'::uuid $$;
			create or replace function auth.jwt() returns jsonb language sql stable as $$ select '{"email":"guest@example.com"}'::jsonb $$;
			insert into auth.users values (auth.uid(), 'guest@example.com', now());
		`);
		await db.exec(functionSql(original, "private.create_anonymous_publish_profile"));
		const guestPayload = {
			profile_type: "squadra",
			announcement_type: "annuncio_squadra_cerca_staff",
			profile_draft: {sport_principale: "Calcio", nome_societa: "Società ospite", tipologie_sport: ["Calcio a 11"], sede_principale: "Roma", presentazione: "Squadra ospite"},
			profile_locations: [{regione: "Lazio", citta: "Roma"}],
			profile_update: null,
			detail: cases[2][2],
			announcement_locations: [{regione: "Lazio", citta: "Roma"}],
			contacts: {email: "guest-contact@example.com", phone: null},
			extras: {generic_link: null, video_highlights: null, image_path: null, image_mime: null},
			profile_social_links: null,
		};
		await db.exec("set role authenticated");
		const guestResult = await db.query(
			"select public.publish_announcement_v2('dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid, $1::jsonb, '2026-09-23', '2026-09-23', 'gratuito') as result",
			[JSON.stringify(guestPayload)],
		);
		await db.exec("reset role");
		assert.equal(guestResult.rows[0].result.status, "success");
		assert.equal((await db.query("select anonymous_at_publish from private.announcement_submission where submission_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'")).rows[0].anonymous_at_publish, true);
		const counts = await db.query("select tipologia_annuncio, count(*)::integer as count from public.annuncio group by tipologia_annuncio order by tipologia_annuncio");
		assert.equal(counts.rows.length, 9);
		assert.equal(counts.rows.reduce((total, {count}) => total + count, 0), 11);
		assert.equal((await db.query("select count(*)::integer as count from private.announcement_submission")).rows[0].count, 11);
		assert.deepEqual((await db.query("select periodo_dal::text as from_date, periodo_al::text as to_date from public.annuncio_squadra_cerca_staff")).rows, [
			{from_date: "2026-10-01", to_date: "2026-12-31"},
			{from_date: "2026-10-01", to_date: "2026-12-31"},
		]);
		assert.deepEqual((await db.query("select orario_dalle::text as from_time, orario_alle::text as to_time from public.annuncio_squadra_cerca_partita")).rows, [{from_time: "18:30:00", to_time: "20:00:00"}]);
	} finally {
		await db.close();
	}
});

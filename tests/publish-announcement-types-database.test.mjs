import { PGlite } from "./helpers/pglite.mjs";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

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

test("all nine announcement types publish through the current free RPC", async t => {
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
			insert into public.profilo_giocatore values ('33333333-3333-4333-8333-333333333331', false, 'Mario', array['Calcio 11'], '{"principali":["Difensore"],"specifici":[]}'::jsonb);
			insert into public.profilo_squadra values ('33333333-3333-4333-8333-333333333331', false, 'Società', array['Calcio 11']);
			insert into public.profilo_staff_sportivo values ('33333333-3333-4333-8333-333333333331', false, 'Luigi', array['Allenatore'], '[]'::jsonb, 'disponibile-subito');
			insert into public.profilo_arbitro values ('33333333-3333-4333-8333-333333333331', false, 'Anna', '[]'::jsonb, 'disponibile-subito');
			insert into public.profilo_torneo_evento values ('33333333-3333-4333-8333-333333333331', false, 'Ente', array['Calcio 11']);
			insert into public.profilo_campi_impianti values ('33333333-3333-4333-8333-333333333331', false, 'Impianto', 'Roma', array['Calcio 11']);
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

		// Install the current field migration on the real publication core and synthetic data.
		await db.exec(`
			alter table public.profilo_giocatore add column richiede_caricamento_highlights boolean default false;
			alter table public.profilo_squadra add column categoria_attuale text;
			alter table public.profilo_arbitro add column lista_esperienze jsonb default '[]', add column qualifiche_licenze jsonb default '[]';
			update public.profilo_giocatore set richiede_caricamento_highlights = true;
			update public.profilo_arbitro set lista_esperienze = '[{"id":"old","titolo":"Old team","ente":"Old role","periodoDa":"2020","periodoA":"2021","squadraProfiloId":"33333333-3333-4333-8333-333333333331","squadraIstanzaId":1}]';
			insert into public.annuncio_arbitro(lista_esperienze) select lista_esperienze from public.profilo_arbitro;
			create function private.team_category_is_valid_v1(text) returns boolean language sql as $$ select $1 like 'Calcio a %::%' $$;
		`);
		const sqlSource = name => readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
		await db.exec(functionSql(sqlSource("20261007101356_profile_fields_and_first_team_categories"), "private.assert_updated_profile_fields_v1"));
		await db.exec(functionSql(sqlSource("20260928141148_refactor_profile_publication_fields"), "private.save_profile_career_sections_v1"));
		await db.exec(sqlSource("20261101120000_profile_and_announcement_field_adjustments"));
		assert.equal((await db.query("select richiede_caricamento_highlights from public.profilo_giocatore")).rows[0].richiede_caricamento_highlights, false);
		await assert.rejects(() => db.exec("update public.profilo_giocatore set richiede_caricamento_highlights = true"), /player_highlights_assistance_suspended/);
		const cleared = [{id: "old", titolo: "", ente: "", periodoDa: "2020", periodoA: "2021"}];
		for (const table of ["profilo_arbitro", "annuncio_arbitro"]) {
			assert.deepEqual((await db.query(`select lista_esperienze from public.${table}`)).rows[0].lista_esperienze, cleared);
		}
		await db.exec("delete from public.annuncio_arbitro where uuid_annuncio is null");
		const profileId = "33333333-3333-4333-8333-333333333331";
		const history = [{id: "new", titolo: "Prima Categoria", ente: "CSI", periodoDa: "2020", periodoA: "oggi", squadraProfiloId: profileId, squadraIstanzaId: 1}];
		await db.query("select private.save_profile_career_sections_v1($1, 'arbitro', $2)", [profileId, JSON.stringify({lista_esperienze: history, qualifiche_licenze: []})]);
		assert.deepEqual((await db.query("select lista_esperienze from public.profilo_arbitro")).rows[0].lista_esperienze, [{id: "new", titolo: "Prima Categoria", ente: "CSI", periodoDa: "2020", periodoA: "oggi"}]);
		for (const size of [11, 8, 7, 5]) {
			for (const gender of ["maschile", "femminile"]) {
				await db.query("update public.profilo_squadra set tipologie_sport = $1, categoria_attuale = $2", [[`Calcio ${size}`], `Calcio a ${size} ${gender}::Tornei`]);
				await db.query("select private.assert_updated_profile_fields_v1($1, 'squadra')", [profileId]);
			}
		}
		await db.exec("update public.profilo_squadra set tipologie_sport = array['Calcio 11']");
		await assert.rejects(() => db.query("select private.assert_updated_profile_fields_v1($1, 'squadra')", [profileId]), /TEAM_FIRST_TEAM_CATEGORY_REQUIRED/);

		const cases = [
			["giocatore", "annuncio_giocatore", {categorie_ricercate: [], descrizione_aggiuntiva: "Cerco una squadra."}],
			["squadra", "annuncio_squadra_cerca_giocatore", {ruoli_principali: ["Difensore"], ruoli_secondari: [], annate_ricercate: [], stagione: null, descrizione_aggiuntiva: "Cerchiamo un giocatore."}],
			["squadra", "annuncio_squadra_cerca_staff", {figura_ricercata: "Allenatore", settore: null, compenso_mensile: 19.99, requisiti: "Esperienza.", periodo_dal: "2026-10-01", periodo_al: "2026-12-31", descrizione_aggiuntiva: null}],
			["squadra", "annuncio_squadra_cerca_partita", {categorie_avversario: ["Under 17"], periodo_dal: "2026-10-01", periodo_al: "2026-12-31", orario_dalle: "18:30", orario_alle: "20:00", disponibilita_trasferta: null, descrizione_aggiuntiva: null}],
			["squadra", "annuncio_squadra_cerca_sponsor", {categoria_settore: "Locale", supporto_cercato: "Supporto.", offerta_fornita: "Visibilità.", descrizione_aggiuntiva: null}],
			["staff-sportivo", "annuncio_staff_sportivo", {tipologie_sport: ["Calcio 11"], categorie_ricercate: [], disponibilita_spostamento: null, descrizione_aggiuntiva: "Cerco incarico."}],
			["arbitro", "annuncio_arbitro", {tipologie_sport: ["Calcio 11"], automunito: null, disponibilita_spostamento: null, descrizione_aggiuntiva: "Disponibile."}],
			["torneo-evento", "annuncio_torneo_evento", {nome_evento: "Torneo", tipologie_sport: ["Calcio 11"], modalita_iscrizione: null, annate_ammesse_da: null, annate_ammesse_a: null, numero_squadre: null, costo_partecipazione: null, tipo_partecipazione: "squadra", lista_premi_trofei: [], descrizione_aggiuntiva: "Torneo locale."}],
			["campi-impianti-sportivi", "annuncio_campo_impianto", {tipologie_sport: ["Calcio 11"], orari: null, costo_partenza: 0.29, servizi_inclusi: null, descrizione_aggiuntiva: "Campo disponibile."}],
		];
		for (const [, , detail] of cases) detail.descrizione_aggiuntiva = null;
		cases[0][2].categorie_ricercate = ["Qualsiasi"];
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
			if (index === 0) {
				await assert.rejects(() => db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, '2026-09-23', '2026-09-23', 'gratuito')", [submissionId, JSON.stringify({...payload, detail: {...detail, categorie_ricercate: []}})]), /INVALID_PUBLISH_PAYLOAD/);
			}
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
				draft: {tipologie_sport: ["Calcio 5"], ruoli_sport: {principali: ["Portiere"], specifici: []}},
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
		assert.deepEqual((await db.query("select categorie_ricercate from public.annuncio_arbitro")).rows[0].categorie_ricercate, []);
		assert.deepEqual((await db.query("select tipologie_sport, ruoli_principali from public.annuncio_giocatore where uuid_annuncio = $1::uuid", [updatedPlayerId])).rows, [{tipologie_sport: ["Calcio 5"], ruoli_principali: ["Portiere"]}]);
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
			profile_draft: {sport_principale: "Calcio", nome_societa: "Società ospite", tipologie_sport: ["Calcio 11"], sede_principale: "Roma", presentazione: "Squadra ospite"},
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
		await t.test("regional RPC composes with the preserved business writer and finalized profile snapshots", async () => {
			await db.exec(`
        create or replace function auth.uid() returns uuid language sql stable as $$select '11111111-1111-4111-8111-111111111111'::uuid$$;
        create or replace function auth.jwt() returns jsonb language sql stable as $$select '{"email":"publisher@example.com"}'::jsonb$$;
        alter table public.annuncio add column eliminato_il timestamptz,add column eliminato_da uuid,add column oscurato_da_admin boolean default false;
        alter table private.announcement_submission add column stripe_checkout_session_id text,add column stripe_payment_intent_id text;
        create table public.media_annuncio(id bigint generated always as identity,uuid_annuncio uuid,link_media text);
        create table public.link_social_annuncio(id bigint generated always as identity,uuid_annuncio uuid,piattaforma text,sublink text);
        create table public.profilo_follow(uuid_profilo_follower uuid,uuid_profilo_seguito uuid);
        create table private.notifiche(destinatario uuid,tipo text,evento text,dati jsonb,unique(destinatario,evento));
        create table private.annunci_notificati(annuncio uuid primary key);
        create function private.notification_profile_ref(uuid) returns jsonb language sql as $$select jsonb_build_object('id',$1)$$;
        create function private.notification_target_ref(uuid,uuid) returns jsonb language sql as $$select jsonb_build_object('id',$1)$$;
      `);
			for (const name of ["20261102145910_regional_publication_schema","20261102151000_regional_publication_backfill","20261102151100_regional_publication_activate"]) await db.exec(sqlSource(name));
			const submission="ffffffff-ffff-4fff-8fff-ffffffffffff";
			const payload={...updatedPlayerPayload,announcement_locations:[{regione:"Lazio",citta:"Roma"},{regione:"Lazio",citta:"Viterbo"},{regione:"Veneto",citta:"Venezia"},{regione:"Toscana",citta:null},{regione:"Lombardia",citta:"Milano"}]};
			await db.exec("set role authenticated");
			const result=(await db.query("select public.publish_announcement_v3($1,$2::jsonb,'2026-09-23','2026-09-23','gratuito') result",[submission,JSON.stringify(payload)])).rows[0].result;
			const retry=(await db.query("select public.publish_announcement_v3($1,$2::jsonb,'2026-09-23','2026-09-23','gratuito') result",[submission,JSON.stringify(payload)])).rows[0].result;
			await db.exec("reset role");
			assert.equal(result.announcements.length,4); assert.equal(retry.idempotent,true); assert.equal(retry.publicationId,result.publicationId);
			for (const {id} of result.announcements) {
				assert.deepEqual((await db.query("select tipologie_sport,ruoli_principali from public.annuncio_giocatore where uuid_annuncio=$1",[id])).rows,[{tipologie_sport:["Calcio 5"],ruoli_principali:["Portiere"]}]);
				assert.equal((await db.query("select count(*)::int n from public.contatto_annuncio where uuid_annuncio=$1",[id])).rows[0].n,1);
			}
			assert.equal((await db.query("select count(*)::int n from private.announcement_submission where submission_id=$1",[submission])).rows[0].n,1);
		});
	} finally {
		await db.close();
	}
});

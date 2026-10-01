import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20261001143400_person_soccer_types_and_anonymous_newsletter.sql", import.meta.url);
const wrapperUrl = new URL("../supabase/migrations/20260928141148_refactor_profile_publication_fields.sql", import.meta.url);
const invitationWrapperUrl = new URL("../supabase/migrations/20260924173632_invitation_codes.sql", import.meta.url);

function functionSql(source, name) {
	const start = [source.indexOf(`create or replace function ${name}(`), source.indexOf(`create function ${name}(`)]
		.find((position) => position >= 0) ?? -1;
	assert.notEqual(start, -1);
	const suffix = source.slice(start);
	const match = /\r?\n\$\$;/.exec(suffix);
	assert.ok(match);
	return suffix.slice(0, match.index + match[0].length);
}

test("profile soccer types and anonymous newsletter choice persist through publication", {
	skip: !existsSync(engineUrl) && "PGlite runner unavailable",
}, async () => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	const anonymousAuthId = "11111111-1111-4111-8111-111111111111";
	const registeredAuthId = "22222222-2222-4222-8222-222222222222";
	try {
		await db.exec(`
			create role anon;
			create role authenticated;
			create role service_role;
			create schema auth;
			create schema private;
			create function auth.uid() returns uuid language sql stable as $$ select current_setting('test.auth_uid')::uuid $$;
			create table auth.users (id uuid primary key, email_confirmed_at timestamptz);
			create table public.utente (
				utente_uuid uuid primary key, auth_user_uuid uuid, registrato_il timestamptz,
				consenso_newsletter boolean not null default false,
				consenso_newsletter_aggiornato_il timestamptz, ultima_modifica_il timestamptz,
				codice_invito text
			);
			create table public.invito (uuid_invitante uuid, uuid_invitato uuid, codice_invito text, registrato_il timestamptz, confermato_il timestamptz);
			create table public.profilo (uuid uuid primary key, uuid_utente uuid);
			create table public.profilo_staff_sportivo (uuid_profilo uuid primary key, qualifiche_licenze jsonb);
			create table public.profilo_arbitro (uuid_profilo uuid primary key, lista_esperienze jsonb, storico_esperienze jsonb);
			create table public.annuncio (uuid uuid primary key, autore_annuncio uuid);
			create table private.announcement_submission (
				submission_id uuid primary key, announcement_id uuid, utente_id uuid, anonymous_at_publish boolean
			);
			create function private.tournament_step12_detail_is_valid(jsonb) returns boolean language sql immutable as $$ select true $$;
			create function private.save_staff_step10_fields_v1(p_profile_id uuid, p_draft jsonb)
			returns void language plpgsql as $$
			begin
				update public.profilo_staff_sportivo
				set qualifiche_licenze = p_draft -> 'qualifiche_licenze'
				where uuid_profilo = p_profile_id;
			end;
			$$;
			create function private.save_profile_career_sections_v1(p_profile_id uuid, p_profile_type text, p_draft jsonb)
			returns void language plpgsql as $$
			begin
				if p_profile_type = 'arbitro' then
					update public.profilo_arbitro
					set lista_esperienze = p_draft -> 'lista_esperienze',
					    storico_esperienze = '[]'::jsonb
					where uuid_profilo = p_profile_id;
				end if;
			end;
			$$;
			create function private.provision_auth_user_with_consents_v1(uuid,text,jsonb)
			returns void language plpgsql as $$ begin null; end; $$;
			create function private.ensure_invitation_code(uuid) returns void language plpgsql as $$ begin null; end; $$;
			create function private.publish_announcement_core_v2(p_submission_id uuid, p_payload jsonb, p_terms_version text, p_privacy_version text, p_visibility text)
			returns jsonb language plpgsql as $$
			declare v_announcement_id uuid; v_user_id uuid; v_registered_at timestamptz;
			begin
				select announcement_id into v_announcement_id from private.announcement_submission where submission_id = p_submission_id;
				if found then return jsonb_build_object('status', 'success', 'announcementId', v_announcement_id, 'idempotent', true); end if;
				select utente_uuid, registrato_il into v_user_id, v_registered_at from public.utente where auth_user_uuid = auth.uid();
				v_announcement_id := gen_random_uuid();
				insert into public.annuncio values (v_announcement_id, gen_random_uuid());
				insert into private.announcement_submission values (p_submission_id, v_announcement_id, v_user_id, v_registered_at is null);
				return jsonb_build_object('status', 'success', 'announcementId', v_announcement_id, 'idempotent', false);
			end;
			$$;
		`);
		await db.exec(functionSql(readFileSync(invitationWrapperUrl, "utf8"), "private.provision_auth_user"));
		await db.exec(functionSql(readFileSync(wrapperUrl, "utf8"), "public.publish_announcement_v2"));
		await db.exec(readFileSync(migrationUrl, "utf8"));

		await db.query("insert into public.utente (utente_uuid, auth_user_uuid) values ($1, $2)", ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", anonymousAuthId]);
		await db.query("insert into public.utente (utente_uuid, auth_user_uuid, registrato_il) values ($1, $2, now())", ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", registeredAuthId]);
		await db.query("select set_config('test.auth_uid', $1, false)", [anonymousAuthId]);
		const payload = {profile_type: "giocatore", announcement_type: "annuncio_giocatore", profile_draft: null, profile_update: null, newsletter_subscribed: true};
		const submissionId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
		await db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, 'terms', 'privacy', 'gratuito')", [submissionId, JSON.stringify(payload)]);
		let choice = (await db.query("select consenso_newsletter, consenso_newsletter_aggiornato_il from public.utente where auth_user_uuid = $1", [anonymousAuthId])).rows[0];
		assert.equal(choice.consenso_newsletter, true);
		assert.ok(choice.consenso_newsletter_aggiornato_il);
		let receipt = (await db.query("select newsletter_subscribed, newsletter_choice_at from private.announcement_submission where submission_id = $1", [submissionId])).rows[0];
		assert.equal(receipt.newsletter_subscribed, true);
		assert.ok(receipt.newsletter_choice_at);

		await db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, 'terms', 'privacy', 'gratuito')", [submissionId, JSON.stringify({...payload, newsletter_subscribed: false})]);
		choice = (await db.query("select consenso_newsletter from public.utente where auth_user_uuid = $1", [anonymousAuthId])).rows[0];
		assert.equal(choice.consenso_newsletter, true);

		await db.query("select set_config('test.auth_uid', $1, false)", [registeredAuthId]);
		await db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, 'terms', 'privacy', 'gratuito')", ["dddddddd-dddd-4ddd-8ddd-dddddddddddd", JSON.stringify(payload)]);
		choice = (await db.query("select consenso_newsletter from public.utente where auth_user_uuid = $1", [registeredAuthId])).rows[0];
		assert.equal(choice.consenso_newsletter, false);
		const staffProfileId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
		const refereeProfileId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
		await db.query("insert into public.profilo_staff_sportivo (uuid_profilo) values ($1)", [staffProfileId]);
		await db.query("insert into public.profilo_arbitro (uuid_profilo) values ($1)", [refereeProfileId]);
		await db.query("select private.save_staff_step10_fields_v1($1::uuid, $2::jsonb)", [staffProfileId, JSON.stringify({qualifiche_licenze: [], tipologie_sport: ["Calcio 11", "Calcio 5"]})]);
		await db.query("select private.save_profile_career_sections_v1($1::uuid, 'arbitro', $2::jsonb)", [refereeProfileId, JSON.stringify({lista_esperienze: [], tipologie_sport: ["Calcio 7"]})]);
		assert.deepEqual((await db.query("select tipologie_sport from public.profilo_staff_sportivo where uuid_profilo = $1", [staffProfileId])).rows[0].tipologie_sport, ["Calcio 11", "Calcio 5"]);
		assert.deepEqual((await db.query("select tipologie_sport from public.profilo_arbitro where uuid_profilo = $1", [refereeProfileId])).rows[0].tipologie_sport, ["Calcio 7"]);
		await db.query("insert into public.profilo (uuid, uuid_utente) values ($1, $2), ($3, $2)", [staffProfileId, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", refereeProfileId]);
		await db.query("select private.provision_auth_user($1::uuid, 'test@example.com', $2::jsonb)", [registeredAuthId, JSON.stringify({profiles: [
			{type: "staff-sportivo", draft: {tipologie_sport: ["Calcio 8"]}},
			{type: "arbitro", draft: {tipologie_sport: ["Calcio 5", "Calcio 7"]}},
		]})]);
		assert.deepEqual((await db.query("select tipologie_sport from public.profilo_staff_sportivo where uuid_profilo = $1", [staffProfileId])).rows[0].tipologie_sport, ["Calcio 8"]);
		assert.deepEqual((await db.query("select tipologie_sport from public.profilo_arbitro where uuid_profilo = $1", [refereeProfileId])).rows[0].tipologie_sport, ["Calcio 5", "Calcio 7"]);
	} finally {
		await db.close();
	}
});

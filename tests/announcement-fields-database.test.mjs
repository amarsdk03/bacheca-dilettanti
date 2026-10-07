import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20261006194601_announcement_fields_and_professional_regions.sql", import.meta.url);
const uid = "11111111-1111-4111-8111-111111111111";
const profile = "22222222-2222-4222-8222-222222222222";
const announcement = "33333333-3333-4333-8333-333333333333";

test("announcement fields migration enforces regions transactionally, stores groups, and validates the full Staff catalogue", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async (t) => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	try {
		await db.exec(`
			create role anon; create role authenticated; create role service_role;
			create schema private; create schema auth;
			create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.user', true), '')::uuid $$;
			create table public.utente (utente_uuid uuid primary key, auth_user_uuid uuid, registrato_il timestamptz);
			create table public.profilo (uuid uuid primary key, uuid_utente uuid);
			create table public.annuncio (uuid uuid primary key, autore_annuncio uuid);
			create table public.annuncio_squadra_cerca_giocatore (uuid_annuncio uuid primary key);
			create table public.annuncio_squadra_cerca_partita (uuid_annuncio uuid primary key);
			create table public.localita_profilo (uuid_profilo uuid, sottoprofilo text, regione text, citta text);
			create table public.localita_annuncio (uuid_annuncio uuid, regione text, citta text);
			create function private.publish_text_array_is_valid(p_value jsonb, p_required boolean default false, p_max_items integer default 32, p_max_length integer default 120)
			returns boolean language sql as $$ select jsonb_typeof(p_value) = 'array'
				and jsonb_array_length(p_value) <= p_max_items and (not p_required or jsonb_array_length(p_value) > 0)
				and not exists (select 1 from jsonb_array_elements(p_value) as item(value) where jsonb_typeof(value) <> 'string' or length(btrim(value #>> '{}')) not between 1 and p_max_length) $$;
			create function public.publish_announcement_core_v1(uuid, jsonb, text, text) returns jsonb language plpgsql as $$ declare v_detail jsonb := $2 -> 'detail'; begin
				if not private.publish_text_array_is_valid(v_detail -> 'categorie_avversario', true) then raise exception 'INVALID_OPPONENT'; end if;
				return '{}'::jsonb;
			end $$;
			create function private.publish_announcement_core_v2(uuid, jsonb, text, text, text) returns jsonb language plpgsql as $$ begin
				insert into public.annuncio values ('${announcement}', '${profile}');
				if $2 ->> 'announcement_type' = 'annuncio_squadra_cerca_giocatore' then
					insert into public.annuncio_squadra_cerca_giocatore values ('${announcement}');
				elsif $2 ->> 'announcement_type' = 'annuncio_squadra_cerca_partita' then
					insert into public.annuncio_squadra_cerca_partita values ('${announcement}');
				end if;
				insert into public.localita_annuncio select '${announcement}', location ->> 'regione', location ->> 'citta' from jsonb_array_elements($2 -> 'announcement_locations') as location;
				if $2 -> 'profile_update' is not null then
					delete from public.localita_profilo where uuid_profilo = '${profile}';
					insert into public.localita_profilo select '${profile}', 'servizi-consulenze', location ->> 'regione', null from jsonb_array_elements($2 -> 'profile_update' -> 'locations') as location;
				end if;
				return '{"status":"success","announcementId":"${announcement}","idempotent":false}'::jsonb;
			end $$;
			create function public.publish_announcement_v2(p_submission_id uuid, p_payload jsonb, p_terms_version text, p_privacy_version text, p_visibility text) returns jsonb language plpgsql security definer set search_path = '' as $$ declare v_result jsonb; begin
				if $2 ->> 'announcement_type' = 'annuncio_staff_sportivo' and not private.staff_step11_detail_is_valid($2 -> 'detail') then raise exception 'INVALID_STAFF'; end if;
				v_result := private.publish_announcement_core_v2($1, $2, $3, $4, $5);
				if v_result ->> 'status' <> 'success' then
  return v_result;
				end if;
  return v_result;
			end $$;
			insert into public.utente values ('${uid}', '${uid}', now());
			insert into public.profilo values ('${profile}', '${uid}');
			insert into public.localita_profilo values ('${profile}', 'servizi-consulenze', 'Lombardia', null), ('${profile}', 'servizi-consulenze', 'Campania', null);
		`);
		await db.exec(readFileSync(migrationUrl, "utf8"));
		await db.query("select set_config('test.user', $1, false)", [uid]);
		const send = async (regions, extra = {}, type = "annuncio_servizi_consulenze") => {
			const payload = {announcement_type: type, detail: {}, announcement_locations: regions.map(regione => ({regione})), ...extra};
			return (await db.query("select public.publish_announcement_v2($1::uuid, $2::jsonb, 'terms', 'privacy', 'gratuito') as result", [announcement, JSON.stringify(payload)])).rows[0].result;
		};
		const clear = () => db.exec("delete from public.annuncio_squadra_cerca_giocatore; delete from public.annuncio_squadra_cerca_partita; delete from public.localita_annuncio; delete from public.annuncio;");

		await t.test("only a subset of saved professional regions is allowed", async () => {
			for (const regions of [["Lombardia"], ["Campania"], ["Lombardia", "Campania"]]) {
				assert.equal((await send(regions)).status, "success");
				await clear();
			}
			for (const regions of [[], ["Lazio"], ["Lombardia", "Lazio"]]) {
				await assert.rejects(() => send(regions), /PROFESSIONAL_ANNOUNCEMENT_AREA_NOT_ALLOWED/);
				assert.equal((await db.query("select count(*)::int as count from public.annuncio")).rows[0].count, 0);
			}
		});
		await t.test("profile updates and announcement areas are checked in one transaction", async () => {
			await assert.rejects(() => send(["Campania"], {profile_update: {locations: [{regione: "Lazio"}]}}), /PROFESSIONAL_ANNOUNCEMENT_AREA_NOT_ALLOWED/);
			assert.deepEqual((await db.query("select regione from public.localita_profilo order by regione")).rows.map(({regione}) => regione), ["Campania", "Lombardia"]);
			assert.equal((await send(["Lazio"], {profile_update: {locations: [{regione: "Lazio"}]}})).status, "success");
			await clear();
			await assert.rejects(() => send(["Lombardia"]), /PROFESSIONAL_ANNOUNCEMENT_AREA_NOT_ALLOWED/);
		});
		await t.test("the profile owner is checked even for a direct RPC request", async () => {
			await db.query("select set_config('test.user', $1, false)", [profile]);
			await assert.rejects(() => send(["Lazio"]), /PROFILE_ACCESS_DENIED/);
			await db.query("select set_config('test.user', $1, false)", [uid]);
		});
		await t.test("team groups persist and invalid groups roll back the announcement", async () => {
			for (const [type, table] of [["annuncio_squadra_cerca_giocatore", "annuncio_squadra_cerca_giocatore"], ["annuncio_squadra_cerca_partita", "annuncio_squadra_cerca_partita"]]) {
				await send(["Lazio"], {detail: {gruppo_squadra: "  Juniores  "}}, type);
				assert.equal((await db.query(`select gruppo_squadra from public.${table}`)).rows[0].gruppo_squadra, "Juniores");
				await clear();
				for (const group of ["x".repeat(161), 42]) await assert.rejects(() => send(["Lazio"], {detail: {gruppo_squadra: group}}, type), /INVALID_TEAM_ANNOUNCEMENT_GROUP/);
			}
		});
		await t.test("all 93 Staff options match the SQL catalogue and Qualsiasi is exclusive", async () => {
			const source = readFileSync(new URL("../src/features/pubblica-annuncio/types/staff-category-catalog.ts", import.meta.url), "utf8");
			const groups = Function(`return ${source.match(/STAFF_CATEGORY_GROUPS = (\[[\s\S]*?\]) as const/)[1]}`)();
			const keys = groups.flatMap(({gruppo, opzioni}) => opzioni.map(option => gruppo === "Selezione generale" ? option : `${gruppo}::${option}`));
			assert.equal(new Set(keys).size, 93);
			for (const key of keys) {
				assert.equal((await db.query("select private.staff_step11_detail_is_valid($1::jsonb) as valid", [JSON.stringify({categorie_ricercate: [key], disponibilita_spostamento: "Da valutare"})])).rows[0].valid, true, key);
			}
			for (const categories of [["Serie A"], ["Qualsiasi", "Prime squadre"], [7], Array(33).fill("Prime squadre")]) {
				assert.equal((await db.query("select private.staff_step11_detail_is_valid($1::jsonb) as valid", [JSON.stringify({categorie_ricercate: categories})])).rows[0].valid, false);
			}
			await assert.rejects(() => send(["Lazio"], {detail: {categorie_ricercate: ["Categoria inventata"]}}, "annuncio_staff_sportivo"), /INVALID_STAFF/);
		});
		await t.test("opponent category accepts a single free text up to 160 characters", async () => {
			const check = categories => db.query("select public.publish_announcement_core_v1($1::uuid, $2::jsonb, '', '')", [announcement, JSON.stringify({detail: {categorie_avversario: categories}})]);
			await check(["Categoria libera"]);
			await check(["x".repeat(160)]);
			await assert.rejects(() => check(["x".repeat(161)]), /INVALID_OPPONENT/);
			await assert.rejects(() => check(["Prima", "Seconda"]), /INVALID_OPPONENT/);
		});
		await t.test("helpers are private and cannot be called directly by publishers", async () => {
			await db.exec("set role authenticated");
			await assert.rejects(() => db.query("select private.finalize_announcement_fields_v1('{}', '{}')"), /permission denied/);
			await db.exec("reset role");
		});
	} finally {
		await db.close();
	}
});

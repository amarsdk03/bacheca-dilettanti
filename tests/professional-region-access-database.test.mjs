import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {test} from "node:test";

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20261007152510_professional_regions_and_service_labels.sql", import.meta.url);
const user = "11111111-1111-4111-8111-111111111111";
const profile = "22222222-2222-4222-8222-222222222222";
const ad = "33333333-3333-4333-8333-333333333333";

function existingFunction(file, name) {
    const source = readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8");
    const start = source.search(new RegExp(`create (?:or replace )?function ${name.replaceAll(".", "\\.")}\\(`));
    assert.ok(start >= 0, `Missing prerequisite function ${name}`);
    return source.slice(start, source.indexOf("$$;", start) + 3);
}

test("admin region entitlements guard independent profile/publication selections and prune revocations", {skip: !existsSync(engineUrl) && "PGlite runner unavailable"}, async (t) => {
    const {PGlite} = await import(engineUrl.href);
    const db = await PGlite.create();
    try {
        await db.exec(`
            create role anon; create role authenticated; create role service_role bypassrls;
            create schema private; create schema auth;
            create function auth.uid() returns uuid language sql as $$ select '${user}'::uuid $$;
            create table public.utente (utente_uuid uuid primary key, auth_user_uuid uuid, registrato_il timestamptz);
            create table public.profilo (uuid uuid primary key, uuid_utente uuid);
            create table public.profilo_servizi_consulenze (uuid_profilo uuid primary key);
            create table public.profilo_creator (uuid_profilo uuid primary key);
            create table public.annuncio (uuid uuid primary key, autore_annuncio uuid, tipologia_annuncio text);
            create table public.annuncio_squadra_cerca_giocatore (uuid_annuncio uuid primary key, gruppo_squadra text);
            create table public.annuncio_squadra_cerca_partita (uuid_annuncio uuid primary key, gruppo_squadra text);
            create table public.localita_profilo (uuid_profilo uuid, sottoprofilo text, regione text not null, citta text);
            create table public.localita_annuncio (uuid_annuncio uuid, regione text not null, citta text);
            create table public.restricted_profile_access (
                profile_id uuid references public.profilo(uuid),
                profile_type text check (profile_type in ('servizi-consulenze', 'creators')),
                primary key (profile_id, profile_type)
            );
            -- Focused stand-in for the installed core writer; the migration patches
            -- its established wrapper after locations are written in one transaction.
            create function private.save_owned_subprofile_internal_v1(p_user_id uuid,p_profile_type text,p_draft jsonb,p_locations jsonb)
            returns jsonb language plpgsql as $$
            declare v_profile_id uuid; v_result jsonb := '{"status":"success"}';
            begin
                select uuid into v_profile_id from public.profilo where uuid_utente = p_user_id for update;
                delete from public.localita_profilo where uuid_profilo = v_profile_id and sottoprofilo = p_profile_type;
                insert into public.localita_profilo
                  select v_profile_id, p_profile_type, value->>'regione', value->>'citta' from jsonb_array_elements(p_locations);
  return v_result;
            end; $$;
            grant usage on schema public,private,auth to service_role;
            grant all on all tables in schema public to service_role;
            insert into public.utente values ('${user}', '${user}', now());
            insert into public.profilo values ('${profile}', '${user}');
            insert into public.restricted_profile_access values ('${profile}', 'servizi-consulenze');
            insert into public.localita_profilo values ('${profile}', 'servizi-consulenze', 'Lombardia', 'Milano');
            insert into public.annuncio values ('${ad}', '${profile}', 'annuncio_servizi_consulenze');
            insert into public.localita_annuncio values ('${ad}', 'Campania', 'Napoli');
        `);
        await db.exec(existingFunction("20261001160000_restricted_profiles_and_service_publication.sql", "private.assert_restricted_profile_access_v1"));
        await db.exec("create trigger restricted_access_guard before insert or update on public.restricted_profile_access for each row execute function private.assert_restricted_profile_access_v1();");
        await db.exec(existingFunction("20261006194601_announcement_fields_and_professional_regions.sql", "private.finalize_announcement_fields_v1"));
        await db.exec(readFileSync(migrationUrl, "utf8"));
        const count = async (table) => Number((await db.query(`select count(*) as n from public.${table}`)).rows[0].n);
        const configure = (regions) => db.query("select public.admin_configure_professional_access_v1($1, $2::text[])", [profile, regions]);
        const save = (regions) => db.query("select private.save_owned_subprofile_internal_v1($1,'servizi-consulenze','{}',$2::jsonb)", [user, JSON.stringify(regions.map(regione => ({regione})))]);
        const insertAdLocation = (region, city = null) => db.query("insert into public.localita_annuncio values ($1,$2,$3)", [ad, region, city]);
        const finalize = () => db.query("select private.finalize_announcement_fields_v1($1::jsonb,$2::jsonb)", [JSON.stringify({status: "success", announcementId: ad}), JSON.stringify({announcement_type: "annuncio_servizi_consulenze"})]);

        await t.test("initial grants are empty and old selections confer no authorization", async () => {
            assert.deepEqual((await db.query("select allowed_regions from public.restricted_profile_access")).rows[0].allowed_regions, []);
            assert.equal(await count("localita_profilo"), 0);
            assert.equal(await count("localita_annuncio"), 0);
            assert.equal(await count("annuncio"), 1);
            await assert.rejects(() => save(["Lombardia"]), /PROFESSIONAL_REGIONS_REQUIRED/);
        });
        await t.test("only admins configure grants, with >= 1 valid region", async () => {
            await assert.rejects(() => configure([]), /INVALID_PROFESSIONAL_REGIONS/);
            await assert.rejects(() => configure(null), /INVALID_PROFESSIONAL_REGIONS/);
            await assert.rejects(() => configure(["Atlantide"]), /INVALID_PROFESSIONAL_REGIONS/);
            await assert.rejects(() => configure(["Lombardia", "Lombardia"]), /INVALID_PROFESSIONAL_REGIONS/);
            await assert.rejects(() => configure([null]), /INVALID_PROFESSIONAL_REGIONS/);
            await assert.rejects(() => db.query("select public.admin_configure_professional_access_v1($1, array[['Lombardia'],['Campania']])", [profile]), /INVALID_PROFESSIONAL_REGIONS/);
            await db.exec("set role authenticated;");
            await assert.rejects(() => configure(["Lombardia"]), /permission denied/);
            await assert.rejects(() => db.query("update public.restricted_profile_access set allowed_regions = array['Lazio']"), /permission denied/);
            await db.exec("reset role; set role anon;");
            await assert.rejects(() => configure(["Lombardia"]), /permission denied/);
            await db.exec("reset role; set role service_role;");
            await configure(["Lombardia", "Campania"]);
            await db.exec("reset role;");
        });
        await t.test("profile in Lombardia can publish in Campania independently", async () => {
            await save(["Lombardia"]);
            await insertAdLocation("Campania", "Napoli");
            await finalize();
            assert.equal(await count("localita_profilo"), 1);
            assert.equal(await count("localita_annuncio"), 1);
        });
        await t.test("RPC rollback and direct writes reject unauthorized regions", async () => {
            await assert.rejects(() => save(["Lazio"]), /PROFESSIONAL_PROFILE_AREA_NOT_ALLOWED/);
            await assert.rejects(() => save([]), /PROFESSIONAL_PROFILE_AREA_NOT_ALLOWED/);
            assert.equal((await db.query("select regione from public.localita_profilo")).rows[0].regione, "Lombardia");
            await assert.rejects(() => insertAdLocation("Lazio"), /PROFESSIONAL_ANNOUNCEMENT_AREA_NOT_ALLOWED/);
            await assert.rejects(() => db.query("update public.localita_annuncio set regione='Lazio'"), /PROFESSIONAL_ANNOUNCEMENT_AREA_NOT_ALLOWED/);
            await assert.rejects(() => db.query("insert into public.localita_profilo values ($1,'servizi-consulenze','Lazio',null)", [profile]), /PROFESSIONAL_PROFILE_AREA_NOT_ALLOWED/);
            await assert.rejects(() => db.query("update public.restricted_profile_access set allowed_regions=array['Invalid']"), /restricted_profile_allowed_regions_valid/);
        });
        await t.test("partial revocation removes only affected locations and stale submissions fail", async () => {
            await insertAdLocation("Lombardia", "Milano");
            await configure(["Lombardia"]);
            assert.deepEqual((await db.query("select regione,citta from public.localita_annuncio")).rows, [{regione: "Lombardia", citta: "Milano"}]);
            assert.equal(await count("localita_profilo"), 1);
            await assert.rejects(() => insertAdLocation("Campania"), /PROFESSIONAL_ANNOUNCEMENT_AREA_NOT_ALLOWED/);
            await finalize();
        });
        await t.test("full suspension retains content, and reauthorization does not restore deleted selections", async () => {
            await db.exec("update public.restricted_profile_access set allowed_regions='{}';");
            assert.equal(await count("localita_profilo"), 0);
            assert.equal(await count("localita_annuncio"), 0);
            assert.equal(await count("annuncio"), 1);
            await assert.rejects(finalize, /PROFESSIONAL_REGIONS_REQUIRED/);
            await configure(["Lombardia"]);
            assert.equal(await count("localita_annuncio"), 0);
            await assert.rejects(finalize, /PROFESSIONAL_PROFILE_AREA_NOT_ALLOWED/);
            await save(["Lombardia"]);
            await assert.rejects(finalize, /PROFESSIONAL_ANNOUNCEMENT_AREA_NOT_ALLOWED/);
        });
        await t.test("ordinary profiles and Creators keep their location behavior", async () => {
            await db.query("insert into public.localita_profilo values ($1,'creators','Lazio',null)", [profile]);
            await db.query("insert into public.restricted_profile_access (profile_id,profile_type) values ($1,'creators')", [profile]);
            await assert.rejects(() => db.exec("update public.restricted_profile_access set allowed_regions=array['Lazio'] where profile_type='creators'"), /restricted_profile_regions_scope/);
            await configure(["Campania"]);
            assert.deepEqual((await db.query("select sottoprofilo,regione from public.localita_profilo")).rows, [{sottoprofilo: "creators", regione: "Lazio"}]);
        });
    } finally {
        await db.close();
    }
});

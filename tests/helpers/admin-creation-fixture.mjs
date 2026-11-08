import {readFileSync} from "node:fs";
import {createAuditReadsFixture} from "./admin-audit-reads-fixture.mjs";
const read = name => readFileSync(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
function fn(source, name) {
  const match = new RegExp(`create (?:or replace )?function ${name.replaceAll(".", "\\.")}\\(`).exec(source);
  if (!match) throw new Error(name);
  return source.slice(match.index, source.indexOf("$$;", match.index) + 3);
}
export async function createCreationFixture() {
  const h = await createAuditReadsFixture(); const {db} = h;
  try {
    // Complete the synthetic schema from the shared database types. Behaviors
    // below use the actual SQL functions; no remote services or credentials.
    const schema = readFileSync(new URL("../../packages/database/src/index.ts", import.meta.url), "utf8");
    const tables = new Map([...schema.matchAll(/^      (\w+): \{\s*Row: \{([\s\S]*?)^        \}/gm)].map(m => [m[1],m[2]]));
    for (const [table, body] of tables) {
      if (!/^profilo(?:_|$)/.test(table) || ["profilo_follow", "profilo_professionista_studente"].includes(table)) continue;
      const exists = (await db.query("select to_regclass($1) as tab",["public."+table])).rows[0].tab; if (!exists) continue;
      for (const [,column,type] of body.matchAll(/^\s+(\w+): ([^\r\n]+)/gm)) {
        const sqlType = type.includes("Json") ? "jsonb" : type.includes("string[]") ? "text[]" : type.includes("string") ? "text" : type.includes("number") ? "numeric" : "boolean";
        if ((await db.query("select 1 from information_schema.columns where table_schema='public' and table_name=$1 and column_name=$2",[table,column])).rows.length) continue;
        await db.exec(`alter table public.${table} add column ${column} ${sqlType}`);
      }
    }
    await db.exec(`alter table public.profilo alter uuid set default gen_random_uuid();
      alter table public.localita_profilo add column id bigint generated always as identity,add column citta text,add column id_sottoprofilo bigint;
      alter table public.annuncio alter creato_il set default now();
      create table private.regional_publication(id uuid primary key default gen_random_uuid(),submission_id uuid unique,owner_id uuid,created_at timestamptz default now());
      create table private.regional_publication_item(publication_id uuid references private.regional_publication,announcement_id uuid unique,region text);
      create table private.regional_publication_context(transaction_id bigint primary key,mode text not null constraint regional_publication_context_mode_check check(mode in ('publish','backfill')));
      alter table public.annuncio add column gruppo_pubblicazione uuid,add column regione_pubblicazione text;`);
    const publication = read("20260824195350_publish_announcement_workflow");
    for (const name of ["private.publish_object_has_only_keys","private.publish_text_is_valid","private.publish_text_array_is_valid","private.publish_locations_are_valid","private.create_anonymous_publish_profile"]) await db.exec(fn(publication,name));
    await db.exec(fn(read("20260927040000_enforce_current_player_team_profile_fields"),"private.assert_required_subprofile_fields_v1").replaceAll("profilo_professionista_studente","profilo_servizi_consulenze").replaceAll("professionisti-studi","servizi-consulenze"));
    await db.exec(fn(read("20260927020000_facility_profile_single_site"),"private.facility_step13_location_is_valid"));
    const fields = read("20261007101356_profile_fields_and_first_team_categories");
    for (const name of ["private.team_category_is_valid_v1","private.assert_updated_profile_fields_v1"]) await db.exec(fn(fields,name));
    // Real social writer uses subprofile identity helpers, also loaded verbatim.
    const social = read("20260928141148_refactor_profile_publication_fields");
    const requiredPatch = social.indexOf("do $migration$");
    await db.exec(social.slice(requiredPatch,social.indexOf("$migration$;",requiredPatch)+13));
    await db.exec(`create table public.link_social_profilo(id bigint generated always as identity,uuid_profilo uuid,sottoprofilo text,id_sottoprofilo bigint,piattaforma text,sublink text);`);
    await db.exec(`create unique index link_social_profilo_managed_platform_uidx on public.link_social_profilo(uuid_profilo,sottoprofilo,piattaforma) where sottoprofilo is not null and piattaforma in ('website','instagram','facebook','youtube','linkedin');`);
    await db.exec(fn(social,"private.sync_profile_social_links_v1"));
    const regional = read("20261102145910_regional_publication_schema");
    for (const name of ["private.regional_copy_rows","private.regional_split_announcement","private.regional_publication_result"]) await db.exec(fn(regional,name));
    await db.exec(read("20261106180007_admin_annunci_media_titles"));
    await db.exec(read("20261107152140_admin_announcement_creation"));
    await h.reset();
    await db.exec("update public.utente set registrato_il=now() where tipologia_utente='Utente'");
    return h;
  } catch(error) {await db.close(); throw error;}
}

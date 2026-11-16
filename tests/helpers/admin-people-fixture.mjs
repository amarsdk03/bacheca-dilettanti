import {readFileSync} from "node:fs";
import {createCommunityFixture} from "./admin-community-fixture.mjs";
import {listId} from "./admin-announcements-fixture.mjs";
const read = name => readFileSync(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
function installedFunction(sql, name) {
  const start = sql.search(new RegExp(`create (?:or replace )?function ${name.replaceAll(".", "\\.")}\\(`, "i"));
  if (start < 0) throw Error(`Missing fixture function ${name}`);
  const end = sql.indexOf("$$;", start); return sql.slice(start, end + 3);
}
export async function createPeopleFixture({apply = true, wrappedList = false, baseFixture} = {}) {
  const h = await createCommunityFixture({base: baseFixture});
  try {
    await h.db.exec("grant usage on schema auth to anon,authenticated");
    await h.db.exec(`alter table public.utente add column if not exists creato_il timestamptz not null default now(), add column if not exists num_telefono text,
      add column if not exists consenso_newsletter boolean not null default false, add column if not exists consenso_newsletter_aggiornato_il timestamptz,
      add column if not exists informative_accettate_il timestamptz, add column if not exists versione_termini text, add column if not exists versione_privacy text, add column if not exists versione_cookie_policy text;
      alter table public.profilo add column if not exists creato_il timestamptz not null default now(), add column if not exists verificato_il timestamptz, add column if not exists confermato_il timestamptz;
      alter table public.localita_profilo add column if not exists id bigint generated always as identity, add column if not exists citta text, add column if not exists sottoprofilo text, add column if not exists id_sottoprofilo bigint;`);
    for (const [migration, functions] of [
      ["20261005121608_manifestazioni_interesse", ["private.interest_subprofile_id", "public.submit_manifestazione_interesse_v1"]],
      ["20261005140622_profile_follow_identities_and_activity", ["public.set_profile_follow_v2"]],
      ["20261102145910_regional_publication_schema", ["private.regional_emit_notification"]],
    ]) for (const name of functions) await h.db.exec(installedFunction(read(migration), name));
    await h.db.exec("alter table public.annuncio add column if not exists gruppo_pubblicazione uuid, add column if not exists regione_pubblicazione text");
    await h.db.exec(installedFunction(read("20261102145910_regional_publication_schema"), "public.latest_regional_announcement_ids_v1"));
    if (wrappedList) await h.db.exec(`
      alter function private.list_admin_announcements_v1(jsonb) rename to list_admin_announcements_before_create_v1;
      create function private.list_admin_announcements_v1(p_query jsonb default '{}') returns jsonb
      language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
        result:=private.list_admin_announcements_before_create_v1(p_query);
        return jsonb_set(result,'{items}',coalesce((select jsonb_agg(v||jsonb_build_object('fromWhatsApp',true)) from jsonb_array_elements(result->'items') v),'[]'));
      end $$;
      alter function private.list_admin_announcements_v1(jsonb) rename to list_admin_announcements_before_whatsapp_v1;
      create function private.list_admin_announcements_v1(p_query jsonb default '{}') returns jsonb
      language plpgsql stable security definer set search_path='' as $$ declare result jsonb; begin
        result:=private.list_admin_announcements_before_whatsapp_v1(p_query);
        return jsonb_set(result,'{items}',coalesce((select jsonb_agg(v||jsonb_build_object('whatsappStatus','imported')) from jsonb_array_elements(result->'items') v),'[]'));
      end $$;`);
    const migrate = async () => {
      await h.db.exec(read("20261115112211_profile_type_verification_and_holds"));
      await h.db.exec(read("20261115112325_admin_users_and_profiles"));
      await h.db.exec(read("20261116120439_admin_directory_sort_and_filter_defaults"));
    };
    if (apply) await migrate();
    return {...h, migrate, async reset() {
      await h.reset();
      await h.db.query("insert into auth.users(id,email) values($1,'zero@example.test')", [listId(3)]);
      await h.db.query("update public.utente set auth_user_uuid=$1 where utente_uuid=$2", [listId(3), listId(103)]);
    }};
  } catch (e) {await h.db.close(); throw e;}
}

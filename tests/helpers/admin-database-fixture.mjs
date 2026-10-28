import { PGlite } from "./pglite.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Shared synthetic schema, in-memory only. No env files, URLs or network.
const readMigration = (name) => readFileSync(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), "utf8");

function functionBody(source, name) {
  const start = source.indexOf(`create or replace function ${name}(`);
  assert(start >= 0, `Missing source function ${name}`);
  return source.slice(start, source.indexOf("$$;", start) + 3);
}

export async function createAdminDatabaseFixture() {
  const db = await PGlite.create();
  try {
    await db.exec(`
      set timezone = 'UTC';
      create role anon; create role authenticated; create role service_role bypassrls;
      create role supabase_auth_admin;
      create schema private; create schema auth;
      grant usage on schema auth, private to service_role;
      grant usage on schema auth to authenticated;
      create function auth.jwt() returns jsonb language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb
      $$;
      create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz,
        banned_until timestamptz, deleted_at timestamptz, is_anonymous boolean default false,
        raw_user_meta_data jsonb default '{}');
      create table auth.sessions(id uuid primary key, user_id uuid references auth.users,
        created_at timestamptz default now(), not_after timestamptz, refreshed_at timestamp);
      create table auth.refresh_tokens(id bigint generated always as identity primary key,
        session_id uuid references auth.sessions, updated_at timestamptz, revoked boolean default false);
      create table public.utente(utente_uuid uuid primary key default gen_random_uuid(),
        auth_user_uuid uuid unique references auth.users, tipologia_utente text default 'Utente',
        registrato_il timestamptz, indirizzo_email text, num_telefono text,
        creato_il timestamptz default now(), ultima_modifica_il timestamptz default now());
      create table public.profilo(uuid uuid primary key default gen_random_uuid(),
        uuid_utente uuid references public.utente);
      create table public.annuncio(uuid uuid primary key default gen_random_uuid(),
        creato_da uuid references public.utente, titolo_annuncio text,
        stato_annuncio text default 'in_revisione', nascosto boolean default false);
      create table private.registration_intent(token uuid primary key, normalized_email text,
        payload jsonb, expires_at timestamptz);
      grant all on public.utente, public.profilo, public.annuncio to service_role;
      grant select on public.utente to authenticated;
      grant update(tipologia_utente), insert(tipologia_utente) on public.utente to authenticated;
    `);
    const identity = readMigration("20260824195359_reconcile_auth_identity_registration");
    for (const name of ["private.provision_auth_user", "private.registered_internal_user_id", "public.complete_registration_v1"]) {
      await db.exec(functionBody(identity, name));
    }
    await db.exec(functionBody(readMigration("20260928141148_refactor_profile_publication_fields"), "public.publish_announcement_v2"));
    await db.exec(`
      revoke all on function private.provision_auth_user(uuid,text,jsonb), private.registered_internal_user_id(uuid)
        from public,anon,authenticated;
      grant execute on function private.provision_auth_user(uuid,text,jsonb), private.registered_internal_user_id(uuid) to service_role;
      revoke all on function public.complete_registration_v1(uuid), public.publish_announcement_v2(uuid,jsonb,text,text,text) from public;
      grant execute on function public.complete_registration_v1(uuid), public.publish_announcement_v2(uuid,jsonb,text,text,text) to authenticated;
    `);
    const publicationBefore = (await db.query("select pg_get_functiondef('public.publish_announcement_v2(uuid,jsonb,text,text,text)'::regprocedure) as body")).rows[0].body;
    await db.exec(readMigration("20261024095639_admin_authorization_foundation"));
    return { db, publicationBefore };
  } catch (error) {
    await db.close();
    throw error;
  }
}

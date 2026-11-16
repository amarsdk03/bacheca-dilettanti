import {readFileSync} from "node:fs";
import {PGlite} from "./pglite.mjs";
import {ADMIN_ID, ADMIN_EMAIL, CHANNEL_KEYS} from "../../scripts/database-cleanup/policy.mjs";

export const cleanupId = n => `a0000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
export async function createCleanupFixture() {
  const db = await PGlite.create();
  try {
    await db.exec(`
      create schema auth; create schema private; create schema storage;
      create table auth.users(id uuid primary key,email text,password_hash text default 'private-local-fixture',deleted_at timestamptz);
      create table auth.sessions(id uuid primary key,user_id uuid references auth.users on delete cascade);
      create table auth.refresh_tokens(id bigint primary key,session_id uuid references auth.sessions on delete cascade);
      create table public.utente(utente_uuid uuid primary key,auth_user_uuid uuid not null references auth.users on delete cascade,tipologia_utente text not null);
      create table public.profilo(uuid uuid primary key,uuid_utente uuid references public.utente on delete cascade,
        creato_da uuid references public.utente on delete set null,ultima_modifica_da uuid references public.utente on delete set null,nascosto boolean default false,link_foto_profilo text);
      create table private.regional_publication(id uuid primary key,owner_id uuid references public.utente on delete set null,followers_notified boolean default true);
      create table public.annuncio(uuid uuid primary key,autore_annuncio uuid references public.profilo on delete cascade,
        creato_da uuid references public.utente on delete cascade,ultima_modifica_da uuid references public.utente on delete set null,
        titolo_annuncio text,stato_annuncio text default 'pubblicato',gruppo_pubblicazione uuid references private.regional_publication,
        nascosto boolean default false,oscurato_da_admin boolean default false,eliminato_il timestamptz,eliminato_da uuid,
        privato boolean default false,priorita_attiva boolean default false,livello_annuncio text default 'gratuito',creato_il timestamptz default '2026-01-01Z');
      create table public.profilo_giocatore(id bigint primary key,uuid_profilo uuid references public.profilo on delete cascade,nome text);
      create table public.media_profilo(id bigint primary key,uuid_profilo uuid references public.profilo on delete cascade,storage_path text,link_media text);
      create table public.annuncio_giocatore(uuid_annuncio uuid primary key references public.annuncio on delete cascade,descrizione text);
      create table public.media_annuncio(id bigint primary key,uuid_annuncio uuid references public.annuncio on delete cascade,link_media text);
      create table public.sport(id bigint primary key,nome text,creato_da uuid references public.utente);
      create table private.segnalazioni(id bigint primary key,uuid_annuncio uuid references public.annuncio on delete cascade,uuid_profilo uuid references public.profilo on delete cascade,
        uuid_utente_segnalatore uuid references public.utente on delete set null,motivazione text,stato text default 'open',nota_interna text);
      create table private.regional_publication_item(publication_id uuid references private.regional_publication,announcement_id uuid primary key,region text);
      create table private.distribution_channel_v1(id uuid primary key,channel_key text,name text,url text,region text,active boolean default true);
      create table private.distribution_record_v1(id bigint primary key,channel_id uuid references private.distribution_channel_v1,message_text text);
      create table private.distribution_revision_v1(record_id bigint references private.distribution_record_v1,version integer);
      create table private.admin_creation_submission_v1(id bigint primary key,source_channel_id uuid references private.distribution_channel_v1,original_text text);
      create table private.announcement_whatsapp_v1(announcement_id uuid primary key references public.annuncio,known_website boolean,message_url text);
      create table private.announcement_submission(submission_id uuid primary key,announcement_id uuid references public.annuncio,
        utente_id uuid not null references public.utente on delete cascade,stripe_payment_intent_id text);
      create table private.notifiche(id bigint primary key,destinatario uuid references public.utente on delete cascade);
      create table private.admin_audit_event_v1(id bigint primary key,action text);
      create table public.annuncio_salvato(uuid_utente uuid references public.utente,uuid_annuncio uuid references public.annuncio);
      create table private.annunci_notificati(annuncio uuid primary key references public.annuncio);
      create table private.admin_session_policy_v1(enabled boolean); insert into private.admin_session_policy_v1 values(true);
      create table storage.buckets(id text primary key,public boolean default false);
      create table storage.objects(id uuid primary key,bucket_id text references storage.buckets,name text,owner uuid references auth.users,
        owner_id text,updated_at timestamptz default '2026-01-01Z',metadata jsonb default '{}');
    `);
    // Use the actual freeze guard: clearing creator references on a trashed ad
    // would fail without the narrowly scoped, transactional guard handling.
    const trash=readFileSync(new URL("../../supabase/migrations/20261024162714_admin_announcement_trash.sql",import.meta.url),"utf8");
    const start=trash.indexOf("create function private.guard_announcement_trash_v1()");
    await db.exec(trash.slice(start,trash.indexOf("alter function private.guard_announcement_trash_v1()",start)));
    await db.query("insert into auth.users(id,email) values($1,$2),($3,'author@example.test'),($4,'second-admin@example.test')",[ADMIN_ID,ADMIN_EMAIL,cleanupId(2),cleanupId(3)]);
    await db.query("insert into public.utente values($1,$2,'Admin'),($3,$4,'Utente'),($5,$6,'Admin')",[cleanupId(101),ADMIN_ID,cleanupId(102),cleanupId(2),cleanupId(103),cleanupId(3)]);
    await db.query("insert into auth.sessions values($1,$2),($3,$4);",[cleanupId(501),ADMIN_ID,cleanupId(502),cleanupId(2)]);
    await db.exec("insert into auth.refresh_tokens select row_number() over(),id from auth.sessions");
    for(let n=201;n<=203;n++) {
      await db.query("insert into public.profilo(uuid,uuid_utente,creato_da,ultima_modifica_da) values($1,$2,$2,$2)",[cleanupId(n),cleanupId(102)]);
      await db.query("insert into public.profilo_giocatore values($1,$2,$3)",[n,cleanupId(n),`Giocatore ${n}`]);
    }
    await db.query("insert into private.regional_publication values($1,$2,true),($3,$2,false)",[cleanupId(401),cleanupId(102),cleanupId(402)]);
    for(let n=301;n<=303;n++) {
      await db.query("insert into public.annuncio(uuid,autore_annuncio,creato_da,titolo_annuncio,gruppo_pubblicazione,nascosto,oscurato_da_admin,eliminato_il,eliminato_da) values($1,$2,$3,$4,$5,$6,$6,$7,$8)",[
        cleanupId(n),cleanupId(201),cleanupId(102),`Titolo ${n}`,cleanupId(401),n===303,n===303?'2026-01-02Z':null,n===303?ADMIN_ID:null]);
      await db.query("insert into public.annuncio_giocatore values($1,'Testo da conservare')",[cleanupId(n)]);
      await db.query("insert into private.regional_publication_item values($1,$2,'Lombardia')",[cleanupId(401),cleanupId(n)]);
      await db.query("insert into private.annunci_notificati values($1)",[cleanupId(n)]);
    }
    await db.query("insert into private.segnalazioni values(1,$1,null,$2,'Motivo 1','resolved','Nota 1'),(2,$3,null,$2,'Motivo 2','open','Nota 2'),(3,$4,null,$2,'Motivo 3','working','Nota 3'),(4,null,$5,$2,'Profilo segnalato','archived','Nota 4')",[cleanupId(301),cleanupId(102),cleanupId(302),cleanupId(303),cleanupId(202)]);
    for(let n=0;n<CHANNEL_KEYS.length;n++) await db.query("insert into private.distribution_channel_v1 values($1,$2,$3,$4,'Lombardia',true)",[cleanupId(600+n),CHANNEL_KEYS[n],`Canale ${n}`,`https://whatsapp.com/channel/${CHANNEL_KEYS[n]}`]);
    await db.query("insert into private.distribution_record_v1 values(1,$1,'Messaggio privato')",[cleanupId(600)]);
    await db.exec("insert into private.distribution_revision_v1 values(1,1)");
    await db.query("insert into private.admin_creation_submission_v1 values(1,$1,'Originale WhatsApp')",[cleanupId(600)]);
    await db.query("insert into private.announcement_submission values($1,$2,$3,'pi_test')",[cleanupId(801),cleanupId(301),cleanupId(102)]);
    await db.query("insert into private.announcement_whatsapp_v1 values($1,true,'https://whatsapp.com/channel/example/1')",[cleanupId(301)]);
    await db.query("insert into private.notifiche values(1,$1);",[cleanupId(102)]);
    await db.exec("insert into private.admin_audit_event_v1 values(1,'announcement.create');insert into storage.buckets(id) values('immagini_annunci'),('immagini_profili');");
    await db.query("insert into public.sport values(1,'Calcio',$1)",[cleanupId(102)]);
    await db.query("insert into public.annuncio_salvato values($1,$2)",[cleanupId(102),cleanupId(301)]);
    for(const [n,bucket,name] of [[901,'immagini_annunci','author/a & b.jpg'],[902,'immagini_profili','author/keep.jpg'],[903,'immagini_profili','author/remove.jpg']]) {
      await db.query("insert into storage.objects(id,bucket_id,name,owner,owner_id,metadata) values($1,$2,$3,$4::uuid,($4::uuid)::text,'{\"size\":3}')",[cleanupId(n),bucket,name,cleanupId(2)]);
    }
    await db.query("insert into public.media_annuncio values(1,$1,'author/a & b.jpg')",[cleanupId(301)]);
    await db.query("insert into public.media_profilo values(1,$1,'author/keep.jpg','https://fixture.supabase.co/storage/v1/object/public/immagini_profili/author/keep.jpg'),(2,$2,'author/remove.jpg','https://fixture.supabase.co/storage/v1/object/public/immagini_profili/author/remove.jpg')",[cleanupId(202),cleanupId(203)]);
    await db.exec("set search_path=pg_catalog");
    return {db};
  } catch(e) {await db.close();throw e;}
}

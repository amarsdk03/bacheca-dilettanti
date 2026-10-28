import { readFileSync } from "node:fs";
import { createAdminDatabaseFixture } from "./admin-database-fixture.mjs";

export const announcementListMigration = readFileSync(new URL("../../supabase/migrations/20261024120724_admin_announcement_list.sql", import.meta.url), "utf8");
export const listId = (n) => `eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12, "0")}`;
export const listActor = { authId: listId(1), userId: listId(101), sessionId: listId(501), authorId: listId(102), profileId: listId(201) };
export const announcementTypes = ["annuncio_giocatore","annuncio_squadra_cerca_giocatore","annuncio_squadra_cerca_staff",
  "annuncio_squadra_cerca_partita","annuncio_squadra_cerca_sponsor","annuncio_staff_sportivo","annuncio_arbitro",
  "annuncio_torneo_evento","annuncio_campo_impianto","annuncio_servizi_consulenze","annuncio_creators"];
export function listClaims(extra = {}) {
  return { role: "authenticated", sub: listActor.authId, session_id: listActor.sessionId,
    exp: Math.floor(Date.now()/1000)+3600, ...extra };
}
export async function createAnnouncementFixture({ apply = true } = {}) {
  const { db } = await createAdminDatabaseFixture();
  try {
    await db.exec(`
      alter table public.annuncio add column autore_annuncio uuid, add column tipologia_annuncio text not null default 'annuncio_giocatore',
        add column privato boolean default false, add column creato_il timestamptz, add column ultima_modifica_il timestamptz;
      alter table public.profilo add column nascosto boolean not null default false;
      create table public.profilo_giocatore(id bigint generated always as identity primary key, uuid_profilo uuid references public.profilo,
        nascosto boolean default false, nominativo_anonimo boolean default false, nome text, cognome text);
      create table public.profilo_squadra(id bigint generated always as identity primary key, uuid_profilo uuid references public.profilo,
        nascosto boolean default false, nominativo_anonimo boolean default false, nome_societa text);
      create table public.profilo_staff_sportivo(id bigint generated always as identity primary key, uuid_profilo uuid references public.profilo,
        nascosto boolean default false, nominativo_anonimo boolean default false, nome text, cognome text);
      create table public.profilo_arbitro(id bigint generated always as identity primary key, uuid_profilo uuid references public.profilo,
        nascosto boolean default false, nominativo_anonimo boolean default false, nome text, cognome text);
      create table public.profilo_servizi_consulenze(id bigint generated always as identity primary key, uuid_profilo uuid references public.profilo,
        nascosto boolean default false, nome text);
      create table public.profilo_creator(id bigint generated always as identity primary key, uuid_profilo uuid references public.profilo,
        nascosto boolean default false, nome_creator text, contatto_email text);
      create table public.profilo_torneo_evento(id bigint generated always as identity primary key, uuid_profilo uuid references public.profilo,
        nascosto boolean default false, nome_organizzazione text);
      create table public.profilo_campi_impianti(id bigint generated always as identity primary key, uuid_profilo uuid references public.profilo,
        nascosto boolean default false, nome_organizzazione text);
      create index on public.profilo_giocatore(uuid_profilo); create index on public.profilo_squadra(uuid_profilo);
      create index on public.profilo_staff_sportivo(uuid_profilo); create index on public.profilo_arbitro(uuid_profilo);
      create index on public.profilo_servizi_consulenze(uuid_profilo); create index on public.profilo_creator(uuid_profilo);
      create index on public.profilo_torneo_evento(uuid_profilo); create index on public.profilo_campi_impianti(uuid_profilo);
      alter table public.annuncio enable row level security; alter table public.profilo enable row level security;
      alter table public.profilo_giocatore enable row level security;
    `);
    if (apply) await db.exec(announcementListMigration);
    const reset = async () => {
      await db.exec("truncate public.annuncio,public.profilo,public.utente,auth.users cascade");
      await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'admin@example.test',now()),($2,'author-secret@example.test',now())", [listActor.authId,listId(2)]);
      await db.query("insert into public.utente(utente_uuid,auth_user_uuid,tipologia_utente,indirizzo_email) values($1,$2,'Admin','admin@example.test'),($3,$4,'Utente','author-secret@example.test')", [listActor.userId,listActor.authId,listActor.authorId,listId(2)]);
      await db.query("insert into auth.sessions(id,user_id) values($1,$2),($3,$4)",[listActor.sessionId,listActor.authId,listId(502),listId(2)]);
      await db.exec("update private.admin_session_policy_v1 set verified_at=now(),timebox_seconds=null,inactivity_timeout_seconds=null,single_session_per_user=false,unsupported_auth_settings=false");
      await db.query("insert into public.profilo(uuid,uuid_utente) values($1,$2)",[listActor.profileId,listActor.authorId]);
      for (const table of ["profilo_giocatore","profilo_staff_sportivo","profilo_arbitro"]) {
        await db.query(`insert into public.${table}(uuid_profilo,nome,cognome) values($1,'Nome','Pubblico')`,[listActor.profileId]);
      }
      for (const [table,column,name] of [["profilo_squadra","nome_societa","Squadra pubblica"],["profilo_servizi_consulenze","nome","Servizio pubblico"],
        ["profilo_creator","nome_creator","Creator pubblico"],["profilo_torneo_evento","nome_organizzazione","Evento pubblico"],["profilo_campi_impianti","nome_organizzazione","Campo pubblico"]]) {
        await db.query(`insert into public.${table}(uuid_profilo,${column}) values($1,$2)`,[listActor.profileId,name]);
      }
    };
    const callAs = async (role, jwt, sql, args = []) => {
      if (!["authenticated","anon","service_role"].includes(role)) throw new Error("Invalid synthetic role");
      await db.exec(`begin; set local role ${role}`);
      try {
        await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify(jwt)]);
        const result = await db.query(sql,args); await db.exec("commit"); return result;
      } catch (error) { await db.exec("rollback"); throw error; }
    };
    const list = async (query = {}, jwt = listClaims(), role = "authenticated") =>
      (await callAs(role,jwt,"select public.admin_list_announcements_v1($1::jsonb) as page",[JSON.stringify(query)])).rows[0].page;
    const insert = async (n, values = {}) => {
      const row = { type:"annuncio_giocatore", status:"in_revisione", hidden:false, private:false,
        createdAt:"2026-01-01T12:00:00.123456Z", updatedAt:null, title:`Titolo ${n}`, profileId:listActor.profileId, ...values };
      await db.query(`insert into public.annuncio(uuid,creato_da,autore_annuncio,tipologia_annuncio,stato_annuncio,nascosto,privato,creato_il,ultima_modifica_il,titolo_annuncio)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[listId(n),listActor.authorId,row.profileId,row.type,row.status,row.hidden,row.private,row.createdAt,row.updatedAt,row.title]);
    };
    return { db,reset,list,insert,callAs };
  } catch (error) { await db.close(); throw error; }
}

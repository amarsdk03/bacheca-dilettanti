import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createAnnouncementFixture, listClaims } from "./admin-announcements-fixture.mjs";

export const detailMigration = readFileSync(new URL("../../supabase/migrations/20261024145954_admin_announcement_detail.sql", import.meta.url), "utf8");
// Synthetic types/columns mirror the shared schema, not database constraints or
// the complete production migration history. Integration remains a release gate.
const types = readFileSync(new URL("../../packages/database/src/index.ts", import.meta.url), "utf8");
const rowTypes = new Map([...types.matchAll(/^      (\w+): \{\s*Row: \{([\s\S]*?)^        \}/gm)].map((m) => [m[1], m[2]]));
const children = ["annuncio_giocatore", "annuncio_squadra_cerca_giocatore", "annuncio_squadra_cerca_staff", "annuncio_squadra_cerca_partita",
  "annuncio_squadra_cerca_sponsor", "annuncio_staff_sportivo", "annuncio_arbitro", "annuncio_torneo_evento", "annuncio_campo_impianto", "annuncio_servizi_consulenze", "annuncio_creator"];
const sqlType = (type) => {
  if (type.includes("Json")) return "jsonb";
  if (type.includes("string[]")) return "text[]";
  if (type.includes("string")) return "text";
  if (type.includes("number")) return "numeric";
  if (type.includes("boolean")) return "boolean";
  throw new Error("Unknown synthetic type " + type);
};

export async function createDetailFixture({ apply = true } = {}) {
  const h = await createAnnouncementFixture(); const { db } = h;
  try {
    await db.exec(`alter table public.annuncio add column info_stato_annuncio text, add column livello_annuncio text,
      add column priorita_attiva boolean not null default false, add column priorita_inizio_il timestamptz,
      add column priorita_fine_il timestamptz, add column ultima_modifica_da uuid;`);
    for (const table of children) {
      const columns = [...rowTypes.get(table).matchAll(/^\s+(\w+): ([^\r\n]+)/gm)]
        .filter((m) => m[1] !== "uuid_annuncio").map((m) => `${m[1]} ${sqlType(m[2])}`);
      await db.exec(`create table public.${table}(uuid_annuncio uuid primary key references public.annuncio on delete cascade,${columns.join(",")});
        alter table public.${table} enable row level security;`);
    }
    await db.exec(`
      create table public.localita_annuncio(id bigint generated always as identity primary key,uuid_annuncio uuid not null references public.annuncio on delete cascade,regione text not null,citta text);
      create table public.contatto_annuncio(id bigint generated always as identity primary key,uuid_annuncio uuid not null references public.annuncio on delete cascade,tipo text not null,valore text not null,referente text,unique(uuid_annuncio,tipo));
      create table public.link_social_annuncio(id bigint generated always as identity primary key,uuid_annuncio uuid not null references public.annuncio on delete cascade,piattaforma text,sublink text not null);
      create table public.media_annuncio(id bigint generated always as identity primary key,uuid_annuncio uuid not null references public.annuncio on delete cascade,formato_media text,link_media text not null);
      create index on public.localita_annuncio(uuid_annuncio); create index on public.media_annuncio(uuid_annuncio); create index on public.link_social_annuncio(uuid_annuncio);
      alter table public.localita_annuncio enable row level security; alter table public.contatto_annuncio enable row level security;
      alter table public.link_social_annuncio enable row level security; alter table public.media_annuncio enable row level security;
    `);
    if (apply) await db.exec(detailMigration);
    const detail = async (id, claims = listClaims(), role = "authenticated") =>
      (await h.callAs(role, claims, "select public.admin_get_announcement_v1($1::uuid) as detail", [id])).rows[0].detail;
    const child = async (id, type, values = {}) => {
      const table = type === "annuncio_creators" ? "annuncio_creator" : type;
      assert(children.includes(table));
      const columns = Object.keys(values); assert(columns.every((s) => /^[a-z_]+$/.test(s)));
      await db.query(`insert into public.${table}(uuid_annuncio${columns.length ? "," + columns.join(",") : ""}) values($1${columns.map((_, i) => ",$" + (i + 2)).join("")})`, [id, ...Object.values(values)]);
    };
    return { ...h, detail, child };
  } catch (error) { await db.close(); throw error; }
}

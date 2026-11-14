import {readFileSync} from "node:fs";
import {createAuditReadsFixture} from "./admin-audit-reads-fixture.mjs";
import {listActor, listClaims, listId} from "./admin-announcements-fixture.mjs";
const read = name => readFileSync(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
export async function createCommunityFixture() {
  const h = await createAuditReadsFixture();
  try {
    const reports = read("20260917124241_segnalazioni");
    await h.db.exec(reports.slice(reports.indexOf("create table private.segnalazioni"), reports.indexOf("create or replace function public.submit_segnalazione_v1")));
    const invitations = read("20260924173632_invitation_codes");
    await h.db.exec("alter table public.utente add column codice_invito text");
    await h.db.exec(invitations.slice(invitations.indexOf("create table public.invito"), invitations.indexOf("create function private.ensure_invitation_code")));
    await h.db.exec(read("20261114222716_admin_report_management"));
    await h.db.exec(read("20261114222731_admin_invitation_management"));
    const reset = async () => {
      await h.reset();
      await h.db.query("update public.utente set registrato_il=now(),codice_invito='ABCDEF0123456789' where utente_uuid=$1", [listActor.authorId]);
      await h.db.query("insert into public.utente(utente_uuid,indirizzo_email,registrato_il,codice_invito) values($1,'zero@example.test',now(),'1234567890ABCDEF')", [listId(103)]);
      await h.insert(301);
    };
    const call = async (name, args = [], claims = listClaims(), role = "authenticated") => (await h.callAs(role, claims, `select public.${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) result`, args)).rows[0].result;
    return {...h, reset, call,
      report: async (n = 301, extra = {}) => {
        const row = {profile: false, createdAt: "2026-11-14T09:00:00Z", anonymous: false, ...extra};
        return (await h.db.query(`insert into private.segnalazioni(uuid_annuncio,uuid_profilo,uuid_utente_segnalatore,chiave_anonima_hash,motivazione,creato_il)
          values($1,$2,$3,$4,'Motivazione privata',$5) returning admin_uuid`, [row.profile ? null : listId(n), row.profile ? listActor.profileId : null, row.anonymous ? null : listActor.authorId, row.anonymous ? "a".repeat(64) : null, row.createdAt])).rows[0].admin_uuid;
      },
      invitation: async (n = 401, confirmed = true) => {
        await h.db.query("insert into public.utente(utente_uuid,indirizzo_email,registrato_il) values($1,$2,now())", [listId(n), `invited-${n}@example.test`]);
        await h.db.query("insert into public.invito(invito_uuid,uuid_invitante,uuid_invitato,codice_invito,registrato_il,confermato_il) values($1,$2,$3,'ABCDEF0123456789',now(),$4)", [listId(n + 1000), listActor.authorId, listId(n), confirmed ? "2026-11-14T09:00:00Z" : null]);
        return listId(n + 1000);
      },
    };
  } catch (error) {await h.db.close(); throw error;}
}

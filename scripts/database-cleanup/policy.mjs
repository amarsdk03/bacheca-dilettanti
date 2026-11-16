// One-off operation agreed on 2026-11-16. Never imported by application code.
export const ADMIN_ID = "0b889a5b-a5a5-49ce-a8b7-c1c899f0e391";
export const ADMIN_EMAIL = "bachecadilettanti@gmail.com";
export const CHANNEL_KEYS = [
  "0029VbDS7vZ3GJOwJ4Yx4w3G", "0029VbDMOuH0lwgr7a9eFZ0j", "0029VbCRyUwFXUujbAouO50t",
  "0029Vb7TErsISTkKlirDw02Q", "0029Vb8l6aX1noyyuOQmH108", "0029VbDaeJcHQbS3tmQ9Bg0z",
  "0029VbD5cbcG8l5EQ29a080J", "0029Vb7xXeP5Ui2WFON5760T", "0029VbCtuGm84OmINIlY9f1S",
  "0029Vb841uC8V0twNplLLR2u", "0029VbCuFgSFXUubDGDToV0o", "0029VbD4FRwHVvThMRJbvc0d",
  "0029VbDMsuhAe5VyCxlAom1A", "0029Vb81ShY2phHJfeWbFf2u", "0029VbDOKq6Gk1FyjRfZDt31",
  "0029Vb841qB7DAWz6S1mVh0l", "0029Vb8bkPO8PgsEm1fO2309", "0029VbCoZba17Emvj3jbUn0G",
].sort();

export const RESET = [
  "private.distribution_revision_v1", "private.distribution_receipt_v1", "private.distribution_record_v1",
  "private.admin_creation_submission_v1", "private.announcement_whatsapp_v1",
  "public.invito", "public.annuncio_salvato", "public.profilo_follow", "private.notifiche",
  "private.manifestazioni_interesse", "private.follow_daily_usage", "private.follow_legacy_archive",
  "private.registration_intent", "private.publish_email_otp_request", "private.announcement_submission",
  "private.regional_publication_backup", "private.regional_publication_context", "private.admin_audit_event_v1",
];
const profiles = "select id from pg_temp.cleanup_profiles";
const groups = "select id from pg_temp.cleanup_groups";
export const KEEP = {
  "public.utente": `auth_user_uuid = '${ADMIN_ID}'::uuid`,
  "public.annuncio": "true",
  "public.profilo": `uuid in (${profiles})`,
  "public.sport": "true",
  "private.distribution_channel_v1": "true",
  "private.admin_session_policy_v1": "true",
  "private.admin_trash_release_v1": "true",
  "private.regional_publication_release": "true",
  "private.regional_publication": `id in (${groups})`,
  "private.regional_publication_item": `publication_id in (${groups}) and announcement_id in (select uuid from public.annuncio)`,
  "private.profile_activity": `profile_id in (${profiles})`,
  "private.announcement_activity": "announcement_id in (select uuid from public.annuncio)",
  "private.annunci_notificati": "annuncio in (select uuid from public.annuncio)",
  "public.restricted_profile_access": `profile_id in (${profiles})`,
  "public.profile_type_state": `profile_id in (${profiles})`,
};
for (const name of ["giocatore", "squadra", "staff_sportivo", "arbitro", "torneo_evento", "campi_impianti", "servizi_consulenze", "creator", "creators", "professionista_studente"]) {
  KEEP[`public.profilo_${name}`] = `uuid_profilo in (${profiles})`;
}
for (const name of ["media_profilo", "localita_profilo", "link_social_profilo"]) KEEP[`public.${name}`] = `uuid_profilo in (${profiles})`;
for (const name of ["generico", "giocatore", "squadra_cerca_giocatore", "squadra_cerca_staff", "squadra_cerca_partita", "squadra_cerca_sponsor", "staff_sportivo", "arbitro", "torneo_evento", "campo_impianto", "servizi_consulenze", "creator", "creators"]) KEEP[`public.annuncio_${name}`] = "true";
for (const name of ["contatto_annuncio", "localita_annuncio", "link_social_annuncio", "media_annuncio"]) KEEP[`public.${name}`] = "true";
KEEP["private.segnalazioni"] = "true";

// Supersedes the original selective cleanup: all content is now disposable.
export const CLEANUP_SCOPE = "reset-all-content-v2";
const CONFIGURATION_TABLES = new Set(["public.utente","public.sport","private.distribution_channel_v1","private.admin_session_policy_v1","private.admin_trash_release_v1","private.regional_publication_release"]);
for(const table of Object.keys(KEEP)) if(!CONFIGURATION_TABLES.has(table)) KEEP[table]="false";

// Retained for compatibility with the captured v1 inventory's relationship
// fields. These references do NOT protect content in reset-all-content-v2.
export const PROTECTED_PROFILES = `select autore_annuncio as id from public.annuncio where autore_annuncio is not null
  union select uuid_profilo from private.segnalazioni where uuid_profilo is not null`;

export function parseInventory(value) {
  let data = typeof value === "string" ? JSON.parse(value) : value;
  if (Array.isArray(data) && data.length === 1) data = data[0];
  if (data?.inventory) data = typeof data.inventory === "string" ? JSON.parse(data.inventory) : data.inventory;
  if (data?.version !== 1 || !Array.isArray(data.tables) || !Array.isArray(data.objects) || !Array.isArray(data.references) || !Array.isArray(data.channels)) throw new Error("Inventario JSON non valido.");
  if (!/^[a-f0-9]{32}$/.test(data.schemaHash ?? "")) throw new Error("Inventario privo del fingerprint dello schema.");
  return data;
}

export function validateInventory(data) {
  if (data.admin?.id !== ADMIN_ID || data.admin?.email?.toLowerCase() !== ADMIN_EMAIL || data.admin?.kind !== "Admin") throw new Error("Identità admin diversa da quella autorizzata.");
  if (!Array.isArray(data.reports) || !Array.isArray(data.announcements) || !Array.isArray(data.keepProfiles) || !Array.isArray(data.deleteProfiles)) throw new Error("Inventario contenuti non valido.");
  if (JSON.stringify(data.channels.map(c => c.key).sort()) !== JSON.stringify(CHANNEL_KEYS)) throw new Error("I canali non corrispondono ai 18 concordati.");
  for (const t of data.tables) {
    if (!/^(public|private|auth|storage)\.[a-zA-Z_][a-zA-Z_0-9]*$/.test(t.name) || !Number.isSafeInteger(t.count) || t.count < 0 || !/^[a-f0-9]{32}$/.test(t.hash)) throw new Error("Fingerprint tabella non valido.");
    if (/^(public|private)\./.test(t.name) && !RESET.includes(t.name) && !Object.hasOwn(KEEP, t.name)) throw new Error(`Tabella da classificare prima della pulizia: ${t.name} (${t.count} righe).`);
  }
  if (data.partitions?.length) throw new Error("Sono presenti tabelle partizionate: occorre una revisione specifica.");
  return data;
}

const BUCKETS = new Set(["immagini_annunci", "immagini_profili"]);
// Shared branding is not account/test data and may be referenced outside SQL.
const PROTECTED_STORAGE = new Set(["foto_profilo/bachecadilettanti.png"]);
const UUID_PATH = "[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}";
const ANNOUNCEMENT_UPLOAD = new RegExp(`^${UUID_PATH}/${UUID_PATH}/[a-f0-9]{64}\\.(jpg|png|webp)$`);
const PROFILE_UPLOAD = new RegExp(`^${UUID_PATH}/(principale|giocatore|squadra|staff-sportivo|arbitro|torneo-evento|campi-impianti-sportivi|servizi-consulenze|creators)/${UUID_PATH}\\.webp$`);
function managedUpload(o) {
  return o.bucket==="immagini_annunci" && ANNOUNCEMENT_UPLOAD.test(o.name) || o.bucket==="immagini_profili" && PROFILE_UPLOAD.test(o.name);
}
export function storageReferenceKeys(ref) {
  const keys=[];
  if(ref.path) keys.push(`${ref.bucket}/${ref.path}`);
  if(ref.url) {
    try {
      const u=new URL(ref.url,ref.url.startsWith("/")?"https://relative.invalid":undefined);
      const m=u.pathname.match(/^\/storage\/v1\/(?:object\/(?:public|sign|authenticated)|render\/image\/(?:public|sign))\/([^/]+)\/(.+)$/);
      if(m) keys.push(`${decodeURIComponent(m[1])}/${decodeURIComponent(m[2])}`);
    } catch {
      if(!ref.url.startsWith("/") && !ref.url.includes(":")) keys.push(`${ref.bucket}/${ref.url}`);
      else if(!ref.path && !ref.url.startsWith("/")) throw new Error("Riferimento media non riconosciuto.");
    }
  }
  return keys;
}
export function classifyStorage(data) {
  const kept = new Set(), discarded = new Set(), unresolved = [];
  const objectKeys = new Set(data.objects.map(o => `${o.bucket}/${o.name}`));
  for (const ref of data.references) {
    let candidates;
    try { candidates=storageReferenceKeys(ref); }
    catch { continue; }
    for (const key of candidates) {
      if (objectKeys.has(key)) discarded.add(key);
    }
  }
  const keep = [], remove = [], unknown = [];
  for (const o of data.objects) {
    const key = `${o.bucket}/${o.name}`;
    if (kept.has(key) || PROTECTED_STORAGE.has(key)) keep.push(o);
    else if (BUCKETS.has(o.bucket) && (discarded.has(key) || o.owner && data.deleteAuthIds.includes(o.owner) || managedUpload(o))) remove.push(o);
    else unknown.push(o);
  }
  if (unknown.length || unresolved.length) throw new Error(`Storage da classificare: ${unknown.length} oggetti e ${unresolved.length} riferimenti irrisolti. Nessuna cancellazione preparata.${unknown.length?" Oggetti: "+unknown.map(o=>`${o.bucket}/${o.name}`).join(", "):""}`);
  return {keep, remove};
}

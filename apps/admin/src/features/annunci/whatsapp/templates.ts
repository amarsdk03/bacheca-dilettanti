import type {AnnouncementDetail} from "../contracts";
import {categoryShortLabel} from "@bacheca/announcements/features/pubblica-annuncio/types/category-catalog";

/** Editable WhatsApp format catalogue. Bump VERSION when changing generated copy.
 * Missing values omit their row; never invent identities, dates or contacts.
 * `temporary` marks formats not yet supplied by the editorial team.
 */
export const WHATSAPP_TEMPLATE_VERSION = "2026-11-v1";
type Row = {emoji: string; label: string; keys: string[]};
interface Template {heading: string; rows: Row[]; tags: string[]; temporary?: boolean}
const row = (emoji: string, label: string, ...keys: string[]): Row => ({emoji,label,keys});
const sport = row("⚽", "Calcio", "tipologie_sport");
const category = row("🏆", "Categoria", "categorie_ricercate", "gruppo_squadra", "settore");
export const WHATSAPP_TEMPLATES: Record<string, Template> = {
  annuncio_giocatore: {heading: "🔵 GIOCATORE CERCA SQUADRA", rows: [sport, row("🧍","Ruolo","ruoli_principali","ruoli_secondari"),row("📅","Anno","anno_nascita"),row("🏆","Categoria cercata","categorie_ricercate"),row("🏟️","Categorie precedenti","storico_carriera")], tags: ["Giocatori"]},
  annuncio_squadra_cerca_giocatore: {heading: "🟢 SQUADRA CERCA GIOCATORI", rows: [sport,category,row("🎯","Ruoli cercati","ruoli_principali","ruoli_secondari"),row("📅","Annate/età","annata_da","annata_a","annate_ricercate"),row("📝","Requisiti","requisiti"),row("📌","Periodo","stagione")], tags: ["SquadraCerca","Giocatori"]},
  annuncio_staff_sportivo: {heading: "🟣 STAFF CERCA OPPORTUNITÀ", rows: [sport,row("👤","Figura","figure_professionali"),row("🏆","Categoria/settore cercato","categorie_ricercate"),row("📚","Qualifiche","qualifiche_licenze"),row("🏟️","Esperienza","lista_esperienze"),row("🚗","Spostamento","disponibilita_spostamento")], tags: ["StaffCercaOpportunità"]},
  annuncio_squadra_cerca_staff: {heading: "🟠 SQUADRA CERCA STAFF", rows: [sport,category,row("👤","Figura cercata","figure_ricercate","figura_ricercata"),row("📅","Periodo","stagione","periodo_dal","periodo_al"),row("📝","Requisiti","requisiti"),row("💰","Compenso mensile","compenso_mensile")], tags: ["Staff","SquadraCercaStaff"]},
  annuncio_squadra_cerca_partita: {heading: "⚪ CERCASI AMICHEVOLE", rows: [sport,category,row("📅","Data/periodo","periodo_dal","periodo_al"),row("🕒","Orario","orario_dalle","orario_alle"),row("🚗","Trasferta","disponibilita_trasferta"),row("🎯","Avversario cercato","categorie_avversario")], tags: ["Amichevole"]},
  annuncio_squadra_cerca_sponsor: {heading: "🤝 SOCIETÀ CERCA SPONSOR", rows: [row("⚽","Categoria/settore","categoria_settore"),row("🎯","Ricerca","supporto_cercato"),row("📣","Visibilità offerta","offerta_fornita")], tags: ["Sponsor","Società"]},
  annuncio_campo_impianto: {heading: "🏟️ CAMPO SPORTIVO DISPONIBILE PER AFFITTO", rows: [row("⚽","Tipologia del campo","tipologie_sport"),row("📅","Disponibilità","orari"),row("💰","Costo","costo_partenza"),row("🚿","Servizi inclusi","servizi_inclusi"),row("📍","Indirizzo","indirizzo")], tags: ["CampiSportivi"]},
  annuncio_torneo_evento: {heading: "🏆 TORNEO / EVENTO CALCISTICO", rows: [row("🏆","Evento","nome_evento"),sport,row("👥","Categorie/annate","annate_ammesse_da","annate_ammesse_a"),row("🔢","Squadre cercate","numero_squadre"),row("💰","Costo iscrizione","costo_partecipazione","tipo_partecipazione"),row("🎁","Premi","lista_premi_trofei"),row("📝","Iscrizioni","modalita_iscrizione")], tags: ["Torneo","CalcioDilettanti"]},
  annuncio_arbitro: {heading: "🟡 ARBITRO DISPONIBILE", rows: [sport,row("📅","Disponibilità","disponibilita_occupazione"),row("🚗","Spostamento","disponibilita_spostamento"),row("📚","Qualifiche","qualifiche_licenze"),row("🏟️","Esperienza","lista_esperienze")], tags: ["Arbitro"], temporary: true},
  annuncio_servizi_consulenze: {heading: "🔷 SERVIZI E CONSULENZE PER IL CALCIO", rows: [sport,row("👤","Figura","figura_professionale"),row("🎯","Specializzazione","specializzazione"),row("📝","Servizi","presentazione_servizi")], tags: ["Servizi","CalcioDilettanti"], temporary: true},
  annuncio_creators: {heading: "🎥 CREATOR / COLLABORAZIONE SPORTIVA", rows: [row("📝","Proposta","descrizione_post"),row("📣","Contenuto","contenuto_post")], tags: ["Creators","CalcioDilettanti"], temporary: true},
};
export const ADMINISTRATIVE_STAFF_TEMPLATE: Template = {heading: "🟠 SOCIETÀ CERCA STAFF", rows: [row("👤","Ruolo cercato","figure_ricercate","figura_ricercata"),row("⚽","Settore","settore"),row("📝","Mansioni / requisiti","requisiti"),row("📅","Periodo","stagione","periodo_dal","periodo_al")], tags: ["Staff","Segreteria","SocietàCercaStaff"]};
export const FALLBACK_WHATSAPP_TEMPLATE: Template = {heading: "📣 ANNUNCIO CALCIO DILETTANTI", rows: [sport], tags: ["CalcioDilettanti"], temporary: true};

const placeholder = /^(?:non[- ]specificar[eo]|non specificat[oaie]|da definire)$/i;
function valueText(value: unknown): string {
  if (typeof value === "string") return placeholder.test(value.trim()) ? "" : categoryShortLabel(value.trim()) || value.trim();
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (Array.isArray(value)) return [...new Set(value.map(valueText).filter(Boolean))].join(", ");
  if (value && typeof value === "object") {
    const v=value as Record<string,unknown>;
    if (v.attivo === false) return "";
    return [v.giorno,v.dalle,v.alle,v.posto,v.titoloPremio,v.titolo,v.ente,v.periodoDa,v.periodoA,v.descrizione].map(valueText).filter(Boolean).join(" · ");
  }
  return "";
}
export function generateWhatsAppMessage(detail: AnnouncementDetail, websiteUrl: string | null = null) {
  const fields = detail.content.fields as Record<string, unknown>;
  const figures = valueText(fields.figure_ricercate ?? fields.figura_ricercata).toLocaleLowerCase("it-IT");
  const template = detail.content.type === "annuncio_squadra_cerca_staff" && figures.split(", ").includes("segretario") ? ADMINISTRATIVE_STAFF_TEMPLATE : WHATSAPP_TEMPLATES[detail.summary.type] ?? FALLBACK_WHATSAPP_TEMPLATE;
  const regionNames = [...new Set(detail.locations.map(location => location.region))];
  const zone = detail.locations.map(location => [location.city, location.region].filter(Boolean).join(", ")).join(" / ");
  const lines = [template.heading];
  if (zone) lines.push(`📍 Zona: ${zone}`);
  const title = detail.summary.title || (template === FALLBACK_WHATSAPP_TEMPLATE ? detail.summary.displayTitle : null);
  if (title) lines.push(`📝 Titolo: ${title}`);
  if (detail.summary.author.available && detail.summary.author.anonymous !== true) lines.push(`🏟️ ${detail.summary.type.startsWith("annuncio_squadra_") ? "Società" : "Autore"}: ${detail.summary.author.displayName}`);
  for (const item of template.rows) {
    const value = [...new Set(item.keys.map(key => valueText(fields[key])).filter(Boolean))].join(/Data|Periodo|Annate|Orario|Categorie\/annate/.test(item.label) ? " – " : " / ");
    if (value) lines.push(`${item.emoji} ${item.label}: ${value}`);
  }
  const contacts = detail.contacts.filter(contact => contact.valid && ["email","phone"].includes(contact.kind)).map(contact => contact.value);
  if (contacts.length) lines.push(`📲 Contatto: ${contacts.join(" / ")}`);
  const description = valueText(fields.descrizione_aggiuntiva);
  if (description) lines.push("",description);
  if (websiteUrl && detail.summary.status === "pubblicato") lines.push("",`🔗 Annuncio: ${websiteUrl}`);
  const sports = Array.isArray(fields.tipologie_sport) ? fields.tipologie_sport.filter((v): v is string => typeof v === "string").map(v => v.replace(/\s+/g,"")) : [];
  const tags = [...regionNames,...sports,...template.tags].map(v => "#"+v.replace(/[^\p{L}\p{N}]/gu,""));
  lines.push("",[...new Set(tags)].join(" "));
  return {text: lines.join("\n"), templateVersion: WHATSAPP_TEMPLATE_VERSION, temporary: Boolean(template.temporary)};
}

import { ADMIN_ANNOUNCEMENT_TYPES, type AnnouncementListItem } from "./contracts";

export const TYPE_LABELS: Record<typeof ADMIN_ANNOUNCEMENT_TYPES[number], string> = {
  annuncio_giocatore: "Giocatore", annuncio_squadra_cerca_giocatore: "Squadra cerca giocatori", annuncio_squadra_cerca_staff: "Squadra cerca staff",
  annuncio_squadra_cerca_partita: "Squadra cerca partita", annuncio_squadra_cerca_sponsor: "Squadra cerca sponsor", annuncio_staff_sportivo: "Staff sportivo",
  annuncio_arbitro: "Arbitro", annuncio_torneo_evento: "Torneo / Evento", annuncio_campo_impianto: "Campo / Impianto", annuncio_servizi_consulenze: "Servizi e consulenze", annuncio_creators: "Creators",
};
export const STATUS_LABELS = { in_revisione: "In revisione", pubblicato: "Pubblicato", rifiutato: "Rifiutato", in_attesa_pagamento: "In attesa di pagamento" };
export const VISIBILITY_LABELS = { all: "Tutte le visibilità", shown: "Non oscurati", hidden: "Oscurati", unknown: "Oscuramento non specificato" };
export const FIELD_LABELS: Record<string, string> = {
  tipologie_sport: "Tipologie di sport", ruoli_principali: "Ruoli principali", ruoli_secondari: "Ruoli specifici", categorie_ricercate: "Categorie ricercate",
  descrizione_aggiuntiva: "Descrizione", gruppo_squadra: "Gruppo squadra", annata_da: "Annata da", annata_a: "Annata a", annate_ricercate: "Annate ricercate",
  stagione: "Stagione", figura_ricercata: "Figura ricercata", figure_ricercate: "Figure ricercate", settore: "Settore", compenso_mensile: "Compenso mensile",
  requisiti: "Requisiti", periodo_dal: "Periodo dal", periodo_al: "Periodo al", categorie_avversario: "Categorie avversario", disponibilita_trasferta: "Disponibilità alla trasferta",
  orario_dalle: "Dalle ore", orario_alle: "Alle ore", categoria_settore: "Categoria / Settore", supporto_cercato: "Supporto cercato", offerta_fornita: "Offerta fornita",
  figure_professionali: "Figure professionali", disponibilita_occupazione: "Disponibilità lavorativa", disponibilita_spostamento: "Disponibilità agli spostamenti",
  disponibile_remoto: "Disponibile da remoto", lista_esperienze: "Esperienze", qualifiche_licenze: "Qualifiche e licenze", automunito: "Automunito",
  nome_evento: "Nome evento", modalita_iscrizione: "Modalità di iscrizione", annate_ammesse_da: "Annate ammesse da", annate_ammesse_a: "Annate ammesse a",
  numero_squadre: "Numero squadre", costo_partecipazione: "Costo di partecipazione", tipo_partecipazione: "Tipo di partecipazione", lista_premi_trofei: "Premi e trofei",
  orari: "Orari", costo_partenza: "Costo di partenza", servizi_inclusi: "Servizi inclusi", indirizzo: "Indirizzo", figura_professionale: "Figure professionali",
  specializzazione: "Specializzazione", presentazione_servizi: "Presentazione dei servizi", titolo_post: "Titolo del contenuto", descrizione_post: "Descrizione del contenuto", contenuto_post: "Contenuto",
};
export function typeLabel(value: string) { return Object.hasOwn(TYPE_LABELS, value) ? TYPE_LABELS[value as keyof typeof TYPE_LABELS] : "Tipologia non riconosciuta: " + value; }
export function statusLabel(value: string | null) { return value === null ? "Stato non specificato" : Object.hasOwn(STATUS_LABELS, value) ? STATUS_LABELS[value as keyof typeof STATUS_LABELS] : "Stato non riconosciuto: " + value; }
export function visibilityLabel(row: Pick<AnnouncementListItem, "hidden" | "private">) {
  return [row.hidden === null ? "Oscuramento non specificato" : row.hidden ? "Oscurato" : "Non oscurato", row.private === null ? "Privacy non specificata" : row.private ? "Privato" : "Pubblico"];
}
export function displayDate(value: string | null) {
  if (!value) return "Non specificata";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" }).format(date) : "Non specificata";
}
export const money = (value: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
export function issueLabel(issue: string) {
  if (issue === "UNSUPPORTED_TYPE") return "Questa tipologia non dispone ancora di un dettaglio supportato.";
  if (issue === "DETAIL_MISSING") return "Il contenuto specifico dell’annuncio non è disponibile.";
  if (issue.startsWith("INVALID_FIELD:")) return "Informazioni incomplete o non interpretabili: " + (FIELD_LABELS[issue.slice(14)] ?? "contenuto");
  if (issue.startsWith("COLLECTION_TRUNCATED:")) return "Alcuni elementi superano il limite di visualizzazione.";
  if (issue === "INVALID_CONTACT") return "Alcuni recapiti non hanno un formato valido.";
  return "Alcuni collegamenti non possono essere aperti in sicurezza.";
}

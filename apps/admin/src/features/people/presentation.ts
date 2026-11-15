import {FIELD_LABELS} from "../annunci/presentation";
const labels: Record<string, string> = {nome: "Nome", cognome: "Cognome", nome_societa: "Società", nome_organizzazione: "Organizzazione", nome_creator: "Nome creator", nominativo_anonimo: "Nome anonimo", anno_nascita: "Anno di nascita", mese_nascita: "Mese di nascita", giorno_nascita: "Giorno di nascita", sport_principale: "Sport", presentazione: "Presentazione", disponibilita: "Disponibilità", ruoli_sport: "Ruoli", categoria_attuale: "Categoria attuale", genere: "Genere", nazionalita: "Nazionalità", altezza: "Altezza", peso: "Peso", piede_principale: "Piede principale", squadra_attuale_nome: "Squadra attuale", squadra_attuale_categoria: "Categoria squadra", squadra_attuale_torneo: "Torneo squadra", squadra_attuale_dal: "In squadra dal", storico_carriera: "Carriera", tipologia_contenuti: "Contenuti", specializzazioni: "Specializzazioni", sede_professionista: "Sede", contatto_email: "Email di contatto", contatto_telefono: "Telefono di contatto", info_aggiuntive: "Informazioni aggiuntive", torneo_attuale_nome: "Torneo attuale"};
export const profileFieldLabel = (key: string) => labels[key] ?? FIELD_LABELS[key] ?? key.replaceAll("_", " ");
export function profileFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sì" : "No";
  if (Array.isArray(value)) return value.map(profileFieldValue).join("\n");
  if (typeof value === "object") return Object.entries(value).map(([k, v]) => `${profileFieldLabel(k)}: ${profileFieldValue(v)}`).join("\n");
  return String(value);
}

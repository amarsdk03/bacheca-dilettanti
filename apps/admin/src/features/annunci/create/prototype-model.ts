import {
	CATEGORY_FILTER_OPTIONS,
	categoryKey,
	FIGURA_PROFESSIONALE_OPTIONS,
	PLAYER_CURRENT_CATEGORY_GROUPS
} from "@bacheca/announcements/features/pubblica-annuncio/types/category-catalog";
import {
	STAFF_CATEGORY_FILTER_OPTIONS
} from "@bacheca/announcements/features/pubblica-annuncio/types/staff-category-catalog";
import {TEAM_CATEGORY_OPTIONS} from "@bacheca/announcements/features/profilo/team-category-catalog";
import {PLAYER_NATIONALITIES} from "@bacheca/announcements/features/profilo/player-nationalities";
import {
	PLAYER_PRIMARY_ROLES,
	PLAYER_SPECIFIC_ROLES_BY_PRIMARY
} from "@bacheca/announcements/features/profilo/player-roles";
import {REGIONI_ITALIANE} from "@bacheca/announcements/const/defaultConstants";
import {TIPOLOGIA_CALCIO_OPTIONS} from "@bacheca/announcements/features/pubblica-annuncio/types/tipologie-calcio";

export const PROFILE_OPTIONS = [
  {value: "giocatore", label: "Giocatore"},
  {value: "squadra", label: "Squadra"},
  {value: "staff-sportivo", label: "Staff sportivo"},
  {value: "arbitro", label: "Arbitro"},
  {value: "torneo-evento", label: "Torneo / Evento"},
  {value: "campi-impianti-sportivi", label: "Campi e impianti"},
  {value: "servizi-consulenze", label: "Servizi e professionisti"},
  {value: "creators", label: "Creators"},
] as const;
export type MockProfileType = typeof PROFILE_OPTIONS[number]["value"];
export const TEAM_OPTIONS = ["Cerca giocatori", "Cerca staff", "Cerca partite amichevoli", "Cerca sponsor"] as const;
export type MockTeamType = typeof TEAM_OPTIONS[number];
export type MockAuthorMode = "registered" | "unregistered" | "whatsapp";
export interface MockValues { [key: string]: string | string[] | MockValues[] }
export interface MockField {
  key: string;
  label: string;
  kind?: "text" | "textarea" | "select" | "multi" | "date" | "time" | "number" | "email" | "tel" | "repeat";
  required?: boolean;
  options?: readonly string[];
  fields?: readonly MockField[];
  placeholder?: string;
  description?: string;
  maxLength?: number;
  wide?: boolean;
}
export const REGIONS = REGIONI_ITALIANE.map(region => region.nome);
const SPORTS = TIPOLOGIA_CALCIO_OPTIONS;
const CATEGORIES = ["Qualsiasi", ...CATEGORY_FILTER_OPTIONS.map(option => option.value)];
const CURRENT_CATEGORIES = PLAYER_CURRENT_CATEGORY_GROUPS.flatMap(({gruppo,opzioni}) => opzioni.map(value => categoryKey(gruppo,value)));
const ROLES = [...PLAYER_PRIMARY_ROLES];
const SPECIFIC_ROLES = Object.values(PLAYER_SPECIFIC_ROLES_BY_PRIMARY).flat();
const FIGURES = FIGURA_PROFESSIONALE_OPTIONS;
const travel: MockField = {key: "travel", label: "Disponibilità agli spostamenti", kind: "select", options: ["Sì", "No", "Da valutare"]};
const description: MockField = {key: "description", label: "Informazioni aggiuntive", kind: "textarea", maxLength: 5000, wide: true, placeholder: "Aggiungi le informazioni utili per chi legge l’annuncio…"};
const presentation: MockField = {key: "presentation", label: "Presentazione", kind: "textarea", maxLength: 5000, wide: true};
const sports: MockField = {key: "sports", label: "Tipologie calcio", kind: "multi", options: SPORTS, required: true};
const personal: MockField[] = [
  {key: "name", label: "Nome", required: true}, {key: "surname", label: "Cognome"},
  {key: "birthDate", label: "Data di nascita", kind: "date", required: true},
  {key: "anonymousName", label: "Mantieni anonimo il nominativo", kind: "select", options: ["No", "Sì"]},
];
const experiences: MockField = {key: "experiences", label: "Esperienze", kind: "repeat", wide: true, fields: [
  {key: "role", label: "Ruolo / categoria"}, {key: "organization", label: "Società / ente"},
  {key: "from", label: "Stagione dal", placeholder: "2025"}, {key: "to", label: "Stagione al", placeholder: "2026"},
]};
const qualifications: MockField = {key: "qualifications", label: "Qualifiche e licenze", kind: "repeat", wide: true, fields: [
  {key: "title", label: "Qualifica / licenza"}, {key: "organization", label: "Ente"},
  {key: "state", label: "Stato", kind: "select", options: ["In corso", "Conseguito"], required: true},
]};
const social: MockField = {key: "social", label: "Collegamenti del profilo", kind: "repeat", wide: true, fields: [
  {key: "platform", label: "Canale", kind: "select", options: ["Sito web", "Instagram", "Facebook", "YouTube", "LinkedIn"], required: true},
  {key: "url", label: "Collegamento", placeholder: "https://…", required: true, maxLength: 2048},
]};

export const PROFILE_FIELDS: Record<MockProfileType, readonly MockField[]> = {
  giocatore: [
    ...personal, {key: "gender", label: "Genere", kind: "select", options: ["Uomo", "Donna"], required: true},
    {key: "nationality", label: "Nazionalità", kind: "select", options: PLAYER_NATIONALITIES.map(option => option.code)}, sports,
    {key: "availability", label: "Disponibilità", kind: "select", options: ["Svincolato", "Tesserato"], required: true},
    {key: "currentTeam", label: "Squadra attuale"}, {key: "currentCategory", label: "Categoria attuale", kind: "select", options: CURRENT_CATEGORIES},
    {key: "mainRoles", label: "Ruoli principali", kind: "multi", options: ROLES, required: true},
    {key: "specificRoles", label: "Ruoli specifici", kind: "multi", options: SPECIFIC_ROLES},
    {key: "height", label: "Altezza (in cm)", kind: "number"}, {key: "weight", label: "Peso (in kg)", kind: "number"},
    {key: "foot", label: "Piede principale", kind: "select", options: ["Destro", "Sinistro", "Ambidestro"]},
    presentation, {key: "highlights", label: "Link video highlights", placeholder: "https://…"},
    {key: "highlightsPreference", label: "Highlights", kind: "select", options: ["Pubblici", "Privati", "Richiedi caricamento"]}, experiences,
  ],
  squadra: [
    {key: "name", label: "Nome società", required: true},
    {key: "anonymousName", label: "Mantieni anonimo il nominativo", kind: "select", options: ["No", "Sì"]},
    {...sports, kind: "select", label: "Tipologia calcio"},
    {key: "currentCategory", label: "Categoria attuale Prima Squadra", kind: "select", options: TEAM_CATEGORY_OPTIONS.map(option => option.value), required: true},
    {key: "tournament", label: "Nome torneo"}, presentation,
  ],
  "staff-sportivo": [
    ...personal, {key: "figures", label: "Figure professionali", kind: "multi", options: FIGURES, required: true},
    {...sports, required: false}, {key: "availability", label: "Disponibilità", kind: "select", options: ["Disponibile subito", "Tesserato"]},
    {key: "remote", label: "Disponibile anche da remoto", kind: "select", options: ["Sì", "No"]}, presentation, experiences, qualifications,
  ],
  arbitro: [...personal, {...sports, required: false}, presentation, {...experiences, fields: [
    {key: "description", label: "Esperienza", kind: "textarea", wide: true},
    {key: "from", label: "Anno dal", placeholder: "2025"}, {key: "to", label: "Anno al", placeholder: "2026"},
  ]}, {...qualifications, fields: qualifications.fields?.map(field => ({...field, required: false}))}],
  "servizi-consulenze": [
    {key: "name", label: "Nome, Cognome o Ragione Sociale", required: true},
    {key: "specialization", label: "Tipo di azienda / professione"}, {key: "headquarters", label: "Sede Azienda / Professionista"},
    {key: "profileEmail", label: "Contatto email", kind: "email"}, {key: "profilePhone", label: "Contatto telefonico", kind: "tel"},
    {key: "availability", label: "Disponibilità", kind: "select", options: ["Disponibile subito", "Tesserato"]},
    presentation, {key: "services", label: "Presentazione servizi", kind: "textarea", wide: true},
  ],
  creators: [
    {key: "name", label: "Nome creator", required: true}, {key: "contentType", label: "Tipologia contenuti"},
    {key: "profileEmail", label: "Contatto email", kind: "email"}, presentation,
  ],
  "torneo-evento": [{key: "name", label: "Nome organizzazione", required: true}, sports, {...presentation, label: "Presentazione torneo"}],
  "campi-impianti-sportivi": [
    {key: "name", label: "Nome campo/struttura", required: true}, {...sports, label: "Tipologia campi disponibili"},
    {key: "address", label: "Indirizzo", required: true}, {key: "startingCost", label: "Prezzo a partire da (€)", kind: "number"},
    presentation, description,
  ],
};
export const PROFILE_SOCIAL_FIELD = social;

const season: MockField = {key: "season", label: "Stagione", placeholder: "Es. 2026/2027", maxLength: 80};
export const TEAM_FIELDS: Record<MockTeamType, readonly MockField[]> = {
  "Cerca giocatori": [
    {key: "teamGroup", label: "Gruppo squadra", placeholder: "Prima squadra, Allievi, Juniores, U15…"},
    {key: "mainRoles", label: "Ruolo/i cercati", kind: "multi", options: ROLES, required: true},
    {key: "specificRoles", label: "Ruoli specifici", kind: "multi", options: SPECIFIC_ROLES},
    {key: "yearFrom", label: "Annata da", kind: "number"}, {key: "yearTo", label: "Annata a", kind: "number"}, season, description,
  ],
  "Cerca staff": [
    {key: "figures", label: "Figure ricercate", kind: "multi", options: FIGURES, required: true},
    {key: "teamGroup", label: "Gruppo squadra"}, {key: "compensation", label: "Compenso mensile (€)", kind: "number"}, season,
    {key: "requirements", label: "Requisiti", kind: "textarea", required: true, wide: true}, description,
  ],
  "Cerca partite amichevoli": [
    {key: "teamGroup", label: "Gruppo squadra"}, {key: "opponentCategory", label: "Categoria avversario cercata", required: true},
    {key: "dateFrom", label: "Periodo dal", kind: "date"}, {key: "dateTo", label: "Periodo al", kind: "date"},
    {key: "timeFrom", label: "Orario dalle", kind: "time"}, {key: "timeTo", label: "Orario alle", kind: "time"},
    {key: "travel", label: "Disponibilità alla trasferta", kind: "select", options: ["Sì", "No"]}, description,
  ],
  "Cerca sponsor": [
    {key: "sector", label: "Settore", required: true, placeholder: "Prima squadra, Settore Giovanile…"},
    {key: "offer", label: "Visibilità offerta", kind: "textarea", required: true, wide: true}, description,
  ],
};
export const ANNOUNCEMENT_FIELDS: Record<Exclude<MockProfileType, "squadra">, readonly MockField[]> = {
  giocatore: [{key: "categories", label: "Categorie ricercate", kind: "multi", options: CATEGORIES, required: true}, description],
  "staff-sportivo": [sports, {key: "categories", label: "Categoria/Settore cercato", kind: "multi", options: STAFF_CATEGORY_FILTER_OPTIONS.map(option => option.value)}, travel, description],
  arbitro: [sports, {key: "car", label: "Automunito", kind: "select", options: ["Sì", "No"]}, {...travel, options: ["Sì", "No"]}, description],
  "servizi-consulenze": [
    {key: "figures", label: "Figure professionali", kind: "multi", options: FIGURES, required: true}, {key: "specialization", label: "Specializzazione"},
    {key: "content", label: "Contenuto", kind: "textarea", required: true, wide: true}, {...description, label: "Promozione/offerta per la Community"},
  ],
  creators: [{key: "content", label: "Contenuto dell’annuncio", kind: "textarea", wide: true, description: "Consigliato per presentare il contenuto alla community."}],
  "torneo-evento": [
    {key: "eventName", label: "Nome torneo / evento", required: true}, {...sports, kind: "select", label: "Tipologia calcio"},
    {key: "registration", label: "Modalità di iscrizione", kind: "select", options: ["Libera", "Posti limitati"]},
    {key: "yearFrom", label: "Annate ammesse da", kind: "number"}, {key: "yearTo", label: "Annate ammesse a", kind: "number"},
    {key: "teams", label: "Numero squadre", kind: "number"}, {key: "cost", label: "Costo partecipazione (€)", kind: "number"},
    {key: "unit", label: "Tipo partecipazione", kind: "select", options: ["Per squadra", "Per giocatore"]},
    {key: "prizes", label: "Premi e trofei", kind: "repeat", wide: true, fields: [{key: "place", label: "Posizione"}, {key: "title", label: "Premio / trofeo"}]}, description,
  ],
  "campi-impianti-sportivi": [
    {...sports, kind: "select", label: "Tipologia campo da pubblicizzare"}, {key: "address", label: "Indirizzo", required: true},
    {key: "hours", label: "Orari di apertura", kind: "repeat", wide: true, fields: [
      {key: "day", label: "Giorno", kind: "select", options: ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"]},
      {key: "from", label: "Dalle", kind: "time"}, {key: "to", label: "Alle", kind: "time"},
    ]},
    {key: "hourlyCost", label: "Prezzo orario (€ / 1h)", kind: "number"},
    {key: "services", label: "Servizi inclusi", kind: "textarea", wide: true}, description,
  ],
};

export function textValue(values: MockValues, key: string): string {
  const value = values[key];
  return typeof value === "string" ? value : "";
}
export function profileLabel(type: MockProfileType) { return PROFILE_OPTIONS.find(option => option.value === type)!.label; }
export function defaultMockTitle(type: MockProfileType, teamType: MockTeamType, author: string, values: MockValues) {
  // Mirrors the public title precedence, without importing the Web application.
  const selection = (key: string) => {
    const value = values[key];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  };
  if (["giocatore", "staff-sportivo", "arbitro", "campi-impianti-sportivi"].includes(type)) return author || (type === "campi-impianti-sportivi" ? "CAMPO DISPONIBILE" : "Ricerca opportunità");
  if (type === "squadra") {
    if (teamType === "Cerca partite amichevoli") return "Ricerca partite/amichevoli";
    if (teamType === "Cerca sponsor") return "Ricerca sponsor";
    if (teamType === "Cerca staff") {
      const figures = selection("figures");
      return figures.length === 1 ? `Ricerca ${figures[0]}` : "Ricerca staff sportivo";
    }
    const primary = selection("mainRoles"), specific = selection("specificRoles");
    const singleRole = primary.length === 1 && specific.length === 1 ? specific[0] : primary.length + specific.length === 1 ? primary[0] ?? specific[0] : null;
    return singleRole ? `Ricerca ${singleRole}` : "Ricerca giocatori";
  }
  if (type === "torneo-evento") return textValue(values, "eventName").trim() || "Ricerca opportunità";
  const figure = selection("figures")[0];
  return type === "creators" ? "Annuncio creator" : figure ? `Servizi di ${figure}` : "Servizi e professionisti";
}

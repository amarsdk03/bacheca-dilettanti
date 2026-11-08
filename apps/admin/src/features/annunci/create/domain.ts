import {
	createProfileDrafts,
	createProfileLocations,
	type ProfileDrafts,
	type ProfileLocationDraft
} from "@bacheca/announcements/features/profilo/profile-model";
import {createProfileSocialLinks} from "@bacheca/announcements/features/profilo/profile-social-links";
import type {PublishAnnouncementPayload} from "@bacheca/announcements/features/pubblica-annuncio/publish-model";
import {
	createAnnouncementDetailsDrafts,
	getAnnouncementDetail,
	getAnnouncementValidationErrors,
	getDatabaseAnnouncementType,
	getProfileValidationErrors,
	PUBLISH_PAYLOAD_VERSION,
	type TeamAnnouncementSubtype
} from "@bacheca/announcements/features/pubblica-annuncio/publish-model";
import {
	parsePublishPayload,
	PublishPayloadError
} from "@bacheca/announcements/features/pubblica-annuncio/server/validation";
import {
	isValidIsoDate,
	isValidPhone,
	isValidTime,
	parseOptionalMoney
} from "@bacheca/announcements/features/pubblica-annuncio/publish-field-validation";
import type {AuthorProfile, CreationInput, FieldIssue} from "./contracts";
import {
	ANNOUNCEMENT_FIELDS,
	type MockField,
	type MockProfileType,
	type MockTeamType,
	type MockValues,
	PROFILE_FIELDS,
	PROFILE_SOCIAL_FIELD,
	TEAM_FIELDS,
	textValue
} from "./prototype-model";
import {parseWhatsAppMessage} from "./whatsapp-parser";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const TEAM_SUBTYPES: Record<MockTeamType, TeamAnnouncementSubtype> = {"Cerca giocatori": "cerca-giocatore", "Cerca staff": "cerca-staff", "Cerca partite amichevoli": "cerca-partite-amichevoli", "Cerca sponsor": "cerca-sponsor"};
const MONTHS = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
export const strings = (values: MockValues, key: string): string[] => Array.isArray(values[key]) ? (values[key] as unknown[]).filter((v): v is string => typeof v === "string") : textValue(values, key) ? [textValue(values, key)] : [];
export const rows = (values: MockValues, key: string): MockValues[] => Array.isArray(values[key]) ? (values[key] as unknown[]).filter((v): v is MockValues => Boolean(v) && typeof v === "object" && !Array.isArray(v)) : [];
export function locations(values: MockValues): ProfileLocationDraft[] {
  const list = textValue(values, "region") ? [values] : rows(values, "locations");
  return list.map(row => ({regione: textValue(row, "region"), citta: textValue(row, "city") || null})).filter(row => row.regione);
}
const profileMap: Record<string, string> = {surname: "cognome", gender: "genere", nationality: "nazionalita", presentation: "presentazione", currentTeam: "squadra_attuale_nome", currentCategory: "categoria_attuale", height: "altezza", weight: "peso", foot: "piede_principale", specialization: "specializzazioni", headquarters: "sede_professionista", profileEmail: "contatto_email", profilePhone: "contatto_telefono", contentType: "tipologia_contenuti", address: "indirizzo", services: "presentazione_servizi", description: "info_aggiuntive", startingCost: "costo_partenza", highlights: "video_highlights"};
export function canonicalProfile(type: MockProfileType, values: MockValues): ProfileDrafts[MockProfileType] {
  const draft = {...createProfileDrafts()[type]} as Record<string, unknown>;
  const nameKey = type === "squadra" ? "nome_societa" : type === "creators" ? "nome_creator" : ["torneo-evento", "campi-impianti-sportivi"].includes(type) ? "nome_organizzazione" : "nome";
  draft[nameKey] = textValue(values, "name");
  for (const [key, destination] of Object.entries(profileMap)) if (destination in draft) draft[destination] = textValue(values, key) || (destination === "costo_partenza" ? null : "");
  if ("tipologie_sport" in draft) draft.tipologie_sport = strings(values, "sports");
  if ("figure_professionali" in draft) draft.figure_professionali = strings(values, "figures");
  if ("nominativo_anonimo" in draft) draft.nominativo_anonimo = textValue(values, "anonymousName") === "Sì";
  if ("disponibilita" in draft) draft.disponibilita = ({Svincolato: "svincolato", Tesserato: "sotto-contratto", "Disponibile subito": "disponibile-subito"})[textValue(values, "availability")] ?? (type === "giocatore" ? "" : "non-specificare");
  if ("disponibile_remoto" in draft) draft.disponibile_remoto = textValue(values, "remote") === "Sì";
  if (type === "campi-impianti-sportivi") draft.sede_principale = textValue(values, "address");
  if (type === "squadra") draft.torneo_attuale_nome = textValue(values, "tournament");
  const birth = textValue(values, "birthDate");
  if ("anno_nascita" in draft) {
    const [year, month, day] = birth.split("-"); draft.anno_nascita = year ?? ""; draft.mese_nascita = MONTHS[Number(month) - 1] ?? ""; draft.giorno_nascita = day ? String(Number(day)) : "";
  }
  if (type === "giocatore") {
    draft.ruoli_sport = {principali: strings(values, "mainRoles"), specifici: strings(values, "specificRoles")};
    draft.highlights_privati = textValue(values, "highlightsPreference") === "Privati";
    draft.richiede_caricamento_highlights = textValue(values, "highlightsPreference") === "Richiedi caricamento";
  }
  const experience = (row: MockValues, index: number) => ({id: `admin-${index}`, titolo: textValue(row, "role") || textValue(row, "title"), ente: textValue(row, "organization"), periodoDa: textValue(row, "from"), periodoA: textValue(row, "to"), descrizione: textValue(row, "description"), stato: textValue(row, "state") === "In corso" ? "in-corso" : textValue(row, "state") === "Conseguito" ? "conseguito" : "non-specificare", squadraProfiloId: null, squadraIstanzaId: null});
  if (type === "giocatore") draft.storico_carriera = rows(values, "experiences").map(experience);
  if ("lista_esperienze" in draft) draft.lista_esperienze = rows(values, "experiences").map(experience);
  if (type === "arbitro") draft.lista_esperienze = rows(values, "experiences").map((row,index) => ({...experience(row,index), titolo: "", ente: "", descrizione: textValue(row,"description") || [textValue(row,"role"),textValue(row,"organization")].filter(Boolean).join(" · ")}));
  if ("qualifiche_licenze" in draft) draft.qualifiche_licenze = rows(values, "qualifications").map(experience);
  return draft as unknown as ProfileDrafts[MockProfileType];
}
export function canonicalAnnouncement(type: MockProfileType, team: MockTeamType, values: MockValues) {
  const drafts = createAnnouncementDetailsDrafts();
  const key = type === "squadra" ? ({"Cerca giocatori": "squadraCercaGiocatore", "Cerca staff": "squadraCercaStaff", "Cerca partite amichevoli": "squadraCercaPartita", "Cerca sponsor": "squadraCercaSponsor"} as const)[team] : ({giocatore: "giocatore", "staff-sportivo": "staffSportivo", arbitro: "arbitro", "servizi-consulenze": "serviziConsulenze", creators: "creator", "torneo-evento": "torneoEvento", "campi-impianti-sportivi": "campoImpianto"} as const)[type];
  const detail = drafts[key] as unknown as Record<string, unknown>;
  if (type === "creators") detail.titolo_post = textValue(values, "title").trim() || "Annuncio creator";
  const mapping: Record<string, string> = {categories: "categorie_ricercate", teamGroup: team === "Cerca staff" ? "settore" : "gruppo_squadra", mainRoles: "ruoli_principali", specificRoles: "ruoli_secondari", yearFrom: type === "torneo-evento" ? "annate_ammesse_da" : "annata_da", yearTo: type === "torneo-evento" ? "annate_ammesse_a" : "annata_a", season: "stagione", figures: type === "squadra" ? "figure_ricercate" : "figura_professionale", compensation: "compenso_mensile", requirements: "requisiti", opponentCategory: "categorie_avversario", dateFrom: "periodo_dal", dateTo: "periodo_al", timeFrom: "orario_dalle", timeTo: "orario_alle", travel: type === "squadra" ? "disponibilita_trasferta" : "disponibilita_spostamento", sector: "categoria_settore", offer: "offerta_fornita", sports: "tipologie_sport", car: "automunito", specialization: "specializzazione", content: type === "creators" ? "descrizione_post" : "presentazione_servizi", eventName: "nome_evento", registration: "modalita_iscrizione", teams: "numero_squadre", cost: "costo_partecipazione", unit: "tipo_partecipazione", address: "indirizzo", hourlyCost: "costo_partenza", services: "servizi_inclusi", description: "descrizione_aggiuntiva"};
  for (const [field, destination] of Object.entries(mapping)) if (destination in detail) {
    const value = Array.isArray(detail[destination]) ? strings(values, field) : textValue(values, field);
    detail[destination] = ["travel", "car"].includes(field) && value === "Sì" ? "Si" : field === "registration" && typeof value === "string" ? value.toLowerCase().replaceAll(" ", "-") : field === "unit" && typeof value === "string" ? value.replace("Per ", "") || "squadra" : value;
  }
  if ("lista_premi_trofei" in detail) detail.lista_premi_trofei = rows(values, "prizes").map((row, i) => ({id: `prize-${i}`, posto: textValue(row, "place"), titoloPremio: textValue(row, "title")}));
  if ("orari" in detail) detail.orari = rows(values, "hours").map(row => ({giorno: textValue(row, "day").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), attivo: true, dalle: textValue(row, "from"), alle: textValue(row, "to")}));
  return {drafts, subtype: type === "squadra" ? TEAM_SUBTYPES[team] : null};
}
export function creationPayload(input: CreationInput): PublishAnnouncementPayload {
  const {drafts, subtype} = canonicalAnnouncement(input.profileType, input.teamType, input.announcement);
  const socials = createProfileSocialLinks()[input.profileType];
  const platforms: Record<string, keyof typeof socials> = {"Sito web": "website", Instagram: "instagram", Facebook: "facebook", YouTube: "youtube", LinkedIn: "linkedin"};
  for (const row of rows(input.profile, "social")) {const platform = platforms[textValue(row, "platform")]; if (platform) socials[platform] = textValue(row, "url");}
  const databaseType = getDatabaseAnnouncementType(input.profileType, subtype);
  const detail = getAnnouncementDetail(input.profileType, subtype, drafts);
  if (!databaseType || !detail) throw new Error("INVALID_ANNOUNCEMENT_TYPE");
  return {version: PUBLISH_PAYLOAD_VERSION, submissionId: input.submissionId, visibility: "gratuito", profileType: input.profileType, teamSubtype: subtype,
    anonymousProfile: input.authorMode === "unregistered" ? {type: input.profileType, draft: canonicalProfile(input.profileType, input.profile), locations: locations(input.profile), socialLinks: socials} : null,
    profileUpdate: null,
    announcement: {type: databaseType, title: textValue(input.announcement, "title"), detail, locations: locations(input.announcement), contacts: {email: textValue(input.announcement, "publicEmail"), phone: textValue(input.announcement, "publicPhone"), contactRole: textValue(input.announcement, "contactRole")}, extras: {genericLink: textValue(input.announcement, "link")}},
    consents: {dataConfirmed: false, termsAccepted: false, privacyAccepted: false, newsletterSubscribed: false}};
}

const profileErrorKeys: Record<string, string> = {name: "name", category: "currentCategory", sports: "sports", mainRole: "mainRoles", birthYear: "birthDate", availability: "availability", gender: "gender", nationality: "nationality", professionalRole: "figures", qualificationState: "qualifications", email: "profileEmail", phone: "profilePhone", contacts: "profileEmail", startingCost: "startingCost", locations: "locations"};
const announcementErrorKeys: Record<string, string> = {title: "title", email: "publicEmail", phone: "publicPhone", contacts: "publicEmail", contactRole: "contactRole", locations: "locations", professionalRole: "figures", servicePresentation: "content", mainRoles: "mainRoles", playerCategories: "categories", staffCategories: "categories", sports: "sports", staffTravel: "travel", requirements: "requirements", yearFrom: "yearFrom", yearTo: "yearTo", matchCategories: "opponentCategory", periodFrom: "dateFrom", periodTo: "dateTo", matchTimes: "timeFrom", matchTimeFrom: "timeFrom", matchTimeTo: "timeTo", monthlyCompensation: "compensation", sponsorSector: "sector", sponsorOffer: "offer", tournamentName: "eventName", tournamentYears: "yearFrom", tournamentTeams: "teams", tournamentCost: "cost", tournamentPrizes: "prizes", facilityCost: "hourlyCost", facilityAddress: "address", facilityHours: "hours", genericLink: "link"};
export function validateCreation(input: CreationInput, existing?: AuthorProfile): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const add = (path: string, message: string) => { if (!issues.some(issue => issue.path === path)) issues.push({path, severity: "error", code: "INVALID_FIELD", message, tab: path.startsWith("profile.") ? "profile" : /\.(?:public|contactRole|link|image)/.test(path) ? "contacts" : path.startsWith("author.") ? "author" : path === "authorized" ? "review" : "announcement"}); };
  if (!UUID.test(input.submissionId)) add("authorized", "L’invio non è inizializzato. Avvia una nuova bozza.");
  if (!input.authorized) add("authorized", "Operazione amministrativa non autorizzata.");
  if (input.provenance?.context) {
    const source = input.provenance;
    const extraction = parseWhatsAppMessage(source.rawText, source.messageUrl, source.manualTarget, source.context);
    if (extraction.blocked || extraction.target?.profileType !== input.profileType || input.profileType === "squadra" && extraction.target?.teamType !== input.teamType) {
      add("author._form", "Analizza il messaggio e risolvi regione e tipologia prima dell’invio.");
    }
  }
  if (input.authorMode === "registered" && (!existing || existing.id !== input.profileId || existing.type !== input.profileType)) add("author.profileId", "Seleziona un profilo attivo compatibile.");
  if (input.authorMode === "unregistered" && ["servizi-consulenze", "creators"].includes(input.profileType)) add("author.profileId", "Per questa tipologia scegli un profilo esistente abilitato.");
  if (input.referenceEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.referenceEmail)) add("author.email", "Inserisci un indirizzo email valido oppure lascia vuoto il campo.");
  const payload = creationPayload(input);
  const profiles = createProfileDrafts(), profileLocations = createProfileLocations();
  profiles[input.profileType] = (existing?.draft ?? canonicalProfile(input.profileType, input.profile)) as never;
  profileLocations[input.profileType] = existing?.locations ?? locations(input.profile);
  for (const [key, message] of Object.entries(getProfileValidationErrors(input.profileType, profiles, profileLocations))) if (message) {
    const single = ["giocatore", "squadra", "staff-sportivo", "arbitro", "campi-impianti-sportivi"].includes(input.profileType);
    const field = key === "locations" && single ? !textValue(input.profile, "region") ? "region" : "city" : profileErrorKeys[key] ?? key;
    add(`profile.${field}`, message);
  }
  const {drafts, subtype} = canonicalAnnouncement(input.profileType, input.teamType, input.announcement);
  for (const [key, message] of Object.entries(getAnnouncementValidationErrors(input.profileType, subtype, drafts, payload.announcement.locations, payload.announcement.contacts, payload.announcement.extras, payload.announcement.title, input.authorMode === "registered"))) if (message) {
    const field = key === "locations" && input.profileType === "campi-impianti-sportivi" ? !textValue(input.announcement, "region") ? "region" : "city" : announcementErrorKeys[key] ?? key;
    add(`announcement.${field}`, message);
  }
  const checkFields = (fields: readonly MockField[], values: MockValues, prefix: string) => {
    for (const field of fields) {
      const value = textValue(values, field.key), raw = values[field.key], path = `${prefix}.${field.key}`;
      if (field.kind === "repeat") {
        rows(values, field.key).forEach((row, index) => checkFields(field.fields ?? [], row, `${path}.${index}`)); continue;
      }
      if (field.required && !(value.trim() || Array.isArray(raw) && raw.length)) add(path, "Campo obbligatorio.");
      if (value && (field.maxLength && value.length > field.maxLength)) add(path, "Il testo supera la lunghezza consentita.");
      if (value && field.kind === "date" && !isValidIsoDate(value)) add(path, "Data non valida.");
      if (value && field.kind === "time" && !isValidTime(value)) add(path, "Orario non valido.");
      if (value && field.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) add(path, "Indirizzo email non valido.");
      if (value && field.kind === "tel" && !isValidPhone(value)) add(path, "Telefono non valido.");
      if (field.options && strings(values, field.key).some(option => !field.options!.includes(option))) add(path, "Valore non presente nel catalogo.");
      if (value && field.kind === "number" && parseOptionalMoney(value) === undefined) add(path, "Numero non valido.");
    }
  };
  if (!existing) checkFields([...PROFILE_FIELDS[input.profileType], PROFILE_SOCIAL_FIELD], input.profile, "profile");
  checkFields(input.profileType === "squadra" ? TEAM_FIELDS[input.teamType] : ANNOUNCEMENT_FIELDS[input.profileType], input.announcement, "announcement");
  if (input.profileType === "servizi-consulenze" && existing?.allowedRegions && locations(input.announcement).some(row => !existing.allowedRegions!.includes(row.regione))) add("announcement.locations", "Una o più regioni non sono abilitate per questo profilo.");
  if (!issues.length) {
    try { parsePublishPayload(payload, input.authorMode === "registered", "admin-attested"); }
    catch (error) {add(error instanceof PublishPayloadError && error.step === 2 ? "profile._form" : "announcement._form", error instanceof Error ? error.message : "Dati non validi.");}
  }
  return issues;
}

export function normalizeCreation(input: CreationInput) {
  return parsePublishPayload(creationPayload(input), input.authorMode === "registered", "admin-attested");
}

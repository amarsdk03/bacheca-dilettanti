import "server-only";

import {REGIONI_ITALIANE} from "@/const/defaultConstants";
import {
	createProfileDrafts,
	type ProfileDrafts,
	type ProfileLocationDraft,
} from "@/features/profilo/profile-model";
import {
	getAnnouncementValidationMessage,
	getDatabaseAnnouncementType,
	getProfileValidationMessage,
	isPublishableProfileType,
	isTeamAnnouncementSubtype,
	type AnnouncementContacts,
	type AnnouncementDetailsDrafts,
	type DatabaseAnnouncementType,
	type PublishableProfileType,
	type PublishAnnouncementPayload,
	type TeamAnnouncementSubtype,
	PUBLISH_PAYLOAD_VERSION,
} from "@/features/pubblica-annuncio/publish-model";
import {EMAIL_PATTERN} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {
	parseProfileEditorPayload,
	RegistrationPayloadError,
} from "@/features/registrati/server/registration";
import type {Json} from "@/server/supabase";

const MAX_PAYLOAD_BYTES = 256_000;
const MAX_SHORT_TEXT = 160;
const MAX_LONG_TEXT = 5_000;
const MAX_LIST_ITEMS = 32;
const MAX_LOCATIONS = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const REGIONS = new Set(REGIONI_ITALIANE.map(({nome}) => nome));

export class PublishPayloadError extends Error {
	readonly step: 1 | 2 | 3 | 4;

	constructor(message: string, step: 1 | 2 | 3 | 4) {
		super(message);
		this.name = "PublishPayloadError";
		this.step = step;
	}
}

export interface NormalizedPublishPayload {
	submissionId: string;
	profileType: PublishableProfileType;
	teamSubtype: TeamAnnouncementSubtype | null;
	announcementType: DatabaseAnnouncementType;
	profileDraft: Record<string, Json> | null;
	profileLocations: ProfileLocationDraft[];
	detail: Record<string, Json>;
	announcementLocations: ProfileLocationDraft[];
	contacts: AnnouncementContacts;
}

function fail(message: string, step: 1 | 2 | 3 | 4): never {
	throw new PublishPayloadError(message, step);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value: Record<string, unknown>, keys: readonly string[], step: 1 | 2 | 3 | 4) {
	if (Object.keys(value).some((key) => !keys.includes(key))) fail("I dati inviati non sono validi.", step);
}

function textValue(value: unknown, maxLength: number, step: 1 | 2 | 3 | 4, required = false) {
	if (value === null || value === undefined || value === "") {
		if (required) fail("Completa tutti i campi obbligatori.", step);
		return null;
	}
	if (typeof value !== "string" || value.length > maxLength) fail("Uno dei campi inseriti non è valido.", step);
	const normalized = value.trim();
	if (required && !normalized) fail("Completa tutti i campi obbligatori.", step);
	return normalized || null;
}

function stringList(value: unknown, step: 1 | 2 | 3 | 4, required = false) {
	if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) fail("Una delle selezioni non è valida.", step);
	const normalized = value.map((item) => {
		const text = textValue(item, 120, step, true);
		if (!text) fail("Una delle selezioni non è valida.", step);
		return text;
	});
	const unique = [...new Set(normalized)];
	if (required && unique.length === 0) fail("Completa tutti i campi obbligatori.", step);
	return unique;
}

function numericValue(
	value: unknown,
	step: 1 | 2 | 3 | 4,
	options: {integer?: boolean; min?: number; max?: number} = {},
) {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value !== "string" && typeof value !== "number") fail("Uno dei valori numerici non è valido.", step);
	const normalized = typeof value === "string" ? value.trim().replace(",", ".") : value;
	if (normalized === "") return null;
	const number = Number(normalized);
	if (!Number.isFinite(number)) fail("Uno dei valori numerici non è valido.", step);
	if (options.integer && !Number.isInteger(number)) fail("Uno dei valori numerici non è valido.", step);
	if (options.min !== undefined && number < options.min) fail("Uno dei valori numerici non è valido.", step);
	if (options.max !== undefined && number > options.max) fail("Uno dei valori numerici non è valido.", step);
	return number;
}

function dateValue(value: unknown) {
	const normalized = textValue(value, 10, 3);
	if (!normalized) return null;
	const parsed = new Date(`${normalized}T00:00:00Z`);
	if (
		!DATE_PATTERN.test(normalized)
		|| Number.isNaN(parsed.getTime())
		|| parsed.toISOString().slice(0, 10) !== normalized
	) {
		fail("Una delle date inserite non è valida.", 3);
	}
	return normalized;
}

function timeValue(value: unknown) {
	const normalized = textValue(value, 5, 3);
	if (!normalized) return null;
	if (!TIME_PATTERN.test(normalized)) fail("Uno degli orari inseriti non è valido.", 3);
	return normalized;
}

function normalizeLocations(value: unknown, step: 2 | 3) {
	if (!Array.isArray(value) || value.length === 0 || value.length > MAX_LOCATIONS) {
		fail("Seleziona almeno una località valida.", step);
	}
	const seen = new Set<string>();
	return value.map((entry): ProfileLocationDraft => {
		if (!isRecord(entry)) fail("Una delle località non è valida.", step);
		assertExactKeys(entry, ["regione", "citta"], step);
		const regione = textValue(entry.regione, 80, step, true);
		if (!regione || !REGIONS.has(regione)) fail("Seleziona una regione italiana valida.", step);
		const citta = textValue(entry.citta, 120, step);
		const key = `${regione}\u0000${citta ?? ""}`;
		if (seen.has(key)) fail("Rimuovi le località duplicate.", step);
		seen.add(key);
		return {regione, citta};
	});
}

function normalizeContacts(value: unknown): AnnouncementContacts {
	if (!isRecord(value)) fail("I contatti dell’annuncio non sono validi.", 3);
	assertExactKeys(value, ["email", "phone"], 3);
	const email = textValue(value.email, 254, 3) ?? "";
	const phone = textValue(value.phone, 40, 3) ?? "";
	if (!email && !phone) fail("Inserisci almeno un contatto tra email e telefono.", 3);
	if (email && !EMAIL_PATTERN.test(email)) fail("Inserisci un indirizzo email valido.", 3);
	const phoneDigits = phone.replace(/\D/g, "");
	if (phone && (phoneDigits.length < 6 || phoneDigits.length > 20 || !/^[+\d().\s-]+$/.test(phone))) {
		fail("Inserisci un numero di telefono valido.", 3);
	}
	return {email: email.toLowerCase(), phone};
}

function normalizePrizeList(value: unknown): Json[] {
	if (!Array.isArray(value) || value.length > 20) fail("I premi inseriti non sono validi.", 3);
	return value.map((entry) => {
		if (!isRecord(entry)) fail("I premi inseriti non sono validi.", 3);
		assertExactKeys(entry, ["id", "posto", "titoloPremio"], 3);
		return {
			id: textValue(entry.id, 100, 3) ?? crypto.randomUUID(),
			posto: textValue(entry.posto, MAX_SHORT_TEXT, 3) ?? "",
			titoloPremio: textValue(entry.titoloPremio, MAX_SHORT_TEXT, 3, true) ?? "",
		};
	});
}

function normalizeDetail(type: DatabaseAnnouncementType, value: unknown): Record<string, Json> {
	if (!isRecord(value)) fail("I dati dell’annuncio non sono validi.", 3);

	if (type === "annuncio_giocatore") {
		assertExactKeys(value, ["descrizione_aggiuntiva"], 3);
		return {descrizione_aggiuntiva: textValue(value.descrizione_aggiuntiva, MAX_LONG_TEXT, 3, true)};
	}
	if (type === "annuncio_squadra_cerca_giocatore") {
		assertExactKeys(value, ["ruoli_principali", "ruoli_secondari", "annate_ricercate", "stagione", "descrizione_aggiuntiva"], 3);
		return {
			ruoli_principali: stringList(value.ruoli_principali, 3, true),
			ruoli_secondari: stringList(value.ruoli_secondari, 3),
			annate_ricercate: stringList(value.annate_ricercate, 3),
			stagione: textValue(value.stagione, 80, 3),
			descrizione_aggiuntiva: textValue(value.descrizione_aggiuntiva, MAX_LONG_TEXT, 3, true),
		};
	}
	if (type === "annuncio_squadra_cerca_staff") {
		assertExactKeys(value, ["figura_ricercata", "settore", "compenso_mensile", "requisiti", "periodo_dal", "periodo_al", "descrizione_aggiuntiva"], 3);
		const from = dateValue(value.periodo_dal);
		const to = dateValue(value.periodo_al);
		if (from && to && from > to) fail("La data finale non può precedere quella iniziale.", 3);
		return {
			figura_ricercata: textValue(value.figura_ricercata, MAX_SHORT_TEXT, 3, true),
			settore: textValue(value.settore, MAX_SHORT_TEXT, 3),
			compenso_mensile: numericValue(value.compenso_mensile, 3, {min: 0, max: 99_999_999.99}),
			requisiti: textValue(value.requisiti, MAX_LONG_TEXT, 3, true),
			periodo_dal: from,
			periodo_al: to,
			descrizione_aggiuntiva: textValue(value.descrizione_aggiuntiva, MAX_LONG_TEXT, 3),
		};
	}
	if (type === "annuncio_squadra_cerca_partita") {
		assertExactKeys(value, ["categorie_avversario", "periodo_dal", "periodo_al", "orario_dalle", "orario_alle", "disponibilita_trasferta", "descrizione_aggiuntiva"], 3);
		const from = dateValue(value.periodo_dal);
		const to = dateValue(value.periodo_al);
		if (from && to && from > to) fail("La data finale non può precedere quella iniziale.", 3);
		const timeFrom = timeValue(value.orario_dalle);
		const timeTo = timeValue(value.orario_alle);
		if (Boolean(timeFrom) !== Boolean(timeTo)) fail("Completa entrambi gli orari indicativi.", 3);
		return {
			categorie_avversario: stringList(value.categorie_avversario, 3, true),
			periodo_dal: from,
			periodo_al: to,
			orario_dalle: timeFrom,
			orario_alle: timeTo,
			disponibilita_trasferta: textValue(value.disponibilita_trasferta, 40, 3),
			descrizione_aggiuntiva: textValue(value.descrizione_aggiuntiva, MAX_LONG_TEXT, 3),
		};
	}
	if (type === "annuncio_squadra_cerca_sponsor") {
		assertExactKeys(value, ["categoria_settore", "supporto_cercato", "offerta_fornita", "descrizione_aggiuntiva"], 3);
		return {
			categoria_settore: textValue(value.categoria_settore, MAX_SHORT_TEXT, 3, true),
			supporto_cercato: textValue(value.supporto_cercato, MAX_LONG_TEXT, 3, true),
			offerta_fornita: textValue(value.offerta_fornita, MAX_LONG_TEXT, 3, true),
			descrizione_aggiuntiva: textValue(value.descrizione_aggiuntiva, MAX_LONG_TEXT, 3),
		};
	}
	if (type === "annuncio_staff_sportivo") {
		assertExactKeys(value, ["tipologie_sport", "categorie_ricercate", "disponibilita_spostamento", "descrizione_aggiuntiva"], 3);
		return {
			tipologie_sport: stringList(value.tipologie_sport, 3, true),
			categorie_ricercate: stringList(value.categorie_ricercate, 3),
			disponibilita_spostamento: textValue(value.disponibilita_spostamento, 40, 3),
			descrizione_aggiuntiva: textValue(value.descrizione_aggiuntiva, MAX_LONG_TEXT, 3, true),
		};
	}
	if (type === "annuncio_arbitro") {
		assertExactKeys(value, ["tipologie_sport", "categorie_ricercate", "automunito", "disponibilita_spostamento", "descrizione_aggiuntiva"], 3);
		return {
			tipologie_sport: stringList(value.tipologie_sport, 3, true),
			categorie_ricercate: stringList(value.categorie_ricercate, 3),
			automunito: textValue(value.automunito, 40, 3),
			disponibilita_spostamento: textValue(value.disponibilita_spostamento, 40, 3),
			descrizione_aggiuntiva: textValue(value.descrizione_aggiuntiva, MAX_LONG_TEXT, 3, true),
		};
	}
	if (type === "annuncio_torneo_evento") {
		assertExactKeys(value, ["nome_evento", "tipologie_sport", "modalita_iscrizione", "annate_ammesse_da", "annate_ammesse_a", "numero_squadre", "costo_partecipazione", "tipo_partecipazione", "lista_premi_trofei", "descrizione_aggiuntiva"], 3);
		const yearFrom = textValue(value.annate_ammesse_da, 4, 3);
		const yearTo = textValue(value.annate_ammesse_a, 4, 3);
		if ((yearFrom && !/^\d{4}$/.test(yearFrom)) || (yearTo && !/^\d{4}$/.test(yearTo)) || (yearFrom && yearTo && Number(yearFrom) > Number(yearTo))) {
			fail("L’intervallo delle annate non è valido.", 3);
		}
		const registration = textValue(value.modalita_iscrizione, 40, 3);
		if (registration && !["libera", "posti-limitati"].includes(registration)) fail("La modalità di iscrizione non è valida.", 3);
		const participation = textValue(value.tipo_partecipazione, 40, 3) ?? "squadra";
		if (!["giocatore", "squadra"].includes(participation)) fail("La modalità di partecipazione non è valida.", 3);
		return {
			nome_evento: textValue(value.nome_evento, MAX_SHORT_TEXT, 3, true),
			tipologie_sport: stringList(value.tipologie_sport, 3, true),
			modalita_iscrizione: registration,
			annate_ammesse_da: yearFrom,
			annate_ammesse_a: yearTo,
			numero_squadre: numericValue(value.numero_squadre, 3, {integer: true, min: 1, max: 100_000}),
			costo_partecipazione: numericValue(value.costo_partecipazione, 3, {min: 0, max: 99_999_999.99}),
			tipo_partecipazione: participation,
			lista_premi_trofei: normalizePrizeList(value.lista_premi_trofei),
			descrizione_aggiuntiva: textValue(value.descrizione_aggiuntiva, MAX_LONG_TEXT, 3, true),
		};
	}

	assertExactKeys(value, ["tipologie_sport", "orari", "costo_partenza", "servizi_inclusi", "descrizione_aggiuntiva"], 3);
	return {
		tipologie_sport: stringList(value.tipologie_sport, 3, true),
		orari: textValue(value.orari, MAX_LONG_TEXT, 3),
		costo_partenza: numericValue(value.costo_partenza, 3, {min: 0, max: 99_999_999.99}),
		servizi_inclusi: textValue(value.servizi_inclusi, MAX_LONG_TEXT, 3),
		descrizione_aggiuntiva: textValue(value.descrizione_aggiuntiva, MAX_LONG_TEXT, 3, true),
	};
}

function assignNormalizedProfileDraft(
	drafts: ProfileDrafts,
	type: PublishableProfileType,
	draft: Record<string, Json>,
) {
	(drafts as unknown as Record<PublishableProfileType, Record<string, Json>>)[type] = draft;
}

function assignNormalizedAnnouncementDetail(
	drafts: AnnouncementDetailsDrafts,
	type: DatabaseAnnouncementType,
	detail: Record<string, Json>,
) {
	const key = {
		annuncio_giocatore: "giocatore",
		annuncio_squadra_cerca_giocatore: "squadraCercaGiocatore",
		annuncio_squadra_cerca_staff: "squadraCercaStaff",
		annuncio_squadra_cerca_partita: "squadraCercaPartita",
		annuncio_squadra_cerca_sponsor: "squadraCercaSponsor",
		annuncio_staff_sportivo: "staffSportivo",
		annuncio_arbitro: "arbitro",
		annuncio_torneo_evento: "torneoEvento",
		annuncio_campo_impianto: "campoImpianto",
	}[type] as keyof AnnouncementDetailsDrafts;
	(drafts as unknown as Record<keyof AnnouncementDetailsDrafts, Record<string, Json>>)[key] = detail;
}

export function parsePublishPayload(rawValue: unknown, registered: boolean): NormalizedPublishPayload {
	let serialized: string | undefined;
	try {
		serialized = JSON.stringify(rawValue);
	} catch {
		fail("I dati dell’annuncio non sono validi.", 3);
	}
	if (!serialized || Buffer.byteLength(serialized, "utf8") > MAX_PAYLOAD_BYTES || !isRecord(rawValue)) {
		fail("I dati dell’annuncio sono mancanti o troppo grandi.", 3);
	}
	assertExactKeys(rawValue, ["version", "submissionId", "profileType", "teamSubtype", "anonymousProfile", "announcement", "consents"], 3);
	if (rawValue.version !== PUBLISH_PAYLOAD_VERSION) fail("Aggiorna la pagina e ripeti la pubblicazione.", 1);
	if (typeof rawValue.submissionId !== "string" || !UUID_PATTERN.test(rawValue.submissionId)) fail("La richiesta di pubblicazione non è valida.", 4);
	if (typeof rawValue.profileType !== "string" || !isPublishableProfileType(rawValue.profileType)) fail("La tipologia di profilo non è valida.", 1);
	const profileType = rawValue.profileType;

	let teamSubtype: TeamAnnouncementSubtype | null = null;
	if (profileType === "squadra") {
		if (typeof rawValue.teamSubtype !== "string" || !isTeamAnnouncementSubtype(rawValue.teamSubtype)) fail("Seleziona una tipologia di annuncio per la squadra.", 1);
		teamSubtype = rawValue.teamSubtype;
	} else if (rawValue.teamSubtype !== null) {
		fail("La sottotipologia dell’annuncio non è valida.", 1);
	}

	const expectedAnnouncementType = getDatabaseAnnouncementType(profileType, teamSubtype);
	if (!expectedAnnouncementType || !isRecord(rawValue.announcement)) fail("La tipologia di annuncio non è valida.", 1);
	assertExactKeys(rawValue.announcement, ["type", "detail", "locations", "contacts"], 3);
	if (rawValue.announcement.type !== expectedAnnouncementType) fail("I dati non corrispondono alla tipologia selezionata.", 3);

	let profileDraft: Record<string, Json> | null = null;
	let profileLocations: ProfileLocationDraft[] = [];
	if (registered) {
		if (rawValue.anonymousProfile !== null) fail("I dati del profilo anonimo non sono previsti per questo account.", 2);
	} else {
		if (!isRecord(rawValue.anonymousProfile)) fail("Completa i dati del profilo prima di pubblicare.", 2);
		try {
			const profile = parseProfileEditorPayload(rawValue.anonymousProfile);
			if (profile.type !== profileType || !isPublishableProfileType(profile.type)) fail("I dati del profilo non corrispondono alla tipologia selezionata.", 2);
			profileDraft = profile.draft;
			profileLocations = normalizeLocations(profile.locations, 2);
			const drafts = createProfileDrafts();
			assignNormalizedProfileDraft(drafts, profileType, profile.draft);
			const profileMessage = getProfileValidationMessage(profileType, drafts, {
				...Object.fromEntries(Object.keys(drafts).map((key) => [key, []])),
				[profileType]: profileLocations,
			} as Record<keyof ProfileDrafts, ProfileLocationDraft[]>);
			if (profileMessage) fail(profileMessage, 2);
		} catch (error) {
			if (error instanceof PublishPayloadError) throw error;
			if (error instanceof RegistrationPayloadError) fail(error.message, 2);
			throw error;
		}
	}

	const detail = normalizeDetail(expectedAnnouncementType, rawValue.announcement.detail);
	const announcementLocations = normalizeLocations(rawValue.announcement.locations, 3);
	const contacts = normalizeContacts(rawValue.announcement.contacts);

	const normalizedDrafts = {
		giocatore: {descrizione_aggiuntiva: ""},
		squadraCercaGiocatore: {ruoli_principali: [], ruoli_secondari: [], annate_ricercate: [], stagione: "", descrizione_aggiuntiva: ""},
		squadraCercaStaff: {figura_ricercata: "", settore: "", compenso_mensile: "", requisiti: "", periodo_dal: "", periodo_al: "", descrizione_aggiuntiva: ""},
		squadraCercaPartita: {categorie_avversario: [], periodo_dal: "", periodo_al: "", orario_dalle: "", orario_alle: "", disponibilita_trasferta: "", descrizione_aggiuntiva: ""},
		squadraCercaSponsor: {categoria_settore: "", supporto_cercato: "", offerta_fornita: "", descrizione_aggiuntiva: ""},
		staffSportivo: {tipologie_sport: [], categorie_ricercate: [], disponibilita_spostamento: "", descrizione_aggiuntiva: ""},
		arbitro: {tipologie_sport: [], categorie_ricercate: [], automunito: "", disponibilita_spostamento: "", descrizione_aggiuntiva: ""},
		torneoEvento: {nome_evento: "", tipologie_sport: [], modalita_iscrizione: "", annate_ammesse_da: "", annate_ammesse_a: "", numero_squadre: "", costo_partecipazione: "", tipo_partecipazione: "squadra", lista_premi_trofei: [], descrizione_aggiuntiva: ""},
		campoImpianto: {tipologie_sport: [], orari: "", costo_partenza: "", servizi_inclusi: "", descrizione_aggiuntiva: ""},
	} satisfies AnnouncementDetailsDrafts;
	assignNormalizedAnnouncementDetail(normalizedDrafts, expectedAnnouncementType, detail);
	const detailMessage = getAnnouncementValidationMessage(profileType, teamSubtype, normalizedDrafts, announcementLocations, contacts);
	if (detailMessage) fail(detailMessage, 3);

	if (!isRecord(rawValue.consents)) fail("Conferma i consensi richiesti.", 4);
	assertExactKeys(rawValue.consents, ["dataConfirmed", "termsAccepted", "privacyAccepted"], 4);
	if (rawValue.consents.dataConfirmed !== true || rawValue.consents.termsAccepted !== true || rawValue.consents.privacyAccepted !== true) {
		fail("Conferma i dati, i termini e l’informativa privacy prima dell’invio.", 4);
	}

	return {
		submissionId: rawValue.submissionId,
		profileType,
		teamSubtype,
		announcementType: expectedAnnouncementType,
		profileDraft,
		profileLocations,
		detail,
		announcementLocations,
		contacts,
	};
}

export function asPublishPayload(value: PublishAnnouncementPayload) {
	return value;
}

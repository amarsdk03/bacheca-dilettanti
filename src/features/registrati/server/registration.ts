import "server-only";

import {REGIONI_ITALIANE} from "@/const/defaultConstants";
import {
	isLimitedProfileType,
	isProfileType,
	MAX_PROFILE_COUNT,
	type ProfileType,
} from "@/features/profilo/profile-model";
import {
	isRegistrableProfileType,
	REGISTRATION_PAYLOAD_VERSION,
	type RegistrableProfileType,
} from "@/features/registrati/registration-payload";
import type {Json} from "@/server/supabase";

const MAX_PAYLOAD_BYTES = 256_000;
const MAX_SHORT_TEXT = 160;
const MAX_LONG_TEXT = 5_000;
const MAX_LIST_ITEMS = 32;
const MAX_EXPERIENCES = 20;
const MAX_LOCATIONS = 100;

const REGIONS = new Set(REGIONI_ITALIANE.map(({nome}) => nome));
const AVAILABILITIES = new Set(["non-specificare", "disponibile-subito", "sotto-contratto"]);
const VEHICLE_AVAILABILITIES = new Set(["si", "no"]);
const FEET = new Set(["", "Destro", "Sinistro", "Ambipiede"]);
const EXPERIENCE_STATES = new Set(["non-specificare", "in-corso", "conseguito"]);
const WEEKDAYS = new Set(["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"]);
const MONTHS = new Set([
	"Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
	"Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
]);
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const YEAR_PATTERN = /^\d{4}$/;
const DAY_PATTERN = /^(?:0?[1-9]|[12]\d|3[01])$/;

type RegistrationStep = 2 | 3;

export class RegistrationPayloadError extends Error {
	readonly step: RegistrationStep;
	readonly profileType?: ProfileType;

	constructor(message: string, step: RegistrationStep, profileType?: ProfileType) {
		super(message);
		this.name = "RegistrationPayloadError";
		this.step = step;
		this.profileType = profileType;
	}
}

export interface NormalizedRegistrationProfile {
	type: RegistrableProfileType;
	draft: Record<string, Json>;
	locations: Array<{regione: string; citta: string | null}>;
}

export interface NormalizedRegistrationPayload {
	version: typeof REGISTRATION_PAYLOAD_VERSION;
	selectedProfileTypes: ProfileType[];
	primaryProfileType: RegistrableProfileType;
	profiles: NormalizedRegistrationProfile[];
}

function fail(
	message: string,
	step: RegistrationStep,
	profileType?: ProfileType,
): never {
	throw new RegistrationPayloadError(message, step, profileType);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(
	value: Record<string, unknown>,
	keys: readonly string[],
	profileType: ProfileType,
) {
	if (Object.keys(value).some((key) => !keys.includes(key))) {
		fail("I dati del profilo non sono validi. Rivedi i campi inseriti.", 3, profileType);
	}
}

function textValue(
	value: unknown,
	maxLength: number,
	profileType: ProfileType,
): string | null {
	if (value === null || value === undefined || value === "") return null;
	if (typeof value !== "string" || value.length > maxLength) {
		fail("Uno dei campi del profilo è troppo lungo o non valido.", 3, profileType);
	}
	const normalized = value.trim();
	return normalized || null;
}

function enumText(
	value: unknown,
	allowed: Set<string>,
	profileType: ProfileType,
): string | null {
	const normalized = textValue(value, MAX_SHORT_TEXT, profileType);
	if (normalized === null) return null;
	if (!allowed.has(normalized)) {
		fail("Uno dei valori selezionati per il profilo non è valido.", 3, profileType);
	}
	return normalized === "non-specificare" ? null : normalized;
}

function stringList(value: unknown, profileType: ProfileType): string[] {
	if (value === null || value === undefined) return [];
	if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) {
		fail("Una delle selezioni del profilo non è valida.", 3, profileType);
	}

	const result = value.map((item) => {
		const normalized = textValue(item, 120, profileType);
		if (!normalized) fail("Una delle selezioni del profilo non è valida.", 3, profileType);
		return normalized;
	});
	return [...new Set(result)];
}

function birthField(
	value: unknown,
	type: "day" | "month" | "year",
	profileType: ProfileType,
): string | null {
	const normalized = textValue(value, 12, profileType);
	if (normalized === null) return null;
	const valid = type === "day"
		? DAY_PATTERN.test(normalized)
		: type === "month"
			? MONTHS.has(normalized)
			: YEAR_PATTERN.test(normalized) && Number(normalized) >= 1900 && Number(normalized) <= new Date().getFullYear();
	if (!valid) fail("La data di nascita inserita non è valida.", 3, profileType);
	return normalized;
}

function experiences(value: unknown, profileType: ProfileType): Json[] {
	if (value === null || value === undefined) return [];
	if (!Array.isArray(value) || value.length > MAX_EXPERIENCES) {
		fail("Lo storico delle esperienze non è valido.", 3, profileType);
	}

	return value.map((entry) => {
		if (!isRecord(entry)) fail("Lo storico delle esperienze non è valido.", 3, profileType);
		assertExactKeys(entry, ["id", "titolo", "ente", "periodoDa", "periodoA", "descrizione", "stato"], profileType);
		const periodoDa = textValue(entry.periodoDa, 4, profileType);
		const periodoA = textValue(entry.periodoA, 4, profileType);
		const currentYear = new Date().getFullYear();
		const invalidYear = (year: string | null) => Boolean(year) && (
			!YEAR_PATTERN.test(year as string)
			|| Number(year) < 1900
			|| Number(year) > currentYear
		);
		if (invalidYear(periodoDa) || invalidYear(periodoA)) {
			fail("Uno dei periodi inseriti non è valido.", 3, profileType);
		}
		if (periodoDa && periodoA && Number(periodoA) < Number(periodoDa)) {
			fail("La fine di un’esperienza non può precederne l’inizio.", 3, profileType);
		}
		const stato = enumText(entry.stato, EXPERIENCE_STATES, profileType);
		return {
			id: textValue(entry.id, 100, profileType) ?? crypto.randomUUID(),
			titolo: textValue(entry.titolo, 120, profileType) ?? "",
			ente: textValue(entry.ente, 120, profileType) ?? "",
			periodoDa: periodoDa ?? "",
			periodoA: periodoA ?? "",
			descrizione: textValue(entry.descrizione, MAX_LONG_TEXT, profileType) ?? "",
			stato: stato ?? "non-specificare",
		};
	});
}

function sportsRoles(value: unknown, profileType: ProfileType): Json {
	if (value === null || value === undefined) return {principali: [], specifici: []};
	if (!isRecord(value)) fail("I ruoli sportivi inseriti non sono validi.", 3, profileType);
	assertExactKeys(value, ["principali", "specifici"], profileType);
	return {
		principali: stringList(value.principali, profileType),
		specifici: stringList(value.specifici, profileType),
	};
}

function openingHours(value: unknown, profileType: ProfileType): Json[] {
	if (value === null || value === undefined) return [];
	if (!Array.isArray(value) || value.length > WEEKDAYS.size) {
		fail("Gli orari inseriti non sono validi.", 3, profileType);
	}
	const seen = new Set<string>();
	return value.map((entry) => {
		if (!isRecord(entry)) fail("Gli orari inseriti non sono validi.", 3, profileType);
		assertExactKeys(entry, ["giorno", "attivo", "dalle", "alle"], profileType);
		if (typeof entry.giorno !== "string" || !WEEKDAYS.has(entry.giorno) || seen.has(entry.giorno)) {
			fail("Gli orari inseriti non sono validi.", 3, profileType);
		}
		seen.add(entry.giorno);
		if (typeof entry.attivo !== "boolean") fail("Gli orari inseriti non sono validi.", 3, profileType);
		const dalle = textValue(entry.dalle, 5, profileType) ?? "";
		const alle = textValue(entry.alle, 5, profileType) ?? "";
		if ((dalle && !TIME_PATTERN.test(dalle)) || (alle && !TIME_PATTERN.test(alle))) {
			fail("Gli orari inseriti non sono validi.", 3, profileType);
		}
		return {giorno: entry.giorno, attivo: entry.attivo, dalle, alle};
	});
}

function locations(
	value: unknown,
	profileType: ProfileType,
): Array<{regione: string; citta: string | null}> {
	if (value === null || value === undefined) return [];
	if (!Array.isArray(value) || value.length > MAX_LOCATIONS) {
		fail("Le località del profilo non sono valide.", 3, profileType);
	}
	const seen = new Set<string>();
	return value.map((entry) => {
		if (!isRecord(entry)) fail("Le località del profilo non sono valide.", 3, profileType);
		assertExactKeys(entry, ["regione", "citta"], profileType);
		const regione = textValue(entry.regione, 80, profileType);
		if (!regione || !REGIONS.has(regione)) fail("Seleziona una regione italiana valida.", 3, profileType);
		const citta = textValue(entry.citta, 120, profileType);
		const key = `${regione}\u0000${citta ?? ""}`;
		if (seen.has(key)) fail("Rimuovi le località duplicate dal profilo.", 3, profileType);
		seen.add(key);
		return {regione, citta};
	});
}

function baseSport(value: unknown, profileType: ProfileType): string {
	if (value !== "Calcio") fail("Lo sport principale selezionato non è valido.", 3, profileType);
	return value;
}

function normalizeDraft(
	type: ProfileType,
	value: unknown,
): Record<string, Json> {
	if (!isRecord(value)) fail("I dati del profilo non sono validi.", 3, type);

	if (type === "giocatore") {
		assertExactKeys(value, ["altezza", "anno_nascita", "categorie_ricercate", "cognome", "disponibilita", "giorno_nascita", "mese_nascita", "nome", "peso", "piede_principale", "presentazione", "ruoli_sport", "sport_principale", "storico_carriera", "tipologie_sport"], type);
		return {
			altezza: textValue(value.altezza, MAX_SHORT_TEXT, type),
			anno_nascita: birthField(value.anno_nascita, "year", type),
			categorie_ricercate: stringList(value.categorie_ricercate, type),
			cognome: textValue(value.cognome, MAX_SHORT_TEXT, type),
			disponibilita: enumText(value.disponibilita, AVAILABILITIES, type),
			giorno_nascita: birthField(value.giorno_nascita, "day", type),
			mese_nascita: birthField(value.mese_nascita, "month", type),
			nome: textValue(value.nome, MAX_SHORT_TEXT, type),
			peso: textValue(value.peso, MAX_SHORT_TEXT, type),
			piede_principale: enumText(value.piede_principale, FEET, type),
			presentazione: textValue(value.presentazione, MAX_LONG_TEXT, type),
			ruoli_sport: sportsRoles(value.ruoli_sport, type),
			sport_principale: baseSport(value.sport_principale, type),
			storico_carriera: experiences(value.storico_carriera, type),
			tipologie_sport: stringList(value.tipologie_sport, type),
		};
	}

	if (type === "squadra") {
		assertExactKeys(value, ["nome_societa", "presentazione", "sede_principale", "sport_principale", "tipologie_sport"], type);
		return {
			nome_societa: textValue(value.nome_societa, MAX_SHORT_TEXT, type),
			presentazione: textValue(value.presentazione, MAX_LONG_TEXT, type),
			sede_principale: textValue(value.sede_principale, MAX_SHORT_TEXT, type),
			sport_principale: baseSport(value.sport_principale, type),
			tipologie_sport: stringList(value.tipologie_sport, type),
		};
	}

	if (type === "staff-sportivo") {
		assertExactKeys(value, ["anno_nascita", "cognome", "disponibilita", "figure_professionali", "giorno_nascita", "mese_nascita", "nome", "presentazione", "sport_principale", "storico_esperienze"], type);
		return {
			anno_nascita: birthField(value.anno_nascita, "year", type),
			cognome: textValue(value.cognome, MAX_SHORT_TEXT, type),
			disponibilita: enumText(value.disponibilita, AVAILABILITIES, type),
			figure_professionali: stringList(value.figure_professionali, type),
			giorno_nascita: birthField(value.giorno_nascita, "day", type),
			mese_nascita: birthField(value.mese_nascita, "month", type),
			nome: textValue(value.nome, MAX_SHORT_TEXT, type),
			presentazione: textValue(value.presentazione, MAX_LONG_TEXT, type),
			sport_principale: baseSport(value.sport_principale, type),
			storico_esperienze: experiences(value.storico_esperienze, type),
		};
	}

	if (type === "arbitro") {
		assertExactKeys(value, ["anno_nascita", "cognome", "disponibilita", "giorno_nascita", "mese_nascita", "nome", "presentazione", "sport_principale", "storico_esperienze"], type);
		return {
			anno_nascita: birthField(value.anno_nascita, "year", type),
			cognome: textValue(value.cognome, MAX_SHORT_TEXT, type),
			disponibilita: enumText(value.disponibilita, AVAILABILITIES, type),
			giorno_nascita: birthField(value.giorno_nascita, "day", type),
			mese_nascita: birthField(value.mese_nascita, "month", type),
			nome: textValue(value.nome, MAX_SHORT_TEXT, type),
			presentazione: textValue(value.presentazione, MAX_LONG_TEXT, type),
			sport_principale: baseSport(value.sport_principale, type),
			storico_esperienze: experiences(value.storico_esperienze, type),
		};
	}

	if (type === "torneo-evento") {
		assertExactKeys(value, ["nome_organizzazione", "presentazione", "sede_principale", "sport_principale", "tipologie_sport"], type);
		return {
			nome_organizzazione: textValue(value.nome_organizzazione, MAX_SHORT_TEXT, type),
			presentazione: textValue(value.presentazione, MAX_LONG_TEXT, type),
			sede_principale: textValue(value.sede_principale, MAX_SHORT_TEXT, type),
			sport_principale: baseSport(value.sport_principale, type),
			tipologie_sport: stringList(value.tipologie_sport, type),
		};
	}

	if (type === "professionisti-studi") {
		assertExactKeys(value, [
			"anno_nascita",
			"automunito",
			"cognome",
			"disponibilita",
			"figure_professionali",
			"giorno_nascita",
			"mese_nascita",
			"nome",
			"presentazione",
			"presentazione_servizi",
			"specializzazioni",
			"sport_principale",
			"storico_esperienze",
			"tipologie_sport",
		], type);
		return {
			anno_nascita: birthField(value.anno_nascita, "year", type),
			automunito: enumText(value.automunito, VEHICLE_AVAILABILITIES, type),
			cognome: textValue(value.cognome, MAX_SHORT_TEXT, type),
			disponibilita: enumText(value.disponibilita, AVAILABILITIES, type),
			figure_professionali: stringList(value.figure_professionali, type),
			giorno_nascita: birthField(value.giorno_nascita, "day", type),
			mese_nascita: birthField(value.mese_nascita, "month", type),
			nome: textValue(value.nome, MAX_SHORT_TEXT, type),
			presentazione: textValue(value.presentazione, MAX_LONG_TEXT, type),
			presentazione_servizi: textValue(value.presentazione_servizi, MAX_LONG_TEXT, type),
			specializzazioni: textValue(value.specializzazioni, MAX_LONG_TEXT, type),
			sport_principale: baseSport(value.sport_principale, type),
			storico_esperienze: experiences(value.storico_esperienze, type),
			tipologie_sport: stringList(value.tipologie_sport, type),
		};
	}

	if (type === "creators") {
		assertExactKeys(value, [
			"nome_creator",
			"presentazione",
			"sport_principale",
			"tipologia_contenuti",
		], type);
		return {
			nome_creator: textValue(value.nome_creator, MAX_SHORT_TEXT, type),
			presentazione: textValue(value.presentazione, MAX_LONG_TEXT, type),
			sport_principale: baseSport(value.sport_principale, type),
			tipologia_contenuti: textValue(value.tipologia_contenuti, MAX_SHORT_TEXT, type),
		};
	}

	assertExactKeys(value, ["costo_partenza", "info_aggiuntive", "nome_organizzazione", "orari", "presentazione", "sede_principale", "servizi_inclusi", "sport_principale", "tipologie_sport"], type);
	const cost = value.costo_partenza;
	if (cost !== null && cost !== undefined && (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0 || cost > 99_999_999.99 || Math.round(cost * 100) !== cost * 100)) {
		fail("Il costo di partenza non è valido.", 3, type);
	}
	return {
		costo_partenza: typeof cost === "number" ? cost : null,
		info_aggiuntive: textValue(value.info_aggiuntive, MAX_LONG_TEXT, type),
		nome_organizzazione: textValue(value.nome_organizzazione, MAX_SHORT_TEXT, type),
		orari: openingHours(value.orari, type),
		presentazione: textValue(value.presentazione, MAX_LONG_TEXT, type),
		sede_principale: textValue(value.sede_principale, MAX_SHORT_TEXT, type),
		servizi_inclusi: textValue(value.servizi_inclusi, MAX_LONG_TEXT, type),
		sport_principale: baseSport(value.sport_principale, type),
		tipologie_sport: stringList(value.tipologie_sport, type),
	};
}

export interface NormalizedProfileEditorPayload {
	type: ProfileType;
	draft: Record<string, Json>;
	locations: Array<{regione: string; citta: string | null}>;
}

export function parseProfileEditorPayload(
	rawValue: unknown,
): NormalizedProfileEditorPayload {
	let serialized: string | undefined;
	try {
		serialized = JSON.stringify(rawValue);
	} catch {
		fail("I dati del profilo non sono validi.", 3);
	}

	if (
		typeof serialized !== "string"
		|| serialized.length === 0
		|| serialized.length > MAX_PAYLOAD_BYTES
		|| !isRecord(rawValue)
	) {
		fail("I dati del profilo sono mancanti o troppo grandi.", 3);
	}

	const rawType = rawValue.type;
	if (typeof rawType !== "string" || !isProfileType(rawType)) {
		fail("La tipologia di profilo non è valida.", 3);
	}
	assertExactKeys(rawValue, ["type", "draft", "locations"], rawType);

	return {
		type: rawType,
		draft: normalizeDraft(rawType, rawValue.draft),
		locations: locations(rawValue.locations, rawType),
	};
}

export function parseRegistrationPayload(rawValue: FormDataEntryValue | null): NormalizedRegistrationPayload {
	if (typeof rawValue !== "string" || rawValue.length === 0 || rawValue.length > MAX_PAYLOAD_BYTES) {
		fail("I dati della registrazione sono mancanti o troppo grandi.", 2);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(rawValue);
	} catch {
		fail("I dati della registrazione non sono validi.", 2);
	}
	if (!isRecord(parsed)) fail("I dati della registrazione non sono validi.", 2);
	if (Object.keys(parsed).some((key) => !["version", "selectedProfileTypes", "primaryProfileType", "profiles"].includes(key))) {
		fail("I dati della registrazione non sono validi.", 2);
	}
	if (parsed.version !== REGISTRATION_PAYLOAD_VERSION) {
		fail("Aggiorna la pagina e ripeti la registrazione.", 2);
	}

	if (!Array.isArray(parsed.selectedProfileTypes) || parsed.selectedProfileTypes.length === 0 || parsed.selectedProfileTypes.length > MAX_PROFILE_COUNT) {
		fail(`Seleziona da 1 a ${MAX_PROFILE_COUNT} tipologie di profilo.`, 2);
	}
	const selectedProfileTypes = parsed.selectedProfileTypes.map((value) => {
		if (typeof value !== "string" || !isProfileType(value)) fail("Una tipologia di profilo selezionata non è valida.", 2);
		return value;
	});
	if (new Set(selectedProfileTypes).size !== selectedProfileTypes.length) {
		fail("Le tipologie di profilo non possono essere duplicate.", 2);
	}
	const registrableTypes = selectedProfileTypes.filter(isRegistrableProfileType);
	if (registrableTypes.length === 0) {
		fail("Seleziona almeno un profilo attivabile subito.", 2);
	}
	if (typeof parsed.primaryProfileType !== "string" || !isProfileType(parsed.primaryProfileType) || isLimitedProfileType(parsed.primaryProfileType) || !selectedProfileTypes.includes(parsed.primaryProfileType)) {
		fail("Seleziona un profilo principale valido.", 2);
	}
	const primaryProfileType = parsed.primaryProfileType as RegistrableProfileType;

	if (!Array.isArray(parsed.profiles) || parsed.profiles.length !== registrableTypes.length) {
		fail("Completa i dati di tutti i profili selezionati.", 3, primaryProfileType);
	}
	const seenProfiles = new Set<RegistrableProfileType>();
	const profiles = parsed.profiles.map((entry): NormalizedRegistrationProfile => {
		if (!isRecord(entry)) fail("I dati di uno dei profili non sono validi.", 3, primaryProfileType);
		assertExactKeys(entry, ["type", "draft", "locations"], primaryProfileType);
		if (typeof entry.type !== "string" || !isProfileType(entry.type) || !isRegistrableProfileType(entry.type) || !registrableTypes.includes(entry.type) || seenProfiles.has(entry.type)) {
			fail("I dati di uno dei profili non corrispondono alla selezione.", 3, primaryProfileType);
		}
		seenProfiles.add(entry.type);
		return {
			type: entry.type,
			draft: normalizeDraft(entry.type, entry.draft),
			locations: locations(entry.locations, entry.type),
		};
	});

	return {
		version: REGISTRATION_PAYLOAD_VERSION,
		selectedProfileTypes,
		primaryProfileType,
		profiles,
	};
}

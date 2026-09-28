import {isCompleteValidBirthDate} from "@/features/profilo/birth-date";
import {isPlayerNationalityCode} from "@/features/profilo/player-nationalities";
import type {ProfileDrafts, ProfileLocations, ProfileType,} from "@/features/profilo/profile-model";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/announcementExtras";

export interface ProfileCompletion {
	completed: number;
	percentage: number;
	total: number;
}

function hasText(value: unknown) {
	return typeof value === "string" && value.trim() !== "";
}

function hasItems(value: unknown) {
	return Array.isArray(value) && value.some(hasText);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasPlayerRoles(value: unknown, key: "principali" | "specifici") {
	return isRecord(value) && hasItems(value[key]);
}

function hasBirthDate(draft: {
	anno_nascita: string | null;
	giorno_nascita: string | null;
	mese_nascita: string | null;
}) {
	return isCompleteValidBirthDate({
		day: draft.giorno_nascita,
		month: draft.mese_nascita,
		year: draft.anno_nascita,
	});
}

function hasExperiences(value: unknown) {
	if (!Array.isArray(value)) return false;
	return value.some((entry) => {
		if (!isRecord(entry)) return false;
		return ["titolo", "ente", "periodoDa", "periodoA", "descrizione"].some((key) => hasText(entry[key]))
			|| entry.stato === "in-corso"
			|| entry.stato === "conseguito";
	});
}

function completion(checks: readonly boolean[]): ProfileCompletion {
	const completed = checks.filter(Boolean).length;
	return {
		completed,
		percentage: Math.round((completed / checks.length) * 100),
		total: checks.length,
	};
}

export function getProfileCompletion(
	type: ProfileType,
	drafts: ProfileDrafts,
	locations: ProfileLocations,
): ProfileCompletion {
	const hasLocations = locations[type].some(({regione}) => hasText(regione));

	if (type === "giocatore") {
		const draft = drafts.giocatore;
		return completion([
			hasText(draft.nome),
			hasText(draft.cognome),
			hasText(draft.anno_nascita),
			hasText(draft.genere),
			hasItems(draft.tipologie_sport),
			hasText(draft.disponibilita) && draft.disponibilita !== "non-specificare",
			hasPlayerRoles(draft.ruoli_sport, "principali"),
			hasPlayerRoles(draft.ruoli_sport, "specifici"),
			hasText(draft.categoria_attuale),
			isPlayerNationalityCode(draft.nazionalita),
			hasText(draft.altezza),
			hasText(draft.peso),
			hasText(draft.piede_principale),
			hasText(draft.presentazione),
			hasExperiences(draft.storico_carriera),
			hasText(draft.video_highlights) && isLinkAnnuncioValid(draft.video_highlights),
			hasLocations,
		]);
	}

	if (type === "squadra") {
		const draft = drafts.squadra;
		return completion([
			hasText(draft.nome_societa),
			Array.isArray(draft.tipologie_sport) && draft.tipologie_sport.length === 1,
			hasText(draft.categoria_attuale),
			hasText(draft.presentazione),
			hasLocations,
		]);
	}

	if (type === "staff-sportivo") {
		const draft = drafts["staff-sportivo"];
		return completion([
			hasText(draft.nome),
			hasText(draft.cognome),
			hasBirthDate(draft),
			hasItems(draft.figure_professionali),
			hasText(draft.disponibilita) && draft.disponibilita !== "non-specificare",
			hasText(draft.presentazione),
			hasExperiences(draft.lista_esperienze),
			hasExperiences(draft.qualifiche_licenze) || hasExperiences(draft.storico_esperienze),
			hasLocations,
		]);
	}

	if (type === "professionisti-studi") {
		const draft = drafts["professionisti-studi"];
		return completion([
			hasText(draft.nome),
			hasText(draft.cognome),
			hasBirthDate(draft),
			hasItems(draft.figure_professionali),
			hasItems(draft.tipologie_sport),
			hasText(draft.disponibilita) && draft.disponibilita !== "non-specificare",
			hasText(draft.automunito),
			hasText(draft.specializzazioni),
			hasText(draft.presentazione),
			hasText(draft.presentazione_servizi),
			hasExperiences(draft.lista_esperienze),
			hasExperiences(draft.qualifiche_licenze),
			hasLocations,
		]);
	}

	if (type === "arbitro") {
		const draft = drafts.arbitro;
		return completion([
			hasText(draft.nome),
			hasText(draft.cognome),
			hasBirthDate(draft),
			hasText(draft.disponibilita) && draft.disponibilita !== "non-specificare",
			hasText(draft.presentazione),
			hasExperiences(draft.lista_esperienze),
			hasExperiences(draft.qualifiche_licenze),
			hasLocations,
		]);
	}

	if (type === "creators") {
		const draft = drafts.creators;
		return completion([
			hasText(draft.nome_creator),
			hasText(draft.tipologia_contenuti),
			hasText(draft.presentazione),
			hasLocations,
		]);
	}

	if (type === "torneo-evento") {
		const draft = drafts["torneo-evento"];
		return completion([
			hasText(draft.nome_organizzazione),
			hasItems(draft.tipologie_sport),
			hasText(draft.presentazione),
			hasLocations,
		]);
	}

	const draft = drafts["campi-impianti-sportivi"];
	return completion([
		hasText(draft.nome_organizzazione),
		hasItems(draft.tipologie_sport),
		locations["campi-impianti-sportivi"].length === 1 && hasText(locations["campi-impianti-sportivi"][0]?.citta),
		hasText(draft.indirizzo),
		hasText(draft.presentazione),
		hasText(draft.info_aggiuntive),
	]);
}

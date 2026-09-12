import {isCompleteValidBirthDate} from "@/features/profilo/birth-date";
import type {
	ProfileDrafts,
	ProfileLocations,
	ProfileType,
} from "@/features/profilo/profile-model";
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

function hasOpeningHours(value: unknown) {
	return Array.isArray(value) && value.some((entry) => (
		isRecord(entry) && entry.attivo === true && hasText(entry.giorno)
	));
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
			hasBirthDate(draft),
			hasItems(draft.tipologie_sport),
			hasText(draft.disponibilita) && draft.disponibilita !== "non-specificare",
			hasPlayerRoles(draft.ruoli_sport, "principali"),
			hasPlayerRoles(draft.ruoli_sport, "specifici"),
			hasItems(draft.categorie_ricercate),
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
			hasItems(draft.tipologie_sport),
			hasText(draft.sede_principale),
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
			hasExperiences(draft.storico_esperienze),
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
			hasExperiences(draft.storico_esperienze),
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
			hasExperiences(draft.storico_esperienze),
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
			hasText(draft.sede_principale),
			hasText(draft.presentazione),
			hasLocations,
		]);
	}

	const draft = drafts["campi-impianti-sportivi"];
	return completion([
		hasText(draft.nome_organizzazione),
		hasItems(draft.tipologie_sport),
		hasText(draft.sede_principale),
		typeof draft.costo_partenza === "number" && Number.isFinite(draft.costo_partenza),
		hasOpeningHours(draft.orari),
		hasText(draft.presentazione),
		hasText(draft.servizi_inclusi),
		hasText(draft.info_aggiuntive),
		hasLocations,
	]);
}

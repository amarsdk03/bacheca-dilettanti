import type {ProfileLocationDraft, ProfileType} from "@/features/profilo/profile-model";

export type ProfileValidationField =
	| "name"
	| "sports"
	| "mainRole"
	| "professionalRole"
	| "headquarters"
	| "locations";

export type ProfileValidationErrors = Partial<Record<ProfileValidationField, string>>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmpty(value: unknown) {
	return typeof value === "string" && value.trim() !== "";
}

function hasItems(value: unknown) {
	return Array.isArray(value) && value.length > 0;
}

function hasMainPlayerRole(value: unknown) {
	return isRecord(value) && hasItems(value.principali);
}

export function getProfileRequiredFieldErrors(
	type: ProfileType,
	draft: unknown,
	locations: readonly ProfileLocationDraft[],
): ProfileValidationErrors {
	const errors: ProfileValidationErrors = {};
	const values = isRecord(draft) ? draft : {};

	if (locations.length === 0) errors.locations = "Seleziona almeno una località per il profilo.";

	if (type === "giocatore") {
		if (!nonEmpty(values.nome)) errors.name = "Inserisci il nome del giocatore.";
		if (!hasItems(values.tipologie_sport)) errors.sports = "Seleziona almeno una tipologia di calcio.";
		if (!hasMainPlayerRole(values.ruoli_sport)) errors.mainRole = "Seleziona almeno un ruolo principale.";
	}
	if (type === "squadra") {
		if (!nonEmpty(values.nome_societa)) errors.name = "Inserisci il nome della società.";
		if (!hasItems(values.tipologie_sport)) errors.sports = "Seleziona almeno una tipologia di calcio.";
	}
	if (type === "staff-sportivo") {
		if (!nonEmpty(values.nome)) errors.name = "Inserisci il nome del membro dello staff.";
		if (!hasItems(values.figure_professionali)) errors.professionalRole = "Seleziona almeno una figura professionale.";
	}
	if (type === "arbitro" && !nonEmpty(values.nome)) {
		errors.name = "Inserisci il nome dell’arbitro.";
	}
	if (type === "torneo-evento") {
		if (!nonEmpty(values.nome_organizzazione)) errors.name = "Inserisci il nome dell’organizzazione.";
		if (!hasItems(values.tipologie_sport)) errors.sports = "Seleziona almeno una tipologia di calcio.";
	}
	if (type === "campi-impianti-sportivi") {
		if (!nonEmpty(values.nome_organizzazione)) errors.name = "Inserisci il nome dell’impianto o dell’organizzazione.";
		if (!nonEmpty(values.sede_principale)) errors.headquarters = "Inserisci la sede principale dell’impianto.";
		if (!hasItems(values.tipologie_sport)) errors.sports = "Seleziona almeno una tipologia di calcio.";
	}

	return errors;
}

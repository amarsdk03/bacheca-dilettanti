import type {ProfileLocationDraft, ProfileType} from "@/features/profilo/profile-model";
import {isPlayerNationalityCode} from "@/features/profilo/player-nationalities";
import {parseOptionalMoney} from "@/features/pubblica-annuncio/publish-field-validation";
import {getRequiredBirthDateError} from "@/features/profilo/birth-date";

export type ProfileValidationField =
	| "name"
	| "sports"
	| "mainRole"
	| "gender"
	| "nationality"
	| "birthYear"
	| "availability"
	| "professionalRole"
	| "headquarters"
	| "startingCost"
	| "locations"
	| "qualificationState";

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
	if (["giocatore", "staff-sportivo", "arbitro", "servizi-consulenze"].includes(type)) {
		const birthError = getRequiredBirthDateError({
			day: values.giorno_nascita as string | null | undefined,
			month: values.mese_nascita as string | null | undefined,
			year: values.anno_nascita as string | null | undefined,
		});
		if (birthError) errors.birthYear = birthError;
	}

	if (locations.length === 0) errors.locations = "Seleziona almeno una località per il profilo.";

	if (type === "giocatore") {
		if (!nonEmpty(values.nome)) errors.name = "Inserisci il nome del giocatore.";
		if (values.genere !== "Uomo" && values.genere !== "Donna") errors.gender = "Seleziona il genere.";
		if (values.disponibilita !== "svincolato" && values.disponibilita !== "sotto-contratto") errors.availability = "Seleziona la disponibilità.";
		if (!hasItems(values.tipologie_sport)) errors.sports = "Seleziona almeno una tipologia di calcio.";
		if (!hasMainPlayerRole(values.ruoli_sport)) errors.mainRole = "Seleziona almeno un ruolo principale.";
		if (nonEmpty(values.nazionalita) && !isPlayerNationalityCode(values.nazionalita as string)) errors.nationality = "La nazionalità salvata non è più disponibile. Selezionane un’altra o svuota il campo.";
	}
	if (type === "squadra") {
		if (!nonEmpty(values.nome_societa)) errors.name = "Inserisci il nome della società.";
		if (!Array.isArray(values.tipologie_sport) || values.tipologie_sport.length !== 1 || !nonEmpty(values.tipologie_sport[0])) errors.sports = "Seleziona una sola tipologia di calcio.";
	}
	if (type === "staff-sportivo") {
		if (!nonEmpty(values.nome)) errors.name = "Inserisci il nome del membro dello staff.";
		if (!hasItems(values.figure_professionali)) errors.professionalRole = "Seleziona almeno una figura professionale.";
		if (Array.isArray(values.qualifiche_licenze) && values.qualifiche_licenze.some((item) => !isRecord(item) || (item.stato !== "in-corso" && item.stato !== "conseguito"))) errors.qualificationState = "Seleziona lo stato di ogni qualifica o licenza.";
	}
	if (type === "servizi-consulenze" || type === "arbitro") {
		if (type === "arbitro" && !nonEmpty(values.nome)) errors.name = "Inserisci il nome dell’arbitro.";
		if (Array.isArray(values.qualifiche_licenze) && values.qualifiche_licenze.some((item) => !isRecord(item) || (item.stato !== "in-corso" && item.stato !== "conseguito"))) errors.qualificationState = "Seleziona lo stato di ogni qualifica o licenza.";
	}
	if (type === "creators" && !nonEmpty(values.nome_creator)) errors.name = "Inserisci il nome del creator o del progetto.";
	if (type === "torneo-evento") {
		if (!nonEmpty(values.nome_organizzazione)) errors.name = "Inserisci il nome dell’organizzazione.";
		if (!hasItems(values.tipologie_sport)) errors.sports = "Seleziona almeno una tipologia di calcio.";
	}
	if (type === "campi-impianti-sportivi") {
		if (!nonEmpty(values.nome_organizzazione)) errors.name = "Inserisci il nome del campo o della struttura.";
		if (!hasItems(values.tipologie_sport)) errors.sports = "Seleziona almeno una tipologia di campo.";
		if (locations.length !== 1 || !nonEmpty(locations[0]?.regione)) errors.locations = "Seleziona una sola regione per la sede.";
		else if (!nonEmpty(locations[0]?.citta)) errors.locations = "Inserisci la città o il comune della sede.";
		if (parseOptionalMoney(values.costo_partenza) === undefined) errors.startingCost = "Inserisci un importo valido con massimo due decimali.";
	}

	return errors;
}

import type {
	ProfileDraft,
	ProfileDrafts,
	ProfileLocationDraft,
	ProfileType,
} from "@/features/profilo/profile-model";
import {EMAIL_PATTERN} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export const PUBLISH_PAYLOAD_VERSION = 1 as const;

export const PUBLISHABLE_PROFILE_TYPES = [
	"giocatore",
	"squadra",
	"staff-sportivo",
	"arbitro",
	"torneo-evento",
	"campi-impianti-sportivi",
] as const satisfies readonly ProfileType[];

export type PublishableProfileType = typeof PUBLISHABLE_PROFILE_TYPES[number];

export const TEAM_ANNOUNCEMENT_SUBTYPES = [
	"cerca-giocatore",
	"cerca-staff",
	"cerca-partite-amichevoli",
	"cerca-sponsor",
] as const;

export type TeamAnnouncementSubtype = typeof TEAM_ANNOUNCEMENT_SUBTYPES[number];

export type DatabaseAnnouncementType =
	| "annuncio_giocatore"
	| "annuncio_squadra_cerca_giocatore"
	| "annuncio_squadra_cerca_staff"
	| "annuncio_squadra_cerca_partita"
	| "annuncio_squadra_cerca_sponsor"
	| "annuncio_staff_sportivo"
	| "annuncio_arbitro"
	| "annuncio_torneo_evento"
	| "annuncio_campo_impianto";

export interface AnnouncementContacts {
	email: string;
	phone: string;
}

export interface TournamentPrize {
	id: string;
	posto: string;
	titoloPremio: string;
}

export interface AnnouncementDetailsDrafts {
	giocatore: {
		descrizione_aggiuntiva: string;
	};
	squadraCercaGiocatore: {
		ruoli_principali: string[];
		ruoli_secondari: string[];
		annate_ricercate: string[];
		stagione: string;
		descrizione_aggiuntiva: string;
	};
	squadraCercaStaff: {
		figura_ricercata: string;
		settore: string;
		compenso_mensile: string;
		requisiti: string;
		periodo_dal: string;
		periodo_al: string;
		descrizione_aggiuntiva: string;
	};
	squadraCercaPartita: {
		categorie_avversario: string[];
		periodo_dal: string;
		periodo_al: string;
		orario_dalle: string;
		orario_alle: string;
		disponibilita_trasferta: string;
		descrizione_aggiuntiva: string;
	};
	squadraCercaSponsor: {
		categoria_settore: string;
		supporto_cercato: string;
		offerta_fornita: string;
		descrizione_aggiuntiva: string;
	};
	staffSportivo: {
		tipologie_sport: string[];
		categorie_ricercate: string[];
		disponibilita_spostamento: string;
		descrizione_aggiuntiva: string;
	};
	arbitro: {
		tipologie_sport: string[];
		categorie_ricercate: string[];
		automunito: string;
		disponibilita_spostamento: string;
		descrizione_aggiuntiva: string;
	};
	torneoEvento: {
		nome_evento: string;
		tipologie_sport: string[];
		modalita_iscrizione: string;
		annate_ammesse_da: string;
		annate_ammesse_a: string;
		numero_squadre: string;
		costo_partecipazione: string;
		tipo_partecipazione: string;
		lista_premi_trofei: TournamentPrize[];
		descrizione_aggiuntiva: string;
	};
	campoImpianto: {
		tipologie_sport: string[];
		orari: string;
		costo_partenza: string;
		servizi_inclusi: string;
		descrizione_aggiuntiva: string;
	};
}

export type AnnouncementDetailDraft = AnnouncementDetailsDrafts[keyof AnnouncementDetailsDrafts];

export interface AnonymousProfilePayload {
	type: PublishableProfileType;
	draft: ProfileDraft;
	locations: ProfileLocationDraft[];
}

export interface PublishAnnouncementPayload {
	version: typeof PUBLISH_PAYLOAD_VERSION;
	submissionId: string;
	profileType: PublishableProfileType;
	teamSubtype: TeamAnnouncementSubtype | null;
	anonymousProfile: AnonymousProfilePayload | null;
	announcement: {
		type: DatabaseAnnouncementType;
		detail: AnnouncementDetailDraft;
		locations: ProfileLocationDraft[];
		contacts: AnnouncementContacts;
	};
	consents: {
		dataConfirmed: boolean;
		termsAccepted: boolean;
		privacyAccepted: boolean;
	};
}

export interface PublishOtpActionInput {
	submissionId: string;
	email: string;
}

export type RequestPublishEmailOtpResult =
	| {status: "sent"; message: string}
	| {status: "already_registered"; message: string}
	| {status: "rate_limited"; message: string; retryAt?: string}
	| {status: "error"; message: string};

export interface VerifyPublishOtpActionInput extends PublishOtpActionInput {
	code: string;
}

export type VerifyPublishEmailOtpResult =
	| {status: "verified"; message: string}
	| {status: "already_registered"; message: string}
	| {status: "invalid"; message: string}
	| {status: "expired"; message: string}
	| {status: "rate_limited"; message: string}
	| {status: "error"; message: string};

export type ProfileValidationField =
	| "name"
	| "sports"
	| "mainRole"
	| "professionalRole"
	| "headquarters"
	| "locations";

export type ProfileValidationErrors = Partial<Record<ProfileValidationField, string>>;

export type AnnouncementValidationField =
	| "contacts"
	| "email"
	| "phone"
	| "locations"
	| "description"
	| "mainRoles"
	| "professionalRole"
	| "requirements"
	| "matchCategories"
	| "matchTimes"
	| "sponsorSector"
	| "sponsorSupport"
	| "sponsorOffer"
	| "sports"
	| "tournamentName"
	| "tournamentYears"
	| "tournamentPrizes"
	| "type";

export type AnnouncementValidationErrors = Partial<Record<AnnouncementValidationField, string>>;

export interface PublishProfileContext {
	profileId: string;
	enabledProfileTypes: PublishableProfileType[];
	drafts: ProfileDrafts;
	locations: Record<ProfileType, ProfileLocationDraft[]>;
}

export type PublishAnnouncementResult =
	| {
		status: "success";
		announcementId: string;
		moderationStatus: "in_revisione";
		idempotent: boolean;
	}
	| {
		status: "rate_limited";
		message: string;
		retryAt: string;
	}
	| {
		status: "error";
		message: string;
		step?: 1 | 2 | 3 | 4;
	};

export function isPublishableProfileType(value: string): value is PublishableProfileType {
	return (PUBLISHABLE_PROFILE_TYPES as readonly string[]).includes(value);
}

export function isTeamAnnouncementSubtype(value: string): value is TeamAnnouncementSubtype {
	return (TEAM_ANNOUNCEMENT_SUBTYPES as readonly string[]).includes(value);
}

export function getDatabaseAnnouncementType(
	profileType: PublishableProfileType,
	teamSubtype: TeamAnnouncementSubtype | null,
): DatabaseAnnouncementType | null {
	if (profileType === "giocatore") return "annuncio_giocatore";
	if (profileType === "staff-sportivo") return "annuncio_staff_sportivo";
	if (profileType === "arbitro") return "annuncio_arbitro";
	if (profileType === "torneo-evento") return "annuncio_torneo_evento";
	if (profileType === "campi-impianti-sportivi") return "annuncio_campo_impianto";
	if (teamSubtype === "cerca-giocatore") return "annuncio_squadra_cerca_giocatore";
	if (teamSubtype === "cerca-staff") return "annuncio_squadra_cerca_staff";
	if (teamSubtype === "cerca-partite-amichevoli") return "annuncio_squadra_cerca_partita";
	if (teamSubtype === "cerca-sponsor") return "annuncio_squadra_cerca_sponsor";
	return null;
}

export function createAnnouncementDetailsDrafts(): AnnouncementDetailsDrafts {
	return {
		giocatore: {descrizione_aggiuntiva: ""},
		squadraCercaGiocatore: {
			ruoli_principali: [],
			ruoli_secondari: [],
			annate_ricercate: [],
			stagione: "",
			descrizione_aggiuntiva: "",
		},
		squadraCercaStaff: {
			figura_ricercata: "",
			settore: "",
			compenso_mensile: "",
			requisiti: "",
			periodo_dal: "",
			periodo_al: "",
			descrizione_aggiuntiva: "",
		},
		squadraCercaPartita: {
			categorie_avversario: [],
			periodo_dal: "",
			periodo_al: "",
			orario_dalle: "",
			orario_alle: "",
			disponibilita_trasferta: "",
			descrizione_aggiuntiva: "",
		},
		squadraCercaSponsor: {
			categoria_settore: "",
			supporto_cercato: "",
			offerta_fornita: "",
			descrizione_aggiuntiva: "",
		},
		staffSportivo: {
			tipologie_sport: [],
			categorie_ricercate: [],
			disponibilita_spostamento: "",
			descrizione_aggiuntiva: "",
		},
		arbitro: {
			tipologie_sport: [],
			categorie_ricercate: [],
			automunito: "",
			disponibilita_spostamento: "",
			descrizione_aggiuntiva: "",
		},
		torneoEvento: {
			nome_evento: "",
			tipologie_sport: [],
			modalita_iscrizione: "",
			annate_ammesse_da: "",
			annate_ammesse_a: "",
			numero_squadre: "",
			costo_partecipazione: "",
			tipo_partecipazione: "squadra",
			lista_premi_trofei: [],
			descrizione_aggiuntiva: "",
		},
		campoImpianto: {
			tipologie_sport: [],
			orari: "",
			costo_partenza: "",
			servizi_inclusi: "",
			descrizione_aggiuntiva: "",
		},
	};
}

function nonEmpty(value: string | null | undefined) {
	return Boolean(value?.trim());
}

function hasItems(value: unknown): value is unknown[] {
	return Array.isArray(value) && value.length > 0;
}

function hasMainPlayerRole(value: unknown) {
	if (!value || Array.isArray(value) || typeof value !== "object") return false;
	return hasItems((value as {principali?: unknown}).principali);
}

export function getProfileValidationMessage(
	type: PublishableProfileType,
	drafts: ProfileDrafts,
	locations: Record<ProfileType, ProfileLocationDraft[]>,
): string | null {
	return Object.values(getProfileValidationErrors(type, drafts, locations))[0] ?? null;
}

export function getProfileValidationErrors(
	type: PublishableProfileType,
	drafts: ProfileDrafts,
	locations: Record<ProfileType, ProfileLocationDraft[]>,
): ProfileValidationErrors {
	const errors: ProfileValidationErrors = {};
	if (locations[type].length === 0) errors.locations = "Seleziona almeno una località per il profilo.";

	if (type === "giocatore") {
		const draft = drafts.giocatore;
		if (!nonEmpty(draft.nome)) errors.name = "Inserisci il nome del giocatore.";
		if (!hasItems(draft.tipologie_sport)) errors.sports = "Seleziona almeno una tipologia di calcio.";
		if (!hasMainPlayerRole(draft.ruoli_sport)) errors.mainRole = "Seleziona almeno un ruolo principale.";
	}
	if (type === "squadra") {
		const draft = drafts.squadra;
		if (!nonEmpty(draft.nome_societa)) errors.name = "Inserisci il nome della società.";
		if (!hasItems(draft.tipologie_sport)) errors.sports = "Seleziona almeno una tipologia di calcio.";
	}
	if (type === "staff-sportivo") {
		const draft = drafts["staff-sportivo"];
		if (!nonEmpty(draft.nome)) errors.name = "Inserisci il nome del membro dello staff.";
		if (!hasItems(draft.figure_professionali)) errors.professionalRole = "Seleziona almeno una figura professionale.";
	}
	if (type === "arbitro" && !nonEmpty(drafts.arbitro.nome)) {
		errors.name = "Inserisci il nome dell’arbitro.";
	}
	if (type === "torneo-evento") {
		const draft = drafts["torneo-evento"];
		if (!nonEmpty(draft.nome_organizzazione)) errors.name = "Inserisci il nome dell’organizzazione.";
		if (!hasItems(draft.tipologie_sport)) errors.sports = "Seleziona almeno una tipologia di calcio.";
	}
	if (type === "campi-impianti-sportivi") {
		const draft = drafts["campi-impianti-sportivi"];
		if (!nonEmpty(draft.nome_organizzazione)) errors.name = "Inserisci il nome dell’impianto o dell’organizzazione.";
		if (!nonEmpty(draft.sede_principale)) errors.headquarters = "Inserisci la sede principale dell’impianto.";
		if (!hasItems(draft.tipologie_sport)) errors.sports = "Seleziona almeno una tipologia di calcio.";
	}

	return errors;
}

export function getAnnouncementDetail(
	type: PublishableProfileType,
	teamSubtype: TeamAnnouncementSubtype | null,
	drafts: AnnouncementDetailsDrafts,
): AnnouncementDetailDraft | null {
	if (type === "giocatore") return drafts.giocatore;
	if (type === "staff-sportivo") return drafts.staffSportivo;
	if (type === "arbitro") return drafts.arbitro;
	if (type === "torneo-evento") return drafts.torneoEvento;
	if (type === "campi-impianti-sportivi") return drafts.campoImpianto;
	if (teamSubtype === "cerca-giocatore") return drafts.squadraCercaGiocatore;
	if (teamSubtype === "cerca-staff") return drafts.squadraCercaStaff;
	if (teamSubtype === "cerca-partite-amichevoli") return drafts.squadraCercaPartita;
	if (teamSubtype === "cerca-sponsor") return drafts.squadraCercaSponsor;
	return null;
}

export function getAnnouncementValidationMessage(
	type: PublishableProfileType,
	teamSubtype: TeamAnnouncementSubtype | null,
	drafts: AnnouncementDetailsDrafts,
	locations: ProfileLocationDraft[],
	contacts: AnnouncementContacts,
): string | null {
	return Object.values(getAnnouncementValidationErrors(type, teamSubtype, drafts, locations, contacts))[0] ?? null;
}

export function getAnnouncementValidationErrors(
	type: PublishableProfileType,
	teamSubtype: TeamAnnouncementSubtype | null,
	drafts: AnnouncementDetailsDrafts,
	locations: ProfileLocationDraft[],
	contacts: AnnouncementContacts,
): AnnouncementValidationErrors {
	const errors: AnnouncementValidationErrors = {};
	const email = contacts.email.trim();
	const phone = contacts.phone.trim();
	if (!email && !phone) errors.contacts = "Inserisci almeno un contatto tra email e telefono.";
	if (email && !EMAIL_PATTERN.test(email)) errors.email = "Inserisci un indirizzo email valido.";
	if (phone && phone.replace(/\D/g, "").length < 6) errors.phone = "Inserisci un numero di telefono valido.";
	if (locations.length === 0) errors.locations = "Seleziona almeno una località per l’annuncio.";

	const detail = getAnnouncementDetail(type, teamSubtype, drafts);
	if (!detail) errors.type = "La tipologia di annuncio non è valida.";

	if (type === "giocatore" && !nonEmpty(drafts.giocatore.descrizione_aggiuntiva)) {
		errors.description = "Inserisci una descrizione dell’annuncio.";
	}
	if (type === "squadra" && teamSubtype === "cerca-giocatore") {
		if (drafts.squadraCercaGiocatore.ruoli_principali.length === 0) errors.mainRoles = "Seleziona almeno un ruolo cercato.";
		if (!nonEmpty(drafts.squadraCercaGiocatore.descrizione_aggiuntiva)) errors.description = "Inserisci una descrizione della ricerca.";
	}
	if (type === "squadra" && teamSubtype === "cerca-staff") {
		if (!nonEmpty(drafts.squadraCercaStaff.figura_ricercata)) errors.professionalRole = "Inserisci la figura professionale cercata.";
		if (!nonEmpty(drafts.squadraCercaStaff.requisiti)) errors.requirements = "Inserisci i requisiti richiesti.";
	}
	if (type === "squadra" && teamSubtype === "cerca-partite-amichevoli") {
		const draft = drafts.squadraCercaPartita;
		if (draft.categorie_avversario.length === 0) errors.matchCategories = "Seleziona almeno una categoria avversaria.";
		if (Boolean(draft.orario_dalle) !== Boolean(draft.orario_alle)) errors.matchTimes = "Completa entrambi gli orari indicativi.";
	}
	if (type === "squadra" && teamSubtype === "cerca-sponsor") {
		const draft = drafts.squadraCercaSponsor;
		if (!nonEmpty(draft.categoria_settore)) errors.sponsorSector = "Inserisci la categoria o il settore dello sponsor.";
		if (!nonEmpty(draft.supporto_cercato)) errors.sponsorSupport = "Descrivi il supporto cercato.";
		if (!nonEmpty(draft.offerta_fornita)) errors.sponsorOffer = "Descrivi cosa offre la società.";
	}
	if (type === "staff-sportivo") {
		const draft = drafts.staffSportivo;
		if (draft.tipologie_sport.length === 0) errors.sports = "Seleziona almeno una tipologia di calcio.";
		if (!nonEmpty(draft.descrizione_aggiuntiva)) errors.description = "Inserisci una descrizione dell’annuncio.";
	}
	if (type === "arbitro") {
		const draft = drafts.arbitro;
		if (draft.tipologie_sport.length === 0) errors.sports = "Seleziona almeno una tipologia di calcio.";
		if (!nonEmpty(draft.descrizione_aggiuntiva)) errors.description = "Inserisci una descrizione dell’annuncio.";
	}
	if (type === "torneo-evento") {
		const draft = drafts.torneoEvento;
		if (!nonEmpty(draft.nome_evento)) errors.tournamentName = "Inserisci il nome del torneo o evento.";
		if (draft.tipologie_sport.length === 0) errors.sports = "Seleziona almeno una tipologia di calcio.";
		if (!nonEmpty(draft.descrizione_aggiuntiva)) errors.description = "Inserisci una descrizione dell’evento.";
		if (draft.annate_ammesse_da && draft.annate_ammesse_a && Number(draft.annate_ammesse_da) > Number(draft.annate_ammesse_a)) {
			errors.tournamentYears = "L’annata iniziale non può essere successiva a quella finale.";
		}
		if (draft.lista_premi_trofei.some((prize) => !nonEmpty(prize.titoloPremio))) errors.tournamentPrizes = "Completa tutti i premi inseriti.";
	}
	if (type === "campi-impianti-sportivi") {
		const draft = drafts.campoImpianto;
		if (draft.tipologie_sport.length === 0) errors.sports = "Seleziona almeno una tipologia di calcio.";
		if (!nonEmpty(draft.descrizione_aggiuntiva)) errors.description = "Inserisci una descrizione dell’impianto.";
	}

	return errors;
}

export function cloneProfileDrafts(drafts: ProfileDrafts): ProfileDrafts {
	return structuredClone(drafts);
}

export function cloneProfileLocations(
	locations: Record<ProfileType, ProfileLocationDraft[]>,
): Record<ProfileType, ProfileLocationDraft[]> {
	return structuredClone(locations);
}

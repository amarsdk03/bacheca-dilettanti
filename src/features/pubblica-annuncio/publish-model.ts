import type {ProfileDraft, ProfileDrafts, ProfileLocationDraft, ProfileType,} from "@/features/profilo/profile-model";
import type {ProfileSocialLinks, ProfileSocialLinksByType,} from "@/features/profilo/profile-social-links";
import {getProfileRequiredFieldErrors, type ProfileValidationErrors,} from "@/features/profilo/profile-required-fields";
import {
	type FacilityOpeningHour,
	isValidIsoDate,
	isValidPhone,
	isValidTime,
	normalizeFacilityOpeningHours,
	parseOptionalMoney
} from "@/features/pubblica-annuncio/publish-field-validation";
import {
	ANNATE_OPTIONS,
	EMAIL_PATTERN,
	FIGURA_PROFESSIONALE_OPTIONS
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {isLinkAnnuncioValid} from "@/features/pubblica-annuncio/types/announcementExtras";
import {isStaffCategory} from "@/features/pubblica-annuncio/types/staff-category-catalog";
import {ANY_CATEGORY} from "@/features/pubblica-annuncio/types/category-catalog";
import {TIPOLOGIA_CALCIO_OPTIONS} from "@/features/pubblica-annuncio/types/tipologie-calcio";

export const PUBLISH_PAYLOAD_VERSION = 4 as const;

export const PUBLISHABLE_PROFILE_TYPES = [
	"giocatore",
	"squadra",
	"staff-sportivo",
	"arbitro",
	"torneo-evento",
	"campi-impianti-sportivi",
	"servizi-consulenze",
	"creators",
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
	| "annuncio_servizi_consulenze"
	| "annuncio_creators"
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
		categorie_ricercate: string[];
		descrizione_aggiuntiva: string;
	};
	squadraCercaGiocatore: {
		ruoli_principali: string[];
		ruoli_secondari: string[];
		annata_da: string;
		annata_a: string;
		stagione: string;
		descrizione_aggiuntiva: string;
	};
	squadraCercaStaff: {
		figure_ricercate: string[];
		settore: string;
		compenso_mensile: string;
		requisiti: string;
		stagione: string;
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
		automunito: string;
		disponibilita_spostamento: string;
		descrizione_aggiuntiva: string;
	};
	creator: {
		titolo_post: string;
		descrizione_post: string;
	};
	serviziConsulenze: {
		figura_professionale: string[];
		specializzazione: string;
		presentazione_servizi: string;
		tipologie_sport: string[];
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
		orari: FacilityOpeningHour[];
		costo_partenza: string;
		servizi_inclusi: string;
		indirizzo: string;
		descrizione_aggiuntiva: string;
	};
}

export type AnnouncementDetailDraft = AnnouncementDetailsDrafts[keyof AnnouncementDetailsDrafts];

export interface AnonymousProfilePayload {
	type: PublishableProfileType;
	draft: ProfileDraft;
	locations: ProfileLocationDraft[];
	socialLinks: ProfileSocialLinks;
}

export type RegisteredProfileUpdatePayload = AnonymousProfilePayload;

export interface AnnouncementExtras {
	genericLink: string;
}

export const PUBLISH_VISIBILITIES = ["gratuito"] as const;
export type PublishVisibility = typeof PUBLISH_VISIBILITIES[number];

export function isPublishVisibility(value: unknown): value is PublishVisibility {
	return typeof value === "string" && (PUBLISH_VISIBILITIES as readonly string[]).includes(value);
}

export interface PublishAnnouncementPayload {
	version: typeof PUBLISH_PAYLOAD_VERSION;
	submissionId: string;
	visibility: PublishVisibility;
	profileType: PublishableProfileType;
	teamSubtype: TeamAnnouncementSubtype | null;
	anonymousProfile: AnonymousProfilePayload | null;
	profileUpdate: RegisteredProfileUpdatePayload | null;
	announcement: {
		type: DatabaseAnnouncementType;
		title: string;
		detail: AnnouncementDetailDraft;
		locations: ProfileLocationDraft[];
		contacts: AnnouncementContacts;
		extras: AnnouncementExtras;
	};
	consents: {
		dataConfirmed: boolean;
		termsAccepted: boolean;
		privacyAccepted: boolean;
		newsletterSubscribed: boolean;
	};
}

export interface PublishOtpActionInput {
	submissionId: string;
	email: string;
}

export type RequestPublishEmailOtpResult =
	| {status: "sent"; message: string; retryAt: string}
	| {status: "already_registered"; message: string}
	| {status: "rate_limited"; limit: "cooldown" | "daily"; message: string; retryAt: string}
	| {status: "rate_limited"; limit: "provider"; message: string; retryAt?: string}
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

export type {ProfileValidationErrors} from "@/features/profilo/profile-required-fields";

export type AnnouncementValidationField =
	| "contacts"
	| "email"
	| "phone"
	| "locations"
	| "description"
	| "title"
	| "mainRoles"
	| "yearFrom"
	| "yearTo"
	| "professionalRole"
	| "servicePresentation"
	| "requirements"
	| "matchCategories"
	| "matchTimes"
	| "matchTimeFrom"
	| "matchTimeTo"
	| "periodFrom"
	| "periodTo"
	| "monthlyCompensation"
	| "tournamentTeams"
	| "tournamentCost"
	| "facilityCost"
	| "facilityAddress"
	| "facilityHours"
	| "genericLink"
	| "sponsorSector"
	| "sponsorOffer"
	| "sports"
	| "staffCategories"
	| "staffTravel"
	| "tournamentName"
	| "tournamentYears"
	| "tournamentPrizes"
	| "type";

export type AnnouncementValidationErrors = Partial<Record<AnnouncementValidationField, string>>;

export interface PublishProfileContext {
	profileId: string;
	enabledProfileTypes: ProfileType[];
	authorizedRestrictedProfileTypes: Array<"servizi-consulenze" | "creators">;
	drafts: ProfileDrafts;
	locations: Record<ProfileType, ProfileLocationDraft[]>;
	socialLinks: ProfileSocialLinksByType;
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
	if (profileType === "creators") return "annuncio_creators";
	if (profileType === "servizi-consulenze") return "annuncio_servizi_consulenze";
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
		giocatore: {categorie_ricercate: [], descrizione_aggiuntiva: ""},
		squadraCercaGiocatore: {
			ruoli_principali: [],
			ruoli_secondari: [],
			annata_da: "",
			annata_a: "",
			stagione: "",
			descrizione_aggiuntiva: "",
		},
		squadraCercaStaff: {
			figure_ricercate: [],
			settore: "",
			compenso_mensile: "",
			requisiti: "",
			stagione: "",
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
			automunito: "",
			disponibilita_spostamento: "",
			descrizione_aggiuntiva: "",
		},
		creator: {
			titolo_post: "",
			descrizione_post: "",
		},
		serviziConsulenze: {
			figura_professionale: [],
			specializzazione: "",
			presentazione_servizi: "",
			tipologie_sport: [],
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
			orari: [],
			costo_partenza: "",
			servizi_inclusi: "",
			indirizzo: "",
			descrizione_aggiuntiva: "",
		},
	};
}

function nonEmpty(value: string | null | undefined) {
	return Boolean(value?.trim());
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
	return getProfileRequiredFieldErrors(type, drafts[type], locations[type]);
}

export function getAnnouncementDetail(
	type: PublishableProfileType,
	teamSubtype: TeamAnnouncementSubtype | null,
	drafts: AnnouncementDetailsDrafts,
): AnnouncementDetailDraft | null {
	if (type === "giocatore") return drafts.giocatore;
	if (type === "staff-sportivo") return drafts.staffSportivo;
	if (type === "arbitro") return drafts.arbitro;
	if (type === "creators") return drafts.creator;
	if (type === "servizi-consulenze") return drafts.serviziConsulenze;
	if (type === "torneo-evento") return drafts.torneoEvento;
	if (type === "campi-impianti-sportivi") return {
		...drafts.campoImpianto,
		orari: normalizeFacilityOpeningHours(drafts.campoImpianto.orari) ?? drafts.campoImpianto.orari,
	};
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
	extras: AnnouncementExtras = {genericLink: ""},
	title = "",
): string | null {
	return Object.values(getAnnouncementValidationErrors(type, teamSubtype, drafts, locations, contacts, extras, title))[0] ?? null;
}

export function getAnnouncementValidationErrors(
	type: PublishableProfileType,
	teamSubtype: TeamAnnouncementSubtype | null,
	drafts: AnnouncementDetailsDrafts,
	locations: ProfileLocationDraft[],
	contacts: AnnouncementContacts,
	extras: AnnouncementExtras = {genericLink: ""},
	title = "",
): AnnouncementValidationErrors {
	const errors: AnnouncementValidationErrors = {};
	if (title.trim().length > 50) errors.title = "Il titolo può contenere al massimo 50 caratteri.";
	const email = contacts.email.trim();
	const phone = contacts.phone.trim();
	if (!email && !phone) errors.contacts = "Inserisci almeno un contatto tra email e telefono.";
	if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) errors.email = "Inserisci un indirizzo email valido.";
	if (phone && !isValidPhone(phone)) errors.phone = "Inserisci un numero di telefono valido.";
	if (!(type === "squadra" && teamSubtype === "cerca-sponsor") && locations.length === 0) errors.locations = "Seleziona almeno una località per l’annuncio.";
	if (!isLinkAnnuncioValid(extras.genericLink)) errors.genericLink = "Inserisci un link completo che inizi con http:// o https://.";

	const detail = getAnnouncementDetail(type, teamSubtype, drafts);
	if (!detail) errors.type = "La tipologia di annuncio non è valida.";

	if (type === "giocatore" && !nonEmpty(drafts.giocatore.descrizione_aggiuntiva)) {
		errors.description = "Inserisci una descrizione dell’annuncio.";
	}
	if (type === "servizi-consulenze") {
		if (drafts.serviziConsulenze.figura_professionale.length === 0) errors.professionalRole = "Seleziona almeno una figura professionale.";
		if (!nonEmpty(drafts.serviziConsulenze.presentazione_servizi)) errors.servicePresentation = "Descrivi il servizio offerto.";
	}
	if (type === "squadra" && teamSubtype === "cerca-giocatore") {
		const draft = drafts.squadraCercaGiocatore;
		if (draft.ruoli_principali.length === 0) errors.mainRoles = "Seleziona almeno un ruolo cercato.";
		if (draft.annata_da && !ANNATE_OPTIONS.includes(draft.annata_da)) errors.yearFrom = "Seleziona un'annata iniziale valida.";
		if (draft.annata_da && !draft.annata_a) errors.yearTo = "Seleziona l'annata finale.";
		if (!draft.annata_da && draft.annata_a) errors.yearTo = "Seleziona prima l'annata iniziale.";
		if (draft.annata_a && !ANNATE_OPTIONS.includes(draft.annata_a)) errors.yearTo = "Seleziona un'annata finale valida.";
		if (!errors.yearFrom && !errors.yearTo && draft.annata_da && draft.annata_a && Number(draft.annata_a) < Number(draft.annata_da)) errors.yearTo = "L'annata finale non può precedere quella iniziale.";
		if (!nonEmpty(draft.descrizione_aggiuntiva)) errors.description = "Inserisci una descrizione della ricerca.";
	}
	if (type === "squadra" && teamSubtype === "cerca-staff") {
		const draft = drafts.squadraCercaStaff;
		if (draft.figure_ricercate.length === 0) errors.professionalRole = "Seleziona almeno una figura cercata.";
		else if (draft.figure_ricercate.length > 32 || draft.figure_ricercate.some((figure) => !FIGURA_PROFESSIONALE_OPTIONS.includes(figure as typeof FIGURA_PROFESSIONALE_OPTIONS[number]))) errors.professionalRole = "Seleziona figure valide dal catalogo.";
		if (!nonEmpty(draft.requisiti)) errors.requirements = "Inserisci i requisiti richiesti.";
		if (parseOptionalMoney(draft.compenso_mensile) === undefined) errors.monthlyCompensation = "Inserisci un importo valido con massimo due decimali.";
	}
	if (type === "squadra" && teamSubtype === "cerca-partite-amichevoli") {
		const draft = drafts.squadraCercaPartita;
		if (draft.categorie_avversario.length === 0) errors.matchCategories = "Seleziona almeno un livello avversario.";
		if (draft.periodo_dal && !isValidIsoDate(draft.periodo_dal)) errors.periodFrom = "Inserisci una data iniziale valida.";
		if (draft.periodo_al && !isValidIsoDate(draft.periodo_al)) errors.periodTo = "Inserisci una data finale valida.";
		if (!errors.periodFrom && !errors.periodTo && draft.periodo_dal && draft.periodo_al && draft.periodo_dal > draft.periodo_al) errors.periodTo = "La data finale non può precedere quella iniziale.";
		if (Boolean(draft.orario_dalle) !== Boolean(draft.orario_alle)) errors.matchTimes = "Completa entrambi gli orari indicativi.";
		if (draft.orario_dalle && !isValidTime(draft.orario_dalle)) errors.matchTimeFrom = "Inserisci un orario valido.";
		if (draft.orario_alle && !isValidTime(draft.orario_alle)) errors.matchTimeTo = "Inserisci un orario valido.";
	}
	if (type === "squadra" && teamSubtype === "cerca-sponsor") {
		const draft = drafts.squadraCercaSponsor;
		if (!nonEmpty(draft.categoria_settore)) errors.sponsorSector = "Inserisci il settore dello sponsor.";
		if (!nonEmpty(draft.offerta_fornita)) errors.sponsorOffer = "Descrivi la visibilità offerta.";
	}
	if (type === "staff-sportivo") {
		const draft = drafts.staffSportivo;
		if (draft.tipologie_sport.length === 0) errors.sports = "Seleziona almeno una tipologia di calcio.";
		if (draft.categorie_ricercate.length > 32 || draft.categorie_ricercate.some((category) => category !== ANY_CATEGORY && !isStaffCategory(category))) errors.staffCategories = "Seleziona categorie valide dal catalogo Staff.";
		if (draft.disponibilita_spostamento && !["Si", "No", "Da valutare"].includes(draft.disponibilita_spostamento)) errors.staffTravel = "Seleziona una disponibilità agli spostamenti valida.";
		if (!nonEmpty(draft.descrizione_aggiuntiva)) errors.description = "Inserisci una descrizione dell’annuncio.";
	}
	if (type === "arbitro") {
		const draft = drafts.arbitro;
		if (draft.tipologie_sport.length === 0) errors.sports = "Seleziona almeno una tipologia di calcio.";
		if (!nonEmpty(draft.descrizione_aggiuntiva)) errors.description = "Inserisci una descrizione dell’annuncio.";
	}
	if (type === "torneo-evento") {
		const draft = drafts.torneoEvento;
		const currentYear = new Date().getFullYear();
		const validYear = (value: string) => !value || (/^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= currentYear);
		if (!nonEmpty(draft.nome_evento)) errors.tournamentName = "Inserisci il nome del torneo o evento.";
		if (draft.tipologie_sport.length !== 1 || !TIPOLOGIA_CALCIO_OPTIONS.includes(draft.tipologie_sport[0] as typeof TIPOLOGIA_CALCIO_OPTIONS[number])) errors.sports = "Seleziona una tipologia di calcio valida.";
		if (!nonEmpty(draft.descrizione_aggiuntiva)) errors.description = "Inserisci una descrizione dell’evento.";
		if (!validYear(draft.annate_ammesse_da) || !validYear(draft.annate_ammesse_a) || (draft.annate_ammesse_da && draft.annate_ammesse_a && Number(draft.annate_ammesse_da) > Number(draft.annate_ammesse_a))) errors.tournamentYears = "L’intervallo delle annate non è valido.";
		if (draft.numero_squadre && (!/^\d+$/.test(draft.numero_squadre) || Number(draft.numero_squadre) < 1 || Number(draft.numero_squadre) > 100_000)) errors.tournamentTeams = "Inserisci un numero di squadre valido.";
		if (parseOptionalMoney(draft.costo_partecipazione) === undefined) errors.tournamentCost = "Inserisci un importo valido con massimo due decimali.";
		if (draft.lista_premi_trofei.some((prize) => !nonEmpty(prize.titoloPremio))) errors.tournamentPrizes = "Completa tutti i premi inseriti.";
	}
	if (type === "campi-impianti-sportivi") {
		const draft = drafts.campoImpianto;
		if (draft.tipologie_sport.length !== 1 || !TIPOLOGIA_CALCIO_OPTIONS.includes(draft.tipologie_sport[0] as typeof TIPOLOGIA_CALCIO_OPTIONS[number])) errors.sports = "Seleziona una tipologia di campo valida.";
		if (locations.length !== 1 || !nonEmpty(locations[0]?.regione) || !nonEmpty(locations[0]?.citta)) errors.locations = "Seleziona una Regione e inserisci la Città o il comune dell’impianto.";
		if (!nonEmpty(draft.indirizzo)) errors.facilityAddress = "Inserisci l’indirizzo dell’impianto.";
		if (parseOptionalMoney(draft.costo_partenza) === undefined) errors.facilityCost = "Inserisci un importo valido con massimo due decimali.";
		if (!normalizeFacilityOpeningHours(draft.orari)) errors.facilityHours = "Controlla gli orari selezionati.";
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

export function cloneProfileSocialLinks(
	socialLinks: ProfileSocialLinksByType,
): ProfileSocialLinksByType {
	return structuredClone(socialLinks);
}

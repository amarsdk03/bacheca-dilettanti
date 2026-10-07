import type {LucideIcon} from "lucide-react";
import {
	AwardIcon,
	BriefcaseBusinessIcon,
	ClipboardListIcon,
	SearchIcon,
	SparklesIcon,
	TrafficConeIcon,
	TrophyIcon,
	UserIcon,
} from "lucide-react";

import type {TablesInsert} from "@/server/supabase";

export const PROFILE_TYPES = [
	"giocatore",
	"squadra",
	"staff-sportivo",
	"arbitro",
	"torneo-evento",
	"campi-impianti-sportivi",
	"servizi-consulenze",
	"creators",
] as const;

export type ProfileType = typeof PROFILE_TYPES[number];

export const COMING_SOON_PROFILE_TYPES = [] as const satisfies readonly ProfileType[];

export type ComingSoonProfileType = typeof COMING_SOON_PROFILE_TYPES[number];

export function isComingSoonProfileType(
	type: ProfileType,
): type is ComingSoonProfileType {
	return (COMING_SOON_PROFILE_TYPES as readonly ProfileType[]).includes(type);
}

type ProfileTable =
	| "profilo_arbitro"
	| "profilo_campi_impianti"
	| "profilo_creator"
	| "profilo_giocatore"
	| "profilo_servizi_consulenze"
	| "profilo_squadra"
	| "profilo_staff_sportivo"
	| "profilo_torneo_evento";

type EditableProfileDraft<Table extends ProfileTable> = Omit<
	Required<TablesInsert<Table>>,
	"id" | "nascosto" | "uuid_profilo"
>;

export type ProfileDrafts = {
	giocatore: EditableProfileDraft<"profilo_giocatore"> & {
		video_highlights: string;
	};
	squadra: Omit<EditableProfileDraft<"profilo_squadra">, "sede_principale">;
	"staff-sportivo": EditableProfileDraft<"profilo_staff_sportivo">;
	"servizi-consulenze": Omit<EditableProfileDraft<"profilo_servizi_consulenze">, "anno_nascita" | "automunito" | "cognome" | "figure_professionali" | "giorno_nascita" | "mese_nascita" | "storico_esperienze" | "lista_esperienze" | "qualifiche_licenze">;
	arbitro: EditableProfileDraft<"profilo_arbitro"> & {
		lista_esperienze: TablesInsert<"profilo_arbitro">["storico_esperienze"];
		qualifiche_licenze: TablesInsert<"profilo_arbitro">["storico_esperienze"];
	};
	creators: EditableProfileDraft<"profilo_creator">;
	"torneo-evento": Omit<EditableProfileDraft<"profilo_torneo_evento">, "sede_principale">;
	"campi-impianti-sportivi": EditableProfileDraft<"profilo_campi_impianti">;
};

export type ProfileDraft<Type extends ProfileType = ProfileType> =
	ProfileDrafts[Type];

export type ProfileLocationDraft = Required<
	Pick<TablesInsert<"localita_profilo">, "regione" | "citta">
>;

export type ProfileLocations = Record<ProfileType, ProfileLocationDraft[]>;

export type ProfileDraftUpdater = <
	Type extends ProfileType,
	Field extends keyof ProfileDrafts[Type],
>(type: Type, field: Field, value: ProfileDrafts[Type][Field]) => void;

interface ProfileOption {
	value: ProfileType;
	label: string;
	description: string;
	icon: LucideIcon;
	colore?: string;
}

export const MAX_PROFILE_COUNT = 5;

export const RESTRICTED_PROFILE_TYPES = ["servizi-consulenze", "creators"] as const satisfies readonly ProfileType[];

export function isRestrictedProfileType(type: ProfileType): type is typeof RESTRICTED_PROFILE_TYPES[number] {
	return (RESTRICTED_PROFILE_TYPES as readonly ProfileType[]).includes(type);
}

export const PROFILE_DIRECTORY_UNLOCK_PROFILE_COUNT = 20;

export const PROFILI_LIMITATI = true;

export const LIMITED_PROFILE_TYPES = [] as const satisfies readonly ProfileType[];

export type LimitedProfileType = typeof LIMITED_PROFILE_TYPES[number];

export function isLimitedProfileType(
	type: ProfileType,
): type is LimitedProfileType {
	return PROFILI_LIMITATI
		&& (LIMITED_PROFILE_TYPES as readonly ProfileType[]).includes(type);
}

export const PROFILE_OPTIONS: readonly ProfileOption[] = [
	{
		value: "giocatore",
		label: "Giocatore",
		description: "Crea il tuo profilo e fatti scoprire da società sportive e osservatori",
		icon: UserIcon,
		colore: "#2F6BFF",
	},
	{
		value: "squadra",
		label: "Squadra",
		description: "Trova giocatori, staff, partite o sponsor per la tua squadra",
		icon: AwardIcon,
		colore: "#2FAE66",
	},
	{
		value: "staff-sportivo",
		label: "Staff sportivo",
		description: "Valorizza il tuo ruolo, esplora i profili e trova nuove opportunità nel calcio",
		icon: SearchIcon,
		colore: "#F28A2E",
	},
	{
		value: "arbitro",
		label: "Arbitro",
		description: "Renditi disponibile per arbitrare o gestire partite ed eventi sportivi",
		icon: ClipboardListIcon,
		colore: "#D4B21F",
	},
	{
		value: "torneo-evento",
		label: "Torneo / Evento",
		description: "Organizza e promuovi il tuo torneo, evento o manifestazione sportiva",
		icon: TrophyIcon,
		colore: "#111111",
	},
	{
		value: "campi-impianti-sportivi",
		label: "Campi e impianti",
		description: "Pubblicizza i tuoi campi o impianti sportivi",
		icon: TrafficConeIcon,
		colore: "#5B8F63",
	},
	{
		value: "servizi-consulenze",
		label: "Servizi e consulenze",
		description: "Servizi e consulenze per ogni esigenza del mondo del calcio, offerti da professionisti, studi e aziende specializzati nel settore",
		icon: BriefcaseBusinessIcon,
		colore: "#D4B21F",
	},
	{
		value: "creators",
		label: "Creators",
		description: "Condividi il tuo profilo e i tuoi contenuti con la nostra community",
		icon: SparklesIcon,
		colore: "#E53935",
	},
];

export function isProfileType(value: string): value is ProfileType {
	return (PROFILE_TYPES as readonly string[]).includes(value);
}

export function createProfileDrafts(): ProfileDrafts {
	return {
		giocatore: {
			nominativo_anonimo: false,
			altezza: "",
			anno_nascita: "",
			categoria_attuale: "",
			categorie_ricercate: [],
			cognome: "",
			disponibilita: "",
			genere: "",
			giorno_nascita: "",
			mese_nascita: "",
			nome: "",
			nazionalita: "",
			peso: "",
			piede_principale: "",
			presentazione: "",
			ruoli_sport: {principali: [], specifici: []},
			sport_principale: "Calcio",
			storico_carriera: [],
			tipologie_sport: [],
			video_highlights: "",
			richiede_caricamento_highlights: false,
		},
		squadra: {
			nominativo_anonimo: false,
			nome_societa: "",
			presentazione: "",
			categoria_attuale: "",
			sport_principale: "Calcio",
			tipologie_sport: [],
		},
		"staff-sportivo": {
			nominativo_anonimo: false,
			anno_nascita: "",
			cognome: "",
			disponibilita: "non-specificare",
			disponibile_remoto: false,
			figure_professionali: [],
			giorno_nascita: "",
			mese_nascita: "",
			nome: "",
			presentazione: "",
			sport_principale: "Calcio",
			storico_esperienze: [],
			tipologie_sport: [],
			lista_esperienze: [],
			qualifiche_licenze: [],
		},
		"servizi-consulenze": {
			disponibilita: "non-specificare",
			nome: "",
			sede_professionista: "",
			contatto_email: "",
			contatto_telefono: "",
			presentazione: "",
			presentazione_servizi: "",
			specializzazioni: "",
			sport_principale: "Calcio",
			tipologie_sport: [],
		},
		arbitro: {
			nominativo_anonimo: false,
			anno_nascita: "",
			cognome: "",
			disponibilita: "non-specificare",
			giorno_nascita: "",
			mese_nascita: "",
			nome: "",
			presentazione: "",
			sport_principale: "Calcio",
			storico_esperienze: [],
			tipologie_sport: [],
			lista_esperienze: [],
			qualifiche_licenze: [],
		},
		creators: {
			nome_creator: "",
			contatto_email: "",
			presentazione: "",
			sport_principale: "Calcio",
			tipologia_contenuti: "",
		},
		"torneo-evento": {
			nome_organizzazione: "",
			presentazione: "",
			sport_principale: "Calcio",
			tipologie_sport: [],
		},
		"campi-impianti-sportivi": {
			costo_partenza: null,
			indirizzo: "",
			info_aggiuntive: "",
			nome_organizzazione: "",
			orari: [],
			presentazione: "",
			sede_principale: "",
			servizi_inclusi: "",
			sport_principale: "Calcio",
			tipologie_sport: [],
		},
	};
}

export function createProfileLocations(): ProfileLocations {
	return {
		giocatore: [],
		squadra: [],
		"staff-sportivo": [],
		"servizi-consulenze": [],
		arbitro: [],
		creators: [],
		"torneo-evento": [],
		"campi-impianti-sportivi": [],
	};
}

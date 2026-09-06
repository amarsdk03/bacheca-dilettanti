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
	"professionisti-studi",
	"arbitro",
	"creators",
	"torneo-evento",
	"campi-impianti-sportivi",
] as const;

export type ProfileType = typeof PROFILE_TYPES[number];

type ProfileTable =
	| "profilo_arbitro"
	| "profilo_campi_impianti"
	| "profilo_creator"
	| "profilo_giocatore"
	| "profilo_professionista_studente"
	| "profilo_squadra"
	| "profilo_staff_sportivo"
	| "profilo_torneo_evento";

type EditableProfileDraft<Table extends ProfileTable> = Omit<
	Required<TablesInsert<Table>>,
	"id" | "nascosto" | "uuid_profilo"
>;

export type ProfileDrafts = {
	giocatore: EditableProfileDraft<"profilo_giocatore">;
	squadra: EditableProfileDraft<"profilo_squadra">;
	"staff-sportivo": EditableProfileDraft<"profilo_staff_sportivo">;
	"professionisti-studi": EditableProfileDraft<"profilo_professionista_studente">;
	arbitro: EditableProfileDraft<"profilo_arbitro">;
	creators: EditableProfileDraft<"profilo_creator">;
	"torneo-evento": EditableProfileDraft<"profilo_torneo_evento">;
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

export const LIMITED_PROFILE_TYPES = [
	"professionisti-studi",
	"creators",
] as const satisfies readonly ProfileType[];

export type LimitedProfileType = typeof LIMITED_PROFILE_TYPES[number];

export function isLimitedProfileType(
	type: ProfileType,
): type is LimitedProfileType {
	return (LIMITED_PROFILE_TYPES as readonly ProfileType[]).includes(type);
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
		description: "Cerca nuove figure calcistiche, staff, partite o sponsor per la tua squadra",
		icon: AwardIcon,
		colore: "#2FAE66",
	},
	{
		value: "staff-sportivo",
		label: "Staff sportivo",
		description: "Cerca e applica per occupazioni retribuite nel settore sportivo",
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
		description: "Fornisci e pubblicizza i tuoi campi e impianti sportivi",
		icon: TrafficConeIcon,
		colore: "#5B8F63",
	},
	{
		value: "professionisti-studi",
		label: "Professionisti e studi",
		description: "Offri i tuoi servizi professionali a squadre, atleti e società sportive",
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
			altezza: "",
			anno_nascita: "",
			cognome: "",
			disponibilita: "non-specificare",
			giorno_nascita: "",
			mese_nascita: "",
			nome: "",
			peso: "",
			piede_principale: "",
			presentazione: "",
			ruoli_sport: {principali: [], specifici: []},
			sport_principale: "Calcio",
			storico_carriera: [],
			tipologie_sport: [],
		},
		squadra: {
			nome_societa: "",
			presentazione: "",
			sede_principale: "",
			sport_principale: "Calcio",
			tipologie_sport: [],
		},
		"staff-sportivo": {
			anno_nascita: "",
			cognome: "",
			disponibilita: "non-specificare",
			figure_professionali: [],
			giorno_nascita: "",
			mese_nascita: "",
			nome: "",
			presentazione: "",
			sport_principale: "Calcio",
			storico_esperienze: [],
		},
		"professionisti-studi": {
			anno_nascita: "",
			automunito: "",
			cognome: "",
			disponibilita: "non-specificare",
			figure_professionali: [],
			giorno_nascita: "",
			mese_nascita: "",
			nome: "",
			presentazione: "",
			presentazione_servizi: "",
			specializzazioni: "",
			sport_principale: "Calcio",
			storico_esperienze: [],
			tipologie_sport: [],
		},
		arbitro: {
			anno_nascita: "",
			cognome: "",
			disponibilita: "non-specificare",
			giorno_nascita: "",
			mese_nascita: "",
			nome: "",
			presentazione: "",
			sport_principale: "Calcio",
			storico_esperienze: [],
		},
		creators: {
			nome_creator: "",
			presentazione: "",
			sport_principale: "Calcio",
			tipologia_contenuti: "",
		},
		"torneo-evento": {
			nome_organizzazione: "",
			presentazione: "",
			sede_principale: "",
			sport_principale: "Calcio",
			tipologie_sport: [],
		},
		"campi-impianti-sportivi": {
			costo_partenza: null,
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
		"professionisti-studi": [],
		arbitro: [],
		creators: [],
		"torneo-evento": [],
		"campi-impianti-sportivi": [],
	};
}

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

export const REGISTRATION_PROFILE_TYPES = [
	"giocatore",
	"squadra",
	"staff-sportivo",
	"professionisti-studi",
	"arbitro",
	"creators",
	"torneo-evento",
	"campi-impianti-sportivi",
] as const;

export type RegistrationProfileType = typeof REGISTRATION_PROFILE_TYPES[number];
export type RegistrationProfileDraft = Record<string, string>;
export type RegistrationProfileDrafts = Record<RegistrationProfileType, RegistrationProfileDraft>;

interface RegistrationProfileOption {
	value: RegistrationProfileType;
	label: string;
	description: string;
	icon: LucideIcon;
}

export const MAX_REGISTRATION_PROFILES = 5;

export const REGISTRATION_PROFILE_OPTIONS: readonly RegistrationProfileOption[] = [
	{
		value: "giocatore",
		label: "Giocatore",
		description: "Crea il tuo profilo e fatti scoprire da società sportive e osservatori",
		icon: UserIcon,
	},
	{
		value: "squadra",
		label: "Squadra",
		description: "Cerca nuove figure calcistiche, staff, partite o sponsor per la tua squadra",
		icon: AwardIcon,
	},
	{
		value: "staff-sportivo",
		label: "Staff sportivo",
		description: "Cerca e applica per occupazioni retribuite nel settore sportivo",
		icon: SearchIcon,
	},
	{
		value: "professionisti-studi",
		label: "Professionisti e studi",
		description: "Offri i tuoi servizi professionali a squadre, atleti e società sportive",
		icon: BriefcaseBusinessIcon,
	},
	{
		value: "arbitro",
		label: "Arbitro",
		description: "Renditi disponibile per arbitrare o gestire partite ed eventi sportivi",
		icon: ClipboardListIcon,
	},
	{
		value: "creators",
		label: "Creators",
		description: "Condividi il tuo profilo e i tuoi contenuti con la nostra community",
		icon: SparklesIcon,
	},
	{
		value: "torneo-evento",
		label: "Torneo / Evento",
		description: "Organizza e promuovi il tuo torneo, evento o manifestazione sportiva",
		icon: TrophyIcon,
	},
	{
		value: "campi-impianti-sportivi",
		label: "Campi e impianti",
		description: "Fornisci e pubblicizza i tuoi campi e impianti sportivi",
		icon: TrafficConeIcon,
	},
];

export function isRegistrationProfileType(value: string): value is RegistrationProfileType {
	return (REGISTRATION_PROFILE_TYPES as readonly string[]).includes(value);
}

export function createRegistrationProfileDrafts(): RegistrationProfileDrafts {
	return {
		giocatore: {
			footballType: "",
			primaryRole: "",
			zone: "",
			birthDate: "",
			specificRole: "",
			presentation: "",
		},
		squadra: {
			clubName: "",
			footballType: "",
			headquarters: "",
			presentation: "",
		},
		arbitro: {
			footballType: "",
			zone: "",
			birthDate: "",
			hasCar: "",
			presentation: "",
		},
		"staff-sportivo": {
			professionalRole: "",
			footballType: "",
			zone: "",
			birthDate: "",
			categories: "",
			travelAvailability: "",
			presentation: "",
		},
		"professionisti-studi": {
			professionalRole: "",
			specialization: "",
			services: "",
			serviceMode: "",
			zone: "",
			qualifications: "",
			experience: "",
		},
		creators: {
			username: "",
			description: "",
		},
		"torneo-evento": {
			eventName: "",
			location: "",
			registrationMode: "",
			ageRange: "",
			teams: "",
			cost: "",
			additionalInfo: "",
		},
		"campi-impianti-sportivi": {
			venueName: "",
			address: "",
			presentation: "",
			hours: "",
			hourlyCost: "",
			services: "",
		},
	};
}

const REQUIRED_PROFILE_FIELDS: Record<RegistrationProfileType, readonly string[]> = {
	giocatore: ["footballType", "primaryRole", "zone"],
	squadra: ["clubName", "footballType", "headquarters"],
	arbitro: ["footballType", "zone"],
	"staff-sportivo": ["professionalRole", "footballType", "zone"],
	"professionisti-studi": ["professionalRole", "specialization", "services"],
	creators: ["username", "description"],
	"torneo-evento": ["eventName", "location"],
	"campi-impianti-sportivi": ["venueName", "address"],
};

export function getMissingRegistrationProfileFields(
	type: RegistrationProfileType,
	draft: RegistrationProfileDraft,
) {
	return REQUIRED_PROFILE_FIELDS[type].filter((field) => !draft[field]?.trim());
}

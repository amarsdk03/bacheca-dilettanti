import type {LucideIcon} from "lucide-react";
import {
	AwardIcon,
	BriefcaseBusinessIcon,
	Building2Icon,
	ClipboardListIcon,
	SearchIcon,
	TrafficConeIcon,
	TrophyIcon,
	UserIcon,
} from "lucide-react";

import {tipologieAnnuncio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export const REGISTRATION_PROFILE_TYPES = [
	"giocatore",
	"squadra",
	"arbitro",
	"aziende-enti",
	"staff-sportivo",
	"professionisti-studi",
	"torneo-evento",
	"campi-impianti-sportivi",
] as const;

export type RegistrationProfileType = typeof REGISTRATION_PROFILE_TYPES[number];
export type RegistrationProfileDraft = Record<string, string>;
export type RegistrationProfileDrafts = Record<RegistrationProfileType, RegistrationProfileDraft>;

const PROFILE_ICONS: Record<RegistrationProfileType, LucideIcon> = {
	giocatore: UserIcon,
	squadra: AwardIcon,
	arbitro: ClipboardListIcon,
	"aziende-enti": Building2Icon,
	"staff-sportivo": SearchIcon,
	"professionisti-studi": BriefcaseBusinessIcon,
	"torneo-evento": TrophyIcon,
	"campi-impianti-sportivi": TrafficConeIcon,
};

export function isRegistrationProfileType(value: string): value is RegistrationProfileType {
	return (REGISTRATION_PROFILE_TYPES as readonly string[]).includes(value);
}

export const REGISTRATION_PROFILE_OPTIONS = tipologieAnnuncio.flatMap((option) => {
	const value = option.valore;
	if (!isRegistrationProfileType(value)) return [];

	return [{
		value,
		label: option.nome,
		description: option.descrizione,
		icon: PROFILE_ICONS[value],
	}];
});

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
		"aziende-enti": {
			businessName: "",
			activityType: "",
			headquarters: "",
			services: "",
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
	"aziende-enti": ["businessName", "activityType", "headquarters", "services"],
	"staff-sportivo": ["professionalRole", "footballType", "zone"],
	"professionisti-studi": ["professionalRole", "specialization", "services"],
	"torneo-evento": ["eventName", "location"],
	"campi-impianti-sportivi": ["venueName", "address"],
};

export function getMissingRegistrationProfileFields(
	type: RegistrationProfileType,
	draft: RegistrationProfileDraft,
) {
	return REQUIRED_PROFILE_FIELDS[type].filter((field) => !draft[field]?.trim());
}

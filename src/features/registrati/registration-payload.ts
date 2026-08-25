import {
	isLimitedProfileType,
	type ProfileDrafts,
	type ProfileLocations,
	type ProfileType,
} from "@/features/profilo/profile-model";

export const REGISTRATION_PAYLOAD_VERSION = 1 as const;

export type RegistrableProfileType = Exclude<
	ProfileType,
	"professionisti-studi" | "creators"
>;

export interface RegistrationProfilePayload {
	type: RegistrableProfileType;
	draft: ProfileDrafts[RegistrableProfileType];
	locations: ProfileLocations[RegistrableProfileType];
}

export interface RegistrationPayload {
	version: typeof REGISTRATION_PAYLOAD_VERSION;
	selectedProfileTypes: ProfileType[];
	primaryProfileType: RegistrableProfileType;
	profiles: RegistrationProfilePayload[];
}

export function isRegistrableProfileType(
	type: ProfileType,
): type is RegistrableProfileType {
	return !isLimitedProfileType(type);
}

export function createRegistrationPayload(
	selectedProfileTypes: ProfileType[],
	primaryProfileType: ProfileType | "",
	drafts: ProfileDrafts,
	locations: ProfileLocations,
): RegistrationPayload | null {
	if (!primaryProfileType || !isRegistrableProfileType(primaryProfileType)) {
		return null;
	}

	const profiles = selectedProfileTypes
		.filter(isRegistrableProfileType)
		.map((type) => ({
			type,
			draft: drafts[type],
			locations: locations[type],
		}));

	return {
		version: REGISTRATION_PAYLOAD_VERSION,
		selectedProfileTypes,
		primaryProfileType,
		profiles,
	};
}

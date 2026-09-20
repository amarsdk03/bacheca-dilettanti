import {
	isComingSoonProfileType,
	type ComingSoonProfileType,
	type ProfileDrafts,
	type ProfileLocations,
	type ProfileType,
} from "@/features/profilo/profile-model";
import type {ProfileSocialLinks, ProfileSocialLinksByType,} from "@/features/profilo/profile-social-links";

export const REGISTRATION_PAYLOAD_VERSION = 1 as const;

export type RegistrableProfileType = Exclude<ProfileType, ComingSoonProfileType>;

export interface RegistrationProfilePayload {
	type: RegistrableProfileType;
	draft: ProfileDrafts[RegistrableProfileType];
	locations: ProfileLocations[RegistrableProfileType];
	socialLinks: ProfileSocialLinks;
}

export interface RegistrationPayload {
	version: typeof REGISTRATION_PAYLOAD_VERSION;
	selectedProfileTypes: RegistrableProfileType[];
	primaryProfileType: RegistrableProfileType;
	profiles: RegistrationProfilePayload[];
}

export function isRegistrableProfileType(
	type: ProfileType,
): type is RegistrableProfileType {
	return !isComingSoonProfileType(type);
}

export function createRegistrationPayload(
	selectedProfileTypes: ProfileType[],
	primaryProfileType: ProfileType | "",
	drafts: ProfileDrafts,
	locations: ProfileLocations,
	socialLinks: ProfileSocialLinksByType,
): RegistrationPayload | null {
	const registrableProfileTypes = selectedProfileTypes.filter(isRegistrableProfileType);
	if (
		registrableProfileTypes.length !== selectedProfileTypes.length
		|| !primaryProfileType
		|| !isRegistrableProfileType(primaryProfileType)
		|| !registrableProfileTypes.includes(primaryProfileType)
	) {
		return null;
	}

	const profiles = registrableProfileTypes
		.map((type) => ({
			type,
			draft: drafts[type],
			locations: locations[type],
			socialLinks: socialLinks[type],
		}));

	return {
		version: REGISTRATION_PAYLOAD_VERSION,
		selectedProfileTypes: registrableProfileTypes,
		primaryProfileType,
		profiles,
	};
}

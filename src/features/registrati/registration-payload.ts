import {
	PROFILE_TYPES,
	type ProfileDrafts,
	type ProfileLocations,
	type ProfileType,
} from "@/features/profilo/profile-model";
import type {ProfileSocialLinks, ProfileSocialLinksByType,} from "@/features/profilo/profile-social-links";

export const REGISTRATION_PAYLOAD_VERSION = 1 as const;

export type RegistrableProfileType = ProfileType;

export interface RegistrationProfilePayload {
	type: RegistrableProfileType;
	draft: ProfileDrafts[RegistrableProfileType];
	locations: ProfileLocations[RegistrableProfileType];
	socialLinks: ProfileSocialLinks;
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
	return (PROFILE_TYPES as readonly ProfileType[]).includes(type);
}

export function createRegistrationPayload(
	selectedProfileTypes: ProfileType[],
	primaryProfileType: ProfileType | "",
	drafts: ProfileDrafts,
	locations: ProfileLocations,
	socialLinks: ProfileSocialLinksByType,
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
			socialLinks: socialLinks[type],
		}));

	return {
		version: REGISTRATION_PAYLOAD_VERSION,
		selectedProfileTypes,
		primaryProfileType,
		profiles,
	};
}

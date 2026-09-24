import {
	type ComingSoonProfileType,
	isComingSoonProfileType,
	type ProfileDrafts,
	type ProfileLocations,
	type ProfileType,
} from "@/features/profilo/profile-model";
import type {ProfileSocialLinks, ProfileSocialLinksByType,} from "@/features/profilo/profile-social-links";
import {COOKIE_POLICY_VERSION, PRIVACY_VERSION, TERMS_VERSION} from "@/features/legal/legal-versions";
import {normalizeInvitationCode} from "@/features/inviti/invitation-code";

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
	inviteCode: string | null;
	selectedProfileTypes: RegistrableProfileType[];
	primaryProfileType: RegistrableProfileType;
	profiles: RegistrationProfilePayload[];
	consents: {
		legalAccepted: boolean;
		newsletterSubscribed: boolean;
		termsVersion: typeof TERMS_VERSION;
		privacyVersion: typeof PRIVACY_VERSION;
		cookiePolicyVersion: typeof COOKIE_POLICY_VERSION;
	};
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
	legalAccepted: boolean,
	newsletterSubscribed: boolean,
	inviteCode = "",
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
		inviteCode: normalizeInvitationCode(inviteCode) || null,
		selectedProfileTypes: registrableProfileTypes,
		primaryProfileType,
		profiles,
		consents: {
			legalAccepted,
			newsletterSubscribed,
			termsVersion: TERMS_VERSION,
			privacyVersion: PRIVACY_VERSION,
			cookiePolicyVersion: COOKIE_POLICY_VERSION,
		},
	};
}

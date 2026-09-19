import {PROFILE_TYPES, type ProfileType,} from "@/features/profilo/profile-model";

export const PROFILE_SOCIAL_PLATFORMS = [
	"instagram",
	"facebook",
	"youtube",
	"linkedin",
] as const;

export type ProfileSocialPlatform = typeof PROFILE_SOCIAL_PLATFORMS[number];

export type ProfileSocialLinks = Record<ProfileSocialPlatform, string>;

export type ProfileSocialLinksByType = Record<ProfileType, ProfileSocialLinks>;

export const PROFILE_SOCIAL_LINK_OPTIONS = [
	{
		platform: "instagram",
		label: "Instagram",
		placeholder: "https://instagram.com/nomeutente",
	},
	{
		platform: "facebook",
		label: "Facebook",
		placeholder: "https://facebook.com/nomepagina",
	},
	{
		platform: "youtube",
		label: "YouTube",
		placeholder: "https://youtube.com/@nomecanale",
	},
	{
		platform: "linkedin",
		label: "LinkedIn",
		placeholder: "https://linkedin.com/in/nomeprofilo",
	},
] as const satisfies readonly {
	platform: ProfileSocialPlatform;
	label: string;
	placeholder: string;
}[];

export function isProfileSocialPlatform(value: string): value is ProfileSocialPlatform {
	return (PROFILE_SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

export function createProfileSocialLinks(): ProfileSocialLinksByType {
	return Object.fromEntries(
		PROFILE_TYPES.map((type) => [
			type,
			{instagram: "", facebook: "", youtube: "", linkedin: ""},
		]),
	) as ProfileSocialLinksByType;
}

export function profileSocialLinksFromRows(
	rows: readonly {piattaforma: string | null; sublink: string}[],
): ProfileSocialLinks {
	const links: ProfileSocialLinks = {
		instagram: "",
		facebook: "",
		youtube: "",
		linkedin: "",
	};

	for (const row of rows) {
		if (!row.piattaforma || !isProfileSocialPlatform(row.piattaforma)) continue;
		links[row.piattaforma] = row.sublink;
	}

	return links;
}

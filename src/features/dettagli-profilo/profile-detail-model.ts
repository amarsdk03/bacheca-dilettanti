import {isProfileType, type ProfileType} from "@/features/profilo/profile-model";
import type {PublicProfileLocation} from "@/features/profilo/public-profile-locations";
import type {AnnouncementDirectoryItem} from "@/features/annunci/announcement-model";
import type {PublicTeamProfile} from "@/features/profilo/team-profile";
import type {ProfileSocialLinks} from "@/features/profilo/profile-social-links";
import type {DirectoryProfile} from "@/features/profili/profile-directory-model";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RawProfileDetailSearchParams = Record<string, string | string[] | undefined>;

export interface ProfileDetailParams {
	id: string;
	type: ProfileType;
}

export interface ProfileDetailField {
	href?: string;
	items?: string[];
	label: string;
	listStyle?: "chips" | "rows";
	value: string;
	wide?: boolean;
}

interface ProfileDetailBase {
	id: string;
	title: string;
	imageUrl: string | null;
	emailConfirmed: boolean;
	officialVerified: boolean;
	primary: boolean;
	availabilityLabel: string | null;
	socialLinks: ProfileSocialLinks;
	announcements: AnnouncementDirectoryItem[];
	announcementsUnavailable: boolean;
	announcementCount: number | null;
	followerCount: number | null;
	similarProfiles: DirectoryProfile[];
	similarProfilesUnavailable: boolean;
}

export type NonPlayerProfileType = Exclude<ProfileType, "giocatore">;

export interface PlayerCareerEntry {
	id: string;
	title: string;
	organization: string | null;
	from: string | null;
	to: string | null;
	status: "in-corso" | "conseguito" | null;
	description: string | null;
	teamProfileId: string | null;
	linkedTeam: PublicTeamProfile | null;
}

export type PublicProfileExperience = PlayerCareerEntry;

export interface PlayerProfileData {
	age: number | null;
	sportTypes: string[];
	primaryRoles: string[];
	specificRoles: string[];
	preferredCategories: string[];
	preferredFoot: string | null;
	height: string | null;
	weight: string | null;
	presentation: string | null;
	career: PlayerCareerEntry[];
	highlightsUrl: string | null;
}

export type PlayerProfileDetail = ProfileDetailBase & {
	type: "giocatore";
	locations: PublicProfileLocation[];
	player: PlayerProfileData;
};

export type GenericProfileDetail<Type extends NonPlayerProfileType = NonPlayerProfileType> = ProfileDetailBase & {
	type: Type;
	locations: PublicProfileLocation[];
	primaryFields: ProfileDetailField[];
	fields: ProfileDetailField[];
	experiences: PublicProfileExperience[];
};

export type ProfileDetail = PlayerProfileDetail | {
	[Type in NonPlayerProfileType]: GenericProfileDetail<Type>;
}[NonPlayerProfileType];

export type ProfileDetailResult =
	| {status: "ok"; profile: ProfileDetail}
	| {status: "not-found"}
	| {status: "error"};

function firstValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function parseProfileDetailParams(
	params: RawProfileDetailSearchParams,
): ProfileDetailParams | null {
	const id = firstValue(params.id).trim();
	const type = firstValue(params.type).trim();

	if (!UUID_PATTERN.test(id) || !isProfileType(type)) return null;
	return {id: id.toLocaleLowerCase("en-US"), type};
}

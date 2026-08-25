import {isProfileType, type ProfileType} from "@/features/profilo/profile-model";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RawProfileDetailSearchParams = Record<string, string | string[] | undefined>;

export interface ProfileDetailParams {
	id: string;
	type: ProfileType;
}

export interface ProfileDetailField {
	label: string;
	value: string;
	wide?: boolean;
}

export interface ProfileAnnouncement {
	id: string;
	typeLabel: string;
	subtypeLabel: string;
	title: string;
	description: string;
	location: string;
	createdAt: string | null;
	level: string | null;
}

export interface ProfileDetail {
	id: string;
	type: ProfileType;
	title: string;
	imageUrl: string | null;
	verified: boolean;
	primary: boolean;
	availabilityLabel: string | null;
	primaryFields: ProfileDetailField[];
	fields: ProfileDetailField[];
	announcements: ProfileAnnouncement[];
	announcementsUnavailable: boolean;
}

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

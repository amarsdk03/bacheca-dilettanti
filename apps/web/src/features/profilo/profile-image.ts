import {isProfileType, type ProfileType,} from "@/features/profilo/profile-model";

export const PROFILE_IMAGES_BUCKET = "immagini_profili";
export const PROFILE_IMAGE_MEDIA_FORMAT = "foto_profilo";
// An empty image link on a subprofile explicitly selects its avatar fallback.
export const PROFILE_IMAGE_FALLBACK_LINK = "";
export const PROFILE_IMAGE_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_OUTPUT_SIZE = 1024;

export type ProfileImageScope = "main" | ProfileType;

export interface ProfileImageRow {
	uuid_profilo: string;
	sottoprofilo: string | null;
	link_media: string;
}

export function isProfileImageScope(value: unknown): value is ProfileImageScope {
	return value === "main" || (typeof value === "string" && isProfileType(value));
}

export function profileImageMapKey(profileId: string, type: ProfileType) {
	return `${profileId}:${type}`;
}

export function profileImageRowsToMap(rows: readonly ProfileImageRow[]) {
	const images = new Map<string, string>();
	for (const row of rows) {
		if (!row.sottoprofilo || !isProfileType(row.sottoprofilo)) continue;
		const url = row.link_media.trim();
		images.set(profileImageMapKey(row.uuid_profilo, row.sottoprofilo), url);
	}
	return images;
}

export function resolvedProfileImageUrl(
	images: ReadonlyMap<string, string>,
	profileId: string,
	type: ProfileType,
	mainImageUrl: string | null,
) {
	const key = profileImageMapKey(profileId, type);
	return images.has(key) ? images.get(key) || null : mainImageUrl;
}

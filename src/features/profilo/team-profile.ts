export const TEAM_PROFILE_SEARCH_MIN_LENGTH = 2;
export const TEAM_PROFILE_SEARCH_LIMIT = 10;
export const TEAM_PROFILE_RESOLVE_LIMIT = 20;

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TeamProfileReference {
	profileId: string;
	name: string;
}

export interface PublicTeamProfile extends TeamProfileReference {
	imageUrl: string | null;
	location: string | null;
}

export function teamProfileHref(profileId: string) {
	return `/dettagli-profilo?id=${encodeURIComponent(profileId)}&type=squadra`;
}

export function normalizeTeamSearchQuery(value: string) {
	return value
		.replace(/[\\%_\u0000-\u001f\u007f]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 100);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function experienceTeamReferences(
	value: unknown,
	nameField: "ente" | "titolo" = "ente",
): TeamProfileReference[] {
	if (!Array.isArray(value)) return [];
	const seen = new Set<string>();
	return value.flatMap((item): TeamProfileReference[] => {
		if (!isRecord(item)) return [];
		const profileId = cleanText(item.squadraProfiloId)?.toLocaleLowerCase("en-US");
		if (!profileId || !UUID_PATTERN.test(profileId) || seen.has(profileId)) return [];
		const name = cleanText(item[nameField]);
		if (!name) return [];
		seen.add(profileId);
		return [{profileId, name}];
	});
}

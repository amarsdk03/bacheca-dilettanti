import type {DirectoryProfile} from "./profile-directory-model";

export interface RankedDirectoryProfile {
	profile: DirectoryProfile;
	completionPercentage: number;
	lastActivityAt: string | null;
}

function activityTime(value: string | null): number {
	const time = value ? Date.parse(value) : NaN;
	return Number.isFinite(time) ? time : 0;
}

function tieBreak(seed: string, profile: DirectoryProfile): number {
	const input = `${seed}:${profile.id}:${profile.type}`;
	let hash = 2166136261;
	for (let index = 0; index < input.length; index += 1) {
		hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
	}
	return hash >>> 0;
}

export function sortRankedDirectoryProfiles(profiles: RankedDirectoryProfile[], seed: string): RankedDirectoryProfile[] {
	return profiles.sort((left, right) =>
		right.completionPercentage - left.completionPercentage
		|| activityTime(right.lastActivityAt) - activityTime(left.lastActivityAt)
		|| tieBreak(seed, left.profile) - tieBreak(seed, right.profile)
		|| `${left.profile.id}:${left.profile.type}`.localeCompare(`${right.profile.id}:${right.profile.type}`),
	);
}

export interface PublicProfileLocation {
	region: string;
	city: string | null;
}

export interface PublicProfileLocationGroup {
	region: string;
	cities: string[];
	hasWholeRegion: boolean;
}

export function groupPublicProfileLocations(
	locations: readonly PublicProfileLocation[],
): PublicProfileLocationGroup[] {
	const grouped = new Map<string, {cities: Set<string>; hasWholeRegion: boolean}>();

	for (const location of locations) {
		const region = location.region.trim();
		if (!region) continue;
		const group = grouped.get(region) ?? {cities: new Set<string>(), hasWholeRegion: false};
		const city = location.city?.trim();
		if (city) group.cities.add(city);
		else group.hasWholeRegion = true;
		grouped.set(region, group);
	}

	return [...grouped.entries()]
		.map(([region, group]) => ({
			region,
			cities: [...group.cities].sort((left, right) => left.localeCompare(right, "it-IT")),
			hasWholeRegion: group.hasWholeRegion,
		}))
		.sort((left, right) => left.region.localeCompare(right.region, "it-IT"));
}

export function publicProfileLocationLabel(
	locations: readonly PublicProfileLocation[],
) {
	const groups = groupPublicProfileLocations(locations);
	if (groups.length === 0) return null;
	const cities = groups.flatMap(({cities}) => cities);
	if (groups.length === 1 && cities.length === 1) return `${cities[0]}, ${groups[0]?.region}`;
	if (groups.length === 1) return groups[0]?.region ?? null;
	return `${groups.length} regioni selezionate`;
}

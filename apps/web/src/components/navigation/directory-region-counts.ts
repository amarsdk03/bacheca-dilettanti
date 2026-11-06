export function countDirectoryRegions<T>(items: readonly T[], regions: (item: T) => readonly string[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const item of items) for (const region of new Set(regions(item))) counts[region] = (counts[region] ?? 0) + 1;
	return counts;
}

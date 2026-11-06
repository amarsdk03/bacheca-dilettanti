function periodYear(value: unknown, end: boolean): number {
	if (typeof value !== "string") return -1;
	const match = /^([1-9]\d{3})(?:\/(\d{2}|[1-9]\d{3}))?$/.exec(value.trim());
	if (!match) return -1;
	const start = Number(match[1]);
	if (!match[2]) return start;
	let finish = match[2].length === 4 ? Number(match[2]) : Math.floor(start / 100) * 100 + Number(match[2]);
	if (match[2].length === 2 && finish < start) finish += 100;
	if (finish !== start + 1) return -1;
	return end ? finish : start;
}

export function sortExperiencesNewestFirst<T>(entries: readonly T[]): T[] {
	return entries.map((entry, index) => {
		const row = entry && typeof entry === "object" && !Array.isArray(entry) ? entry as Record<string, unknown> : {};
		const from = periodYear(row.periodoDa ?? row.from, false);
		const to = row.periodoA ?? row.to;
		const ongoing = (row.stato ?? row.status) === "in-corso"
			|| (typeof to === "string" && /^(?:ad )?oggi$/i.test(to.trim()));
		const end = periodYear(to, true);
		return {entry, index, ongoing, from, end: end >= 0 ? end : from};
	}).sort((a, b) => Number(b.ongoing) - Number(a.ongoing) || b.end - a.end || b.from - a.from || a.index - b.index)
		.map(({entry}) => entry);
}

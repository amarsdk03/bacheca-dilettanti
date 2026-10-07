import {ANY_CATEGORY, categoryKey, categoryLabel} from "./category-catalog";

/** Catalogo C: categorie ricercate dagli annunci Staff sportivo. */
export const STAFF_CATEGORY_GROUPS = [
	{gruppo: "Selezione generale", opzioni: ["Prime squadre", "Settore giovanile", "Qualsiasi"]},
	{gruppo: "Calcio a 11 maschile", opzioni: ["Settore giovanile", "Prime squadre", "Qualsiasi categoria", "Serie C", "Serie D", "Eccellenza", "Promozione", "Prima Categoria", "Seconda Categoria", "Terza Categoria", "FIGC-LND — Amatori", "CSI — Open Eccellenza", "CSI — Open A", "CSI — Open B", "CSI — Master", "UISP — Serie A1", "UISP — Serie A2", "Altra categoria"]},
	{gruppo: "Calcio a 8 maschile", opzioni: ["Settore giovanile", "Prime squadre", "Qualsiasi categoria", "Lega Calcio a 8 — Serie A", "Lega Calcio a 8 — Serie A2", "Lega Calcio a 8 — Serie B", "UISP", "AICS", "ASI", "Altra categoria"]},
	{gruppo: "Calcio a 7 maschile", opzioni: ["Settore giovanile", "Prime squadre", "Qualsiasi categoria", "FIGC-LND — Amatori", "CSI — Open / Amatori", "CSI — Open Eccellenza", "CSI — Open A", "CSI — Open B", "CSI — Open C", "CSI — Open Serie A", "CSI — Open Serie B", "CSI — Open Serie C", "CSI — Open Golden League", "CSI — Open Silver League", "CSI — Open Bronze League", "CSI — Master Senior", "Altra categoria"]},
	{gruppo: "Calcio a 5 maschile", opzioni: ["Settore giovanile", "Prime squadre", "Qualsiasi categoria", "FIGC-LND — Serie A", "FIGC-LND — Serie A2 Élite", "FIGC-LND — Serie A2", "FIGC-LND — Serie B", "FIGC-LND — Serie C1", "FIGC-LND — Serie C2", "FIGC-LND — Serie C regionale", "FIGC-LND — Serie D", "CSI — Open", "Altra categoria"]},
	{gruppo: "Calcio a 11 femminile", opzioni: ["Settore giovanile", "Prime squadre", "Qualsiasi categoria", "FIGC — Serie A Women", "FIGC — Serie B", "FIGC-LND — Serie C", "FIGC-LND — Eccellenza", "FIGC-LND — Promozione", "Altra categoria"]},
	{gruppo: "Calcio a 8 femminile", opzioni: ["Settore giovanile", "Prime squadre", "Qualsiasi categoria", "UISP — Top League", "UISP — Fun League", "UISP", "Altra categoria"]},
	{gruppo: "Calcio a 7 femminile", opzioni: ["Settore giovanile", "Prime squadre", "Qualsiasi categoria", "CSI — Open", "CSI — Open Eccellenza", "CSI — Open A", "CSI — Open B", "Altra categoria"]},
	{gruppo: "Calcio a 5 femminile", opzioni: ["Settore giovanile", "Prime squadre", "Qualsiasi categoria", "FIGC-LND — Serie A", "FIGC-LND — Serie B", "FIGC-LND — Serie C / Campionato regionale", "FIGC-LND — Serie D", "Altra categoria"]},
] as const;

export function staffCategoryKey(group: string, category: string): string {
	return group === "Selezione generale" ? category : categoryKey(group, category);
}

export const STAFF_CATEGORY_FILTER_OPTIONS = STAFF_CATEGORY_GROUPS.flatMap(({gruppo, opzioni}) =>
	opzioni.map((category) => ({value: staffCategoryKey(gruppo, category), label: gruppo === "Selezione generale" ? category : `${gruppo} — ${category}`})),
);

const staffKeys = new Set(STAFF_CATEGORY_FILTER_OPTIONS.map(({value}) => value));

export function isStaffCategory(value: string): boolean {
	return staffKeys.has(value);
}

/** Map only unambiguous historical options; obsolete values remain readable. */
export function normalizeStaffCategory(value: string): string {
	if (staffKeys.has(value)) return value;
	const match = /^Calcio (11|7|5) \((Maschile|Femminile)\)::(.+)$/.exec(value);
	if (!match) return value;
	const [, size, gender, legacyCategory] = match;
	const group = `Calcio a ${size} ${gender.toLowerCase()}`;
	let category = legacyCategory;
	if (category.startsWith("Settore Giovanile")) category = "Settore giovanile";
	else if (size === "7") category = `CSI — ${category}`;
	else if (size === "5") category = `FIGC-LND — ${category === "Serie C" ? "Serie C / Campionato regionale" : category}`;
	else if (gender === "Femminile") {
		category = category.replace(/ Femminile$/, "");
		category = category === "Serie A" ? "FIGC — Serie A Women" : category === "Serie B" ? "FIGC — Serie B" : `FIGC-LND — ${category}`;
	}
	const key = staffCategoryKey(group, category);
	return staffKeys.has(key) ? key : value;
}

export function normalizeStaffCategories(values: readonly string[]): string[] {
	if (values.includes(ANY_CATEGORY)) return [ANY_CATEGORY];
	return [...new Set(values.map(normalizeStaffCategory))];
}

export function staffCategoryLabel(value: string): string {
	const normalized = normalizeStaffCategory(value);
	const option = STAFF_CATEGORY_FILTER_OPTIONS.find(({value: key}) => key === normalized);
	return option?.label ?? (value.includes("::") ? value.replace("::", " · ") : categoryLabel(value));
}

import {categoryKey, categoryLabel} from "./category-catalog";

/** Catalogo C: categorie ricercate dagli annunci Staff sportivo. */
export const STAFF_CATEGORY_GROUPS = [
	{gruppo: "Calcio 11 (Maschile)", opzioni: ["Settore Giovanile", "Serie C", "Serie D", "Eccellenza", "Promozione", "Prima Categoria", "Seconda Categoria", "Terza Categoria"]},
	{gruppo: "Calcio 7 (Maschile)", opzioni: ["Settore Giovanile C7", "Open Eccellenza", "Open Serie A", "Open Serie B", "Open Serie C1", "Open Serie C2", "Open A", "Open B", "Open C", "Open Divisione Unica"]},
	{gruppo: "Calcio 5 (Maschile)", opzioni: ["Settore Giovanile C5", "Serie A", "Serie A2 Élite", "Serie A2", "Serie B", "Serie C1", "Serie C2", "Serie D"]},
	{gruppo: "Calcio 11 (Femminile)", opzioni: ["Settore Giovanile C11 Femminile", "Eccellenza Femminile", "Serie C Femminile", "Serie B Femminile", "Serie A Femminile"]},
	{gruppo: "Calcio 7 (Femminile)", opzioni: ["Settore Giovanile C7 Femminile", "Open Eccellenza", "Open Serie A", "Open Serie B"]},
	{gruppo: "Calcio 5 (Femminile)", opzioni: ["Settore Giovanile C5 Femminile", "Serie D", "Serie C", "Serie B", "Serie A"]},
] as const;

export const STAFF_CATEGORY_FILTER_OPTIONS = STAFF_CATEGORY_GROUPS.flatMap(({gruppo, opzioni}) =>
	opzioni.map((category) => ({value: categoryKey(gruppo, category), label: `${gruppo} · ${category}`})),
);

const staffKeys = new Set(STAFF_CATEGORY_FILTER_OPTIONS.map(({value}) => value));
const staffKeysByName = new Map<string, string[]>();
for (const {gruppo, opzioni} of STAFF_CATEGORY_GROUPS) {
	for (const category of opzioni) {
		staffKeysByName.set(category, [...(staffKeysByName.get(category) ?? []), categoryKey(gruppo, category)]);
	}
}

export function isStaffCategory(value: string): boolean {
	return staffKeys.has(value);
}

/** Bare historical names are upgraded only when one Staff group contains them. */
export function normalizeStaffCategory(value: string): string {
	if (staffKeys.has(value)) return value;
	if (value.includes("::")) return value;
	const matches = staffKeysByName.get(value);
	return matches?.length === 1 ? matches[0] : value;
}

export function normalizeStaffCategories(values: readonly string[]): string[] {
	return [...new Set(values.map(normalizeStaffCategory))];
}

export function staffCategoryLabel(value: string): string {
	const normalized = normalizeStaffCategory(value);
	const option = STAFF_CATEGORY_FILTER_OPTIONS.find(({value: key}) => key === normalized);
	return option?.label ?? (value.includes("::") ? categoryLabel(value) : value);
}

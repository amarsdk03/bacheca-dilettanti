/** Persisted text key for a category within one football group. */
export const CATEGORIE_CALCIO_GROUPS = [
	{gruppo: "Calcio 11 (Maschile)", opzioni: ["Serie C", "Serie D", "Eccellenza", "Promozione", "Prima Categoria", "Seconda Categoria", "Terza Categoria", "Primavera 1", "Primavera 2", "Primavera 3", "Primavera 4", "Juniores Nazionali", "Juniores Regionali", "Juniores Provinciali", "Under 18 Nazionale", "Under 17 Nazionali", "Under 17 Regionali", "Under 17 Provinciali", "Under 16 Nazionali", "Under 16 Regionali", "Under 16 Provinciali", "Under 15 Nazionali", "Under 15 Regionali", "Under 15 Provinciali"]},
	{gruppo: "Calcio 7 (Maschile)", opzioni: ["Open Eccellenza", "Open Serie A", "Open Serie B", "Open Serie C1", "Open Serie C2", "Open A", "Open B", "Open C", "Open Divisione Unica", "Top Junior", "Under 19", "Juniores", "Under 17", "Under 16", "Allievi", "Under 15"]},
	{gruppo: "Calcio 5 (Maschile)", opzioni: ["Serie A", "Serie A2 Élite", "Serie A2", "Serie B", "Serie C1", "Serie C2", "Serie D", "Under 21", "Under 19 Nazionali", "Under 19 Regionali", "Under 17", "Under 15"]},
	{gruppo: "Calcio 11 (Femminile)", opzioni: ["Serie A Femminile", "Serie B Femminile", "Serie C Femminile", "Eccellenza Femminile", "Campionato Primavera 1", "Campionato Primavera 2", "Under 17 Femminile", "Under 15 Femminile"]},
	{gruppo: "Calcio 7 (Femminile)", opzioni: ["Open Eccellenza", "Open Serie A", "Open Serie B", "Under 19", "Under 17", "Under 15"]},
	{gruppo: "Calcio 5 (Femminile)", opzioni: ["Serie A", "Serie B", "Serie C", "Serie D", "Under 19", "Under 17", "Under 15"]},
] as const;

export const FIGURA_PROFESSIONALE_GROUPS = [
	{gruppo: "Area tecnica", opzioni: ["Allenatore", "Allenatore in seconda", "Preparatore atletico", "Preparatore portieri", "Collaboratore tecnico", "Preparatore calci piazzati", "Match Analyst"]},
	{gruppo: "Direzione e organizzazione", opzioni: ["Direttore Sportivo", "Osservatore", "Capo-Osservatore", "Segretario", "Dirigente Accompagnatore", "Magazziniere", "Autista", "Commerciale / Business"]},
	{gruppo: "Staff medico", opzioni: ["Fisioterapia / Medicina sportiva", "Psicologo"]},
	{gruppo: "Comunicazione", opzioni: ["Social Media Manager", "Addetto Stampa / Comunicazione", "Grafico"]},
	{gruppo: "Altre figure", opzioni: ["Tuttofare", "Altro"]},
] as const;

export const ANY_CATEGORY = "Qualsiasi";

export const FIGURA_PROFESSIONALE_OPTIONS = FIGURA_PROFESSIONALE_GROUPS.flatMap(({opzioni}) => [...opzioni]);

export function categoryKey(group: string, category: string): string {
	return `${group}::${category}`;
}

const categoryByKey = new Map(CATEGORIE_CALCIO_GROUPS.flatMap(({gruppo, opzioni}) =>
	opzioni.map((category) => [categoryKey(gruppo, category), {group: gruppo, category}] as const),
));
const keysByName = new Map<string, string[]>();
for (const [key, {category}] of categoryByKey) keysByName.set(category, [...(keysByName.get(category) ?? []), key]);
// Both labels belonged to one explicit group in the previous catalogue.
const LEGACY_CATEGORY_GROUP: Record<string, string> = {
	"Serie C": "Calcio 11 (Maschile)",
	"Serie D": "Calcio 11 (Maschile)",
};

export const CATEGORY_FILTER_OPTIONS = CATEGORIE_CALCIO_GROUPS.flatMap(({gruppo, opzioni}) =>
	opzioni.map((category) => ({value: categoryKey(gruppo, category), label: `${gruppo} · ${category}`})),
);

/** Accepted in old filter URLs, but never offered for new selections. */
export const UNRESOLVED_LEGACY_CATEGORY_FILTERS = [
	"Serie A", "Serie B", "Promozione Femminile", "Serie A C5", "Serie B C5", "Serie C C5", "Calcio amatoriale",
] as const;

/** Unknown and ambiguous historical values remain plain text. */
export function normalizeCategory(value: string): string {
	if (categoryByKey.has(value)) return value;
	const oldGroup = LEGACY_CATEGORY_GROUP[value];
	if (oldGroup) return categoryKey(oldGroup, value);
	const possible = keysByName.get(value);
	return possible?.length === 1 ? possible[0] : value;
}

export function normalizeCategories(values: readonly string[]): string[] {
	if (values.includes(ANY_CATEGORY)) return [ANY_CATEGORY];
	return [...new Set(values.map(normalizeCategory))];
}

export function categoryLabel(value: string): string {
	const pair = categoryByKey.get(normalizeCategory(value));
	return pair ? `${pair.group} · ${pair.category}` : value;
}

export function categoryShortLabel(value: string): string {
	const pair = categoryByKey.get(normalizeCategory(value));
	if (pair) return pair.category;
	const group = CATEGORIE_CALCIO_GROUPS.find(({gruppo}) => value.startsWith(`${gruppo} · `));
	return group ? value.slice(group.gruppo.length + 3) : value;
}

const FIGURE_ALIASES: Record<string, string> = {
	"Fisioterapia/Medicina sportiva": "Fisioterapia / Medicina sportiva",
	"Commerciale/Business": "Commerciale / Business",
};

export function normalizeFigure(value: string): string {
	return FIGURE_ALIASES[value] ?? value;
}

export function normalizeFigures(values: readonly string[]): string[] {
	return [...new Set(values.map(normalizeFigure))];
}

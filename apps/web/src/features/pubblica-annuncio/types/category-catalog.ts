/** Persisted text key for a category within one football group. */
export const OTHER_CATEGORY_GROUPS = [
	{gruppo: "Calcio 11 (Maschile)", opzioni: ["Serie C", "Serie D", "Eccellenza", "Promozione", "Prima Categoria", "Seconda Categoria", "Terza Categoria", "Primavera 1", "Primavera 2", "Primavera 3", "Primavera 4", "Juniores Nazionali", "Juniores Regionali", "Juniores Provinciali", "Under 18 Nazionale", "Under 17 Nazionali", "Under 17 Regionali", "Under 17 Provinciali", "Under 16 Nazionali", "Under 16 Regionali", "Under 16 Provinciali", "Under 15 Nazionali", "Under 15 Regionali", "Under 15 Provinciali"]},
	{gruppo: "Calcio 7 (Maschile)", opzioni: ["Open Eccellenza", "Open Serie A", "Open Serie B", "Open Serie C1", "Open Serie C2", "Open A", "Open B", "Open C", "Open Divisione Unica", "Top Junior", "Under 19", "Juniores", "Under 17", "Under 16", "Allievi", "Under 15"]},
	{gruppo: "Calcio 5 (Maschile)", opzioni: ["Serie A", "Serie A2 Élite", "Serie A2", "Serie B", "Serie C1", "Serie C2", "Serie D", "Under 21", "Under 19 Nazionali", "Under 19 Regionali", "Under 17", "Under 15"]},
	{gruppo: "Calcio 11 (Femminile)", opzioni: ["Serie A Femminile", "Serie B Femminile", "Serie C Femminile", "Eccellenza Femminile", "Campionato Primavera 1", "Campionato Primavera 2", "Under 17 Femminile", "Under 15 Femminile"]},
	{gruppo: "Calcio 7 (Femminile)", opzioni: ["Open Eccellenza", "Open Serie A", "Open Serie B", "Under 19", "Under 17", "Under 15"]},
	{gruppo: "Calcio 5 (Femminile)", opzioni: ["Serie A", "Serie B", "Serie C", "Serie D", "Under 19", "Under 17", "Under 15"]},
] as const;

/** Catalogo delle categorie del Giocatore, nell'ordine di selezione. */
export const CATEGORIE_CALCIO_GROUPS = [
	{gruppo: "Calcio a 11 maschile", opzioni: [
		"Qualsiasi",
		"FIGC — Under 15 nazionale Serie A e B",
		"FIGC — Under 15 nazionale Serie C",
		"FIGC — Under 15 regionale Élite",
		"FIGC — Under 15 regionale",
		"FIGC — Under 15 provinciale / interprovinciale",
		"FIGC — Under 16 nazionale Serie A e B",
		"FIGC — Under 16 nazionale Serie C",
		"FIGC — Under 16 regionale",
		"FIGC — Under 16 provinciale / interprovinciale",
		"FIGC — Under 17 nazionale Serie A e B",
		"FIGC — Under 17 nazionale Serie C",
		"FIGC — Under 17 regionale Élite",
		"FIGC — Under 17 regionale",
		"FIGC — Under 17 provinciale / interprovinciale",
		"FIGC — Under 18 nazionale professionisti",
		"FIGC — Under 18 regionale",
		"FIGC-LND — Juniores Under 19 nazionale",
		"FIGC-LND — Juniores Under 19 regionale Élite",
		"FIGC-LND — Juniores Under 19 regionale",
		"FIGC-LND — Juniores Under 19 provinciale / interprovinciale",
		"FIGC — Primavera 1",
		"FIGC — Primavera 2",
		"FIGC — Primavera 3",
		"FIGC — Primavera 4",
		"CSI — Under 15",
		"CSI — Under 16",
		"CSI — Under 17",
		"CSI — Under 18",
		"CSI — Under 20",
		"CSI — Under 22",
		"FIGC — Serie C — Nazionale",
		"FIGC-LND — Serie D — Nazionale",
		"FIGC-LND — Eccellenza — Regionale",
		"FIGC-LND — Promozione — Regionale",
		"FIGC-LND — Prima Categoria — Regionale",
		"FIGC-LND — Seconda Categoria — Territoriale",
		"FIGC-LND — Terza Categoria — Territoriale",
		"FIGC-LND — Amatori",
		"CSI — Open Eccellenza",
		"CSI — Open A",
		"CSI — Open B",
		"CSI — Master",
		"UISP — Serie A1",
		"UISP — Serie A2",
		"Altra categoria",
	]},
	{gruppo: "Calcio a 8 maschile", opzioni: [
		"Qualsiasi",
		"AiCS — Pro League Youth Under 15",
		"AiCS — Pro League Youth Under 17",
		"AiCS — Pro League Youth Under 19",
		"AiCS — Pro League Youth Under 21",
		"Lega Calcio a 8 — Serie A",
		"Lega Calcio a 8 — Serie A2",
		"Lega Calcio a 8 — Serie B",
		"Lega Calcio a 8 — Over 35",
		"Pro League UP — Open",
		"FIGC-LND — Amatori",
		"UISP", "AiCS", "ASI", "Altra categoria",
	]},
	{gruppo: "Calcio a 7 maschile", opzioni: [
		"Qualsiasi",
		"CSI — Under 15", "CSI — Under 16", "CSI — Under 17", "CSI — Under 18", "CSI — Under 20", "CSI — Under 22",
		"CSI — Allievi", "CSI — Juniores", "CSI — Top Junior",
		"FIGC-LND — Amatori",
		"CSI — Open / Amatori", "CSI — Open Eccellenza", "CSI — Open A", "CSI — Open B", "CSI — Open C",
		"CSI — Open Serie A", "CSI — Open Serie B", "CSI — Open Serie C",
		"CSI — Open Golden League", "CSI — Open Silver League", "CSI — Open Bronze League",
		"CSI — Master Senior", "Altra categoria",
	]},
	{gruppo: "Calcio a 5 maschile", opzioni: [
		"Qualsiasi",
		"FIGC — Under 15 regionale",
		"FIGC — Under 15 provinciale / interprovinciale",
		"FIGC — Under 17 regionale",
		"FIGC — Under 17 provinciale / interprovinciale",
		"FIGC-LND — Under 19 nazionale", "FIGC-LND — Under 19 regionale", "FIGC-LND — Under 21 regionale",
		"AiCS — Pro League Youth Under 15", "AiCS — Pro League Youth Under 16", "AiCS — Pro League Youth Under 17",
		"FIGC-LND — Serie A — Nazionale", "FIGC-LND — Serie A2 Élite — Nazionale", "FIGC-LND — Serie A2 — Nazionale",
		"FIGC-LND — Serie B — Nazionale",
		"FIGC-LND — Serie C1 — Regionale", "FIGC-LND — Serie C2 — Regionale", "FIGC-LND — Serie C — Regionale",
		"FIGC-LND — Serie D — Territoriale", "CSI — Open", "Altra categoria",
	]},
	{gruppo: "Calcio a 11 femminile", opzioni: [
		"Qualsiasi",
		"FIGC — Under 15 fase regionale a 9",
		"FIGC — Under 15 Girone Unico Nazionale",
		"FIGC — Under 15 fase interregionale / nazionale",
		"FIGC — Under 17 fase regionale",
		"FIGC — Under 17 Girone Unico Nazionale",
		"FIGC — Under 17 fase interregionale / nazionale",
		"FIGC-LND — Juniores Under 19 regionale",
		"FIGC — Primavera 1 — Nazionale", "FIGC — Primavera 2 — Nazionale",
		"FIGC — Serie A Women — Nazionale", "FIGC — Serie B — Nazionale",
		"FIGC-LND — Serie C — Nazionale", "FIGC-LND — Eccellenza — Regionale", "FIGC-LND — Promozione — Regionale",
		"Altra categoria",
	]},
	{gruppo: "Calcio a 8 femminile", opzioni: [
		"Qualsiasi", "UISP — Top League", "UISP — Fun League", "UISP", "Altra categoria",
	]},
	{gruppo: "Calcio a 7 femminile", opzioni: [
		"Qualsiasi", "CSI — Under 15", "CSI — Under 16", "CSI — Under 18", "CSI — Allieve", "CSI — Juniores",
		"CSI — Open", "CSI — Open Eccellenza", "CSI — Open A", "CSI — Open B", "Altra categoria",
	]},
	{gruppo: "Calcio a 5 femminile", opzioni: [
		"Qualsiasi", "FIGC — Under 15 territoriale", "AiCS — Pro League Youth Under 15", "FIGC-LND — Under 19 nazionale",
		"FIGC-LND — Serie A — Nazionale", "FIGC-LND — Serie B — Nazionale",
		"FIGC-LND — Serie C / Campionato regionale", "FIGC-LND — Serie D — Territoriale", "Altra categoria",
	]},
] as const;

export const PLAYER_CURRENT_CATEGORY_GROUPS = CATEGORIE_CALCIO_GROUPS.map(({gruppo, opzioni}) => ({
	gruppo, opzioni: opzioni.filter(option => option !== "Qualsiasi"),
}));

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

const categoryByKey = new Map([...OTHER_CATEGORY_GROUPS, ...CATEGORIE_CALCIO_GROUPS].flatMap(({gruppo, opzioni}) =>
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
	opzioni.map((category) => ({value: categoryKey(gruppo, category), label: categoryLabel(categoryKey(gruppo, category))})),
);

const currentCategoryKeys = new Set(PLAYER_CURRENT_CATEGORY_GROUPS.flatMap(({gruppo, opzioni}) =>
	opzioni.map(category => categoryKey(gruppo, category)),
));
export function isPlayerCurrentCategory(value: string): boolean {
	return currentCategoryKeys.has(value);
}

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
	const unique = [...new Set(values.map(normalizeCategory))];
	const anyGroups = new Set(unique.flatMap(value => {
		const pair = categoryByKey.get(value);
		return pair?.category === ANY_CATEGORY ? [pair.group] : [];
	}));
	return unique.filter(value => {
		const pair = categoryByKey.get(value);
		return !pair || pair.category === ANY_CATEGORY || !anyGroups.has(pair.group);
	});
}

/** The newly selected option wins when switching between any and specific categories. */
export function updatePlayerCategories(previous: readonly string[], next: readonly string[]): string[] {
	const added = next.filter(value => !previous.includes(value));
	if (added.includes(ANY_CATEGORY)) return [ANY_CATEGORY];
	let values = added.length ? next.filter(value => value !== ANY_CATEGORY) : [...next];
	for (const value of added) {
		const pair = categoryByKey.get(value);
		if (!pair) continue;
		values = values.filter(item => {
			const other = categoryByKey.get(item);
			if (!other || other.group !== pair.group) return true;
			return pair.category === ANY_CATEGORY ? item === value : other.category !== ANY_CATEGORY;
		});
	}
	return normalizeCategories(values);
}

export function categoryLabel(value: string): string {
	const pair = categoryByKey.get(normalizeCategory(value));
	if (!pair) return value;
	if (pair.group === "Calcio a 11 femminile" && pair.category === "FIGC — Under 15 fase regionale a 9") {
		return `Calcio femminile — ${pair.category}`;
	}
	const separator = pair.group.startsWith("Calcio a ") ? " — " : " · ";
	return `${pair.group}${separator}${pair.category}`;
}

export function categoryShortLabel(value: string): string {
	const pair = categoryByKey.get(normalizeCategory(value));
	if (pair) return pair.category;
	const group = CATEGORIE_CALCIO_GROUPS.find(({gruppo}) => value.startsWith(`${gruppo} — `));
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

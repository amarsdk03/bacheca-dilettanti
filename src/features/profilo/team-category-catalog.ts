import {categoryKey, normalizeCategory} from "@/features/pubblica-annuncio/types/category-catalog";

/** Categorie della Prima Squadra, indipendenti dai cataloghi di ricerca. */
export const TEAM_CATEGORY_GROUPS = [
	{gruppo: "Calcio a 11 maschile", opzioni: ["FIGC — Serie A", "FIGC — Serie B", "FIGC — Serie C", "FIGC-LND — Serie D", "FIGC-LND — Eccellenza", "FIGC-LND — Promozione", "FIGC-LND — Prima Categoria", "FIGC-LND — Seconda Categoria", "FIGC-LND — Terza Categoria", "FIGC-LND — Amatori", "CSI — Open Eccellenza", "CSI — Open A", "CSI — Open B", "CSI — Master", "UISP — Serie A1", "UISP — Serie A2", "Altra categoria"]},
	{gruppo: "Calcio a 8 maschile", opzioni: ["Lega Calcio a 8 — Serie A", "Lega Calcio a 8 — Serie A2", "Lega Calcio a 8 — Serie B", "UISP", "AICS", "ASI", "Altra categoria"]},
	{gruppo: "Calcio a 7 maschile", opzioni: ["FIGC-LND — Amatori", "CSI — Open / Amatori", "CSI — Open Eccellenza", "CSI — Open A", "CSI — Open B", "CSI — Open C", "CSI — Open Serie A", "CSI — Open Serie B", "CSI — Open Serie C", "CSI — Open Golden League", "CSI — Open Silver League", "CSI — Open Bronze League", "CSI — Master Senior", "Altra categoria"]},
	{gruppo: "Calcio a 5 maschile", opzioni: ["FIGC-LND — Serie A", "FIGC-LND — Serie A2 Élite", "FIGC-LND — Serie A2", "FIGC-LND — Serie B", "FIGC-LND — Serie C1", "FIGC-LND — Serie C2", "FIGC-LND — Serie C regionale", "FIGC-LND — Serie D", "CSI — Open", "Altra categoria"]},
	{gruppo: "Calcio a 11 femminile", opzioni: ["FIGC — Serie A Women", "FIGC — Serie B", "FIGC-LND — Serie C", "FIGC-LND — Eccellenza", "FIGC-LND — Promozione", "Altra categoria"]},
	{gruppo: "Calcio a 8 femminile", opzioni: ["UISP — Top League", "UISP — Fun League", "UISP", "Altra categoria"]},
	{gruppo: "Calcio a 7 femminile", opzioni: ["CSI — Open", "CSI — Open Eccellenza", "CSI — Open A", "CSI — Open B", "Altra categoria"]},
	{gruppo: "Calcio a 5 femminile", opzioni: ["FIGC-LND — Serie A", "FIGC-LND — Serie B", "FIGC-LND — Serie C / Campionato regionale", "FIGC-LND — Serie D", "Altra categoria"]},
] as const;

export const TEAM_CATEGORY_OPTIONS = TEAM_CATEGORY_GROUPS.flatMap(({gruppo, opzioni}) =>
 opzioni.map(category => ({value: categoryKey(gruppo, category), label: `${gruppo} — ${category}`})),
);
const labels = new Map(TEAM_CATEGORY_OPTIONS.map(({value, label}) => [value, label]));
export function isTeamCategory(value: unknown): value is string {
 return typeof value === "string" && labels.has(value);
}

/** I valori obsoleti senza una corrispondenza certa vengono svuotati. */
export function normalizeTeamCategory(value: string | null | undefined): string {
 if (!value) return "";
 if (isTeamCategory(value)) return value;
 const match = /^Calcio (11|7|5) \((Maschile|Femminile)\)::(.+)$/.exec(normalizeCategory(value));
 if (!match) return "";
 const [, size, gender, legacy] = match;
 let category = legacy.replace(/ Femminile$/, "");
 if (size === "11") {
  category = category === "Serie A" ? (gender === "Femminile" ? "FIGC — Serie A Women" : "FIGC — Serie A")
   : category === "Serie B" || (category === "Serie C" && gender === "Maschile") ? `FIGC — ${category}` : `FIGC-LND — ${category}`;
 } else if (size === "7") category = `CSI — ${category}`;
 else category = `FIGC-LND — ${category === "Serie C" && gender === "Femminile" ? "Serie C / Campionato regionale" : category}`;
 const key = categoryKey(`Calcio a ${size} ${gender.toLowerCase()}`, category);
 return isTeamCategory(key) ? key : "";
}
export function teamCategoryLabel(value: string | null | undefined): string {
 return labels.get(normalizeTeamCategory(value)) ?? "";
}

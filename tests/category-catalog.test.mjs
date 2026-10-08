import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
	if (cache.has(file)) return cache.get(file).exports;
	const loaded = {exports: {}};
	cache.set(file, loaded);
	const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {
		fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
	});
	new Function("require", "module", "exports", outputText)(specifier => {
		if (specifier === "server-only") return {};
		if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
		const base = specifier.startsWith("@/") ? path.join(root, "src", specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
		return load([base, base + ".ts", base + ".tsx"].find(existsSync));
	}, loaded, loaded.exports);
	return loaded.exports;
}
const source = relative => load(path.join(root, relative));

test("category pairs keep homonymous labels separate in the catalogue, filters and public details", () => {
	const catalog = source("src/features/pubblica-annuncio/types/category-catalog.ts");
	const {announcementContent} = source("src/features/annunci/announcement-content.ts");
	const {parseAnnouncementDirectoryQuery, getAnnouncementFiltersForDirectoryType} = source("src/features/annunci/announcement-model.ts");
	assert.equal(catalog.CATEGORY_FILTER_OPTIONS.length, 147);
	assert.equal(new Set(catalog.CATEGORY_FILTER_OPTIONS.map(option => option.value)).size, 147);
	assert.equal(catalog.FIGURA_PROFESSIONALE_OPTIONS.length, 22);
	assert.ok(catalog.FIGURA_PROFESSIONALE_GROUPS.find(group => group.gruppo === "Direzione e organizzazione").opzioni.includes("Commerciale / Business"));
	assert.ok(catalog.FIGURA_PROFESSIONALE_GROUPS.some(group => group.gruppo === "Staff medico"));
	const male = catalog.categoryKey("Calcio a 5 maschile", "FIGC-LND — Serie A — Nazionale");
	const female = catalog.categoryKey("Calcio a 5 femminile", "FIGC-LND — Serie A — Nazionale");
	assert.notEqual(male, female);
	assert.ok(catalog.CATEGORY_FILTER_OPTIONS.some(option => option.value === male));
	assert.ok(catalog.CATEGORY_FILTER_OPTIONS.some(option => option.value === female));
	assert.equal(parseAnnouncementDirectoryQuery({type: "annuncio_giocatore", categorieRicercate: male}).filters.categorieRicercate, male);
	assert.equal(parseAnnouncementDirectoryQuery({type: "annuncio_squadra", categoriaAttuale: female}).filters.categoriaAttuale, undefined);
	assert.deepEqual(getAnnouncementFiltersForDirectoryType("annuncio_giocatore"), ["annoDa", "annoA", "genere", "categorieRicercate", "regione", "ruolo", "tipologia"]);
	assert.deepEqual(getAnnouncementFiltersForDirectoryType("annuncio_staff_sportivo"), ["figura", "regione", "tipologia"]);
	assert.deepEqual(getAnnouncementFiltersForDirectoryType("annuncio_squadra"), ["ricercaSquadra", "regione"]);
	assert.deepEqual(getAnnouncementFiltersForDirectoryType("annuncio_arbitro"), ["regione", "tipologia"]);
	assert.equal(catalog.normalizeCategory("Serie C"), catalog.categoryKey("Calcio 11 (Maschile)", "Serie C"));
	assert.equal(catalog.normalizeCategory("Under 15"), "Under 15");
	assert.deepEqual(catalog.normalizeCategories([male, catalog.ANY_CATEGORY]), [catalog.ANY_CATEGORY]);
	const content = announcementContent("annuncio_giocatore", {categorie_ricercate: [male, female, "Under 15"]}, [], true);
	assert.deepEqual(content.filters.categories, [male, female, "Under 15"]);
	assert.deepEqual(content.fields.find(field => field.label === "Categorie ricercate").items, [
		"Calcio a 5 maschile — FIGC-LND — Serie A — Nazionale", "Calcio a 5 femminile — FIGC-LND — Serie A — Nazionale", "Under 15",
	]);
});

test("player catalogue preserves group order, youth labels and the women's nine-a-side exception", () => {
	const catalog = source("src/features/pubblica-annuncio/types/category-catalog.ts");
	assert.deepEqual(catalog.CATEGORIE_CALCIO_GROUPS.map(({gruppo}) => gruppo), [
		"Calcio a 11 maschile", "Calcio a 8 maschile", "Calcio a 7 maschile", "Calcio a 5 maschile",
		"Calcio a 11 femminile", "Calcio a 8 femminile", "Calcio a 7 femminile", "Calcio a 5 femminile",
	]);
	assert.deepEqual(catalog.CATEGORIE_CALCIO_GROUPS.map(({opzioni}) => opzioni.length), [46, 15, 24, 21, 16, 5, 11, 9]);
	for (const {gruppo, opzioni} of catalog.CATEGORIE_CALCIO_GROUPS) {
		assert.equal(opzioni[0], "Qualsiasi");
		assert.equal(opzioni.at(-1), "Altra categoria");
		assert.deepEqual(catalog.PLAYER_CURRENT_CATEGORY_GROUPS.find(group => group.gruppo === gruppo).opzioni, opzioni.slice(1));
		assert.equal(catalog.isPlayerCurrentCategory(catalog.categoryKey(gruppo, "Qualsiasi")), false);
		for (const category of opzioni.slice(1)) assert.equal(catalog.isPlayerCurrentCategory(catalog.categoryKey(gruppo, category)), true);
	}
	assert.equal(catalog.isPlayerCurrentCategory("Qualsiasi"), false);
	const exceptional = catalog.categoryKey("Calcio a 11 femminile", "FIGC — Under 15 fase regionale a 9");
	assert.equal(catalog.categoryLabel(exceptional), "Calcio femminile — FIGC — Under 15 fase regionale a 9");
	assert.ok(catalog.CATEGORY_FILTER_OPTIONS.some(({value, label}) => value === exceptional && label === catalog.categoryLabel(exceptional)));
	assert.equal(catalog.categoryShortLabel(exceptional), "FIGC — Under 15 fase regionale a 9");
});

test("player any selections are exclusive globally or within their group, including server normalization", () => {
	const {categoryKey, normalizeCategories, updatePlayerCategories} = source("src/features/pubblica-annuncio/types/category-catalog.ts");
	const any = categoryKey("Calcio a 11 maschile", "Qualsiasi");
	const specific = categoryKey("Calcio a 11 maschile", "FIGC — Under 15 regionale");
	const other = categoryKey("Calcio a 8 maschile", "AiCS — Pro League Youth Under 15");
	assert.deepEqual(updatePlayerCategories([specific, other], [specific, other, any]), [other, any]);
	assert.deepEqual(updatePlayerCategories([any, other], [any, other, specific]), [other, specific]);
	assert.deepEqual(updatePlayerCategories([any, other], [any, other, "Qualsiasi"]), ["Qualsiasi"]);
	assert.deepEqual(updatePlayerCategories(["Qualsiasi"], ["Qualsiasi", specific]), [specific]);
	assert.deepEqual(updatePlayerCategories(["Qualsiasi"], []), []);
	assert.deepEqual(updatePlayerCategories([any, other], [other]), [other]);
	assert.deepEqual(normalizeCategories([specific, any, other, any]), [any, other]);
	assert.deepEqual(normalizeCategories([any, other, "Qualsiasi"]), ["Qualsiasi"]);
});

const engineUrl = new URL("../node_modules/.cache/interaction-tests/node_modules/@electric-sql/pglite/dist/index.js", import.meta.url);
const migrationUrl = new URL("../supabase/migrations/20260926173431_group_football_categories_and_figures.sql", import.meta.url);
test("category migration converts only certain historical groups and figure aliases", {skip: !existsSync(engineUrl) && "Optional PGlite runner is not installed"}, async t => {
	const {PGlite} = await import(engineUrl.href);
	const db = await PGlite.create();
	t.after(() => db.close());
	await db.exec(`
		create table public.profilo_giocatore (categorie_ricercate text[]);
		create table public.annuncio_giocatore (categorie_ricercate text[]);
		create table public.annuncio_squadra_cerca_partita (categorie_avversario text[]);
		create table public.annuncio_staff_sportivo (categorie_ricercate text[], figure_professionali text[]);
		create table public.annuncio_arbitro (categorie_ricercate text[]);
		create table public.profilo_staff_sportivo (figure_professionali text[]);
		create table public.profilo_professionista_studente (figure_professionali text[]);
		create table public.annuncio_squadra_cerca_staff (figura_ricercata text);
		insert into public.profilo_giocatore values (array['Serie C', 'Serie A', 'Under 15', 'Calcio 11 (Maschile)::Serie C']);
		insert into public.annuncio_squadra_cerca_partita values (array['Serie D', 'Serie A C5']);
		insert into public.profilo_staff_sportivo values (array['Commerciale/Business', 'Coaching/Preparatore']);
		insert into public.annuncio_squadra_cerca_staff values ('Fisioterapia/Medicina sportiva');
	`);
	const migration = readFileSync(migrationUrl, "utf8");
	await db.exec(migration);
	await db.exec(migration);
	assert.deepEqual((await db.query("select categorie_ricercate from public.profilo_giocatore")).rows[0].categorie_ricercate,
		["Calcio 11 (Maschile)::Serie C", "Serie A", "Under 15"]);
	assert.deepEqual((await db.query("select categorie_avversario from public.annuncio_squadra_cerca_partita")).rows[0].categorie_avversario,
		["Calcio 11 (Maschile)::Serie D", "Serie A C5"]);
	assert.deepEqual((await db.query("select figure_professionali from public.profilo_staff_sportivo")).rows[0].figure_professionali,
		["Commerciale / Business", "Coaching/Preparatore"]);
	assert.equal((await db.query("select figura_ricercata from public.annuncio_squadra_cerca_staff")).rows[0].figura_ricercata,
		"Fisioterapia / Medicina sportiva");
});

import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {test} from "node:test";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
function sourceLoader(overrides = {}) {
	const cache = new Map();
	function load(file) {
		if (cache.has(file)) return cache.get(file).exports;
		const mod = {exports: {}};
		cache.set(file, mod);
		const {outputText} = ts.transpileModule(readFileSync(file, "utf8") + (/[\\/]server[\\/]queries\.ts$/.test(file) && /[\\/](annunci|profili)[\\/]/.test(file) ? "\nexport {matchesDirectoryQuery};" : ""), {fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}});
		new Function("require", "module", "exports", outputText)(name => {
			if (Object.hasOwn(overrides, name)) return overrides[name];
			if (name === "server-only") return {};
			if (!name.startsWith("@/") && !name.startsWith(".")) return require(name);
			const base = name.startsWith("@/") ? path.join(root, "apps/web/src", name.slice(2)) : path.resolve(path.dirname(file), name);
			return load([base, `${base}.ts`, `${base}.tsx`].find(existsSync));
		}, mod, mod.exports);
		return mod.exports;
	}
	return relative => load(path.join(root, relative));
}


test("regional matching precedes type-specific filters in both directories", () => {
 const load = sourceLoader({"@/lib/supabase/admin": {createAdminClient() {throw Error("No remote services allowed");}}});
 const announcements = load("apps/web/src/features/annunci/announcement-model.ts");
 const profiles = load("apps/web/src/features/profili/profile-directory-model.ts");
 const matchAnnouncement = load("apps/web/src/features/annunci/server/queries.ts").matchesDirectoryQuery;
 const matchProfile = load("apps/web/src/features/profili/server/queries.ts").matchesDirectoryQuery;
 for (const [api, parseName, match, type, types, candidate] of [
  [announcements, "parseAnnouncementDirectoryQuery", matchAnnouncement, "annuncio_giocatore", ["annuncio_giocatore", "annuncio_staff_sportivo"], region => ({item: {type: "annuncio_giocatore"}, searchText: "calcio", filterData: {regions: [region]}})],
  [profiles, "parseProfileDirectoryQuery", matchProfile, "giocatore", ["giocatore", "squadra"], region => ({type: "giocatore", searchText: "calcio", filterData: {regions: [region]}})],
 ]) {
  for (const selected of [undefined, type, types]) {
   const query = api[parseName]({type: selected, q: "calcio", regione: ["Lazio", "Toscana"]});
   for (const region of ["Lazio", "Toscana", "Lombardia"]) {
    const actual = match(candidate(region), query, announcements.ANNOUNCEMENT_TYPES);
    assert.equal(actual, region !== "Lombardia", `${parseName}: ${selected}: ${region}`);
   }
   assert.equal(match(candidate("Lazio"), {...query, q: "basket"}, announcements.ANNOUNCEMENT_TYPES), false);
   assert.equal(match(candidate("Lombardia"), {...query, filters: {...query.filters, regione: []}}, announcements.ANNOUNCEMENT_TYPES), true);
  }
 }
});

test("legacy team links expand correctly and all four selectors share one icon", () => {
 const api = sourceLoader()("apps/web/src/features/annunci/announcement-model.ts");
 assert.deepEqual(api.parseAnnouncementDirectoryQuery({type: "annuncio_squadra"}).types, [...api.TEAM_ANNOUNCEMENT_TYPES]);
 for (const search of api.ANNOUNCEMENT_TEAM_SEARCHES) {
  const type = `annuncio_squadra_cerca_${search}`;
  assert.deepEqual(api.parseAnnouncementDirectoryQuery({type: "annuncio_squadra", ricercaSquadra: search}).types, [type]);
  assert.deepEqual(api.parseAnnouncementDirectoryQuery({type}).types, [type]);
 }
 const options = api.ANNOUNCEMENT_DIRECTORY_OPTIONS.filter(({profileType}) => profileType === "squadra");
 assert.equal(options.length, 4);
 assert.equal(new Set(options.map(({icon}) => icon)).size, 1);
});

test("regional counts count each result once per region", () => {
 const {countDirectoryRegions} = sourceLoader()("apps/web/src/components/navigation/directory-region-counts.ts");
 assert.deepEqual(countDirectoryRegions([["Lazio", "Lazio", "Toscana"], ["Lazio"], []], item => item), {Lazio: 2, Toscana: 1});
});

test("pagination preserves repeated regions, profile seed and active page", () => {
 const load = sourceLoader();
 const {parseProfileDirectoryQuery, buildProfilesHref} = load("apps/web/src/features/profili/profile-directory-model.ts");
 const query = parseProfileDirectoryQuery({regione: ["Lazio", "Toscana"], q: "calcio", seed: "a".repeat(32)});
 const Pagination = load("apps/web/src/components/navigation/DirectoryPagination.tsx").default;
 const html = renderToStaticMarkup(React.createElement(Pagination, {currentPage: 5, totalPages: 10, label: "Pagine", href: page => buildProfilesHref(query, {page})}));
 assert.match(html, /aria-current="page"/);
 assert.match(html, /regione=Lazio&amp;regione=Toscana/);
 assert.match(html, /seed=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/);
 assert.match(html, /Altre pagine/);
 assert.match(html, /Precedente/);
 assert.match(html, /Successiva/);
 assert.equal(renderToStaticMarkup(React.createElement(Pagination, {currentPage: 1, totalPages: 1, label: "Pagine", href: () => "/profili"})), "");
});

test("measurements accept optional positive values and normalize one decimal only", () => {
 const {normalizePlayerMeasurement: normalize} = sourceLoader()("apps/web/src/features/profilo/player-measurements.ts");
 for (const value of [null, "", " "]) assert.equal(normalize(value, "height"), null);
 for (const value of ["180", "00180"]) assert.equal(normalize(value, "height"), "180");
 for (const value of ["75,5", "75.5"]) assert.equal(normalize(value, "weight"), "75.5");
 assert.equal(normalize("75.0", "weight"), "75");
 assert.equal(normalize("0,1", "weight"), "0.1");
 for (const kind of ["height", "weight"]) for (const value of ["0", "-1", "+1", "1e2", "NaN", "Infinity", "cm", "75 kg", "12.34", "1,2,3", 180]) assert.equal(normalize(value, kind), undefined, `${kind}: ${value}`);
 for (const value of ["180.0", "180,5"]) assert.equal(normalize(value, "height"), undefined);
});

test("profile and registration server parsers reject forged measurements", () => {
 const load = sourceLoader();
 const {createProfileDrafts, createProfileLocations} = load("apps/web/src/features/profilo/profile-model.ts");
 const {createProfileSocialLinks} = load("apps/web/src/features/profilo/profile-social-links.ts");
 const {createRegistrationPayload} = load("apps/web/src/features/registrati/registration-payload.ts");
 const {parseProfileEditorPayload, parseRegistrationPayload} = load("apps/web/src/features/registrati/server/registration.ts");
 const drafts = createProfileDrafts(), locations = createProfileLocations(), social = createProfileSocialLinks();
 Object.assign(drafts.giocatore, {nome: "Mario", anno_nascita: "2000", mese_nascita: "Gennaio", giorno_nascita: "01", genere: "Uomo", disponibilita: "svincolato", tipologie_sport: ["Calcio 11"], ruoli_sport: {principali: ["Difensore"], specifici: []}});
 locations.giocatore = [{regione: "Lazio", citta: "Roma"}];
 const editor = () => parseProfileEditorPayload({type: "giocatore", draft: drafts.giocatore, locations: locations.giocatore, socialLinks: social.giocatore});
 const register = () => parseRegistrationPayload(JSON.stringify(createRegistrationPayload(["giocatore"], "giocatore", drafts, locations, social, true, false)));
 Object.assign(drafts.giocatore, {altezza: "180", peso: "75,5"});
 assert.equal(editor().draft.peso, "75.5");
 assert.doesNotThrow(register);
 for (const [field, invalid] of [["altezza", "180.5"], ["peso", "75.55"], ["altezza", "abc"], ["peso", "0"]]) {
  const old = drafts.giocatore[field]; drafts.giocatore[field] = invalid;
  assert.throws(editor, error => error.profileType === "giocatore");
  assert.throws(register, error => error.profileType === "giocatore");
  drafts.giocatore[field] = old;
 }
});

test("combobox input, clear and trigger inherit root and fieldset disabled state", () => {
 const load = sourceLoader();
 const {Combobox, ComboboxInput, ComboboxContent, ComboboxItem, ComboboxList} = load("apps/web/src/components/ui/combobox.tsx");
 const {FieldSet} = load("apps/web/src/components/ui/field.tsx");
 for (const fieldset of [false, true]) {
  const root = React.createElement(Combobox, {disabled: !fieldset, items: ["Roma"], defaultOpen: true},
   React.createElement(ComboboxInput, {showClear: true, value: "Roma", onChange() {}}),
   React.createElement(ComboboxContent, null, React.createElement(ComboboxList, null, React.createElement(ComboboxItem, {value: "Roma"}, "Roma"))));
  const html = renderToStaticMarkup(fieldset ? React.createElement(FieldSet, {disabled: true}, root) : root);
  const input = html.match(/<input[^>]+>/)[0];
  assert.match(input, /disabled/);
  assert.match(input, /aria-expanded="false"/);
  assert.ok([...html.matchAll(/<button[^>]+>/g)].every(([button]) => /disabled/.test(button)));
 }
});

import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
function loader(stubs = {}) {
	const cache = new Map();
	function load(file) {
		file = path.resolve(root, file);
		if (cache.has(file)) return cache.get(file).exports;
		const mod = {exports: {}}; cache.set(file, mod);
		const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}});
		new Function("require", "module", "exports", outputText)(name => {
			if (name in stubs) return stubs[name];
			if (name === "server-only") return {};
			if (!name.startsWith("@/") && !name.startsWith(".")) return require(name);
			const base = name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : path.resolve(path.dirname(file), name);
			return load([base, `${base}.ts`, `${base}.tsx`].find(candidate => existsSync(candidate)));
		}, mod, mod.exports);
		return mod.exports;
	}
	return load;
}
const load = loader();
const {currentCategoryLabel, currentPlayerCareer} = load("src/features/profilo/current-team.ts");
const {TEAM_CATEGORY_GROUPS, TEAM_CATEGORY_OPTIONS} = load("src/features/profilo/team-category-catalog.ts");

test("all eight team groups offer tournaments and resolve the named competition", () => {
	const tournaments = TEAM_CATEGORY_OPTIONS.filter(option => option.value.endsWith("::Tornei"));
	assert.equal(tournaments.length, 8);
	assert.equal(currentCategoryLabel("Calcio a 11 maschile::FIGC — Serie A"), "Calcio a 11 maschile — FIGC — Serie A");
	assert.ok(tournaments.every(option => option.label.endsWith(" — Tornei")));
	for (const {gruppo, opzioni} of TEAM_CATEGORY_GROUPS) {
		assert.equal(opzioni.at(-1), "Altra categoria", gruppo);
		assert.equal(opzioni.at(-2), "Tornei", gruppo);
		assert.equal(TEAM_CATEGORY_OPTIONS.find(option => option.value === `${gruppo}::Tornei`).label, `${gruppo} — Tornei`);
	}
	assert.equal(currentCategoryLabel("Calcio a 7 femminile::Tornei", "Coppa Primavera"), "Coppa Primavera");
	assert.equal(currentCategoryLabel("Calcio a 7 femminile::Tornei", ""), "Calcio a 7 femminile — Tornei");
});

test("managed career precedes history, uses the tournament and avoids matching open duplicates", () => {
	const open = {titolo: "ASD Roma", ente: "Coppa Primavera", periodoA: "oggi"};
	const old = {titolo: "ASD Storica", ente: "Serie D", periodoA: "2023"};
	const player = {squadra_attuale_nome: "ASD Roma", categoria_attuale: "Calcio a 7 femminile::Tornei", squadra_attuale_torneo: "Coppa Primavera", squadra_attuale_dal: "2024", storico_carriera: [open, old]};
	const result = currentPlayerCareer(player);
	assert.equal(result.length, 2); assert.equal(result[0].ente, "Coppa Primavera");
	assert.equal(result[0].periodoA, "oggi"); assert.equal(result[1], old);
	assert.deepEqual(currentPlayerCareer({...player, disponibilita: "svincolato"}), [open, old]);
});

test("profile payloads accept instance references, reject invalid IDs and retain partial archived periods", () => {
	const {createProfileDrafts} = load("src/features/profilo/profile-model.ts");
	const {createProfileSocialLinks} = load("src/features/profilo/profile-social-links.ts");
	const {parseProfileEditorPayload} = load("src/features/registrati/server/registration.ts");
	const drafts = createProfileDrafts();
	Object.assign(drafts.giocatore, {nome: "Mario", anno_nascita: "2000", mese_nascita: "Gennaio", giorno_nascita: "01", genere: "Uomo", disponibilita: "sotto-contratto", tipologie_sport: ["Calcio 11"], ruoli_sport: {principali: ["Difensore"], specifici: []}, squadra_attuale_nome: "ASD Roma", squadra_attuale_id: 10, squadra_attuale_dal: "2024", categoria_attuale: "Calcio a 7 femminile::Tornei", storico_carriera: [{titolo: "Storica", ente: "Coppa", periodoDa: "", periodoA: "2023"}]});
	const parse = (type) => parseProfileEditorPayload({type, draft: drafts[type], locations: [{regione: "Lazio", citta: "Roma"}], socialLinks: createProfileSocialLinks()[type]});
	assert.equal(parse("giocatore").draft.squadra_attuale_id, 10);
	assert.equal(parse("giocatore").draft.storico_carriera[0].periodoA, "2023");
	drafts.giocatore.squadra_attuale_id = -1;
	assert.throws(() => parse("giocatore"));
	drafts.giocatore.disponibilita = "svincolato";
	assert.equal(parse("giocatore").draft.squadra_attuale_id, null);
	assert.equal(parse("giocatore").draft.squadra_attuale_nome, null);
	Object.assign(drafts.squadra, {nome_societa: "ASD", tipologie_sport: ["Calcio 7"], categoria_attuale: "Calcio a 7 femminile::Tornei", torneo_attuale_nome: "Coppa", torneo_attuale_id: 30});
	assert.equal(parse("squadra").draft.torneo_attuale_id, 30);
	drafts.squadra.categoria_attuale = TEAM_CATEGORY_OPTIONS[0].value;
	assert.equal(parse("squadra").draft.torneo_attuale_id, null);
	assert.equal(parse("squadra").draft.torneo_attuale_nome, null);
});

test("managed career fields disable team, category and end period, allowing the start season", () => {
	function Wrapper({children}) {return React.createElement("div", null, children);}
	const ui = loader({
		"@/components/ui/field": {Field: Wrapper, FieldGroup: Wrapper, FieldLabel: Wrapper},
		"@/components/ui/input": {Input: props => React.createElement("input", {...props, readOnly: true})},
		"@/components/ui/select": {Select: Wrapper, SelectContent: Wrapper, SelectGroup: Wrapper, SelectItem: Wrapper, SelectTrigger: Wrapper, SelectValue: Wrapper},
		"@/features/profilo/TeamProfileComboboxField": {default: Wrapper},
		"./TeamProfileComboboxField": {default: Wrapper},
	});
	const {CurrentPlayerCareerFields} = ui("src/features/profilo/CurrentPlayerTeamFields.tsx");
	const {createProfileDrafts} = load("src/features/profilo/profile-model.ts");
	const draft = {...createProfileDrafts().giocatore, squadra_attuale_nome: "Roma", categoria_attuale: "Calcio a 7 femminile::Tornei", squadra_attuale_torneo: "Coppa"};
	const html = renderToStaticMarkup(React.createElement(CurrentPlayerCareerFields, {prefix: "test", draft, onFromChange() {}}));
	assert.match(html, /disabled=""[^>]*value="Ad oggi"/);
	assert.match(html, /disabled=""[^>]*value="Roma"/);
	assert.match(html, /disabled=""[^>]*value="Coppa"/);
	assert.match(html, /Stagione: dal/);
});

test("adding a subprofile starts empty while editing keeps the saved draft", () => {
	function Wrapper({children}) {return React.createElement("div", null, children);}
	const dialog = Object.fromEntries(["AlertDialog", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogFooter", "AlertDialogHeader", "AlertDialogTitle"].map(name => [name, Wrapper]));
	const ui = loader({
		"@/components/ui/alert-dialog": dialog,
		"@/components/ui/alert": {Alert: Wrapper, AlertDescription: Wrapper, AlertTitle: Wrapper},
		"@/components/ui/button": {Button: Wrapper},
		"@/components/ui/scroll-area": {ScrollArea: Wrapper},
		"@/components/ui/toast": {toast: {add() {}}},
		"@/features/profilo/ProfileDetailsForm": {__esModule: true, default: props => React.createElement("pre", null, JSON.stringify({draft: props.drafts.giocatore, locations: props.locations.giocatore, socials: props.socialLinks}))},
	});
	const Dialog = ui("src/features/profilo/ProfileEditorDialog.tsx").default;
	const {createProfileDrafts, createProfileLocations} = load("src/features/profilo/profile-model.ts");
	const {createProfileSocialLinks} = load("src/features/profilo/profile-social-links.ts");
	const drafts = createProfileDrafts(), locations = createProfileLocations(), socialLinks = createProfileSocialLinks();
	drafts.giocatore.nome = "OLD-NAME";
	locations.giocatore = [{regione: "Lazio", citta: "OLD-CITY"}];
	socialLinks.giocatore.website = "https://OLD-SOCIAL.example";
	const props = {professionalRegions: [], profileType: "giocatore", drafts, locations, socialLinks, onClose() {}, onSave() {}};
	const add = renderToStaticMarkup(React.createElement(Dialog, {...props, mode: "add"}));
	const edit = renderToStaticMarkup(React.createElement(Dialog, {...props, mode: "edit"}));
	assert.doesNotMatch(add, /OLD-/); assert.match(edit, /OLD-NAME/); assert.match(edit, /OLD-CITY/); assert.match(edit, /OLD-SOCIAL/);
});

test("a recreated team never resolves an earlier instance's saved name or link", () => {
	const {publicTeamExperienceNames} = load("src/features/profilo/team-profile.ts");
	const profileId = "11111111-1111-4111-8111-111111111111";
	const row = {titolo: "Squadra precedente", squadraProfiloId: profileId, squadraIstanzaId: 10};
	const recreated = {profileId, subprofileId: 11, name: "Squadra ricreata", anonymousName: false};
	const result = publicTeamExperienceNames([row], new Map([[profileId, recreated]]), "titolo");
	assert.equal(result[0].titolo, "Squadra precedente"); assert.equal(result[0].squadraProfiloId, null);
	const anonymous = {...recreated, subprofileId: 10, anonymousName: true, name: "Squadra"};
	assert.equal(publicTeamExperienceNames([row], new Map([[profileId, anonymous]]), "titolo")[0].titolo, "Squadra");
});

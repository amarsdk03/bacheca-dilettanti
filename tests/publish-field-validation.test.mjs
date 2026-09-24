import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/features/pubblica-annuncio/publish-field-validation.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
	compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText;
const {isValidIsoDate, isValidPhone, isValidTime, parseOptionalMoney} = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

const modelSource = readFileSync(new URL("../src/features/pubblica-annuncio/publish-model.ts", import.meta.url), "utf8");
const modelJavaScript = ts.transpileModule(modelSource, {
	compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;
const modelModule = {exports: {}};
const fieldValidators = {isValidIsoDate, isValidPhone, isValidTime, parseOptionalMoney};
vm.runInNewContext(modelJavaScript, {
	module: modelModule,
	exports: modelModule.exports,
	require(specifier) {
		if (specifier.endsWith("profile-required-fields")) return {getProfileRequiredFieldErrors: () => ({})};
		if (specifier.endsWith("publish-field-validation")) return fieldValidators;
		if (specifier.endsWith("pubblicaAnnuncio")) return {EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/};
		if (specifier.endsWith("announcementExtras")) return {isLinkAnnuncioValid: (value) => value === "" || /^https?:\/\//.test(value)};
		throw new Error(`Unexpected import: ${specifier}`);
	},
	Date,
	structuredClone,
});
const {createAnnouncementDetailsDrafts, getAnnouncementValidationErrors} = modelModule.exports;

const profileSource = readFileSync(new URL("../src/features/profilo/profile-required-fields.ts", import.meta.url), "utf8");
const profileJavaScript = ts.transpileModule(profileSource, {
	compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;
const profileModule = {exports: {}};
vm.runInNewContext(profileJavaScript, {
	module: profileModule,
	exports: profileModule.exports,
	require(specifier) {
		if (specifier.endsWith("publish-field-validation")) return fieldValidators;
		throw new Error(`Unexpected import: ${specifier}`);
	},
});
const {getProfileRequiredFieldErrors} = profileModule.exports;

test("publication dates reject impossible calendar days and year zero", () => {
	assert.equal(isValidIsoDate("2024-02-29"), true);
	assert.equal(isValidIsoDate("2026-02-29"), false);
	assert.equal(isValidIsoDate("0000-01-01"), false);
	assert.equal(isValidIsoDate("2026-12-31"), true);
});

test("publication money accepts two decimal amounts without floating point comparison", () => {
	for (const amount of [0.29, 1.13, 19.99, "19,99", "99999999.99"]) {
		assert.notEqual(parseOptionalMoney(amount), undefined, String(amount));
	}
	for (const amount of ["19.999", -1, "100000000", "1e3", Number.POSITIVE_INFINITY]) {
		assert.equal(parseOptionalMoney(amount), undefined, String(amount));
	}
	assert.equal(parseOptionalMoney(""), null);
});

test("publication times and phone numbers follow the server constraints", () => {
	assert.equal(isValidTime("18:30"), true);
	assert.equal(isValidTime("24:00"), false);
	assert.equal(isValidPhone("+39 333 123 4567"), true);
	assert.equal(isValidPhone("+39 123!456"), false);
	assert.equal(isValidPhone("12345"), false);
	assert.equal(isValidPhone("123456789012345678901"), false);
});

test("all nine announcement types pass client validation with complete details", () => {
	const drafts = createAnnouncementDetailsDrafts();
	drafts.giocatore.descrizione_aggiuntiva = "Cerco una squadra.";
	drafts.squadraCercaGiocatore = {...drafts.squadraCercaGiocatore, ruoli_principali: ["Difensore"], descrizione_aggiuntiva: "Cerchiamo un giocatore."};
	drafts.squadraCercaStaff = {...drafts.squadraCercaStaff, figura_ricercata: "Allenatore", requisiti: "Esperienza", compenso_mensile: "19.99", periodo_dal: "2026-10-01", periodo_al: "2026-12-31"};
	drafts.squadraCercaPartita = {...drafts.squadraCercaPartita, categorie_avversario: ["Under 17"], periodo_dal: "2026-10-01", periodo_al: "2026-12-31", orario_dalle: "18:30", orario_alle: "20:00"};
	drafts.squadraCercaSponsor = {...drafts.squadraCercaSponsor, categoria_settore: "Locale", supporto_cercato: "Supporto", offerta_fornita: "Visibilità"};
	drafts.staffSportivo = {...drafts.staffSportivo, tipologie_sport: ["Calcio a 11"], descrizione_aggiuntiva: "Cerco incarico."};
	drafts.arbitro = {...drafts.arbitro, tipologie_sport: ["Calcio a 11"], descrizione_aggiuntiva: "Disponibile."};
	drafts.torneoEvento = {...drafts.torneoEvento, nome_evento: "Torneo", tipologie_sport: ["Calcio a 11"], descrizione_aggiuntiva: "Torneo locale."};
	drafts.campoImpianto = {...drafts.campoImpianto, tipologie_sport: ["Calcio a 11"], descrizione_aggiuntiva: "Campo disponibile.", costo_partenza: "0.29"};
	const locations = [{regione: "Lazio", citta: "Roma"}];
	const contacts = {email: "public@example.com", phone: ""};
	const cases = [
		["giocatore", null],
		["squadra", "cerca-giocatore"],
		["squadra", "cerca-staff"],
		["squadra", "cerca-partite-amichevoli"],
		["squadra", "cerca-sponsor"],
		["staff-sportivo", null],
		["arbitro", null],
		["torneo-evento", null],
		["campi-impianti-sportivi", null],
	];
	for (const [type, subtype] of cases) {
		const errors = getAnnouncementValidationErrors(type, subtype, drafts, locations, contacts);
		assert.equal(Object.keys(errors).length, 0, `${type}/${subtype}: ${JSON.stringify(errors)}`);
	}
});

test("client validation catches errors before confirming publication", () => {
	const drafts = createAnnouncementDetailsDrafts();
	drafts.squadraCercaStaff = {...drafts.squadraCercaStaff, figura_ricercata: "Allenatore", requisiti: "Esperienza", compenso_mensile: "19.999", periodo_dal: "2026-12-31", periodo_al: "2026-10-01"};
	const locations = [{regione: "Lazio", citta: "Roma"}];
	const contacts = {email: "", phone: "123456!"};
	const staff = getAnnouncementValidationErrors("squadra", "cerca-staff", drafts, locations, contacts);
	assert.ok(staff.monthlyCompensation);
	assert.ok(staff.periodTo);
	assert.ok(staff.phone);

	drafts.squadraCercaPartita = {...drafts.squadraCercaPartita, categorie_avversario: ["Under 17"], periodo_dal: "2026-02-29", orario_dalle: "24:00", orario_alle: "20:00"};
	const match = getAnnouncementValidationErrors("squadra", "cerca-partite-amichevoli", drafts, locations, {email: "public@example.com", phone: ""});
	assert.ok(match.periodFrom);
	assert.ok(match.matchTimeFrom);
});

test("facility subprofile validation accepts valid cents in both profile editors", () => {
	const draft = {nome_organizzazione: "Campo", sede_principale: "Roma", tipologie_sport: ["Calcio a 11"], costo_partenza: 19.99};
	const locations = [{regione: "Lazio", citta: "Roma"}];
	assert.equal(getProfileRequiredFieldErrors("campi-impianti-sportivi", draft, locations).startingCost, undefined);
	draft.costo_partenza = 19.999;
	assert.ok(getProfileRequiredFieldErrors("campi-impianti-sportivi", draft, locations).startingCost);
});

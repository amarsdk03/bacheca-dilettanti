import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/features/pubblica-annuncio/publish-field-validation.ts", import.meta.url), "utf8");
const javascript = ts.transpileModule(source, {
	compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText;
const {isValidIsoDate, isValidPhone, isValidTime, normalizeFacilityOpeningHours, FACILITY_WEEKDAYS, parseOptionalMoney} = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

const modelSource = readFileSync(new URL("../src/features/pubblica-annuncio/publish-model.ts", import.meta.url), "utf8");
const modelJavaScript = ts.transpileModule(modelSource, {
	compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;
const modelModule = {exports: {}};
const fieldValidators = {isValidIsoDate, isValidPhone, isValidTime, normalizeFacilityOpeningHours, parseOptionalMoney};
const birthSource = readFileSync(new URL("../src/features/profilo/birth-date.ts", import.meta.url), "utf8");
const birthJavaScript = ts.transpileModule(birthSource, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const birthValidators = await import(`data:text/javascript;base64,${Buffer.from(birthJavaScript).toString("base64")}`);
vm.runInNewContext(modelJavaScript, {
	module: modelModule,
	exports: modelModule.exports,
		require(specifier) {
		if (specifier.endsWith("profile-required-fields")) return {getProfileRequiredFieldErrors: () => ({})};
		if (specifier.endsWith("publish-field-validation")) return fieldValidators;
		if (specifier.endsWith("pubblicaAnnuncio")) return {EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, ANNATE_OPTIONS: Array.from({length: new Date().getFullYear() - 1900 + 1}, (_, index) => String(new Date().getFullYear() - index)), FIGURA_PROFESSIONALE_OPTIONS: ["Allenatore", "Preparatore atletico"]};
		if (specifier.endsWith("announcementExtras")) return {isLinkAnnuncioValid: (value) => value === "" || /^https?:\/\//.test(value)};
		if (specifier.endsWith("staff-category-catalog")) return {isStaffCategory: (value) => value === "Calcio 11 (Maschile)::Serie C"};
		if (specifier.endsWith("category-catalog")) return {ANY_CATEGORY: "Qualsiasi"};
		if (specifier.endsWith("tipologie-calcio")) return {TIPOLOGIA_CALCIO_OPTIONS: ["Calcio 11", "Calcio 8", "Calcio 7", "Calcio 5"]};
		if (specifier.endsWith("player-nationalities")) return {isPlayerNationalityCode: (value) => value === "IT"};
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
		if (specifier.endsWith("birth-date")) return birthValidators;
		if (specifier.endsWith("player-nationalities")) return {isPlayerNationalityCode: (value) => value === "IT"};
		throw new Error(`Unexpected import: ${specifier}`);
	},
});
const {getProfileRequiredFieldErrors} = profileModule.exports;

test("player requires a complete birth date, gender and availability while current category stays optional", () => {
	const draft = {nome: "Mario", tipologie_sport: ["Calcio 11"], ruoli_sport: {principali: ["Difensore"]}, genere: "", anno_nascita: "", disponibilita: ""};
	const location = [{regione: "Lazio", citta: null}];
	const missing = getProfileRequiredFieldErrors("giocatore", draft, location);
	assert.ok(missing.gender && missing.birthYear && missing.availability);
	assert.deepEqual(Object.keys(getProfileRequiredFieldErrors("giocatore", {...draft, genere: "Uomo", anno_nascita: "2000", mese_nascita: "Gennaio", giorno_nascita: "01", disponibilita: "svincolato"}, location)), []);
});

test("creator requires a name in the profile while the shared announcement title is optional", () => {
	const location = [{regione: "Lazio", citta: null}];
	assert.ok(getProfileRequiredFieldErrors("creators", {nome_creator: ""}, location).name);
	assert.equal(getProfileRequiredFieldErrors("creators", {nome_creator: "Creator Lazio"}, location).name, undefined);
	const drafts = createAnnouncementDetailsDrafts();
	assert.equal(getAnnouncementValidationErrors("creators", null, drafts, location, {email: "creator@example.com", phone: ""}).title, undefined);
	assert.equal(getAnnouncementValidationErrors("creators", null, drafts, location, {email: "creator@example.com", phone: ""}, {genericLink: ""}, "x".repeat(50)).title, undefined);
	assert.ok(getAnnouncementValidationErrors("creators", null, drafts, location, {email: "creator@example.com", phone: ""}, {genericLink: ""}, "x".repeat(51)).title);
});

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

test("facility opening hours normalize missing minutes and reject invalid hours", () => {
	const schedule = FACILITY_WEEKDAYS.map((giorno, index) => ({giorno, attivo: index === 0, dalle: index === 0 ? "20:--" : "", alle: index === 0 ? "21:" : ""}));
	const normalized = normalizeFacilityOpeningHours(schedule);
	assert.equal(normalized[0].dalle, "20:00");
	assert.equal(normalized[0].alle, "21:00");
	assert.equal(normalizeFacilityOpeningHours(schedule.map((entry, index) => index === 0 ? {...entry, dalle: "24:--"} : entry)), undefined);
	assert.equal(normalizeFacilityOpeningHours(schedule.map((entry, index) => index === 0 ? {...entry, alle: "20:77"} : entry)), undefined);
});

test("all eleven announcement types pass client validation with complete details", () => {
	const drafts = createAnnouncementDetailsDrafts();
	drafts.giocatore.descrizione_aggiuntiva = "Cerco una squadra.";
	drafts.squadraCercaGiocatore = {...drafts.squadraCercaGiocatore, ruoli_principali: ["Difensore"], descrizione_aggiuntiva: "Cerchiamo un giocatore."};
	drafts.squadraCercaStaff = {...drafts.squadraCercaStaff, figure_ricercate: ["Allenatore", "Preparatore atletico"], requisiti: "Esperienza", compenso_mensile: "19.99", stagione: "2026/27"};
	drafts.squadraCercaPartita = {...drafts.squadraCercaPartita, categorie_avversario: ["Under 17"], periodo_dal: "2026-10-01", periodo_al: "2026-12-31", orario_dalle: "18:30", orario_alle: "20:00"};
	drafts.squadraCercaSponsor = {...drafts.squadraCercaSponsor, categoria_settore: "Locale", offerta_fornita: "Visibilità"};
	drafts.staffSportivo = {...drafts.staffSportivo, tipologie_sport: ["Calcio 11"], descrizione_aggiuntiva: "Cerco incarico."};
	drafts.arbitro = {...drafts.arbitro, tipologie_sport: ["Calcio 11"], descrizione_aggiuntiva: "Disponibile."};
	drafts.creator = {...drafts.creator, titolo_post: "Collaborazione video", descrizione_post: "Proposta editoriale."};
	drafts.serviziConsulenze = {...drafts.serviziConsulenze, figura_professionale: ["Allenatore"], presentazione_servizi: "Preparazione atletica per squadre."};
	drafts.torneoEvento = {...drafts.torneoEvento, nome_evento: "Torneo", tipologie_sport: ["Calcio 11"], descrizione_aggiuntiva: "Torneo locale."};
	drafts.campoImpianto = {...drafts.campoImpianto, tipologie_sport: ["Calcio 11"], indirizzo: "Via Roma 1", descrizione_aggiuntiva: "Campo disponibile.", costo_partenza: "0.29"};
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
		["creators", null],
		["servizi-consulenze", null],
		["torneo-evento", null],
		["campi-impianti-sportivi", null],
	];
	for (const [type, subtype] of cases) {
		const errors = getAnnouncementValidationErrors(type, subtype, drafts, locations, contacts);
		assert.equal(Object.keys(errors).length, 0, `${type}/${subtype}: ${JSON.stringify(errors)}`);
	}
});

test("tournament announcements require exactly one supported football type", () => {
	const drafts = createAnnouncementDetailsDrafts();
	drafts.torneoEvento = {
		...drafts.torneoEvento,
		nome_evento: "Torneo estivo",
		descrizione_aggiuntiva: "Descrizione evento",
	};
	const base = {email: "", phone: "3331234567"};
	const emptyErrors = getAnnouncementValidationErrors("torneo-evento", null, drafts, [{regione: "Lazio", citta: null}], base);
	assert.equal(emptyErrors.sports, "Seleziona una tipologia di calcio valida.");
	drafts.torneoEvento.tipologie_sport = ["Calcio 11", "Calcio 7"];
	assert.ok(getAnnouncementValidationErrors("torneo-evento", null, drafts, [{regione: "Lazio", citta: null}], base).sports);
	drafts.torneoEvento.tipologie_sport = ["Calcio 11"];
	assert.equal(getAnnouncementValidationErrors("torneo-evento", null, drafts, [{regione: "Lazio", citta: null}], base).sports, undefined);
});

test("team player year range requires an ordered end year only after a start year", () => {
	const drafts = createAnnouncementDetailsDrafts();
	drafts.squadraCercaGiocatore.ruoli_principali = ["Difensore"];
	drafts.squadraCercaGiocatore.descrizione_aggiuntiva = "Cerchiamo giocatori.";
	const errors = () => getAnnouncementValidationErrors("squadra", "cerca-giocatore", drafts, [{regione: "Lazio", citta: null}], {email: "info@example.com", phone: ""});
	assert.equal(errors().yearTo, undefined);
	drafts.squadraCercaGiocatore.annata_da = "2007";
	assert.ok(errors().yearTo);
	drafts.squadraCercaGiocatore.annata_a = "2004";
	assert.ok(errors().yearTo);
	drafts.squadraCercaGiocatore.annata_a = "2008";
	assert.deepEqual(Object.keys(errors()), []);
	drafts.squadraCercaGiocatore.annata_da = "";
	assert.ok(errors().yearTo);
});

test("client validation catches errors before confirming publication", () => {
	const drafts = createAnnouncementDetailsDrafts();
	drafts.squadraCercaStaff = {...drafts.squadraCercaStaff, figure_ricercate: ["Non nel catalogo"], requisiti: "Esperienza", compenso_mensile: "19.999", stagione: "2026/27"};
	const locations = [{regione: "Lazio", citta: "Roma"}];
	const contacts = {email: "", phone: "123456!"};
	const staff = getAnnouncementValidationErrors("squadra", "cerca-staff", drafts, locations, contacts);
	assert.ok(staff.monthlyCompensation);
	assert.ok(staff.professionalRole);
	assert.ok(staff.phone);

	drafts.squadraCercaPartita = {...drafts.squadraCercaPartita, categorie_avversario: ["Under 17"], periodo_dal: "2026-02-29", orario_dalle: "24:00", orario_alle: "20:00"};
	const match = getAnnouncementValidationErrors("squadra", "cerca-partite-amichevoli", drafts, locations, {email: "public@example.com", phone: ""});
	assert.ok(match.periodFrom);
	assert.ok(match.matchTimeFrom);
});

test("facility announcement requires a single city and a complete structured address", () => {
	const drafts = createAnnouncementDetailsDrafts();
	assert.equal(getAnnouncementValidationErrors("campi-impianti-sportivi", null, drafts, [{regione: "Lazio", citta: "Roma"}], {email: "info@example.com", phone: ""}).sports, "Seleziona una tipologia di campo valida.");
	drafts.campoImpianto.tipologie_sport = ["Calcio 11"];
	drafts.campoImpianto.indirizzo = "Via Roma 1";
	const contacts = {email: "info@example.com", phone: ""};
	assert.deepEqual(Object.keys(getAnnouncementValidationErrors("campi-impianti-sportivi", null, drafts, [{regione: "Lazio", citta: "Roma"}], contacts)), []);
	assert.ok(getAnnouncementValidationErrors("campi-impianti-sportivi", null, drafts, [{regione: "Lazio", citta: null}], contacts).locations);
	assert.ok(getAnnouncementValidationErrors("campi-impianti-sportivi", null, drafts, [{regione: "Lazio", citta: "Roma"}, {regione: "Lazio", citta: "Viterbo"}], contacts).locations);
	drafts.campoImpianto.indirizzo = " ";
	assert.ok(getAnnouncementValidationErrors("campi-impianti-sportivi", null, drafts, [{regione: "Lazio", citta: "Roma"}], contacts).facilityAddress);
});

test("sponsor search requires a sector and visibility offer but no support text or location", () => {
	const drafts = createAnnouncementDetailsDrafts();
	drafts.squadraCercaSponsor = {...drafts.squadraCercaSponsor, categoria_settore: "Prima squadra", offerta_fornita: "Logo sulle divise"};
	const contacts = {email: "info@example.com", phone: ""};
	assert.deepEqual(Object.keys(getAnnouncementValidationErrors("squadra", "cerca-sponsor", drafts, [], contacts)), []);
	drafts.squadraCercaSponsor.offerta_fornita = "";
	assert.ok(getAnnouncementValidationErrors("squadra", "cerca-sponsor", drafts, [], contacts).sponsorOffer);
});

test("facility subprofile validation accepts valid cents in both profile editors", () => {
	const draft = {nome_organizzazione: "Campo", sede_principale: "Roma", tipologie_sport: ["Calcio 11"], costo_partenza: 19.99};
	const locations = [{regione: "Lazio", citta: "Roma"}];
	assert.equal(getProfileRequiredFieldErrors("campi-impianti-sportivi", draft, locations).startingCost, undefined);
	draft.costo_partenza = 19.999;
	assert.ok(getProfileRequiredFieldErrors("campi-impianti-sportivi", draft, locations).startingCost);
});

test("facility profile requires exactly one complete site without requiring historical headquarters", () => {
	const draft = {nome_organizzazione: "Campo", sede_principale: "", indirizzo: "", tipologie_sport: ["Calcio 11"], costo_partenza: null};
	assert.deepEqual(Object.keys(getProfileRequiredFieldErrors("campi-impianti-sportivi", draft, [{regione: "Lazio", citta: "Roma"}])), []);
	assert.ok(getProfileRequiredFieldErrors("campi-impianti-sportivi", draft, [{regione: "Lazio", citta: null}]).locations);
	assert.ok(getProfileRequiredFieldErrors("campi-impianti-sportivi", draft, [{regione: "Lazio", citta: "Roma"}, {regione: "Lazio", citta: "Viterbo"}]).locations);
});

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
		fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
	});
	new Function("require", "module", "exports", outputText)((specifier) => {
		if (specifier === "server-only") return {};
		if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
		const base = specifier.startsWith("@/") ? path.join(root, "src", specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
		return load([base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate)));
	}, loaded, loaded.exports);
	return loaded.exports;
}

const {categoryKey} = load(path.join(root, "src/features/pubblica-annuncio/types/category-catalog.ts"));
const catalog = load(path.join(root, "src/features/pubblica-annuncio/types/staff-category-catalog.ts"));
const {announcementContent} = load(path.join(root, "src/features/annunci/announcement-content.ts"));
const {parseAnnouncementDirectoryQuery} = load(path.join(root, "src/features/annunci/announcement-model.ts"));
const {parsePublishPayload} = load(path.join(root, "src/features/pubblica-annuncio/server/validation.ts"));
const {createAnnouncementDetailsDrafts, getAnnouncementValidationErrors, PUBLISH_PAYLOAD_VERSION} = load(path.join(root, "src/features/pubblica-annuncio/publish-model.ts"));

const male = categoryKey("Calcio a 5 maschile", "FIGC-LND — Serie A");
const female = categoryKey("Calcio a 5 femminile", "FIGC-LND — Serie A");
const payload = () => ({
	version: PUBLISH_PAYLOAD_VERSION, submissionId: "11111111-1111-4111-8111-111111111111", visibility: "gratuito",
	profileType: "staff-sportivo", teamSubtype: null, anonymousProfile: null, profileUpdate: null,
	announcement: {
		type: "annuncio_staff_sportivo",
		detail: {tipologie_sport: ["Calcio 5"], categorie_ricercate: [male, female], disponibilita_spostamento: "Da valutare", descrizione_aggiuntiva: "Cerco incarico."},
		locations: [{regione: "Lazio", citta: "Roma"}], contacts: {email: "staff@example.com", phone: ""}, extras: {genericLink: ""},
	},
	consents: {dataConfirmed: true, termsAccepted: true, privacyAccepted: true, newsletterSubscribed: false},
});

test("Staff catalogue keeps homonymous categories distinct from the Player catalogue and filters", () => {
	assert.equal(catalog.STAFF_CATEGORY_FILTER_OPTIONS.length, 93);
	assert.equal(new Set(catalog.STAFF_CATEGORY_FILTER_OPTIONS.map(({value}) => value)).size, 93);
	assert.notEqual(male, female);
	assert.equal(catalog.staffCategoryLabel(male), "Calcio a 5 maschile — FIGC-LND — Serie A");
	assert.equal(catalog.staffCategoryLabel(female), "Calcio a 5 femminile — FIGC-LND — Serie A");
	assert.equal(parseAnnouncementDirectoryQuery({type: "annuncio_staff_sportivo", categoria: male}).filters.categorieRicercate, "");
	assert.equal(parseAnnouncementDirectoryQuery({type: "annuncio_squadra", categoriaAttuale: female}).filters.categoriaAttuale, undefined);
	const content = announcementContent("annuncio_staff_sportivo", {categorie_ricercate: [male, female], disponibilita_spostamento: "Da valutare"}, [], true);
	assert.deepEqual(content.filters.categories, [male, female]);
	assert.deepEqual(content.fields.find(({label}) => label === "Categoria/Settore cercato").items, ["Calcio a 5 maschile — FIGC-LND — Serie A", "Calcio a 5 femminile — FIGC-LND — Serie A"]);
	assert.equal(content.fields.find(({label}) => label === "Disponibilità agli spostamenti").value, "Da valutare");
});

test("Staff publication accepts only Catalog C and persists Da valutare", () => {
	const valid = payload();
	const normalized = parsePublishPayload(valid, true);
	assert.deepEqual(normalized.detail.categorie_ricercate, [male, female]);
	assert.equal(normalized.detail.disponibilita_spostamento, "Da valutare");
	const drafts = createAnnouncementDetailsDrafts();
	drafts.staffSportivo = valid.announcement.detail;
	const errors = getAnnouncementValidationErrors("staff-sportivo", null, drafts, valid.announcement.locations, valid.announcement.contacts);
	assert.equal(errors.staffCategories, undefined);
	assert.equal(errors.staffTravel, undefined);
	const invalid = payload();
	invalid.announcement.detail.categorie_ricercate = [categoryKey("Calcio 11 (Maschile)", "Primavera 1")];
	assert.throws(() => parsePublishPayload(invalid, true), /catalogo Staff/i);
	assert.ok(getAnnouncementValidationErrors("staff-sportivo", null, {...drafts, staffSportivo: invalid.announcement.detail}, invalid.announcement.locations, invalid.announcement.contacts).staffCategories);
	invalid.announcement.detail.categorie_ricercate = [male];
	invalid.announcement.detail.disponibilita_spostamento = "forse";
	assert.throws(() => parsePublishPayload(invalid, true), /spostamenti/i);
});

test("announcement payload rejects the removed video highlights field", () => {
	const legacy = payload();
	legacy.announcement.extras.videoHighlights = "https://example.test/video";
	assert.throws(() => parsePublishPayload(legacy, true), /dati inviati non sono validi/i);
});

test("a registered publisher cannot add marketing consent and an older payload defaults to no consent", () => {
	const previousClient = payload();
	delete previousClient.consents.newsletterSubscribed;
	assert.equal(parsePublishPayload(previousClient, true).newsletterSubscribed, false);
	const registered = payload();
	registered.consents.newsletterSubscribed = true;
	assert.throws(() => parsePublishPayload(registered, true), /preferenza per le comunicazioni/i);
});

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

const {parsePublishPayload} = load(path.join(root, "src/features/pubblica-annuncio/server/validation.ts"));
const weekdays = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"];
const schedule = () => weekdays.map((giorno, index) => ({
	giorno, attivo: index === 0, dalle: index === 0 ? "20:--" : "", alle: index === 0 ? "22:00" : "",
}));
const payload = () => ({
	version: 4,
	submissionId: "11111111-1111-4111-8111-111111111111",
	visibility: "gratuito",
	profileType: "campi-impianti-sportivi",
	teamSubtype: null,
	anonymousProfile: null,
	profileUpdate: null,
	announcement: {
		type: "annuncio_campo_impianto",
		title: "",
		detail: {tipologie_sport: ["Calcio 11"], orari: schedule(), costo_partenza: "20.00", servizi_inclusi: "Spogliatoi", indirizzo: "Via Roma 1", descrizione_aggiuntiva: ""},
		locations: [{regione: "Lazio", citta: "Roma"}],
		contacts: {email: "campo@example.com", phone: ""},
		extras: {genericLink: ""},
	},
	consents: {dataConfirmed: true, termsAccepted: true, privacyAccepted: true, newsletterSubscribed: false},
});

test("facility announcement server normalization accepts one complete address and optional description", () => {
	const normalized = parsePublishPayload(payload(), true);
	assert.equal(normalized.detail.indirizzo, "Via Roma 1");
	assert.equal(normalized.detail.descrizione_aggiuntiva, null);
	assert.deepEqual(normalized.detail.orari[0], {giorno: "lunedi", attivo: true, dalle: "20:00", alle: "22:00"});
	assert.equal(normalized.detail.orari.length, 7);
});

test("facility announcement server rejects missing address, missing city, multiple locations, and invalid hours", () => {
	const noAddress = payload();
	noAddress.announcement.detail.indirizzo = " ";
	assert.throws(() => parsePublishPayload(noAddress, true), /obbligatori/i);

	const noCity = payload();
	noCity.announcement.locations[0].citta = null;
	assert.throws(() => parsePublishPayload(noCity, true), /Città|città/i);

	const multipleLocations = payload();
	multipleLocations.announcement.locations.push({regione: "Lazio", citta: "Viterbo"});
	assert.throws(() => parsePublishPayload(multipleLocations, true), /una sola/i);

	const invalidHours = payload();
	invalidHours.announcement.detail.orari[0].dalle = "25:--";
	assert.throws(() => parsePublishPayload(invalidHours, true), /orari/i);
});

test("announcement title is optional, trimmed and limited to 50 characters on the server", () => {
	const shortTitle = payload();
	shortTitle.announcement.title = `  ${"x".repeat(50)}  `;
	assert.equal(parsePublishPayload(shortTitle, true).announcementTitle, "x".repeat(50));

	const tooLong = payload();
	tooLong.announcement.title = "x".repeat(51);
	assert.throws(() => parsePublishPayload(tooLong, true), /50 caratteri/i);

	const blank = payload();
	blank.announcement.title = "   ";
	assert.equal(parsePublishPayload(blank, true).announcementTitle, "");
});

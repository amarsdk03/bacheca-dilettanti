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
const payload = () => ({
	version: 3, submissionId: "11111111-1111-4111-8111-111111111111", visibility: "gratuito",
	profileType: "squadra", teamSubtype: "cerca-giocatore", anonymousProfile: null, profileUpdate: null,
	announcement: {
		type: "annuncio_squadra_cerca_giocatore",
		detail: {ruoli_principali: ["Difensore"], ruoli_secondari: [], annata_da: "2004", annata_a: "2008", stagione: "2026/27", descrizione_aggiuntiva: "Cerchiamo giocatori."},
		locations: [{regione: "Lazio", citta: "Roma"}], contacts: {email: "info@example.com", phone: ""}, extras: {genericLink: ""},
	},
	consents: {dataConfirmed: true, termsAccepted: true, privacyAccepted: true},
});

test("server normalizes a valid interval for the SQL writer and rejects incomplete or legacy client payloads", () => {
	const normalized = parsePublishPayload(payload(), true);
	assert.deepEqual(normalized.detail.annate_ricercate, []);
	assert.equal(normalized.detail.annata_da, "2004");
	assert.equal(normalized.detail.annata_a, "2008");
	const anyYear = payload();
	anyYear.announcement.detail.annata_da = "";
	anyYear.announcement.detail.annata_a = "";
	const normalizedAnyYear = parsePublishPayload(anyYear, true);
	assert.equal(normalizedAnyYear.detail.annata_da, null);
	assert.equal(normalizedAnyYear.detail.annata_a, null);
	const missingEnd = payload();
	missingEnd.announcement.detail.annata_a = "";
	assert.throws(() => parsePublishPayload(missingEnd, true), /intervallo|finale/i);
	const oldShape = payload();
	delete oldShape.announcement.detail.annata_da;
	delete oldShape.announcement.detail.annata_a;
	oldShape.announcement.detail.annate_ricercate = ["2004", "2007"];
	assert.throws(() => parsePublishPayload(oldShape, true));
});

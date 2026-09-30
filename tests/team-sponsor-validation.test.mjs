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
	version: 4, submissionId: "11111111-1111-4111-8111-111111111111", visibility: "gratuito",
	profileType: "squadra", teamSubtype: "cerca-sponsor", anonymousProfile: null, profileUpdate: null,
	announcement: {
		type: "annuncio_squadra_cerca_sponsor",
		detail: {categoria_settore: "Prima squadra", offerta_fornita: "Logo sulle divise", descrizione_aggiuntiva: ""},
		locations: [], contacts: {email: "info@example.com", phone: ""}, extras: {genericLink: ""},
	},
	consents: {dataConfirmed: true, termsAccepted: true, privacyAccepted: true},
});

test("sponsor server payload accepts no support or locations and rejects both legacy support input and supplied locations", () => {
	const normalized = parsePublishPayload(payload(), true);
	assert.deepEqual(normalized.announcementLocations, []);
	assert.equal(normalized.detail.categoria_settore, "Prima squadra");
	assert.equal(normalized.detail.offerta_fornita, "Logo sulle divise");
	assert.equal(Object.hasOwn(normalized.detail, "supporto_cercato"), false);
	const oldSupport = payload();
	oldSupport.announcement.detail.supporto_cercato = "Materiale tecnico";
	assert.throws(() => parsePublishPayload(oldSupport, true));
	const fakeLocation = payload();
	fakeLocation.announcement.locations = [{regione: "Lazio", citta: null}];
	assert.throws(() => parsePublishPayload(fakeLocation, true), /non prevede località/i);
});

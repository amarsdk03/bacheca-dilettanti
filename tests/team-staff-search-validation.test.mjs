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
const {PUBLISH_PAYLOAD_VERSION} = load(path.join(root, "src/features/pubblica-annuncio/publish-model.ts"));
const payload = () => ({
	version: PUBLISH_PAYLOAD_VERSION, submissionId: "11111111-1111-4111-8111-111111111111", visibility: "gratuito",
	profileType: "squadra", teamSubtype: "cerca-staff", anonymousProfile: null, profileUpdate: null,
	announcement: {
		type: "annuncio_squadra_cerca_staff",
		detail: {figure_ricercate: ["Allenatore", "Preparatore atletico"], settore: "Juniores", compenso_mensile: "1200", requisiti: "Esperienza.", stagione: "2026/27", descrizione_aggiuntiva: ""},
		locations: [{regione: "Lazio", citta: "Roma"}], contacts: {email: "info@example.com", phone: ""}, extras: {genericLink: ""},
	},
	consents: {dataConfirmed: true, termsAccepted: true, privacyAccepted: true, newsletterSubscribed: false},
});

test("staff search normalizes selected figures for the database and rejects old client fields", () => {
	const normalized = parsePublishPayload(payload(), true);
	assert.deepEqual(normalized.detail.figure_ricercate, ["Allenatore", "Preparatore atletico"]);
	assert.equal(normalized.detail.figura_ricercata, "Allenatore");
	assert.equal(normalized.detail.stagione, "2026/27");
	assert.equal(Object.hasOwn(normalized.detail, "periodo_dal"), false);
	const none = payload();
	none.announcement.detail.figure_ricercate = [];
	assert.throws(() => parsePublishPayload(none, true));
	const unknown = payload();
	unknown.announcement.detail.figure_ricercate = ["Ruolo libero"];
	assert.throws(() => parsePublishPayload(unknown, true), /catalogo/);
	const oldShape = payload();
	oldShape.announcement.detail.periodo_dal = "2026-10-01";
	assert.throws(() => parsePublishPayload(oldShape, true));
});

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
		fileName: file,
		compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
	});
	new Function("require", "module", "exports", outputText)((specifier) => {
		if (specifier === "server-only") return {};
		if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
		const base = specifier.startsWith("@/") ? path.join(root, "src", specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
		return load([base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate)));
	}, loaded, loaded.exports);
	return loaded.exports;
}

const profileModel = load(path.join(root, "src/features/profilo/profile-model.ts"));
const registration = load(path.join(root, "src/features/registrati/registration-payload.ts"));
const registrationServer = load(path.join(root, "src/features/registrati/server/registration.ts"));
const publishModel = load(path.join(root, "src/features/pubblica-annuncio/publish-model.ts"));
const publishServer = load(path.join(root, "src/features/pubblica-annuncio/server/validation.ts"));

test("restricted categories cannot be self-selected at registration", () => {
	for (const type of ["servizi-consulenze", "creators"]) {
		assert.equal(profileModel.isRestrictedProfileType(type), true);
		assert.equal(registration.isRegistrableProfileType(type), false);
	}
	const drafts = profileModel.createProfileDrafts();
	const locations = profileModel.createProfileLocations();
	drafts.squadra.nome_societa = "Squadra Test";
	drafts.squadra.tipologie_sport = ["Calcio 11"];
	locations.squadra = [{regione: "Lazio", citta: "Roma"}];
	const social = load(path.join(root, "src/features/profilo/profile-social-links.ts")).createProfileSocialLinks();
	const valid = registration.createRegistrationPayload(["squadra"], "squadra", drafts, locations, social, true, false);
	for (const type of ["servizi-consulenze", "creators"]) {
		assert.equal(registration.createRegistrationPayload([type], type, drafts, locations, social, true, false), null);
		assert.throws(() => registrationServer.parseRegistrationPayload(JSON.stringify({...valid, selectedProfileTypes: ["squadra", type]})), (error) => error.step === 2);
	}
});

const servicePayload = () => ({
	version: publishModel.PUBLISH_PAYLOAD_VERSION, submissionId: "11111111-1111-4111-8111-111111111111", visibility: "gratuito",
	profileType: "servizi-consulenze", teamSubtype: null, anonymousProfile: null, profileUpdate: null,
	announcement: {
		type: "annuncio_servizi_consulenze", title: "Consulenza per società",
		detail: {figura_professionale: ["Allenatore"], specializzazione: "Settore giovanile", presentazione_servizi: "Percorsi di formazione", tipologie_sport: ["Calcio 11"], descrizione_aggiuntiva: "Disponibile da ottobre"},
		locations: [{regione: "Lazio", citta: "Roma"}], contacts: {email: "service@example.com", phone: ""}, extras: {genericLink: ""},
	},
	consents: {dataConfirmed: true, termsAccepted: true, privacyAccepted: true, newsletterSubscribed: false},
});

test("authorized service publication has a complete mapped payload, while anonymous special publication is refused", () => {
	assert.equal(publishModel.getDatabaseAnnouncementType("servizi-consulenze", null), "annuncio_servizi_consulenze");
	const normalized = publishServer.parsePublishPayload(servicePayload(), true);
	assert.equal(normalized.announcementType, "annuncio_servizi_consulenze");
	assert.deepEqual(normalized.detail.figura_professionale, ["Allenatore"]);
	assert.equal(normalized.detail.presentazione_servizi, "Percorsi di formazione");
	assert.throws(() => publishServer.parsePublishPayload(servicePayload(), false), /abilitazione dell’admin/i);
	const creator = {...servicePayload(), profileType: "creators", announcement: {...servicePayload().announcement, type: "annuncio_creators"}};
	assert.throws(() => publishServer.parsePublishPayload(creator, false), /abilitazione dell’admin/i);
});

test("database migration guards direct inserts and keeps five ordinary slots", () => {
	const migration = readFileSync(path.join(root, "supabase/migrations/20261001160000_restricted_profiles_and_service_publication.sql"), "utf8");
	for (const table of ["profilo_servizi_consulenze", "profilo_creator", "annuncio_servizi_consulenze", "annuncio_creator"]) {
		assert.match(migration, new RegExp(`before insert on public\\.${table}`));
	}
	assert.match(migration, /revoke all on table public\.restricted_profile_access from public, anon, authenticated/);
	assert.match(migration, /v_profile_count[\s\S]*- \(select count\(\*\) from public\.profilo_servizi_consulenze[\s\S]*- \(select count\(\*\) from public\.profilo_creator/);
	assert.match(migration, /delete from public\.restricted_profile_access[\s\S]*profile_type = p_profile_type/);
});

import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function sourceLoader(overrides = {}) {
	const cache = new Map();
	function load(file) {
		if (cache.has(file)) return cache.get(file).exports;
		const loaded = {exports: {}};
		cache.set(file, loaded);
		const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {
			fileName: file,
			compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
		});
		new Function("require", "module", "exports", outputText)((specifier) => {
			if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
			if (specifier === "server-only") return {};
			if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
			const base = specifier.startsWith("@/") ? path.join(root, "src", specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
			const target = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate));
			if (!target) throw new Error(`Cannot resolve ${specifier}`);
			return load(target);
		}, loaded, loaded.exports);
		return loaded.exports;
	}
	return (relative) => load(path.join(root, relative));
}

function validRegistrationPayload(legalAccepted = true, newsletterSubscribed = false) {
	const load = sourceLoader();
	const {createProfileDrafts, createProfileLocations} = load("src/features/profilo/profile-model.ts");
	const {createProfileSocialLinks} = load("src/features/profilo/profile-social-links.ts");
	const {createRegistrationPayload} = load("src/features/registrati/registration-payload.ts");
	const drafts = createProfileDrafts();
	const locations = createProfileLocations();
	drafts.squadra.nome_societa = "Squadra Test";
	drafts.squadra.tipologie_sport = ["Calcio 11"];
	locations.squadra = [{regione: "Lazio", citta: "Roma"}];
	return createRegistrationPayload(
		["squadra"],
		"squadra",
		drafts,
		locations,
		createProfileSocialLinks(),
		legalAccepted,
		newsletterSubscribed,
	);
}

function validPlayerPayload() {
	const load = sourceLoader();
	const {createProfileDrafts, createProfileLocations} = load("src/features/profilo/profile-model.ts");
	const {createProfileSocialLinks} = load("src/features/profilo/profile-social-links.ts");
	const {createRegistrationPayload} = load("src/features/registrati/registration-payload.ts");
	const drafts = createProfileDrafts();
	const locations = createProfileLocations();
	Object.assign(drafts.giocatore, {nome: "Mario", tipologie_sport: ["Calcio 11"], ruoli_sport: {principali: ["Difensore"], specifici: []}, genere: "Maschio", anno_nascita: "2000", disponibilita: "sotto-contratto", categoria_attuale: "Calcio 11 (Maschile)::Eccellenza", nazionalita: "IT", piede_principale: "Ambipiede", categorie_ricercate: ["Eccellenza"]});
	locations.giocatore = [{regione: "Lazio", citta: null}];
	return createRegistrationPayload(["giocatore"], "giocatore", drafts, locations, createProfileSocialLinks(), true, false);
}

test("staff qualifications require a state while historical entries retain an unknown state", () => {
	const load = sourceLoader();
	const {createProfileDrafts, createProfileLocations} = load("src/features/profilo/profile-model.ts");
	const {createProfileSocialLinks} = load("src/features/profilo/profile-social-links.ts");
	const {createRegistrationPayload} = load("src/features/registrati/registration-payload.ts");
	const {parseRegistrationPayload, RegistrationPayloadError} = load("src/features/registrati/server/registration.ts");
	const {getProfileRequiredFieldErrors} = load("src/features/profilo/profile-required-fields.ts");
	const drafts = createProfileDrafts();
	const locations = createProfileLocations();
	drafts["staff-sportivo"].nome = "Ada";
	drafts["staff-sportivo"].figure_professionali = ["Allenatore"];
	drafts["staff-sportivo"].disponibile_remoto = true;
	drafts["staff-sportivo"].storico_esperienze = [{id: "legacy", titolo: "Voce storica", ente: "Società", periodoDa: "", periodoA: "", descrizione: "Testo originale", stato: "non-specificare", squadraProfiloId: null}, "testo libero precedente"];
	drafts["staff-sportivo"].qualifiche_licenze = [{id: "new", titolo: "Licenza", ente: "Ente", periodoDa: "", periodoA: "", descrizione: "", stato: "non-specificare", squadraProfiloId: null}];
	locations["staff-sportivo"] = [{regione: "Lazio", citta: "Roma"}];
	assert.ok(getProfileRequiredFieldErrors("staff-sportivo", drafts["staff-sportivo"], locations["staff-sportivo"]).qualificationState);
	const payload = () => createRegistrationPayload(["staff-sportivo"], "staff-sportivo", drafts, locations, createProfileSocialLinks(), true, false);
	assert.throws(() => parseRegistrationPayload(JSON.stringify(payload())), (error) => error instanceof RegistrationPayloadError && error.step === 3);
	drafts["staff-sportivo"].qualifiche_licenze[0].stato = "conseguito";
	const saved = parseRegistrationPayload(JSON.stringify(payload())).profiles[0].draft;
	assert.equal(saved.disponibile_remoto, true);
	assert.equal(saved.storico_esperienze[0].descrizione, "Testo originale");
	assert.equal(saved.storico_esperienze[0].stato, "non-specificare");
	assert.equal(saved.storico_esperienze[1], "testo libero precedente");
	assert.equal(saved.qualifiche_licenze[0].stato, "conseguito");
});

test("player profile accepts year only, preserves old category preferences and normalizes current fields", () => {
	const {parseRegistrationPayload, RegistrationPayloadError} = sourceLoader()("src/features/registrati/server/registration.ts");
	const payload = validPlayerPayload();
	const profile = parseRegistrationPayload(JSON.stringify(payload)).profiles[0].draft;
	assert.equal(profile.categoria_attuale, "Calcio 11 (Maschile)::Eccellenza");
	assert.deepEqual(profile.categorie_ricercate, ["Calcio 11 (Maschile)::Eccellenza"]);
	assert.equal(profile.piede_principale, "Ambidestro");
	assert.equal(profile.nazionalita, "IT");
	assert.equal(profile.anno_nascita, "2000");
	assert.equal(profile.mese_nascita, null);
	payload.profiles[0].draft.disponibilita = "svincolato";
	assert.equal(parseRegistrationPayload(JSON.stringify(payload)).profiles[0].draft.categoria_attuale, null);
	for (const field of ["genere", "anno_nascita", "disponibilita"]) {
		const invalid = validPlayerPayload();
		invalid.profiles[0].draft[field] = "";
		assert.throws(() => parseRegistrationPayload(JSON.stringify(invalid)), (error) => error instanceof RegistrationPayloadError && error.step === 3, field);
	}
});

test("registration requires current legal versions and preserves the optional newsletter choice", () => {
	const {parseRegistrationPayload, RegistrationPayloadError} = sourceLoader()("src/features/registrati/server/registration.ts");
	const accepted = validRegistrationPayload(true, false);
	const parsed = parseRegistrationPayload(JSON.stringify(accepted));
	assert.deepEqual(parsed.consents, {
		legalAccepted: true,
		newsletterSubscribed: false,
		termsVersion: "2026-09-23",
		privacyVersion: "2026-09-23",
		cookiePolicyVersion: "2026-09-23",
	});

	for (const invalid of [
		validRegistrationPayload(false, true),
		{...accepted, consents: {...accepted.consents, privacyVersion: "obsolete"}},
		{...accepted, consents: undefined},
	]) {
		assert.throws(
			() => parseRegistrationPayload(JSON.stringify(invalid)),
			(error) => error instanceof RegistrationPayloadError && error.step === 3,
		);
	}
});

test("registration normalizes an optional invitation code and rejects malformed input on account step", () => {
	const {parseRegistrationPayload, RegistrationPayloadError} = sourceLoader()("src/features/registrati/server/registration.ts");
	const payload = validRegistrationPayload();
	assert.equal(parseRegistrationPayload(JSON.stringify(payload)).inviteCode, null);
	assert.equal(
		parseRegistrationPayload(JSON.stringify({...payload, inviteCode: " a1b2c3d4e5f60708 "})).inviteCode,
		"A1B2C3D4E5F60708",
	);
	assert.throws(
		() => parseRegistrationPayload(JSON.stringify({...payload, inviteCode: "wrong"})),
		(error) => error instanceof RegistrationPayloadError && error.step === 1,
	);
});

test("registration UI includes all legal links, a required consent and newsletter enabled by default", () => {
	const source = readFileSync(path.join(root, "src/features/registrati/Registrati.tsx"), "utf8");
	assert.match(source, /useState\(false\).*legalAccepted|legalAccepted[^]*useState\(false\)/);
	assert.match(source, /newsletterSubscribed[^]*useState\(true\)/);
	assert.match(source, /id="registration-legal-consent"[^]*required[^]*aria-required="true"/);
	for (const href of ["/termini-di-servizio", "/privacy-policy", "/cookie-policy"]) {
		assert.ok(source.includes(`href="${href}"`));
	}
});

test("newsletter preference action verifies account ownership and stores the choice timestamp", async () => {
	const writes = [];
	const revalidated = [];
	const internalUser = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	const authUser = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
	let account = {utenteId: internalUser, authUserId: authUser, registeredAt: "2026-09-01"};
	const admin = {from(table) {
		const write = {table, payload: null, filters: []};
		const query = {
			update(payload) {write.payload = payload; return this;},
			eq(...args) {write.filters.push(args); return this;},
			select() {return this;},
			maybeSingle() {writes.push(write); return Promise.resolve({data: {utente_uuid: internalUser}, error: null});},
		};
		return query;
	}};
	const {setNewsletterSubscription} = sourceLoader({
		"next/cache": {revalidatePath: (href) => revalidated.push(href)},
		"@/features/auth/server/queries": {getAuthenticatedViewer: async () => account},
		"@/lib/supabase/admin": {createAdminClient: () => admin},
		"@/lib/supabase/server": {createClient: async () => ({})},
	})("src/features/profilo/server/actions.ts");

	assert.equal((await setNewsletterSubscription("true")).status, "error");
	account = null;
	assert.equal((await setNewsletterSubscription(true)).status, "error");
	account = {utenteId: internalUser, authUserId: authUser, registeredAt: "2026-09-01"};
	assert.equal((await setNewsletterSubscription(false)).status, "success");
	assert.equal(writes[0].table, "utente");
	assert.equal(writes[0].payload.consenso_newsletter, false);
	assert.ok(!Number.isNaN(Date.parse(writes[0].payload.consenso_newsletter_aggiornato_il)));
	assert.deepEqual(writes[0].filters, [["utente_uuid", internalUser], ["auth_user_uuid", authUser]]);
	assert.deepEqual(revalidated, ["/il-tuo-profilo"]);
});

test("database migration defaults existing accounts to unsubscribed and records legal acceptance atomically", () => {
	const migration = readFileSync(path.join(root, "supabase/migrations/20260923105600_registration_legal_and_newsletter_consents.sql"), "utf8");
	assert.match(migration, /consenso_newsletter boolean not null default false/);
	assert.match(migration, /informative_accettate_il = now\(\)/);
	assert.match(migration, /utente_informative_accettate_complete_check/);
	assert.match(migration, /versione_termini = v_consents/);
	assert.match(migration, /versione_privacy = v_consents/);
	assert.match(migration, /versione_cookie_policy = v_consents/);
	assert.match(migration, /INVALID_REGISTRATION_CONSENTS/);
	assert.match(migration, /revoke all on function private\.provision_auth_user/);
});

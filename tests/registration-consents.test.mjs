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
	drafts.squadra.tipologie_sport = ["Calcio a 11"];
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

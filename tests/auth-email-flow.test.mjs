import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tokenHash = "a".repeat(64);
const authCode = "b".repeat(48);
const verifiedUser = {id: "user-1", email_confirmed_at: "2026-09-24T12:00:00Z"};

function loadServerModule(relativePath, dependencies) {
	const file = path.join(root, relativePath);
	const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {
		fileName: file,
		compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
	});
	const loaded = {exports: {}};
	new Function("require", "module", "exports", outputText)((specifier) => {
		if (specifier === "server-only") return {};
		if (Object.hasOwn(dependencies, specifier)) return dependencies[specifier];
		if (specifier.startsWith("@/")) return {};
		throw new Error(`Unexpected dependency: ${specifier}`);
	}, loaded, loaded.exports);
	return loaded.exports;
}

const {isEmailLinkCredentialValue, parseEmailLinkCredential} = loadServerModule("src/features/auth/email-link.ts", {});
const {getAuthCallbackUrl, getAuthConfirmUrl, getSiteUrl} = loadServerModule("src/features/auth/utils.ts", {});

function recoveryForm(name = "token_hash", value = tokenHash) {
	const formData = new FormData();
	formData.set(name, value);
	return formData;
}

test("Auth email URLs reject missing, malformed and production-localhost origins", () => {
	const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
	const originalNodeEnv = process.env.NODE_ENV;
	try {
		process.env.NODE_ENV = "production";
		delete process.env.NEXT_PUBLIC_SITE_URL;
		assert.throws(getSiteUrl, /NEXT_PUBLIC_SITE_URL/);
		process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
		assert.throws(getSiteUrl, /trusted site origin/);
		process.env.NEXT_PUBLIC_SITE_URL = "https://www.bachecadilettanti.it/path";
		assert.throws(getSiteUrl, /trusted site origin/);
		process.env.NEXT_PUBLIC_SITE_URL = "https://www.bachecadilettanti.it/";
		assert.equal(getAuthCallbackUrl(), "https://www.bachecadilettanti.it/auth/callback");
		assert.equal(getAuthConfirmUrl(), "https://www.bachecadilettanti.it/auth/confirm");
		process.env.NODE_ENV = "development";
		process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
		assert.equal(getAuthCallbackUrl(), "http://localhost:3000/auth/callback");
	} finally {
		if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
		else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
		if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
		else process.env.NODE_ENV = originalNodeEnv;
	}
});

test("email links accept only an unambiguous recovery or signup credential", () => {
	assert.deepEqual(parseEmailLinkCredential({token_hash: tokenHash, type: "recovery"}, "recovery"), {kind: "token_hash", value: tokenHash});
	assert.deepEqual(parseEmailLinkCredential({token_hash: tokenHash, type: "email"}, "email"), {kind: "token_hash", value: tokenHash});
	assert.deepEqual(parseEmailLinkCredential({code: authCode, next: "/reimposta-password"}, "recovery"), {kind: "code", value: authCode});
	assert.deepEqual(parseEmailLinkCredential({code: authCode, type: "recovery"}, "recovery"), {kind: "code", value: authCode});
	assert.equal(parseEmailLinkCredential({token_hash: tokenHash, type: "email"}, "recovery"), null);
	assert.equal(parseEmailLinkCredential({token_hash: tokenHash, code: authCode, type: "recovery"}, "recovery"), null);
	assert.equal(parseEmailLinkCredential({token_hash: [tokenHash], type: "recovery"}, "recovery"), null);
	assert.equal(isEmailLinkCredentialValue("bad/credential"), false);
});

test("recovery verifies the token hash on the server and opens the password form", async () => {
	const calls = [];
	const supabase = {auth: {
		verifyOtp: async (input) => {
			calls.push(input);
			return {data: {user: verifiedUser, session: {access_token: "session"}}, error: null};
		},
		getUser: async () => ({data: {user: verifiedUser}, error: null}),
	}};
	const actions = loadServerModule("src/features/auth/server/email-link-actions.ts", {
		"next/cache": {revalidatePath: (...args) => calls.push(args)},
		"next/navigation": {redirect: (destination) => { throw Object.assign(new Error("redirect"), {destination}); }},
		"@/features/auth/email-link": {isEmailLinkCredentialValue},
		"@/lib/supabase/server": {createClient: async () => supabase},
	});
	await assert.rejects(actions.completePasswordRecovery({status: "idle"}, recoveryForm()), (error) => error.destination === "/reimposta-password");
	assert.deepEqual(calls[0], {token_hash: tokenHash, type: "recovery"});
	assert.deepEqual(calls[1], ["/", "layout"]);
});

test("expired recovery links leave an existing session untouched", async () => {
	let signedOut = false;
	const actions = loadServerModule("src/features/auth/server/email-link-actions.ts", {
		"next/cache": {},
		"next/navigation": {},
		"@/features/auth/email-link": {isEmailLinkCredentialValue},
		"@/lib/supabase/server": {createClient: async () => ({auth: {
			verifyOtp: async () => ({data: {session: null, user: null}, error: {code: "otp_expired"}}),
			signOut: async () => {signedOut = true;},
		}})},
	});
	const state = await actions.completePasswordRecovery({status: "idle"}, recoveryForm());
	assert.equal(state.status, "error");
	assert.equal(signedOut, false);
});

test("signup confirmation uses email verification rather than recovery verification", async () => {
	let verifiedType;
	const actions = loadServerModule("src/features/auth/server/email-link-actions.ts", {
		"next/cache": {revalidatePath: () => {}},
		"next/navigation": {redirect: (destination) => { throw Object.assign(new Error("redirect"), {destination}); }},
		"@/features/auth/email-link": {isEmailLinkCredentialValue},
		"@/lib/supabase/server": {createClient: async () => ({auth: {
			verifyOtp: async (input) => {
				verifiedType = input.type;
				return {data: {user: verifiedUser, session: {access_token: "session"}}, error: null};
			},
			getUser: async () => ({data: {user: verifiedUser}, error: null}),
		}})},
	});
	await assert.rejects(actions.completeSignupConfirmation({status: "idle"}, recoveryForm()), (error) => error.destination === "/il-tuo-profilo");
	assert.equal(verifiedType, "email");
});

test("password reset requests report provider failures without claiming an email was sent", async () => {
	let redirectTo;
	let providerError = {code: "smtp_error"};
	const actions = loadServerModule("src/features/auth/server/actions.ts", {
		"next/cache": {},
		"next/navigation": {},
		"@/features/auth/utils": {getAuthCallbackUrl: () => "https://www.bachecadilettanti.it/auth/callback"},
		"@/features/auth/validation": {
			validateEmailPassword: () => ({email: "user@example.com", fieldErrors: {password: "required"}}),
			hasFieldErrors: (errors) => Object.keys(errors).length > 0,
		},
		"@/lib/supabase/server": {createClient: async () => ({auth: {
			resetPasswordForEmail: async (_email, options) => {
				redirectTo = options.redirectTo;
				return {error: providerError};
			},
		}})},
	});
	const failed = await actions.requestPasswordReset({status: "idle"}, recoveryForm("email", "user@example.com"));
	assert.equal(failed.status, "error");
	assert.equal(redirectTo, "https://www.bachecadilettanti.it/auth/callback");
	providerError = null;
	const sent = await actions.requestPasswordReset({status: "idle"}, recoveryForm("email", "user@example.com"));
	assert.equal(sent.status, "success");
});

test("password update rejects a session whose claims and verified user do not match", async () => {
	let updated = false;
	const actions = loadServerModule("src/features/auth/server/actions.ts", {
		"next/cache": {},
		"next/navigation": {},
		"@/features/auth/validation": {
			validateNewPassword: () => ({password: "NewLongPassword123", fieldErrors: {}}),
			hasFieldErrors: () => false,
		},
		"@/lib/supabase/server": {createClient: async () => ({auth: {
			getClaims: async () => ({data: {claims: {sub: "other-user"}}, error: null}),
			getUser: async () => ({data: {user: verifiedUser}, error: null}),
			updateUser: async () => {updated = true;},
		}})},
	});
	const result = await actions.updatePassword({status: "idle"}, recoveryForm("password", "NewLongPassword123"));
	assert.equal(result.status, "error");
	assert.equal(updated, false);
});

test("a successful password update returns a registered user to the profile", async () => {
	let updatedPassword;
	const actions = loadServerModule("src/features/auth/server/actions.ts", {
		"next/cache": {revalidatePath: () => {}},
		"next/navigation": {redirect: (destination) => { throw Object.assign(new Error("redirect"), {destination}); }},
		"@/features/auth/validation": {
			validateNewPassword: () => ({password: "NewLongPassword123", fieldErrors: {}}),
			hasFieldErrors: () => false,
		},
		"@/lib/supabase/server": {createClient: async () => ({
			auth: {
				getClaims: async () => ({data: {claims: {sub: verifiedUser.id}}, error: null}),
				getUser: async () => ({data: {user: verifiedUser}, error: null}),
				updateUser: async ({password}) => {updatedPassword = password; return {error: null};},
			},
			from: () => ({select: () => ({eq: () => ({maybeSingle: async () => ({data: {registrato_il: "2026-09-24"}, error: null})})})}),
		})},
	});
	await assert.rejects(actions.updatePassword({status: "idle"}, recoveryForm("password", "NewLongPassword123")), (error) => error.destination === "/il-tuo-profilo?password=aggiornata");
	assert.equal(updatedPassword, "NewLongPassword123");
});

test("the recovery template sends the user to the app with a recovery token hash", () => {
	const template = readFileSync(path.join(root, "supabase/templates/recovery.html"), "utf8");
	assert.ok(template.includes('href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery"'));
	assert.equal(template.includes("{{ .ConfirmationURL }}"), false);
});

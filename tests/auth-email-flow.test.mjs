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
		if (specifier === "@/features/auth/errors") return loadServerModule("apps/web/src/features/auth/errors.ts", {});
		if (specifier.startsWith("@/")) return {};
		throw new Error(`Unexpected dependency: ${specifier}`);
	}, loaded, loaded.exports);
	return loaded.exports;
}

const {isEmailLinkCredentialValue, parseEmailLinkCredential} = loadServerModule("apps/web/src/features/auth/email-link.ts", {});
const {getAuthCallbackUrl, getAuthConfirmUrl, getSiteUrl} = loadServerModule("apps/web/src/features/auth/utils.ts", {});

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
	const actions = loadServerModule("apps/web/src/features/auth/server/email-link-actions.ts", {
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
	const actions = loadServerModule("apps/web/src/features/auth/server/email-link-actions.ts", {
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
	const actions = loadServerModule("apps/web/src/features/auth/server/email-link-actions.ts", {
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
	const actions = loadServerModule("apps/web/src/features/auth/server/actions.ts", {
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
	const actions = loadServerModule("apps/web/src/features/auth/server/actions.ts", {
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
	const actions = loadServerModule("apps/web/src/features/auth/server/actions.ts", {
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

test("Auth 500 responses retain safe diagnostics without consuming or altering the HTTP response", async t => {
	const messages = [];
	t.mock.method(console, "error", (...args) => messages.push(args));
	const {createAuthDiagnosticFetch} = loadServerModule("apps/web/src/lib/supabase/auth-fetch.ts", {});
	const body = {code: "unexpected_failure", msg: "Database error saving new user user@example.com password=secret-value https://example.com/?token=private-value", token: "never-log-this"};
	let requests = 0;
	const diagnosticFetch = createAuthDiagnosticFetch("https://project.supabase.co", async () => {
		requests++;
		return Response.json(body, {status: 500, headers: {"sb-request-id": "request-id-123"}});
	});
	const response = await diagnosticFetch("https://project.supabase.co/auth/v1/signup?redirect_to=private-url", {method: "POST", body: "password=private-body"});
	assert.equal(response.status, 500);
	assert.deepEqual(await response.json(), body);
	assert.equal(requests, 1); // Never retry signup automatically: it sends emails.
	assert.equal(messages.length, 1);
	const logged = messages[0][1];
	assert.equal(logged.path, "/auth/v1/signup");
	assert.equal(logged.code, "unexpected_failure");
	assert.equal(logged.requestId, "request-id-123");
	assert.match(logged.message, /Database error saving new user/);
	assert.doesNotMatch(JSON.stringify(messages), /user@example|secret-value|private-value|never-log-this|private-body|private-url/);
});

test("Auth diagnostics tolerate non-JSON gateway errors and ignore other services", async t => {
	const messages = [];
	t.mock.method(console, "error", (...args) => messages.push(args));
	const {createAuthDiagnosticFetch} = loadServerModule("apps/web/src/lib/supabase/auth-fetch.ts", {});
	const diagnosticFetch = createAuthDiagnosticFetch("https://project.supabase.co", async () => new Response("<html>Bad gateway</html>", {status: 502}));
	const response = await diagnosticFetch(new Request("https://project.supabase.co/auth/v1/verify", {method: "POST"}));
	assert.equal(await response.text(), "<html>Bad gateway</html>");
	assert.equal(messages.length, 1);
	assert.equal(messages[0][1].status, 502);
	await diagnosticFetch("https://other.example.com/auth/v1/signup");
	await diagnosticFetch("https://project.supabase.co/rest/v1/utente");
	assert.equal(messages.length, 1);
});

test("signup and recovery links do not claim expiration when the Auth service returns 500", async t => {
	t.mock.method(console, "error", () => {});
	for (const complete of ["completeSignupConfirmation", "completePasswordRecovery"]) {
		let signedOut = false;
		const actions = loadServerModule("apps/web/src/features/auth/server/email-link-actions.ts", {
			"next/cache": {},
			"next/navigation": {},
			"@/features/auth/email-link": {isEmailLinkCredentialValue},
			"@/lib/supabase/server": {createClient: async () => ({auth: {
				verifyOtp: async () => ({data: {user: null, session: null}, error: {name: "AuthRetryableFetchError", status: 500}}),
				signOut: async () => {signedOut = true;},
			}})},
		});
		const result = await actions[complete]({status: "idle"}, recoveryForm());
		assert.equal(result.status, "error");
		assert.match(result.message, /momentaneamente non disponibile/);
		assert.doesNotMatch(result.message, /scaduto/);
		assert.equal(signedOut, false);
	}
});

function signupActions({afterFailure = "new_email", thrown = false, failure = {name: "AuthRetryableFetchError", status: 500}} = {}) {
	const calls = {identity: 0, signup: 0, cancelled: 0, resend: 0};
	const actions = loadServerModule("apps/web/src/features/auth/server/actions.ts", {
		"next/cache": {},
		"next/navigation": {},
		"@/features/auth/validation": {
			validateRegistration: () => ({email: "signup@example.test", password: "SecurePassword123", fieldErrors: {}}),
			hasFieldErrors: () => false,
		},
		"@/features/registrati/server/registration": {parseRegistrationPayload: () => ({profiles: [{type: "staff-sportivo", draft: {nome: "Test"}}]})},
		"@/features/auth/email-flow": {AUTH_EMAIL_FLOW: {ACCOUNT_SIGNUP: "account_signup"}, createAuthEmailFlowMetadata: () => ({email_flow: "account_signup"})},
		"@/features/auth/server/queries": {getAuthenticatedViewer: async () => null},
		"@/features/auth/utils": {getAuthConfirmUrl: () => "https://example.test/auth/confirm"},
		"@/features/registrati/server/email-identity": {getRegistrationEmailIdentity: async () => {
			calls.identity++;
			return {status: calls.identity === 1 ? "new_email" : afterFailure};
		}},
		"@/features/auth/server/signup-confirmation": {sendSignupConfirmationEmail: async () => {calls.resend++; throw new Error("Must not resend");}},
		"@/lib/supabase/admin": {createAdminClient: () => ({rpc: async name => {
			if (name === "cancel_registration") calls.cancelled++;
			return {data: "intent-token", error: null};
		}})},
		"@/lib/supabase/server": {createClient: async () => ({auth: {signUp: async () => {
			calls.signup++;
			if (thrown) throw failure;
			return {data: {user: failure ? null : verifiedUser, session: null}, error: failure};
		}}})},
	});
	return {submit: () => actions.signUpWithPassword({status: "idle"}, new FormData()), calls};
}

test("a signup committed despite HTTP 500 shows confirmation without resending or retrying", async t => {
	t.mock.method(console, "error", () => {});
	for (const thrown of [false, true]) {
		const {submit, calls} = signupActions({afterFailure: "signup_pending", thrown});
		const result = await submit();
		assert.equal(result.status, "success");
		assert.deepEqual(calls, {identity: 2, signup: 1, cancelled: 0, resend: 0});
	}
});

test("a failed signup remains an error and retains its expiring intent while Auth might still be processing", async t => {
	t.mock.method(console, "error", () => {});
	for (const thrown of [false, true]) {
		const {submit, calls} = signupActions({thrown});
		const result = await submit();
		assert.equal(result.status, "error");
		assert.match(result.message, /momentaneamente non disponibile/);
		assert.equal(calls.cancelled, 0);
		assert.equal(calls.signup, 1);
	}
});

test("signup reconciliation never claims success for incomplete or already registered identities", async t => {
	t.mock.method(console, "error", () => {});
	for (const [afterFailure, reason] of [["registered", "already_registered"], ["recovery_required", "email_verification_required"]]) {
		const {submit, calls} = signupActions({afterFailure});
		const result = await submit();
		assert.equal(result.status, "error");
		assert.equal(result.reason, reason);
		assert.equal(calls.resend, 0);
	}
});

test("successful signup and definitive validation failures still clean up the registration intent", async t => {
	t.mock.method(console, "error", () => {});
	for (const failure of [null, {name: "AuthApiError", status: 422, code: "weak_password"}]) {
		const {submit, calls} = signupActions({failure});
		const result = await submit();
		assert.equal(result.status, failure ? "error" : "success");
		assert.equal(calls.cancelled, 1);
		assert.equal(calls.identity, 1);
	}
});

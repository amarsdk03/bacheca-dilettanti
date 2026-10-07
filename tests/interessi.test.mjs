import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
function loader(stubs = {}) {
	const cache = new Map();
	function load(relativePath) {
		const file = path.resolve(root, relativePath);
		if (cache.has(file)) return cache.get(file).exports;
		const loaded = {exports: {}};
		cache.set(file, loaded);
		const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {
			fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
		});
		new Function("require", "module", "exports", outputText)((name) => {
			if (name in stubs) return stubs[name];
			if (name === "server-only") return {};
			if (name.startsWith("@/") || name.startsWith(".")) {
				const base = name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : path.resolve(path.dirname(file), name);
				return load([base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate)));
			}
			return require(name);
		}, loaded, loaded.exports);
		return loaded.exports;
	}
	return load;
}

const model = loader()("src/features/interessi/interest-model.ts");
const targetId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const target = {kind: "profilo", id: targetId, profileType: "squadra"};
const account = {authUserId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", utenteId: userId, registeredAt: "2026-09-01"};
function form(overrides = {}) {
	const value = new FormData();
	for (const [key, item] of Object.entries({profileType: "giocatore", email: " User@Example.com ", phone: "", ownershipConsent: "on", sharingConsent: "on", ...overrides})) {
		if (item !== null) value.set(key, item);
	}
	return value;
}

test("interest targets require a UUID and the actual profile type for profile details", () => {
	assert.equal(model.isInterestTarget(target), true);
	assert.equal(model.isInterestTarget({kind: "annuncio", id: targetId}), true);
	for (const value of [null, {kind: "profilo", id: targetId}, {...target, profileType: "administrator"}, {...target, id: "bad"}, {...target, kind: "utente"}]) {
		assert.equal(model.isInterestTarget(value), false);
	}
});

test("contacts require at least one valid value and two independent explicit confirmations", () => {
	const valid = model.validateInterestForm(form());
	assert.deepEqual(valid.fieldErrors, {});
	assert.equal(valid.email, "user@example.com");
	assert.equal(valid.phone, null);
	assert.deepEqual(model.validateInterestForm(form({email: "", phone: "+39 (333) 123-4567"})).fieldErrors, {});
	assert.deepEqual(model.validateInterestForm(form({phone: "+39 3331234567"})).fieldErrors, {});
	for (const [overrides, field] of [
		[{email: " ", phone: " "}, "contacts"], [{email: "invalid"}, "email"],
		[{email: "a".repeat(250) + "@example.com"}, "email"], [{phone: "123"}, "phone"],
		[{phone: "333CALLME"}, "phone"], [{profileType: "invalid"}, "profileType"],
		[{ownershipConsent: null}, "ownershipConsent"], [{sharingConsent: null}, "sharingConsent"],
		[{ownershipConsent: "true"}, "ownershipConsent"],
	]) assert.ok(model.validateInterestForm(form(overrides)).fieldErrors[field]);
});

test("quota results distinguish daily and target limits and format a safe retry timestamp", () => {
	assert.equal(model.interestRpcResult({status: "success"}).status, "success");
	const daily = model.interestRpcResult({status: "daily_limit", retryAt: "2026-10-05T22:00:00Z"});
	assert.match(daily.message, /10 manifestazioni/);
	assert.match(daily.message, /6 ottobre 2026/);
	assert.equal(daily.retryAt, "2026-10-05T22:00:00.000Z");
	assert.match(model.interestRpcResult({status: "target_limit", retryAt: "bad"}).message, /60 giorni/);
	assert.equal(model.interestRpcResult({status: "target_limit", retryAt: "bad"}).retryAt, undefined);
	assert.equal(model.interestRpcResult({status: "unexpected"}).status, "error");
});

function actionFixture(viewer = account, rpcResponse = {status: "success"}) {
	const calls = [];
	const load = loader({
		"@/features/auth/server/queries": {getAuthenticatedViewer: async () => viewer},
		"@/lib/supabase/admin": {createAdminClient: () => ({rpc: async (name, args) => {
			calls.push({name, args}); return {data: rpcResponse, error: null};
		}})},
	});
	return {calls, action: load("src/features/interessi/server/actions.ts").submitInterest};
}

test("server action rejects guests, incomplete accounts and invalid forms without any write", async () => {
	for (const [viewer, status] of [[null, "guest"], [{...account, registeredAt: null}, "registration-required"]]) {
		const fixture = actionFixture(viewer);
		assert.equal((await fixture.action(target, form())).status, status);
		assert.equal(fixture.calls.length, 0);
	}
	const fixture = actionFixture();
	assert.equal((await fixture.action({...target, profileType: "wrong"}, form())).status, "error");
	for (const overrides of [{ownershipConsent: null}, {sharingConsent: null}, {email: ""}]) {
		assert.equal((await fixture.action(target, form(overrides))).status, "error");
	}
	assert.equal(fixture.calls.length, 0);
});

test("server action derives app identity from the session and persists only validated data", async () => {
	const fixture = actionFixture();
	const input = form({senderUserId: "spoofed", recipientUserId: "spoofed"});
	assert.equal((await fixture.action(target, input)).status, "success");
	assert.deepEqual(fixture.calls, [{name: "submit_manifestazione_interesse_v1", args: {
		p_sender_user_uuid: userId, p_sender_profile_type: "giocatore", p_target_kind: "profilo", p_target_uuid: targetId,
		p_target_profile_type: "squadra", p_email: "user@example.com", p_phone: null,
		p_ownership_consent: true, p_sharing_consent: true, p_consent_version: "2026-10-05-v1",
	}}]);
	assert.equal((await actionFixture(account, {status: "own_target"}).action(target, form())).status, "error");
});

function contextFixture({viewer = account, recipientUser = "recipient", registeredAt = "2026-01-01", sender = true, active = ["giocatore", "squadra"], primary = "squadra", listed = true} = {}) {
	const load = loader({
		"@/features/auth/server/queries": {getAuthenticatedViewer: async () => viewer},
		"@/lib/supabase/admin": {createAdminClient: () => ({from(table) {
			return {select() {return this;}, eq() {return this;}, async maybeSingle() {
				return {error: null, data: table === "annuncio" ? (listed ? {autore_annuncio: targetId} : null)
					: table === "profilo" ? {uuid_utente: recipientUser}
					: table === "utente" ? {registrato_il: registeredAt} : {id: 1}};
			}};
		}})},
		"@/lib/supabase/server": {createClient: async () => ({from(table) {
			return {select() {return this;}, eq() {return this;}, async maybeSingle() {
				const tables = {giocatore: "profilo_giocatore", squadra: "profilo_squadra", "staff-sportivo": "profilo_staff_sportivo"};
				return {error: null, data: table === "profilo" ? (sender ? {uuid: userId, tipologia_principale: primary} : null)
					: active.some((type) => tables[type] === table) ? {id: 1} : null};
			}};
		}})},
	});
	return load("src/features/interessi/server/queries.ts").getInterestContext;
}

test("context hides own/anonymous/unpublished targets and only returns active owned profile choices", async () => {
	assert.equal((await contextFixture({recipientUser: userId})(target)).status, "unavailable");
	assert.equal((await contextFixture({recipientUser: null})(target)).status, "unavailable");
	assert.equal((await contextFixture({registeredAt: null})(target)).status, "unavailable");
	assert.equal((await contextFixture({listed: false})({kind: "annuncio", id: targetId})).status, "unavailable");
	assert.equal((await contextFixture({viewer: null})(target)).status, "guest");
	assert.equal((await contextFixture({sender: false})(target)).status, "profile-required");
	assert.equal((await contextFixture({active: []})(target)).status, "profile-required");
	const context = await contextFixture()(target);
	assert.equal(context.status, "ready");
	assert.deepEqual(context.profiles.map(({type, isPrimary}) => ({type, isPrimary})), [
		{type: "giocatore", isPrimary: false}, {type: "squadra", isPrimary: true},
	]);
});

test("submission failures never report success and do not expose shared contacts", async () => {
	for (const fail of [async () => ({data: null, error: {code: "42501"}}), async () => {throw new Error("offline");}]) {
		const load = loader({
			"@/features/auth/server/queries": {getAuthenticatedViewer: async () => account},
			"@/lib/supabase/admin": {createAdminClient: () => ({rpc: fail})},
		});
		const result = await load("src/features/interessi/server/actions.ts").submitInterest(target, form());
		assert.equal(result.status, "error");
		assert.doesNotMatch(result.message, /user@example.com/);
	}
});

function dialogFixture() {
	const element = (tag) => function DialogShell({children, className}) {return React.createElement(tag, {className}, children);};
	// Replace just the alert-dialog portal shell so the closed dialog contents
	// can be inspected by SSR; Select, Checkbox, Input and Field remain real.
	const load = loader({
		"next/navigation": {useRouter: () => ({refresh() {}})},
		"next/link": ({children, ...props}) => React.createElement("a", props, children),
		"@/features/interessi/server/actions": {submitInterest: async () => ({status: "success"})},
		"@/components/ui/alert-dialog": {
			AlertDialog: element("section"), AlertDialogContent: element("article"),
			AlertDialogHeader: element("header"), AlertDialogFooter: element("footer"),
			AlertDialogTitle: element("h2"), AlertDialogDescription: element("p"),
			AlertDialogTrigger: element("button"), AlertDialogCancel: element("button"),
		},
	});
	const Dialog = load("src/features/interessi/InterestDialog.tsx").default;
	return (context) => renderToStaticMarkup(React.createElement(Dialog, {target, context, href: `/dettagli-profilo?id=${targetId}&type=squadra`}));
}

test("dialog defaults to the main subprofile, blank contacts and two unchecked mandatory consents", () => {
	const render = dialogFixture();
	const profiles = [{type: "giocatore", label: "Giocatore", isPrimary: false}, {type: "squadra", label: "Squadra", isPrimary: true}];
	const html = render({status: "ready", profiles});
	assert.match(html, /name="profileType" value="squadra"/);
	assert.match(html, /name="email"[^>]*value=""/);
	assert.match(html, /name="phone"[^>]*value=""/);
	assert.equal((html.match(/aria-checked="false"/g) ?? []).length, 2);
	assert.equal((html.match(/<input(?=[^>]*type="checkbox")(?=[^>]*required="")[^>]*>/g) ?? []).length, 2);
	assert.doesNotMatch(html, /\schecked=""/);
	assert.match(html, /<button[^>]*type="submit"[^>]*disabled=""[\s\S]*?>Invia<\/button>/);
	assert.ok(html.includes(model.INTEREST_OWNERSHIP_CONSENT));
	assert.ok(html.includes(model.INTEREST_SHARING_CONSENT));
	const single = render({status: "ready", profiles: [profiles[0]]});
	assert.match(single, /<button(?=[^>]*disabled="")(?=[^>]*data-slot="select-trigger")[^>]*>/);
	assert.match(single, /name="profileType" value="giocatore"/);
});

test("guest dialog explains login and returns to the current details; own targets have no button", () => {
	const render = dialogFixture();
	const html = render({status: "guest"});
	assert.match(html, /Accedi per manifestare il tuo interesse!/);
	assert.match(html, /href="\/accedi\?next=%2Fdettagli-profilo/);
	assert.doesNotMatch(html, /<form/);
	assert.equal(render({status: "unavailable"}), "");
});

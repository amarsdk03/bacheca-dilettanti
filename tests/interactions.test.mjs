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
				const target = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate));
				return load(target);
			}
			return require(name);
		}, loaded, loaded.exports);
		return loaded.exports;
	}
	return load;
}

const ownProfile = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const targetId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const internalUser = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const authUser = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const registered = {authUserId: authUser, utenteId: internalUser, registeredAt: "2026-09-01"};

function actionFixture({account = registered, visible = true, failure = false} = {}) {
	const writes = [];
	const revalidated = [];
	const admin = {from(table) {
		let operation = "read";
		let payload;
		let options;
		const filters = [];
		const query = {
			select() {return this;},
			eq(...args) {filters.push(args); return this;},
			maybeSingle() {return Promise.resolve({data: visible ? {uuid: targetId} : null, error: null});},
			upsert(row, opts) {operation = "insert"; payload = row; options = opts; return this;},
			delete() {operation = "delete"; return this;},
			then(resolve) {
				writes.push({table, operation, payload, options, filters});
				return Promise.resolve({error: failure ? {code: "42501"} : null}).then(resolve);
			},
		};
		return query;
	}};
	const load = loader({
		"next/cache": {revalidatePath: (href) => revalidated.push(href)},
		"@/features/auth/server/queries": {getAuthenticatedViewer: async () => account},
		"@/features/interazioni/server/queries": {getOwnProfileId: async () => ownProfile},
		"@/features/profili/server/queries": {loadPublicPrimaryProfiles: async () => visible ? [{id: targetId}] : []},
		"@/lib/supabase/admin": {createAdminClient: () => admin},
		"@/lib/supabase/server": {createClient: async () => ({})},
	});
	return {actions: load("src/features/interazioni/server/actions.ts"), writes, revalidated};
}

test("interaction actions reject malformed IDs and unauthenticated/incomplete accounts before writing", async () => {
	for (const [account, status] of [[null, "guest"], [{...registered, registeredAt: null}, "registration-required"]]) {
		const fixture = actionFixture({account});
		for (const action of Object.values(fixture.actions)) {
			assert.equal((await action(targetId, true)).status, status);
			assert.equal((await action("not-an-id", true)).status, "error");
			assert.equal((await action(targetId, "true")).status, "error");
		}
		assert.equal(fixture.writes.length, 0);
	}
});

test("follows use the account profile and reject following any of its own subprofiles", async () => {
	const {actions, writes, revalidated} = actionFixture();
	assert.equal((await actions.setProfileFollow(ownProfile.toUpperCase(), true)).status, "error");
	assert.equal(writes.length, 0);
	assert.deepEqual(await actions.setProfileFollow(targetId, true), {status: "success", active: true});
	assert.deepEqual(writes[0].payload, {uuid_profilo_follower: ownProfile, uuid_profilo_seguito: targetId});
	assert.equal(writes[0].options.ignoreDuplicates, true);
	assert.deepEqual(revalidated, ["/il-tuo-profilo", "/dettagli-profilo"]);
});

test("bookmarks derive the internal user from the session and never accept a timestamp from the client", async () => {
	const {actions, writes} = actionFixture();
	assert.deepEqual(await actions.setAnnouncementSaved(targetId, true), {status: "success", active: true});
	assert.deepEqual(writes[0].payload, {uuid_utente: internalUser, uuid_annuncio: targetId});
	assert.equal(writes[0].options.ignoreDuplicates, true);
	assert.equal(writes[0].options.onConflict, "uuid_utente,uuid_annuncio");
	await actions.setAnnouncementSaved(targetId, false);
	assert.deepEqual(writes[1].filters, [["uuid_utente", internalUser], ["uuid_annuncio", targetId]]);
});

test("unavailable content cannot be followed or saved but removing an existing relationship remains possible", async () => {
	const {actions, writes} = actionFixture({visible: false});
	for (const action of Object.values(actions)) {
		assert.equal((await action(targetId, true)).status, "error");
	}
	assert.equal(writes.length, 0);
	for (const action of Object.values(actions)) {
		assert.deepEqual(await action(targetId, false), {status: "success", active: false});
	}
	assert.deepEqual(writes[0].filters, [["uuid_profilo_follower", ownProfile], ["uuid_profilo_seguito", targetId]]);
});

test("a failed write does not report success or revalidate the UI", async () => {
	const {actions, revalidated} = actionFixture({failure: true});
	assert.equal((await actions.setAnnouncementSaved(targetId, true)).status, "error");
	assert.equal((await actions.setProfileFollow(targetId, true)).status, "error");
	assert.deepEqual(revalidated, []);
});

test("saved items preserve saved-date order, ignore publication priority and omit unavailable content", () => {
	const {resolveSavedAnnouncements, formatSavedDate} = loader()("src/features/interazioni/interaction-model.ts");
	const rows = [
		{uuid_annuncio: "new", salvato_il: "2026-09-19T10:15:00Z"},
		{uuid_annuncio: "hidden", salvato_il: "2026-09-18T10:00:00Z"},
		{uuid_annuncio: "old", salvato_il: "2026-09-17T10:00:00Z"},
	];
	const items = [{id: "old", level: "prioritario"}, {id: "new", level: "gratuito"}];
	const saved = resolveSavedAnnouncements(rows, items);
	assert.deepEqual(saved.map(({announcement}) => announcement.id), ["new", "old"]);
	assert.equal(saved[0].savedAt, rows[0].salvato_il);
	const restored = resolveSavedAnnouncements(rows, [...items, {id: "hidden"}]);
	assert.equal(restored[1].savedAt, rows[1].salvato_il);
	assert.match(formatSavedDate(rows[0].salvato_il), /19 settembre 2026.*12:15/);
	assert.match(formatSavedDate("2026-01-01T23:30:00Z"), /02 gennaio 2026.*00:30/);
});

test("dashboard reads every batch through the session and hydrates only the relevant public IDs", async () => {
	const batches = [];
	const rows = Array.from({length: 252}, (_, i) => ({uuid_annuncio: `ad-${i}`, salvato_il: "2026-09-19T10:00:00Z"}));
	const client = {from(table) {
		const query = {
			select() {return this;}, eq() {return this;}, order() {return this;},
			range(from, to) {batches.push([table, from, to]); return Promise.resolve({data: table === "annuncio_salvato" ? rows.slice(from, to + 1) : [], error: null});},
		};
		return query;
	}};
	const load = loader({
		"@/features/auth/server/queries": {}, "@/lib/supabase/server": {},
		"@/features/annunci/server/queries": {loadPublicAnnouncementsByIds: async (ids) => ids.map((id) => ({id}))},
		"@/features/profili/server/queries": {loadPublicPrimaryProfiles: async () => []},
	});
	const result = await load("src/features/interazioni/server/queries.ts").getDashboardInteractions(client, internalUser, ownProfile);
	assert.equal(result.savedAnnouncements.items.length, 252);
	assert.deepEqual(batches.filter(([table]) => table === "annuncio_salvato"), [["annuncio_salvato", 0, 249], ["annuncio_salvato", 250, 499]]);
});

test("a failed bookmark read is an error while independent relationship sections still work", async () => {
	const client = {from(table) {
		return {select() {return this;}, eq() {return this;}, order() {return this;},
			range() {return Promise.resolve(table === "annuncio_salvato" ? {data: null, error: {code: "42P01"}} : {data: [], error: null});}};
	}};
	const load = loader({
		"@/features/auth/server/queries": {}, "@/lib/supabase/server": {},
		"@/features/annunci/server/queries": {},
		"@/features/profili/server/queries": {loadPublicPrimaryProfiles: async () => []},
	});
	const result = await load("src/features/interazioni/server/queries.ts").getDashboardInteractions(client, internalUser, ownProfile);
	assert.equal(result.savedAnnouncements.status, "error");
	assert.deepEqual(result.followers, {status: "success", items: []});
	assert.deepEqual(result.following, {status: "success", items: []});
});

test("the server hides the self-follow control even for uppercase profile UUIDs", async () => {
	const client = {from(table) {
		assert.equal(table, "profilo");
		return {select() {return this;}, eq() {return this;}, maybeSingle: async () => ({data: {uuid: ownProfile}, error: null})};
	}};
	const load = loader({
		"@/features/auth/server/queries": {getAuthenticatedViewer: async () => registered},
		"@/lib/supabase/server": {createClient: async () => client},
		"@/features/annunci/server/queries": {}, "@/features/profili/server/queries": {},
	});
	assert.deepEqual(await load("src/features/interazioni/server/queries.ts").getInteractionState({kind: "profilo", id: ownProfile.toUpperCase()}), {status: "own-profile"});
});

const uiLoad = loader({
	"next/navigation": {useRouter: () => ({push() {}, refresh() {}})},
	"@/features/interazioni/server/actions": {},
});

test("real toggle components render accessible persisted state and hide self-follow", () => {
	const Button = uiLoad("src/features/interazioni/InteractionButton.tsx").default;
	const render = (kind, state) => renderToStaticMarkup(React.createElement(Button, {
		target: {kind, id: targetId}, state, href: "/dettagli-annuncio", showLabel: true,
	}));
	const saved = render("annuncio", {status: "ready", active: true});
	assert.match(saved, /aria-pressed="true"/);
	assert.match(saved, /aria-label="Rimuovi dai salvati"/);
	assert.match(saved, /fill="currentColor"/);
	assert.match(saved, /announcement-save-toggle/);
	assert.doesNotMatch(saved, /<button[^>]*\shidden/);
	assert.match(render("annuncio", {status: "guest"}), /aria-pressed="false"/);
	assert.match(render("annuncio", {status: "guest"}), /announcement-save-toggle/);
	assert.doesNotMatch(render("profilo", {status: "ready", active: true}), /announcement-save-toggle/);
	assert.match(render("profilo", {status: "ready", active: false}), /aria-label="Segui profilo"/);
	assert.match(render("profilo", {status: "ready", active: true}), /aria-label="Non seguire più"/);
	assert.equal(render("profilo", {status: "own-profile"}), "");
	assert.match(render("annuncio", {status: "error"}), /Stato non disponibile\. Riprova/);
});

test("profile action presentation labels its controls and preserves own-profile and error states", () => {
	const actionsLoad = loader({
		"next/navigation": {useRouter: () => ({push() {}, refresh() {}})},
		"@/features/interazioni/server/actions": {},
		"@/features/segnalazioni/server/actions": {},
	});
	const Actions = actionsLoad("src/features/segnalazioni/DetailActions.tsx").default;
	const render = (interaction, presentation = "profile") => renderToStaticMarkup(React.createElement(Actions, {
		target: {kind: "profilo", id: targetId}, interaction, href: "/dettagli-profilo", presentation,
	}));
	const guest = render({status: "guest"});
	assert.match(guest, /role="group" aria-label="Azioni"/);
	assert.ok(guest.indexOf("Segui profilo") < guest.indexOf("Condividi"));
	assert.match(guest, />Condividi<\/button>/);
	assert.match(guest, /profile-detail-follow[^\"]*min-h-11/);
	assert.match(render({status: "ready", active: true}), /aria-pressed="true"/);
	assert.match(render({status: "error"}), />Riprova<\/button>/);
	const own = render({status: "own-profile"});
	assert.doesNotMatch(own, /Segui profilo|profile-detail-follow/);
	assert.match(own, /Condividi/);
	assert.match(own, /Segnala/);
	assert.doesNotMatch(render({status: "guest"}, "default"), /profile-detail-follow|>Condividi<\/button>/);
});

test("announcement detail actions use the shared bookmark styling without profile accent overrides", () => {
	const load = loader({
		"next/navigation": {useRouter: () => ({push() {}, refresh() {}})},
		"@/features/interazioni/server/actions": {},
		"@/features/segnalazioni/server/actions": {},
	});
	const Actions = load("src/features/segnalazioni/DetailActions.tsx").default;
	for (const active of [false, true]) {
		const html = renderToStaticMarkup(React.createElement(Actions, {
			target: {kind: "annuncio", id: targetId}, interaction: {status: "ready", active},
			href: "/dettagli-annuncio", presentation: "announcement",
		}));
		assert.match(html, /announcement-save-toggle/);
		assert.doesNotMatch(html, /profile-detail-follow/);
		assert.ok(html.indexOf(active ? "Rimuovi dai salvati" : "Salva annuncio") < html.indexOf("Condividi"));
	}
});

test("saved-list components distinguish errors from empty results and display saved timestamps", () => {
	const {SavedAnnouncementsSection} = uiLoad("src/features/interazioni/DashboardSections.tsx");
	const render = (list) => renderToStaticMarkup(React.createElement(SavedAnnouncementsSection, {list}));
	assert.match(render({status: "error"}), /Elenco momentaneamente non disponibile/);
	assert.doesNotMatch(render({status: "error"}), /Nessun annuncio salvato disponibile/);
	assert.match(render({status: "success", items: []}), /href="\/annunci"/);
	const announcement = {
		id: targetId, type: "annuncio_giocatore", profileType: "giocatore", typeLabel: "Giocatore",
		title: "Annuncio salvato dimostrativo", description: null, level: null, createdAt: "2025-01-01T10:00:00Z",
		facts: [], location: "Roma", author: {kind: "anonymous", label: "Giocatore anonimo"}, linkedTeams: [],
	};
	const html = render({status: "success", items: [{announcement, savedAt: "2026-09-19T10:15:00Z"}]});
	assert.match(html, /Annuncio salvato dimostrativo/);
	assert.match(html, /dateTime="2026-09-19T10:15:00Z"/);
	assert.match(html, /Salvato il 19 settembre 2026.*12:15/);
	assert.match(html, /Rimuovi dai salvati/);
	assert.match(html, /href="\/dettagli-annuncio\?id=/);
});

test("followers show the resolved primary identity and a working public-profile link", () => {
	const {RelationshipsSection} = uiLoad("src/features/interazioni/DashboardSections.tsx");
	const html = renderToStaticMarkup(React.createElement(RelationshipsSection, {
		followers: {status: "success", items: [{id: targetId, type: "squadra", title: "Squadra principale", imageUrl: null, followedAt: "2026-09-19T10:15:00Z"}]},
		following: {status: "success", items: []},
	}));
	assert.match(html, /Follower e seguiti/);
	assert.match(html, /Squadra principale/);
	assert.match(html, /href="\/dettagli-profilo\?id=[^"]+&amp;type=squadra"/);
	assert.match(html, /role="tab"/);
});

test("follow lists resolve one current primary profile, fall back to visible subprofiles and omit fully hidden profiles", async () => {
	const row = {
		uuid: targetId, tipologia_principale: "squadra", localita_profilo: [],
		profilo_giocatore: [{id: 1, nascosto: false, nome: "Mario", cognome: "Rossi"}],
		profilo_squadra: [{id: 2, nascosto: false, nome_societa: "Squadra principale"}],
	};
	const filters = [];
	const client = {from(table) {
		assert.equal(table, "profilo");
		return {select() {return this;}, order() {return this;}, range() {return this;},
			eq(...args) {filters.push(args); return this;}, not(...args) {filters.push(args); return this;},
			in(column, ids) {assert.equal(column, "uuid"); assert.deepEqual(ids, [targetId]); return this;},
			then(resolve) {return Promise.resolve({data: [row], error: null}).then(resolve);},
		};
	}};
	const load = loader({
		"@/lib/supabase/admin": {createAdminClient: () => client},
		"@/features/profilo/server/profile-images": {loadProfileImageUrlMap: async () => new Map()},
	});
	const {loadPublicPrimaryProfiles} = load("src/features/profili/server/queries.ts");
	const initial = await loadPublicPrimaryProfiles([targetId, targetId]);
	assert.equal(initial.length, 1);
	assert.equal(initial[0].title, "Squadra principale");
	assert.equal(initial[0].id, targetId);
	assert.deepEqual(filters.slice(0, 2), [["nascosto", false], ["uuid_utente", "is", null]]);
	row.tipologia_principale = "giocatore";
	assert.equal((await loadPublicPrimaryProfiles([targetId]))[0].title, "Mario Rossi");
	row.profilo_giocatore[0].nascosto = true;
	assert.equal((await loadPublicPrimaryProfiles([targetId]))[0].type, "squadra");
	row.profilo_squadra[0].nascosto = true;
	assert.deepEqual(await loadPublicPrimaryProfiles([targetId]), []);
});

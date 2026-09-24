import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
function sourceLoader(overrides = {}) {
	const cache = new Map();
	function load(file) {
		if (cache.has(file)) return cache.get(file).exports;
		const loaded = {exports: {}};
		cache.set(file, loaded);
		const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {
			fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
		});
		new Function("require", "module", "exports", outputText)(specifier => {
			if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
			if (specifier === "server-only") return {};
			if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
			const base = specifier.startsWith("@/") ? path.join(root, "src", specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
			return load([base, base + ".ts", base + ".tsx"].find(candidate => existsSync(candidate)));
		}, loaded, loaded.exports);
		return loaded.exports;
	}
	return relative => load(path.join(root, relative));
}

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const authorId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const otherId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const profile = {uuid: authorId, profilo_giocatore: [{id: 7, nascosto: false, nome: "Mario", cognome: "Rossi"}]};
const row = (type = "annuncio_giocatore", child = {}) => ({
	uuid: id, autore_annuncio: authorId, tipologia_annuncio: type, creato_il: "2026-09-22", livello_annuncio: null,
	stato_annuncio: "pubblicato", nascosto: false, privato: false,
	[type]: {tipologie_sport: ["Calcio a 11", "Calcio a 5"], ruoli_principali: ["Difensore"], ruoli_secondari: ["Terzino destro", "Difensore centrale"], categorie_ricercate: ["Eccellenza", "Promozione"], descrizione_aggiuntiva: "Descrizione completa", ...child},
	localita_annuncio: [{regione: "Lazio", citta: "Roma"}],
});

function fixture({current = row(), authors = [profile], similar = [], contacts = [], media = [], errors = {}, counts = {annuncio_salvato: 3, profilo_follow: 8}} = {}) {
	const calls = [];
	const client = {from(table) {
		const call = {table, operations: []};
		calls.push(call);
		const query = {};
		for (const method of ["select", "eq", "neq", "in", "not", "like", "order", "limit", "range", "maybeSingle"]) {
			query[method] = (...args) => {call.operations.push([method, ...args]); return query;};
		}
		query.then = (resolve, reject) => {
			const single = call.operations.some(([method]) => method === "maybeSingle");
			const isSimilar = table === "annuncio" && call.operations.some(([method]) => method === "neq");
			const error = errors[isSimilar ? "similar" : table];
			if (error === "throw") return Promise.reject(new Error("NETWORK_FAILURE")).then(resolve, reject);
			let data;
			let count = counts[table] ?? 0;
			if (table === "annuncio") {
				const rows = (isSimilar ? similar : [current]).filter(Boolean).filter(candidate => call.operations.every(([method, key, value]) => {
					if (method === "eq") return candidate[key] === value;
					if (method === "neq") return candidate[key] !== value;
					if (method === "in") return value.includes(candidate[key]);
					return true;
				}));
				count = rows.length;
				data = single ? rows[0] ?? null : rows;
			} else data = table === "profilo" ? authors : table === "contatto_annuncio" ? contacts : table === "media_annuncio" ? media : [];
			return Promise.resolve({data, error: error ? {code: "TEST_FAILURE"} : null, count}).then(resolve, reject);
		};
		return query;
	}};
	const load = sourceLoader({
		"@/lib/supabase/admin": {createAdminClient: () => client},
		"@/features/profilo/server/profile-images": {loadProfileImageUrlMap: async () => new Map()},
		"@/features/profilo/server/public-team-profiles": {loadPublicTeamProfiles: async () => []},
	});
	return {calls, queries: load("src/features/annunci/server/queries.ts"), load};
}

test("detail exposes aggregate counts and complete comma-separated selections; directory stays compact", async () => {
	const current = {...row(), localita_annuncio: [{regione: "Lazio", citta: "Roma"}, {regione: "Toscana", citta: "Firenze"}]};
	const {queries, calls} = fixture({current});
	const result = await queries.loadPublicAnnouncementDetail(id);
	assert.equal(result.status, "success");
	assert.equal(result.announcement.saveCount, 3);
	assert.equal(result.announcement.authorFollowerCount, 8);
	assert.equal(result.announcement.author.kind, "registered");
	assert.equal(result.announcement.facts.find(f => f.kind === "types").value, "Calcio a 11, Calcio a 5");
	assert.equal(result.announcement.fields.find(f => f.label === "Ruoli secondari").value, "Terzino destro, Difensore centrale");
	assert.equal(result.announcement.facts.find(f => f.kind === "location").value, "Firenze, Toscana, Roma, Lazio");
	assert.doesNotMatch(JSON.stringify(result), /uuid_utente|uuid_profilo_follower/);
	assert.deepEqual(calls.find(c => c.table === "annuncio_salvato").operations, [["select", "uuid_annuncio", {count: "exact", head: true}], ["eq", "uuid_annuncio", id]]);
	assert.deepEqual(calls.find(c => c.table === "profilo_follow").operations, [["select", "uuid_profilo_seguito", {count: "exact", head: true}], ["eq", "uuid_profilo_seguito", authorId]]);
	const [card] = await queries.loadPublicAnnouncementsByIds([id]);
	assert.equal(card.facts.find(f => f.kind === "types").value, "2 selezionate");
});

test("priority styling follows the published activation flag and expiry", async () => {
	const future = new Date(Date.now() + 86_400_000).toISOString();
	const past = new Date(Date.now() - 86_400_000).toISOString();
	const load = sourceLoader();
	const Header = load("src/features/annunci/components/details/AnnouncementDetailsHeader.tsx").default;
	const {ANNOUNCEMENT_DETAIL_PRESENTATIONS: presentations} = load("src/features/annunci/components/details/announcement-detail-presentation.ts");
	for (const [changes, active, level] of [
		[{priorita_attiva: true, priorita_fine_il: future}, true, "prioritario"],
		[{priorita_attiva: false, priorita_fine_il: future}, false, "gratuito"],
		[{priorita_attiva: true, priorita_fine_il: past}, false, "gratuito"],
		[{priorita_attiva: true, priorita_fine_il: "invalid"}, false, "gratuito"],
		[{priorita_attiva: true, priorita_fine_il: future, stato_annuncio: "in_revisione"}, false, "prioritario"],
	]) {
		const {queries, calls} = fixture({current: {...row(), livello_annuncio: "prioritario", ...changes}, authors: []});
		const result = await queries.loadPublicAnnouncementDetail(id);
		assert.equal(result.status, "success");
		assert.equal(result.announcement.isPriority, active);
		assert.equal(result.announcement.level, level);
		const projection = calls.find(call => call.table === "annuncio").operations[0][1];
		assert.match(projection, /priorita_attiva/);
		assert.match(projection, /priorita_fine_il/);
		const html = renderToStaticMarkup(React.createElement(Header, {
			announcement: result.announcement,
			presentation: presentations.annuncio_giocatore,
		}));
		assert.equal(html.includes("priority-announcement-header"), active);
		assert.equal(html.includes("lucide-sparkles"), active);
	}
});

test("detail exposes a stable metadata image URL without returning the private storage path", async () => {
	const privatePath = "owner/submission/image.webp";
	const {queries, calls} = fixture({media: [{id: 9, link_media: privatePath}]});
	const result = await queries.loadPublicAnnouncementDetail(id);
	assert.equal(result.status, "success");
	assert.equal(result.announcement.shareImageUrl, `/api/metadata/annuncio-immagine?id=${id}`);
	assert.doesNotMatch(JSON.stringify(result), new RegExp(privatePath));
	assert.deepEqual(calls.find(call => call.table === "media_annuncio").operations, [
		["select", "id"],
		["eq", "uuid_annuncio", id],
		["like", "formato_media", "image/%"],
		["limit", 1],
	]);
});

test("similar announcements use exact type, six newest, exclusion and every public visibility predicate", async () => {
	const {queries, calls} = fixture({similar: [{...row(), uuid: otherId}]});
	const result = await queries.loadPublicAnnouncementDetail(id);
	assert.deepEqual(result.announcement.similarAnnouncements.map(item => item.id), [otherId]);
	assert.equal(result.announcement.similarAnnouncementsUnavailable, false);
	const publicCalls = calls.filter(c => c.table === "annuncio" && !c.operations.some(([method]) => method === "maybeSingle"));
	for (const call of publicCalls) for (const expected of [["eq", "stato_annuncio", "pubblicato"], ["eq", "nascosto", false], ["eq", "privato", false]]) {
		assert.ok(call.operations.some(op => JSON.stringify(op) === JSON.stringify(expected)));
	}
	const similarCall = publicCalls.find(c => c.operations.some(([method]) => method === "neq"));
	assert.deepEqual(similarCall.operations.slice(-5), [["eq", "tipologia_annuncio", "annuncio_giocatore"], ["neq", "uuid", id], ["order", "creato_il", {ascending: false, nullsFirst: false}], ["order", "uuid", {ascending: false}], ["limit", 6]]);
});

test("anonymous and unavailable authors never trigger a follower count", async t => {
	t.mock.method(console, "error", () => {});
	for (const options of [{authors: []}, {errors: {profilo: true}}]) {
		const {queries, calls} = fixture(options);
		const result = await queries.loadPublicAnnouncementDetail(id);
		assert.equal(result.status, "success");
		assert.equal(result.announcement.authorFollowerCount, null);
		assert.equal(result.announcement.saveCount, 3);
		assert.ok(!calls.some(c => c.table === "profilo_follow"));
		assert.ok(!JSON.stringify(result.announcement.author).includes(authorId));
	}
});

test("missing current announcement prevents auxiliary queries", async () => {
	const {queries, calls} = fixture({current: null});
	assert.deepEqual(await queries.loadPublicAnnouncementDetail(id), {status: "not-found"});
	assert.equal(calls.length, 1);
	assert.deepEqual(await queries.loadPublicAnnouncementDetail("invalid"), {status: "not-found"});
	assert.equal(calls.length, 1);
});

test("saved unlisted announcements are accessible by URL with contacts but absent from discovery", async () => {
	const states = [
		{stato_annuncio: "in_revisione"},
		{stato_annuncio: "in_attesa_pagamento", nascosto: true, privato: true},
		{stato_annuncio: "rifiutato"},
		{nascosto: true},
		{privato: true},
		{stato_annuncio: null},
	];
	for (const state of states) {
		const current = {...row(), ...state, info_stato_annuncio: "PRIVATE_NOTE", creato_da: "PRIVATE_OWNER"};
		const {queries, calls, load} = fixture({current, authors: [], contacts: [{tipo: "email", valore: "contact@example.test"}]});
		const result = await queries.loadPublicAnnouncementDetail(id);
		assert.equal(result.status, "success", JSON.stringify(state));
		assert.equal(result.announcement.isListed, false);
		assert.equal(result.announcement.moderationStatus, current.stato_annuncio);
		assert.equal(result.announcement.contacts[0].value, "contact@example.test");
		assert.equal(result.announcement.saveCount, null);
		assert.ok(!calls.some(call => call.table === "annuncio_salvato"));
		assert.doesNotMatch(JSON.stringify(result), /PRIVATE_NOTE|PRIVATE_OWNER|info_stato_annuncio|creato_da/);
		const projection = calls[0].operations.find(([method]) => method === "select")[1];
		assert.doesNotMatch(projection, /info_stato_annuncio|creato_da|stripe|normalized_email/);
		assert.deepEqual(await queries.loadPublicAnnouncementsByIds([id]), []);
		assert.deepEqual((await queries.loadLatestPublicAnnouncements()).announcements, []);
		const {parseAnnouncementDirectoryQuery} = load("src/features/annunci/announcement-model.ts");
		for (const params of [{}, {q: "Difensore"}]) {
			const directory = await queries.loadPublicAnnouncementDirectory(parseAnnouncementDirectoryQuery(params));
			assert.equal(directory.error, false);
			assert.equal(directory.total, 0);
			assert.deepEqual(directory.announcements, []);
		}
	}
});

test("preview tolerates missing optional relations and rejects unsupported types", async () => {
	const current = {...row(), stato_annuncio: "in_revisione", annuncio_giocatore: null, localita_annuncio: []};
	const {queries} = fixture({current, authors: []});
	const result = await queries.loadPublicAnnouncementDetail(id);
	assert.equal(result.status, "success");
	assert.ok(result.announcement.title);
	assert.deepEqual(result.announcement.contacts, []);
	assert.deepEqual(await fixture({current: {...current, tipologia_annuncio: "unsupported"}}).queries.loadPublicAnnouncementDetail(id), {status: "not-found"});
});

test("unlisted candidates cannot appear among similar announcements", async () => {
	const {queries} = fixture({similar: [
		{...row(), uuid: otherId, stato_annuncio: "in_revisione"},
		{...row(), uuid: otherId, nascosto: true},
		{...row(), uuid: otherId, privato: true},
	]});
	assert.deepEqual((await queries.loadPublicAnnouncementDetail(id)).announcement.similarAnnouncements, []);
});

test("preview banners describe the actual state and pass share-only behavior to the actions", async () => {
	const load = sourceLoader({
		"@/features/interazioni/DetailActions": {__esModule: true, default: ({shareOnly}) => React.createElement("span", {"data-share-only": String(shareOnly)})},
	});
	const Layout = load("src/features/annunci/components/details/AnnouncementDetailsLayout.tsx").default;
	const {ANNOUNCEMENT_DETAIL_PRESENTATIONS: presentations} = load("src/features/annunci/components/details/announcement-detail-presentation.ts");
	for (const [status, title] of [
		["in_revisione", "Annuncio in attesa di revisione"],
		["in_attesa_pagamento", "Annuncio da completare"],
		["rifiutato", "Annuncio non approvato"],
		["pubblicato", "Annuncio disponibile solo tramite link"],
		[null, "Annuncio non pubblicato"],
	]) {
		const {announcement} = await fixture({current: {...row(), stato_annuncio: status, nascosto: true}, authors: []}).queries.loadPublicAnnouncementDetail(id);
		const html = renderToStaticMarkup(React.createElement(Layout, {announcement, presentation: presentations.annuncio_giocatore}));
		assert.ok(html.includes(title));
		assert.match(html, /Non compare nelle ricerche/);
		assert.match(html, /data-share-only="true"/);
		if (status !== "pubblicato") assert.match(html, /Inserito da/);
	}
	const {announcement} = await fixture({authors: []}).queries.loadPublicAnnouncementDetail(id);
	const html = renderToStaticMarkup(React.createElement(Layout, {announcement, presentation: presentations.annuncio_giocatore}));
	assert.doesNotMatch(html, /Non compare nelle ricerche/);
	assert.match(html, /data-share-only="false"/);
});

test("announcement links open the saved detail in a new tab for both preview and published states", () => {
	const ViewLink = sourceLoader()("src/features/annunci/AnnouncementViewLink.tsx").default;
	for (const isListed of [true, false]) {
		const html = renderToStaticMarkup(React.createElement(ViewLink, {id, isListed}));
		assert.ok(html.includes(`href="/dettagli-annuncio?id=${id}"`));
		assert.match(html, /target="_blank"/);
		assert.match(html, /rel="noopener noreferrer"/);
		assert.ok(html.includes(isListed ? "Visualizza" : "Anteprima"));
		assert.match(html, /nuova scheda/);
		assert.doesNotMatch(html, /role="button"/);
	}
});

test("confirmation renders the saved preview and opens its detail in a new tab before approval or payment", () => {
	const Confirmation = sourceLoader()("src/features/pubblica-annuncio/ConfermaPubblicazione.tsx").default;
	for (const awaitingPayment of [true, false]) {
		const preview = {
			id, announcementType: "annuncio_giocatore", profileType: "giocatore", title: "Annuncio salvato",
			typeLabel: "Giocatore", author: "Autore", description: null, locations: [], contacts: [], facts: [], linkedTeams: [],
			genericLink: null, videoHighlights: null, imageUrl: null, imageLabel: null, statusInfo: null,
			status: awaitingPayment ? "Pagamento da completare" : "In attesa di approvazione",
		};
		const html = renderToStaticMarkup(React.createElement(Confirmation, {result: {status: "ok", preview, suggestions: [], awaitingPayment, isListed: false}}));
		assert.match(html, /Annuncio salvato/);
		assert.ok(html.includes(preview.status));
		const link = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].find(([anchor]) => anchor.includes(`href="/dettagli-annuncio?id=${id}"`))?.[0];
		assert.ok(link);
		assert.match(link, /target="_blank"/);
		assert.match(link, /Anteprima/);
	}
});

test("count and similar failures are isolated, including rejected promises; zero remains a known count", async t => {
	t.mock.method(console, "error", () => {});
	for (const failure of [true, "throw"]) {
		const {queries} = fixture({errors: {annuncio_salvato: failure, profilo_follow: failure, similar: failure}});
		const result = await queries.loadPublicAnnouncementDetail(id);
		assert.equal(result.status, "success");
		assert.equal(result.announcement.saveCount, null);
		assert.equal(result.announcement.authorFollowerCount, null);
		assert.equal(result.announcement.similarAnnouncementsUnavailable, true);
		assert.deepEqual(result.announcement.similarAnnouncements, []);
	}
	const {queries} = fixture({counts: {annuncio_salvato: 0, profilo_follow: 0}});
	const result = await queries.loadPublicAnnouncementDetail(id);
	assert.equal(result.announcement.saveCount, 0);
	assert.equal(result.announcement.authorFollowerCount, 0);
});

test("all nine supported types render balanced fact grids and preserve supporting details", async () => {
	const types = ["annuncio_giocatore", "annuncio_squadra_cerca_giocatore", "annuncio_squadra_cerca_staff", "annuncio_squadra_cerca_partita", "annuncio_squadra_cerca_sponsor", "annuncio_staff_sportivo", "annuncio_arbitro", "annuncio_torneo_evento", "annuncio_campo_impianto"];
	const expectedHeaderLabels = {
		annuncio_giocatore: ["Ruoli principali", "Ruoli secondari", "Tipologie", "Categorie ricercate", "Num. salvataggi", "Follower autore"],
		annuncio_squadra_cerca_giocatore: ["Ruoli", "Annate", "Num. salvataggi", "Follower autore"],
		annuncio_squadra_cerca_staff: ["Figura", "Compenso mensile", "Num. salvataggi", "Follower autore"],
		annuncio_squadra_cerca_partita: ["Categorie", "Periodo", "Num. salvataggi", "Follower autore"],
		annuncio_squadra_cerca_sponsor: ["Settore", "Num. salvataggi", "Follower autore"],
		annuncio_staff_sportivo: ["Figure", "Categorie", "Num. salvataggi", "Follower autore"],
		annuncio_arbitro: ["Categorie", "Disponibilità", "Num. salvataggi", "Follower autore"],
		annuncio_torneo_evento: ["Iscrizione", "Costo", "Num. salvataggi", "Follower autore"],
		annuncio_campo_impianto: ["Tipologie", "Costo", "Num. salvataggi", "Follower autore"],
	};
	const supportingValues = {
		annuncio_squadra_cerca_giocatore: "2026/27",
		annuncio_squadra_cerca_staff: "Settore giovanile",
		annuncio_squadra_cerca_partita: "Trasferta regionale",
		annuncio_staff_sportivo: "Spostamenti regionali",
		annuncio_arbitro: "Auto propria",
		annuncio_torneo_evento: "Squadre",
	};
	const longText = "Informazioni complete senza troncamento. ".repeat(20).trim();
	const load = sourceLoader();
	const Header = load("src/features/annunci/components/details/AnnouncementDetailsHeader.tsx").default;
	const Overview = load("src/features/annunci/components/details/AnnouncementDetailsOverview.tsx").default;
	const {ANNOUNCEMENT_DETAIL_PRESENTATIONS: presentations} = load("src/features/annunci/components/details/announcement-detail-presentation.ts");
	for (const type of types) {
		const {queries} = fixture({current: row(type, {
			servizi_inclusi: longText, supporto_cercato: longText, offerta_fornita: "Offerta completa", requisiti: longText,
			stagione: "2026/27", settore: "Settore giovanile", disponibilita_trasferta: "Trasferta regionale",
			disponibilita_spostamento: "Spostamenti regionali", automunito: "Auto propria", tipo_partecipazione: "squadre",
		}), authors: []});
		const {announcement} = await queries.loadPublicAnnouncementDetail(id);
		const props = {announcement, presentation: presentations[type]};
		const html = renderToStaticMarkup(React.createElement(Header, {...props, actions: React.createElement("button", null, "Salva annuncio")}));
		assert.match(html, /public-profile-hero/);
		assert.match(html, /min-h-24/);
		assert.match(html, /Salva annuncio/);
		const labels = [...html.matchAll(/<dt[^>]*>[\s\S]*?<\/dt>/g)]
			.map(match => match[0].replace(/<[^>]+>/g, ""));
		assert.deepEqual(labels, expectedHeaderLabels[type].map(label => label === "Follower autore" ? "Num. follower profilo" : label), type);
		assert.ok([3, 4, 6].includes(labels.length));
		assert.doesNotMatch(html, /<dt[^>]*>[\s\S]*Località[\s\S]*<\/dt>/);
		assert.doesNotMatch(html, /Informazioni complete senza troncamento/);
		const overview = renderToStaticMarkup(React.createElement(Overview, props));
		assert.match(overview, /Descrizione completa/);
		if (supportingValues[type]) assert.ok(overview.includes(supportingValues[type]), `${type}: ${supportingValues[type]}`);
		if (["annuncio_squadra_cerca_staff", "annuncio_squadra_cerca_sponsor", "annuncio_campo_impianto"].includes(type)) assert.ok(overview.includes(longText));
		if (["annuncio_giocatore", "annuncio_squadra_cerca_giocatore"].includes(type)) assert.deepEqual(announcement.playerRoles.secondaryRoles, ["Terzino destro", "Difensore centrale"]);
	}
});

test("announcement location and copyable UUID follow contacts in the overview sidebar", () => {
	const load = sourceLoader();
	const Location = load("src/features/annunci/components/details/AnnouncementLocationCard.tsx").default;
	const Identifier = load("src/components/data-info/DetailIdentifier.tsx").default;
	const location = renderToStaticMarkup(React.createElement(Location, {location: "Roma, Lazio, Firenze, Toscana"}));
	const emptyLocation = renderToStaticMarkup(React.createElement(Location, {location: "Località non specificata"}));
	const identifier = renderToStaticMarkup(React.createElement(Identifier, {id, entity: "annuncio"}));
	assert.match(location, /Roma, Lazio, Firenze, Toscana/);
	assert.match(emptyLocation, /Nessuna località indicata/);
	assert.match(identifier, /UUID annuncio/);
	assert.match(identifier, /aria-label="Copia UUID dell’annuncio"/);
	assert.match(identifier, new RegExp(id));
	const layout = readFileSync(path.join(root, "src/features/annunci/components/details/AnnouncementDetailsLayout.tsx"), "utf8");
	assert.ok(layout.indexOf("<AnnouncementDetailsContacts") < layout.indexOf("<AnnouncementLocationCard"));
	assert.ok(layout.indexOf("<AnnouncementLocationCard") < layout.indexOf("<DetailIdentifier"));
});

test("similar announcements expose a tab and distinguish empty/error states", () => {
	const load = sourceLoader();
	const Tabs = load("src/features/annunci/components/details/AnnouncementDetailsTabs.tsx").default;
	const Similar = load("src/features/annunci/components/details/SimilarAnnouncements.tsx").default;
	assert.match(renderToStaticMarkup(React.createElement(Tabs, {overview: "Dettagli", similar: "Risultati"})), /role="tab"[\s\S]*Annunci simili/);
	assert.match(renderToStaticMarkup(React.createElement(Similar, {announcements: [], unavailable: false})), /Nessun annuncio simile/);
	assert.match(renderToStaticMarkup(React.createElement(Similar, {announcements: [], unavailable: true})), /temporaneamente non disponibili/);
});

test("external navigation confirmation excludes internal links, anchors, email, phone and non-web protocols", () => {
	const {externalNavigationUrl} = sourceLoader()("src/components/navigation/external-navigation.ts");
	const origin = "https://bacheca.example";
	for (const href of ["/annunci", "#ruoli", origin + "/profili", "mailto:info@example.test", "tel:+3912345678", "javascript:alert(1)", "data:text/html,test", "https://["]) assert.equal(externalNavigationUrl(href, origin), null);
	for (const href of ["https://example.test/path?ref=profilo", "//example.test/path", "http://example.test/path"]) assert.equal(externalNavigationUrl(href, origin).hostname, "example.test");
	assert.equal(externalNavigationUrl("https://bacheca.example.evil.test/", origin).hostname, "bacheca.example.evil.test");
});

test("external link intercepts normal, modified and middle clicks only inside the scoped provider", () => {
	const requests = [];
	const {ExternalLink} = sourceLoader({react: {...React, useContext: () => request => requests.push(request)}})("src/components/navigation/ExternalNavigation.tsx");
	const previousWindow = globalThis.window;
	globalThis.window = {location: {origin: "https://bacheca.example"}};
	try {
		const href = "https://example.test/video";
		const anchor = ExternalLink({href, target: "_self", rel: "noopener noreferrer"});
		for (const options of [{button: 0}, {button: 0, ctrlKey: true}, {button: 1}]) {
			const event = {defaultPrevented: false, currentTarget: {}, preventDefault() {this.defaultPrevented = true;}, ...options};
			anchor.props[options.button === 1 ? "onAuxClick" : "onClick"](event);
			assert.equal(event.defaultPrevented, true);
			assert.equal(requests.at(-1).href, href);
			assert.equal(requests.at(-1).target, options.ctrlKey || options.button === 1 ? "_blank" : "_self");
		}
		for (const href of ["/annunci", "mailto:info@example.test", "tel:+3912345678"]) {
			const event = {button: 0, defaultPrevented: false, preventDefault() {this.defaultPrevented = true;}};
			ExternalLink({href}).props.onClick(event);
			assert.equal(event.defaultPrevented, false);
		}
		const NativeLink = sourceLoader({react: {...React, useContext: () => null}})("src/components/navigation/ExternalNavigation.tsx").ExternalLink;
		const event = {button: 0, defaultPrevented: false, preventDefault() {this.defaultPrevented = true;}};
		NativeLink({href}).props.onClick(event);
		assert.equal(event.defaultPrevented, false);
		assert.equal(requests.length, 3);
		assert.equal(ExternalLink({href, target: "_blank", rel: "noopener noreferrer"}).props.rel, "noopener noreferrer");
	} finally {
		if (previousWindow === undefined) delete globalThis.window;
		else globalThis.window = previousWindow;
	}
});

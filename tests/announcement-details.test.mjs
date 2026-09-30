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
const profile = {uuid: authorId, confermato_il: "2026-09-01T10:00:00Z", verificato_il: null, profilo_giocatore: [{id: 7, nascosto: false, nome: "Mario", cognome: "Rossi", anno_nascita: "2005"}]};
const row = (type = "annuncio_giocatore", child = {}) => ({
	uuid: id, autore_annuncio: authorId, tipologia_annuncio: type, titolo_annuncio: null, creato_il: "2026-09-22", livello_annuncio: null,
	stato_annuncio: "pubblicato", nascosto: false, privato: false,
	[type]: {tipologie_sport: ["Calcio a 5", "Calcio a 11"], ruoli_principali: ["Difensore"], ruoli_secondari: ["Terzino destro", "Difensore centrale"], categorie_ricercate: ["Eccellenza", "Promozione"], descrizione_aggiuntiva: "Descrizione completa", ...child},
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
	return {calls, client, queries: load("src/features/annunci/server/queries.ts"), load};
}

test("detail exposes aggregate counts and complete comma-separated selections; directory stays compact", async () => {
	const current = {...row(), localita_annuncio: [{regione: "Lazio", citta: "Roma"}, {regione: "Toscana", citta: "Firenze"}]};
	const {queries, calls} = fixture({current});
	const result = await queries.loadPublicAnnouncementDetail(id);
	assert.equal(result.status, "success");
	assert.equal(result.announcement.saveCount, 3);
	assert.equal(result.announcement.authorFollowerCount, 8);
	assert.equal(result.announcement.author.kind, "registered");
	assert.equal(result.announcement.title, "Mario Rossi");
	assert.equal(result.announcement.author.emailConfirmed, true);
	assert.equal(result.announcement.author.officialVerified, false);
	assert.equal(result.announcement.facts.find(f => f.kind === "types").value, "Calcio 11, Calcio 5");
	assert.equal(result.announcement.fields.find(f => f.label === "Ruoli specifici").value, "Terzino destro, Difensore centrale");
	assert.equal(result.announcement.facts.find(f => f.kind === "location").value, "Firenze, Toscana, Roma, Lazio");
	assert.doesNotMatch(JSON.stringify(result), /uuid_utente|uuid_profilo_follower/);
	assert.deepEqual(calls.find(c => c.table === "annuncio_salvato").operations, [["select", "uuid_annuncio", {count: "exact", head: true}], ["eq", "uuid_annuncio", id]]);
	assert.deepEqual(calls.find(c => c.table === "profilo_follow").operations, [["select", "uuid_profilo_seguito", {count: "exact", head: true}], ["eq", "uuid_profilo_seguito", authorId]]);
	const [card] = await queries.loadPublicAnnouncementsByIds([id]);
	assert.equal(card.facts.find(f => f.kind === "types").value, "2 selezionate");
});

test("player directory filters by the author's birth year", async () => {
	const {queries, load} = fixture();
	const {parseAnnouncementDirectoryQuery} = load("src/features/annunci/announcement-model.ts");
	assert.equal((await queries.loadPublicAnnouncementDirectory(parseAnnouncementDirectoryQuery({type: "annuncio_giocatore", annoNascita: "2005"}))).total, 1);
	assert.equal((await queries.loadPublicAnnouncementDirectory(parseAnnouncementDirectoryQuery({type: "annuncio_giocatore", annoNascita: "2006"}))).total, 0);
});

test("Staff announcement details preserve category and profile snapshots", async () => {
	const male = "Calcio 5 (Maschile)::Serie A";
	const current = fixture({current: row("annuncio_staff_sportivo", {
		categorie_ricercate: [male], disponibilita_spostamento: "Da valutare", disponibile_remoto: true,
		lista_esperienze: [{id: "work", titolo: "Società Alfa", ente: "Dirigenza"}],
		qualifiche_licenze: [{id: "license", titolo: "Licenza", stato: "conseguito"}, "voce storica libera"],
	})});
	const detail = await current.queries.loadPublicAnnouncementDetail(id);
	assert.equal(detail.announcement.fields.find(({label}) => label === "Disponibilità agli spostamenti").value, "Da valutare");
	assert.ok(detail.announcement.fields.find(({label}) => label === "Lista esperienze").items.some((item) => item.includes("Dirigenza")));
	assert.ok(detail.announcement.fields.find(({label}) => label === "Qualifiche / Licenze").items.some((item) => item.includes("voce storica libera")));
});

test("team directory filters by the author's current category", async () => {
	const male = "Calcio 5 (Maschile)::Serie A";
	const current = fixture({
		current: row("annuncio_squadra_cerca_staff"),
		authors: [{...profile, profilo_giocatore: [], profilo_squadra: [{nascosto: false, nome_societa: "A.S.D. Alfa", categoria_attuale: male}]}],
	});
	const {parseAnnouncementDirectoryQuery} = current.load("src/features/annunci/announcement-model.ts");
	assert.equal((await current.queries.loadPublicAnnouncementDirectory(parseAnnouncementDirectoryQuery({type: "annuncio_squadra", ricercaSquadra: "staff", categoriaAttuale: male}))).total, 1);
	assert.equal((await current.queries.loadPublicAnnouncementDirectory(parseAnnouncementDirectoryQuery({type: "annuncio_squadra", ricercaSquadra: "staff", categoriaAttuale: "Calcio 5 (Femminile)::Serie A"}))).total, 0);
});

test("team search announcements keep saved age ranges in details without exposing them as directory filters", async () => {
	const legacy = fixture({current: row("annuncio_squadra_cerca_giocatore", {annate_ricercate: ["2004", "2007"], annata_da: null, annata_a: null})});
	const {parseAnnouncementDirectoryQuery} = legacy.load("src/features/annunci/announcement-model.ts");
	const oldDetail = await legacy.queries.loadPublicAnnouncementDetail(id);
	assert.deepEqual(oldDetail.announcement.fields.find(({label}) => label === "Annate ricercate").items, ["2004", "2007"]);
	assert.equal(parseAnnouncementDirectoryQuery({type: "annuncio_squadra", ricercaSquadra: "giocatore", annata: "2005"}).filters.annoNascita, "");

	const current = fixture({current: row("annuncio_squadra_cerca_giocatore", {annate_ricercate: [], annata_da: 2004, annata_a: 2007})});
	const newDetail = await current.queries.loadPublicAnnouncementDetail(id);
	assert.equal(newDetail.announcement.fields.find(({label}) => label === "Annate ricercate").value, "Dal 2004 al 2007");
	assert.equal(parseAnnouncementDirectoryQuery({type: "annuncio_squadra", ricercaSquadra: "giocatore", annata: "2005"}).filters.annoNascita, "");
});

test("team staff search reads multiple saved figures and keeps historical free text and dates", async () => {
	const current = fixture({current: row("annuncio_squadra_cerca_staff", {
		figura_ricercata: "Allenatore", figure_ricercate: ["Allenatore", "Preparatore atletico"],
		stagione: "2026/27", periodo_dal: null, periodo_al: null, requisiti: "Esperienza richiesta",
	})});
	const {parseAnnouncementDirectoryQuery} = current.load("src/features/annunci/announcement-model.ts");
	const detail = await current.queries.loadPublicAnnouncementDetail(id);
	assert.equal(detail.announcement.title, "Ricerca staff sportivo");
	assert.deepEqual(detail.announcement.fields.find(({label}) => label === "Figure ricercate").items, ["Allenatore", "Preparatore atletico"]);
	assert.equal(detail.announcement.fields.find(({label}) => label === "Stagione").value, "2026/27");
	const directory = await current.queries.loadPublicAnnouncementDirectory(parseAnnouncementDirectoryQuery({type: "annuncio_squadra_cerca_staff", figura: "Preparatore atletico"}));
	assert.equal(directory.total, 1);
	assert.equal(directory.announcements[0].typeLabel, "Squadra");
	assert.equal(directory.announcements[0].facts.find(({kind}) => kind === "figures").value, "2 selezionate");
	const historical = fixture({current: row("annuncio_squadra_cerca_staff", {
		figura_ricercata: "Responsabile tecnico", periodo_dal: "2026-10-01", periodo_al: "2027-06-30",
	})});
	const oldDetail = await historical.queries.loadPublicAnnouncementDetail(id);
	assert.equal(oldDetail.announcement.title, "Ricerca Responsabile tecnico");
	assert.equal(oldDetail.announcement.fields.find(({label}) => label === "Periodo").value, "Dal 01/10/2026 al 30/06/2027");
	assert.equal(oldDetail.announcement.fields.find(({label}) => label === "Stagione"), undefined);
});

test("announcement card titles use public names and fall back when profile data is unavailable", async () => {
	const {queries} = fixture({current: row("annuncio_giocatore"), authors: [profile]});
	const [named] = await queries.loadPublicAnnouncementsByIds([id]);
	assert.equal(named.title, "Mario Rossi");
	const unavailable = fixture({current: row("annuncio_giocatore"), authors: []});
	const [anonymous] = await unavailable.queries.loadPublicAnnouncementsByIds([id]);
	assert.equal(anonymous.title, "Ricerca opportunità");
});

test("custom announcement title takes precedence in result cards and detail headers", async () => {
	const current = fixture({current: {...row(), titolo_annuncio: "Difensore in prova"}});
	const [card] = await current.queries.loadPublicAnnouncementsByIds([id]);
	const detail = await current.queries.loadPublicAnnouncementDetail(id);
	assert.equal(card.title, "Difensore in prova");
	assert.equal(detail.announcement.title, "Difensore in prova");
});

test("Staff, Arbitro and Impianto share the public profile title across cards, latest and details", async () => {
	const cases = [
		["annuncio_staff_sportivo", "profilo_staff_sportivo", {nome: "Anna", cognome: "Verdi"}, "Anna Verdi"],
		["annuncio_arbitro", "profilo_arbitro", {nome: "Luca", cognome: "Neri"}, "Luca Neri"],
		["annuncio_campo_impianto", "profilo_campi_impianti", {nome_organizzazione: "Centro Sportivo Roma"}, "Centro Sportivo Roma"],
	];
	for (const [type, table, child, title] of cases) {
		const author = {uuid: authorId, confermato_il: null, verificato_il: null, [table]: [{id: 7, nascosto: false, ...child}]};
		const current = fixture({current: row(type), authors: [author]});
		const [card] = await current.queries.loadPublicAnnouncementsByIds([id]);
		const latest = await current.queries.loadLatestPublicAnnouncements();
		const detail = await current.queries.loadPublicAnnouncementDetail(id);
		assert.equal(card.title, title, `${type}: card`);
		assert.equal(latest.announcements[0].title, title, `${type}: latest`);
		assert.equal(detail.announcement.title, title, `${type}: detail`);
		const hidden = fixture({current: row(type), authors: [{...author, [table]: [{id: 7, nascosto: true, ...child}]}]});
		const [hiddenCard] = await hidden.queries.loadPublicAnnouncementsByIds([id]);
		assert.equal(hiddenCard.title, type === "annuncio_campo_impianto" ? "CAMPO DISPONIBILE" : "Ricerca opportunità", `${type}: hidden profile`);
	}
});

test("team search titles count effective roles and keep sponsor sector separate", () => {
	const content = sourceLoader()("src/features/annunci/announcement-content.ts").announcementContent;
	assert.equal(content("annuncio_squadra_cerca_giocatore", {}, [], false, "Ricerca personalizzata").title, "Ricerca personalizzata");
	assert.equal(content("annuncio_squadra_cerca_giocatore", {}, []).title, "Ricerca giocatori");
	assert.equal(content("annuncio_squadra_cerca_giocatore", {ruoli_principali: ["Portiere"]}, []).title, "Ricerca Portiere");
	assert.equal(content("annuncio_squadra_cerca_giocatore", {ruoli_principali: ["Difensore"], ruoli_secondari: ["Difensore centrale"]}, []).title, "Ricerca Difensore centrale");
	assert.equal(content("annuncio_squadra_cerca_giocatore", {ruoli_principali: ["Difensore"], ruoli_secondari: ["Difensore centrale", "Terzino destro"]}, []).title, "Ricerca giocatori");
	assert.equal(content("annuncio_squadra_cerca_giocatore", {ruoli_principali: ["Portiere", "Difensore"]}, []).title, "Ricerca giocatori");
	assert.equal(content("annuncio_squadra_cerca_staff", {}, []).title, "Ricerca staff sportivo");
	assert.equal(content("annuncio_squadra_cerca_staff", {figure_ricercate: ["Allenatore"]}, []).title, "Ricerca Allenatore");
	assert.equal(content("annuncio_squadra_cerca_staff", {figure_ricercate: ["Allenatore", "Preparatore atletico"]}, []).title, "Ricerca staff sportivo");
	assert.equal(content("annuncio_torneo_evento", {}, []).title, "Ricerca opportunità");
	const sponsor = content("annuncio_squadra_cerca_sponsor", {categoria_settore: "Abbigliamento"}, []);
	assert.equal(sponsor.title, "Ricerca sponsor");
	assert.equal(sponsor.facts.find(({label}) => label === "Settore").value, "Abbigliamento");
});

test("referee categories remain readable only on historical announcements", async () => {
	const oldAnnouncement = fixture({current: row("annuncio_arbitro", {categorie_ricercate: ["Calcio 11 (Maschile)::Eccellenza"]})});
	const oldDetail = await oldAnnouncement.queries.loadPublicAnnouncementDetail(id);
	assert.equal(oldDetail.status, "success");
	assert.deepEqual(oldDetail.announcement.fields.find(field => field.label === "Categorie storiche").items, ["Calcio 11 (Maschile) · Eccellenza"]);
	const newAnnouncement = fixture({current: row("annuncio_arbitro", {categorie_ricercate: []})});
	const newDetail = await newAnnouncement.queries.loadPublicAnnouncementDetail(id);
	assert.equal(newDetail.status, "success");
	assert.ok(!newDetail.announcement.fields.some(field => field.label.includes("Categorie")));
	assert.ok(!newDetail.announcement.facts.some(fact => fact.kind === "categories"));
});

test("recent announcements on a profile reuse the public card title, facts and visibility rules", async () => {
	const current = row("annuncio_torneo_evento", {
		nome_evento: "Coppa Lazio", modalita_iscrizione: "online", costo_partecipazione: 50,
		lista_premi_trofei: [{posto: "Primo posto", titoloPremio: "Coppa"}],
	});
	const {client, queries, calls} = fixture({current, authors: []});
	const profileResult = await queries.loadPublicProfileAnnouncements(client, authorId, "torneo-evento");
	const [publicCard] = await queries.loadPublicAnnouncementsByIds([id]);
	assert.equal(profileResult.unavailable, false);
	assert.equal(profileResult.announcementCount, 1);
	assert.deepEqual(profileResult.announcements, [publicCard]);
	const request = calls.find(call => call.table === "annuncio" && call.operations.some(([method, key]) => method === "eq" && key === "autore_annuncio"));
	assert.ok(request);
	assert.ok(request.operations.some(([method, key, value]) => method === "eq" && key === "stato_annuncio" && value === "pubblicato"));
	assert.ok(request.operations.some(([method, key, value]) => method === "eq" && key === "nascosto" && value === false));
	assert.ok(request.operations.some(([method, key, value]) => method === "eq" && key === "privato" && value === false));
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
			typeLabel: "Giocatore", author: "Autore", description: null, locations: [], contacts: [], facts: [], fields: [], playerRoles: null, linkedTeams: [],
			genericLink: null, imageUrl: null, imageLabel: null, statusInfo: null,
			status: awaitingPayment ? "Pagamento da completare" : "In attesa di approvazione",
		};
		const html = renderToStaticMarkup(React.createElement(Confirmation, {result: {status: "ok", preview, suggestions: [], awaitingPayment, isListed: false}}));
		assert.match(html, /Annuncio salvato/);
		assert.ok(html.includes(preview.status));
		assert.match(html, /Nessuna località indicata/);
		const link = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].find(([anchor]) => anchor.includes(`href="/dettagli-annuncio?id=${id}"`))?.[0];
		assert.ok(link);
		assert.match(link, /target="_blank"/);
		assert.match(link, /Anteprima/);
	}
});

test("publish preview stays light and compact while retaining locations, image, contacts and links", () => {
	const PreviewCard = sourceLoader()("src/features/pubblica-annuncio/components/AnnouncementPreviewCard.tsx").default;
	const preview = {
		announcementType: "annuncio_giocatore", profileType: "giocatore", title: "Difensore disponibile",
		typeLabel: "Giocatore", author: "Mario Rossi", description: "Descrizione completa",
		locations: [{region: "Lazio", city: "Roma"}, {region: "Lazio", city: "Viterbo"}, {region: "Toscana", city: null}],
		contacts: ["info@example.test", "+39 333 1234567"],
		facts: [{kind: "roles", label: "Ruoli principali", value: "Difensore"}, {kind: "categories", label: "Categorie", value: "Serie D"}],
		fields: [{label: "Ruoli principali", value: "Difensore", items: ["Difensore"], listStyle: "chips"}],
		playerRoles: {primaryRoles: ["Difensore"], secondaryRoles: []},
		genericLink: "https://example.test/annuncio",
		imageUrl: "https://example.test/immagine.webp", imageLabel: "Foto del campo",
		status: "In attesa di approvazione", statusInfo: "Annuncio ricevuto", linkedTeams: [],
	};
	const html = renderToStaticMarkup(React.createElement(PreviewCard, {preview}));
	assert.match(html, /announcement-preview-card/);
	assert.doesNotMatch(html, /public-profile-hero/);
	assert.equal((html.match(/data-slot="card"/g) ?? []).length, 1);
	for (const value of ["Roma (Lazio)", "Viterbo (Lazio)", "Tutta la regione Toscana", "Difensore", "info@example.test", "+39 333 1234567", "Annuncio ricevuto"]) {
		assert.ok(html.includes(value), value);
	}
	assert.ok(html.indexOf("Descrizione completa") < html.indexOf('src="https://example.test/immagine.webp"'));
	assert.match(html, /href="https:\/\/example\.test\/annuncio"/);
	assert.match(html, /Link annuncio/);
	assert.match(html, /Categorie cercate/);
	assert.match(html, /Zone di ricerca/);
});

test("publish preview shows the persisted facts and supporting fields for all ten announcement types", () => {
	const load = sourceLoader();
	const {createProfileDrafts} = load("src/features/profilo/profile-model.ts");
	const {buildPublishPreview} = load("src/features/pubblica-annuncio/announcement-preview.ts");
	const PreviewCard = load("src/features/pubblica-annuncio/components/AnnouncementPreviewCard.tsx").default;
	const drafts = createProfileDrafts();
	drafts.giocatore.nome = "Mario";
	drafts.giocatore.ruoli_sport = {principali: ["Difensore"], specifici: ["Terzino destro"]};
	drafts.giocatore.tipologie_sport = ["Calcio a 11"];
	drafts.squadra.tipologie_sport = ["Calcio a 11"];
	drafts["staff-sportivo"].figure_professionali = ["Allenatore"];
	drafts["staff-sportivo"].disponibilita = "disponibile";
	drafts.arbitro.disponibilita = "disponibile";
	const cases = [
		["annuncio_giocatore", "giocatore", {categorie_ricercate: ["Eccellenza"], descrizione_aggiuntiva: "Disponibile da subito"}, ["Ricerca opportunità", "Terzino destro", "Eccellenza"]],
		["annuncio_squadra_cerca_giocatore", "squadra", {ruoli_principali: ["Difensore"], ruoli_secondari: ["Terzino destro"], annate_ricercate: ["2004"], stagione: "2026/27", descrizione_aggiuntiva: "Cerchiamo difensore"}, ["Ricerca Terzino destro", "2004", "2026/27"]],
		["annuncio_squadra_cerca_staff", "squadra", {figura_ricercata: "Allenatore", settore: "Juniores", compenso_mensile: "1200", requisiti: "Patentino UEFA B", periodo_dal: "2026-10-01", periodo_al: "2027-06-30", descrizione_aggiuntiva: "Staff cercato"}, ["Ricerca Allenatore", "Patentino UEFA B", "Dal 01/10/2026 al 30/06/2027"]],
		["annuncio_squadra_cerca_partita", "squadra", {categorie_avversario: ["Juniores"], disponibilita_trasferta: "Regionale", periodo_dal: "2026-10-01", periodo_al: "2026-10-31", orario_dalle: "18:00", orario_alle: "20:00", descrizione_aggiuntiva: "Amichevole cercata"}, ["Ricerca partite/amichevoli", "Juniores", "Dalle 18:00 alle 20:00"]],
		["annuncio_squadra_cerca_sponsor", "squadra", {categoria_settore: "Abbigliamento", supporto_cercato: "Materiale tecnico", offerta_fornita: "Visibilità", descrizione_aggiuntiva: "Sponsor cercato"}, ["Ricerca sponsor", "Abbigliamento", "Materiale tecnico", "Visibilità"]],
		["annuncio_staff_sportivo", "staff-sportivo", {tipologie_sport: ["Calcio a 11"], categorie_ricercate: ["Juniores"], disponibilita_spostamento: "Regionale", descrizione_aggiuntiva: "Collaborazioni cercate"}, ["Ricerca opportunità", "Juniores", "Calcio 11"]],
		["annuncio_arbitro", "arbitro", {tipologie_sport: ["Calcio a 11"], categorie_ricercate: ["Juniores"], disponibilita_spostamento: "Regionale", automunito: "Auto propria", descrizione_aggiuntiva: "Disponibile nel Lazio"}, ["Ricerca opportunità", "Auto propria", "Calcio 11"]],
		["annuncio_creators", "creators", {titolo_post: "Collaborazione creator", descrizione_post: "Produzione video"}, ["Collaborazione creator", "Produzione video", "Zone di ricerca"]],
		["annuncio_torneo_evento", "torneo-evento", {nome_evento: "Coppa Lazio", tipologie_sport: ["Calcio a 11"], modalita_iscrizione: "online", annate_ammesse_da: "2004", annate_ammesse_a: "2008", numero_squadre: "8", costo_partecipazione: "50", tipo_partecipazione: "squadre", lista_premi_trofei: [{posto: "Primo posto", titoloPremio: "Coppa"}], descrizione_aggiuntiva: "Torneo estivo"}, ["Coppa Lazio", "Premi e trofei", "Primo posto: Coppa"]],
		["annuncio_campo_impianto", "campi-impianti-sportivi", {tipologie_sport: ["Calcio a 11"], orari: "Lun-Ven 18-22", costo_partenza: "60", servizi_inclusi: "Spogliatoi", descrizione_aggiuntiva: "Campo disponibile"}, ["CAMPO DISPONIBILE", "Lun-Ven 18-22", "Spogliatoi"]],
	];
	for (const [type, profileType, detail, expected] of cases) {
		const payload = {
			profileType,
			announcement: {
				type, detail, locations: [{regione: "Lazio", citta: "Roma"}],
				contacts: {email: "info@example.test", phone: ""},
				extras: {genericLink: ""},
			},
		};
		const preview = buildPublishPreview(payload, drafts, null, null);
		const html = renderToStaticMarkup(React.createElement(PreviewCard, {preview}));
		for (const value of expected) assert.ok(html.includes(value), `${type}: missing ${value}`);
		if (type !== "annuncio_squadra_cerca_sponsor") assert.match(html, /Roma/);
		assert.match(html, /info@example\.test/);
	}

	const titled = buildPublishPreview({
		profileType: "torneo-evento",
		announcement: {
			type: "annuncio_torneo_evento",
			title: "Coppa Primavera",
			detail: {nome_evento: "Torneo Lazio", tipologie_sport: ["Calcio a 11"], descrizione_aggiuntiva: "Evento"},
			locations: [{regione: "Lazio", citta: "Roma"}],
			contacts: {email: "info@example.test", phone: ""},
			extras: {genericLink: ""},
		},
	}, drafts, null, null);
	assert.equal(titled.title, "Coppa Primavera");
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
		annuncio_giocatore: ["Ruoli principali", "Ruoli specifici", "Tipologie", "Categorie ricercate", "Num. salvataggi", "Follower autore"],
		annuncio_squadra_cerca_giocatore: ["Ruolo/i cercati", "Annate", "Num. salvataggi", "Follower autore"],
		annuncio_squadra_cerca_staff: ["Figure ricercate", "Compenso mensile", "Num. salvataggi", "Follower autore"],
		annuncio_squadra_cerca_partita: ["Livelli cercati", "Periodo", "Num. salvataggi", "Follower autore"],
		annuncio_squadra_cerca_sponsor: ["Settore", "Num. salvataggi", "Follower autore"],
		annuncio_staff_sportivo: ["Figure", "Categorie", "Num. salvataggi", "Follower autore"],
		annuncio_arbitro: ["Categorie", "Disponibilità", "Num. salvataggi", "Follower autore"],
		annuncio_torneo_evento: ["Iscrizione", "Costo", "Num. salvataggi", "Follower autore"],
		annuncio_campo_impianto: ["Tipologia campo da pubblicizzare", "Prezzo orario", "Num. salvataggi", "Follower autore"],
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
		assert.match(html, /min-h-22/);
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
	const location = renderToStaticMarkup(React.createElement(Location, {locations: [{city: "Roma", region: "Lazio"}, {city: "Firenze", region: "Toscana"}]}));
	const emptyLocation = renderToStaticMarkup(React.createElement(Location, {locations: []}));
	const identifier = renderToStaticMarkup(React.createElement(Identifier, {id, entity: "annuncio"}));
	assert.match(location, /Roma/);
	assert.match(location, /Lazio/);
	assert.match(location, /Firenze/);
	assert.match(location, /Toscana/);
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

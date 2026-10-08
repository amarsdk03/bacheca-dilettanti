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

function formattedDetails(type, raw, authorProfile = null) {
	const load = sourceLoader();
	const content = load("src/features/annunci/announcement-content.ts").announcementContent(type, raw, [], true);
	const sections = load("src/features/annunci/announcement-detail-sections.ts").buildAnnouncementDetailSections({type, ...content, raw, authorProfile});
	const Overview = load("src/features/annunci/components/details/AnnouncementDetailsOverview.tsx").default;
	const html = renderToStaticMarkup(React.createElement(Overview, {announcement: {...content, sections, announcementLink: null, shareImageUrl: null}}));
	return {sections, html};
}

test("formatted opening hours preserve partial availability, order weekdays and omit inactive days", () => {
	const {sections, html} = formattedDetails("annuncio_campo_impianto", {orari: [
		{giorno: "domenica", attivo: true, dalle: "", alle: ""},
		{giorno: "venerdi", attivo: true, dalle: "", alle: "22:00"},
		{giorno: "lunedi", attivo: true, dalle: "18:00:00", alle: "23:00"},
		{giorno: "martedi", attivo: true, dalle: "17:00", alle: ""},
		{giorno: "sabato", attivo: false, dalle: "09:00", alle: "20:00"},
		{giorno: "unknown", attivo: true, dalle: "10:00", alle: "11:00"},
	]});
	const hours = sections.find(section => section.id === "hours").presentation;
	assert.deepEqual(hours.rows.map(row => row.day), ["Lunedì", "Martedì", "Venerdì", "Domenica"]);
	assert.equal(hours.rows[0].from, "18:00");
	assert.match(html, /18:00 – 23:00/);
	assert.match(html, /Dalle 17:00/);
	assert.match(html, /Fino alle 22:00/);
	assert.match(html, /Orario da definire/);
	assert.doesNotMatch(html, /Sabato|unknown|Chiuso/);
	assert.ok(html.indexOf("Lunedì") < html.indexOf("Domenica"));
	assert.equal(formattedDetails("annuncio_campo_impianto", {orari: [{giorno: "sabato", attivo: false}]}).sections.find(section => section.id === "hours").value, null);
	assert.match(formattedDetails("annuncio_campo_impianto", {orari: "Su prenotazione, anche la sera"}).html, /Su prenotazione, anche la sera/);
});

test("prize formatting preserves supplied positions and full titles without inventing ranks", () => {
	const title = "Un premio speciale con una descrizione completa ".repeat(3).trim();
	const {sections, html} = formattedDetails("annuncio_torneo_evento", {lista_premi_trofei: [
		{posto: "Fair play", titoloPremio: "Coppa della correttezza"},
		{posto: "", titoloPremio: title},
		{posto: "Primo posto", titoloPremio: ""},
	]});
	assert.deepEqual(sections.find(section => section.id === "prizes").presentation.rows, [
		{place: "Fair play", title: "Coppa della correttezza"}, {place: null, title},
	]);
	assert.match(html, /Fair play/);
	assert.ok(html.includes(title));
	assert.doesNotMatch(html, /Primo posto|Secondo posto/);
	assert.ok(html.indexOf("Coppa della correttezza") < html.indexOf(title));
});

test("metric formatting keeps zero prices, hourly qualifiers and participation units", () => {
	const tournament = formattedDetails("annuncio_torneo_evento", {costo_partecipazione: 0, numero_squadre: 0, tipo_partecipazione: "giocatori"});
	assert.equal(tournament.sections.find(section => section.id === "cost").presentation.amount, "0,00 €");
	assert.equal(tournament.sections.find(section => section.id === "cost").presentation.unit, "/ giocatore");
	assert.equal(tournament.sections.find(section => section.id === "team-count").presentation.amount, "0");
	assert.match(tournament.html, /0,00 €/);
	assert.match(tournament.html, /\/ giocatore/);
	const facility = formattedDetails("annuncio_campo_impianto", {costo_partenza: "60.5"});
	const price = facility.sections.find(section => section.id === "price").presentation;
	assert.equal(price.qualifier, "Da");
	assert.equal(price.unit, "/ ora");
	assert.equal(price.amount, "60,50 €");
	assert.notEqual(formattedDetails("annuncio_campo_impianto", {}).sections.find(section => section.id === "price").presentation.kind, "metric");
});

test("history presentation preserves qualifications, periods, statuses and legacy text entries", () => {
	const {sections, html} = formattedDetails("annuncio_staff_sportivo", {
		qualifiche_licenze: [
			{titolo: "Patentino UEFA B", ente: "FIGC", periodoDa: "2024", periodoA: "2025", stato: "conseguito", descrizione: "Prima riga\nSeconda riga"},
			"Qualifica storica senza struttura",
			{titolo: "Corso aggiornamento", stato: "in-corso"},
		],
		lista_esperienze: [{titolo: "Allenatore", ente: "Squadra Alfa", periodoDa: "2020", periodoA: "2023"}],
	});
	assert.equal(sections.find(section => section.id === "qualifications").presentation.rows.length, 3);
	assert.equal(sections.find(section => section.id === "qualifications").presentation.rows[0].description, "Prima riga\nSeconda riga");
	for (const value of ["Patentino UEFA B", "FIGC", "2024 – 2025", "Conseguito", "In corso", "Qualifica storica senza struttura", "Squadra Alfa", "2020 – 2023"]) assert.ok(html.includes(value), value);
	assert.match(html, /Prima riga\nSeconda riga/);
	assert.doesNotMatch(html, /\[object Object\]/);
	assert.deepEqual(JSON.parse(JSON.stringify(sections)), sections);
});

test("prose retains paragraphs and only explicit service lists become checklists", () => {
	const description = "Una presentazione lunga che deve mantenere tutti i suoi dettagli. ".repeat(4) + "\n\nSecondo paragrafo.";
	const facility = formattedDetails("annuncio_campo_impianto", {servizi_inclusi: "- Spogliatoi\n- Illuminazione", descrizione_aggiuntiva: description});
	assert.equal(facility.sections.find(section => section.id === "additional-info").value, description);
	assert.deepEqual(facility.sections.find(section => section.id === "services").presentation, {kind: "checklist", items: ["Spogliatoi", "Illuminazione"]});
	assert.ok(facility.html.includes(description));
	assert.equal(formattedDetails("annuncio_campo_impianto", {servizi_inclusi: "Spogliatoi, docce; parcheggio incluso"}).sections.find(section => section.id === "services").presentation.kind, "prose");
	assert.equal(formattedDetails("annuncio_servizi_consulenze", {descrizione_aggiuntiva: "Sconto del 20%\nPer tutta la community"}).sections.find(section => section.id === "promotion").value, "Sconto del 20%\nPer tutta la community");
});

test("structured dates use Italian month names and generic sections remain compatible", () => {
	const {html} = formattedDetails("annuncio_squadra_cerca_partita", {periodo_dal: "2026-10-08", periodo_al: "2026-10-15", orario_dalle: "18:00", orario_alle: "20:00"});
	assert.match(html, /Dal 8 ottobre 2026/);
	assert.match(html, /Fino al 15 ottobre 2026/);
	assert.match(html, /Dalle 18:00 alle 20:00/);
	const load = sourceLoader();
	const Content = load("src/features/annunci/components/details/AnnouncementSectionContent.tsx").default;
	const section = {id: "legacy", value: null, items: ["Voce A", "Voce B"], emptyLabel: "Non specificato"};
	const generic = renderToStaticMarkup(React.createElement(Content, {section}));
	assert.match(generic, /Voce A/);
	assert.match(generic, /Voce B/);
	assert.match(renderToStaticMarkup(React.createElement(Content, {section: {...section, items: []}})), /Non specificato/);
});

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const authorId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const otherId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const profile = {uuid: authorId, confermato_il: "2026-09-01T10:00:00Z", verificato_il: null, profilo_giocatore: [{id: 7, nascosto: false, nome: "Mario", cognome: "Rossi", anno_nascita: "2005", genere: "Uomo"}]};
const row = (type = "annuncio_giocatore", child = {}) => ({
	uuid: id, autore_annuncio: authorId, tipologia_annuncio: type, titolo_annuncio: null, creato_il: "2026-09-22", livello_annuncio: null,
	stato_annuncio: "pubblicato", nascosto: false, privato: false,
	[type === "annuncio_creators" ? "annuncio_creator" : type]: {tipologie_sport: ["Calcio a 5", "Calcio a 11"], ruoli_principali: ["Difensore"], ruoli_secondari: ["Terzino destro", "Difensore centrale"], categorie_ricercate: ["Eccellenza", "Promozione"], descrizione_aggiuntiva: "Descrizione completa", ...child},
	localita_annuncio: [{regione: "Lazio", citta: "Roma"}],
});

function fixture({current = row(), authors = [profile], anonymousProfile = null, profileLocations = [], similar = [], contacts = [], media = [], errors = {}, counts = {annuncio_salvato: 3, profilo_follow: 8}} = {}) {
	const calls = [];
	const client = {from(table) {
		const call = {table, operations: []};
		calls.push(call);
		const query = {};
		for (const method of ["select", "eq", "neq", "in", "not", "is", "or", "like", "order", "limit", "range", "maybeSingle"]) {
			query[method] = (...args) => {call.operations.push([method, ...args]); return query;};
		}
		query.then = (resolve, reject) => {
			const single = call.operations.some(([method]) => method === "maybeSingle");
			const isSimilar = table === "annuncio" && call.operations.some(([method]) => method === "neq");
			const authorDetail = table === "profilo" && call.operations.some(([method, projection]) => method === "select" && projection.includes("giorno_nascita"));
			const error = errors[authorDetail ? "author-detail" : isSimilar ? "similar" : table];
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
		} else if (table === "profilo") {
			const rows = call.operations.some(([method, key]) => method === "is" && key === "uuid_utente")
				? anonymousProfile ? [anonymousProfile] : []
				: call.operations.some(([method, key]) => method === "not" && key === "uuid_utente")
					? authors : [...authors, ...(anonymousProfile ? [anonymousProfile] : [])];
			data = single ? rows[0] ?? null : rows;
		} else data = table === "localita_profilo" ? profileLocations : table === "contatto_annuncio" ? contacts : table === "media_annuncio" ? media : [];
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
	assert.ok(!Object.hasOwn(result.announcement, "authorFollowerCount"));
	assert.equal(result.announcement.author.kind, "registered");
	assert.equal(result.announcement.title, "Mario Rossi");
	assert.equal(result.announcement.author.emailConfirmed, true);
	assert.equal(result.announcement.author.officialVerified, false);
	assert.equal(result.announcement.facts.find(f => f.kind === "types").value, "Calcio 11, Calcio 5");
	assert.equal(result.announcement.fields.find(f => f.label === "Ruoli specifici").value, "Terzino destro, Difensore centrale");
	assert.equal(result.announcement.facts.find(f => f.kind === "location").value, "Firenze, Toscana, Roma, Lazio");
	assert.doesNotMatch(JSON.stringify(result), /uuid_utente|uuid_profilo_follower/);
	assert.deepEqual(calls.find(c => c.table === "annuncio_salvato").operations, [["select", "uuid_annuncio", {count: "exact", head: true}], ["eq", "uuid_annuncio", id]]);
	assert.ok(!calls.some(c => c.table === "profilo_follow"));
	const [card] = await queries.loadPublicAnnouncementsByIds([id]);
	assert.equal(card.facts.find(f => f.kind === "types").value, "2 selezionate");
});

test("player directory filters by the author's birth year", async () => {
	const {queries, load} = fixture();
	const {parseAnnouncementDirectoryQuery} = load("src/features/annunci/announcement-model.ts");
	assert.equal((await queries.loadPublicAnnouncementDirectory(parseAnnouncementDirectoryQuery({type: "annuncio_giocatore", annoNascita: "2005"}))).total, 1);
	assert.equal((await queries.loadPublicAnnouncementDirectory(parseAnnouncementDirectoryQuery({type: "annuncio_giocatore", annoNascita: "2006"}))).total, 0);
});

test("player filters use an inclusive year range, gender and requested categories", async () => {
	const {queries, load} = fixture();
	const {parseAnnouncementDirectoryQuery, getAnnouncementFilterEntries} = load("src/features/annunci/announcement-model.ts");
	const query = values => parseAnnouncementDirectoryQuery({type: "annuncio_giocatore", ...values});
	assert.equal((await queries.loadPublicAnnouncementDirectory(query({annoDa: "2004", annoA: "2005", genere: "Uomo", categorieRicercate: "Eccellenza"}))).total, 1);
	assert.equal((await queries.loadPublicAnnouncementDirectory(query({annoDa: "2006", annoA: "2026"}))).total, 0);
	assert.equal((await queries.loadPublicAnnouncementDirectory(query({genere: "Donna"}))).total, 0);
	assert.equal((await queries.loadPublicAnnouncementDirectory(query({categorieRicercate: "Promozione"}))).total, 1);
	assert.deepEqual([query({annoDa: "2004"}).filters.annoDa, query({annoDa: "2004"}).filters.annoA], ["2004", String(new Date().getFullYear())]);
	assert.deepEqual([query({annoDa: "2004", annoA: "2003"}).filters.annoDa, query({annoDa: "2004", annoA: "2003"}).filters.annoA], ["2004", String(new Date().getFullYear())]);
	assert.equal(getAnnouncementFilterEntries(query({annoA: "2005"}).filters).length, 0);
	assert.deepEqual([query({annoNascita: "2005"}).filters.annoDa, query({annoNascita: "2005"}).filters.annoA], ["2005", "2005"]);
});

test("anonymous player facets remain filterable and essential author info stays scoped", async () => {
	const anonymousProfile = {uuid: authorId, profilo_giocatore: [{nascosto: false, nome: "Luca", cognome: "Bianchi", anno_nascita: "2005", genere: "Uomo", presentazione: "Cerco una squadra"}]};
	const {queries, load, calls} = fixture({authors: [], anonymousProfile, profileLocations: [{regione: "Lazio", citta: "Roma"}]});
	const {parseAnnouncementDirectoryQuery} = load("src/features/annunci/announcement-model.ts");
	const result = await queries.loadPublicAnnouncementDirectory(parseAnnouncementDirectoryQuery({type: "annuncio_giocatore", genere: "Uomo"}));
	assert.equal(result.total, 1);
	const detail = await queries.loadPublicAnnouncementDetail(id);
	assert.equal(detail.announcement.author.kind, "anonymous");
	assert.deepEqual(detail.announcement.anonymousAuthorInfo, {name: "Luca Bianchi", location: "Roma, Lazio", presentation: "Cerco una squadra"});
	assert.ok(calls.some(call => call.table === "profilo" && call.operations.some(([method, key, value]) => method === "is" && key === "uuid_utente" && value === null)));
	assert.doesNotMatch(JSON.stringify(detail.announcement.anonymousAuthorInfo), /uuid_utente|indirizzo_email/);
});

test("service and creator announcements are discoverable and have public details", async () => {
	const cases = [
		["annuncio_servizi_consulenze", "annuncio_servizi_consulenze", {figura_professionale: ["Preparatore atletico"], specializzazione: "Recupero", presentazione_servizi: "Consulenza sportiva", descrizione_aggiuntiva: "Allenamenti personalizzati"}],
		["annuncio_creators", "annuncio_creator", {titolo_post: "Video tattici", descrizione_post: "Analisi partita", contenuto_post: "Approfondimento tecnico"}],
	];
	for (const [type, relation, child] of cases) {
		const current = {...row(type), [type]: undefined, [relation]: child};
		const {queries, load} = fixture({current, authors: []});
		const {parseAnnouncementDirectoryQuery} = load("src/features/annunci/announcement-model.ts");
		assert.equal((await queries.loadPublicAnnouncementDirectory(parseAnnouncementDirectoryQuery({type}))).total, 1, type);
		const detail = await queries.loadPublicAnnouncementDetail(id);
		assert.equal(detail.status, "success", type);
		assert.equal(detail.announcement.type, type);
		assert.ok(detail.announcement.description);
	}
});

test("header shows compact author identity while full categories precede additional information", async () => {
	const current = row("annuncio_giocatore", {categorie_ricercate: ["Eccellenza", "Promozione", "Prima Categoria", "Seconda Categoria"]});
	const {queries, load} = fixture({current});
	const {announcement} = await queries.loadPublicAnnouncementDetail(id);
	const Header = load("src/features/annunci/components/details/AnnouncementDetailsHeader.tsx").default;
	const Overview = load("src/features/annunci/components/details/AnnouncementDetailsOverview.tsx").default;
	const header = renderToStaticMarkup(React.createElement(Header, {announcement}));
	const overview = renderToStaticMarkup(React.createElement(Overview, {announcement}));
	assert.match(header, /Mario Rossi/);
	assert.match(header, /22 settembre 2026/);
	assert.doesNotMatch(header, /<dt|Eccellenza|Num\. salvataggi/);
	for (const category of ["Eccellenza", "Promozione", "Prima Categoria", "Seconda Categoria"]) assert.ok(overview.includes(category));
	assert.ok(overview.indexOf("Seconda Categoria") < overview.indexOf("Informazioni aggiuntive:"));
});

test("author card links public profiles and explains unavailable anonymous profile links", async () => {
	const {load} = fixture();
	const AuthorCard = load("src/features/annunci/components/details/AnnouncementAuthorCard.tsx").default;
	const registered = renderToStaticMarkup(React.createElement(AuthorCard, {announcement: {author: {kind: "registered", profileId: authorId, profileType: "giocatore", title: "Mario Rossi"}}}));
	assert.match(registered, /Apri profilo/);
	assert.match(registered, /dettagli-profilo\?id=/);
	for (const kind of ["anonymous", "unavailable"]) {
		const html = renderToStaticMarkup(React.createElement(AuthorCard, {announcement: {author: {kind, profileType: "giocatore", label: "Autore"}}}));
		assert.match(html, /Apri profilo/);
		assert.match(html, /non dispone di un profilo pubblico|temporaneamente non disponibile/);
		assert.doesNotMatch(html, /href=|mailto:/);
	}
});

test("tournament cost includes its unit and facility displays hours and services without duplicating narrative", async () => {
	const {load} = fixture();
	const {announcementContent} = load("src/features/annunci/announcement-content.ts");
	const {buildAnnouncementDetailSections} = load("src/features/annunci/announcement-detail-sections.ts");
	const tournament = announcementContent("annuncio_torneo_evento", {nome_evento: "Coppa", costo_partecipazione: 50, tipo_partecipazione: "giocatore"}, [], true);
	assert.match(tournament.facts.find(fact => fact.label === "Costo").value, /50,00[^/]*\/ giocatore/);
	const raw = {orari: "Lun-Ven 18-22", servizi_inclusi: "Spogliatoi", descrizione_aggiuntiva: "Campo disponibile"};
	const facility = announcementContent("annuncio_campo_impianto", raw, [], true);
	const sections = buildAnnouncementDetailSections({type: "annuncio_campo_impianto", ...facility, authorProfile: null, raw});
	const Overview = load("src/features/annunci/components/details/AnnouncementDetailsOverview.tsx").default;
	const html = renderToStaticMarkup(React.createElement(Overview, {announcement: {...facility, sections, announcementLink: null, shareImageUrl: null}}));
	assert.match(html, /Lun-Ven 18-22/);
	assert.match(html, /Spogliatoi/);
	assert.match(html, /Campo disponibile/);
	const withoutDescription = buildAnnouncementDetailSections({type: "annuncio_campo_impianto", ...facility, authorProfile: null, raw: {...raw, descrizione_aggiuntiva: null}});
	assert.equal(withoutDescription.at(-1).value, null);
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

test("team directory ignores removed current-category parameters", async () => {
	const male = "Calcio 5 (Maschile)::Serie A";
	const current = fixture({
		current: row("annuncio_squadra_cerca_staff"),
		authors: [{...profile, profilo_giocatore: [], profilo_squadra: [{nascosto: false, nome_societa: "A.S.D. Alfa", categoria_attuale: male}]}],
	});
	const {parseAnnouncementDirectoryQuery} = current.load("src/features/annunci/announcement-model.ts");
	assert.equal((await current.queries.loadPublicAnnouncementDirectory(parseAnnouncementDirectoryQuery({type: "annuncio_squadra", ricercaSquadra: "staff", categoriaAttuale: male}))).total, 1);
	assert.equal((await current.queries.loadPublicAnnouncementDirectory(parseAnnouncementDirectoryQuery({type: "annuncio_squadra", ricercaSquadra: "staff", categoriaAttuale: "Calcio 5 (Femminile)::Serie A"}))).total, 1);
	assert.equal(parseAnnouncementDirectoryQuery({type: "annuncio_squadra", categoriaAttuale: male}).filters.categoriaAttuale, undefined);
});

test("team search announcements keep saved age ranges in details without exposing them as directory filters", async () => {
	const legacy = fixture({current: row("annuncio_squadra_cerca_giocatore", {annate_ricercate: ["2004", "2007"], annata_da: null, annata_a: null})});
	const {parseAnnouncementDirectoryQuery} = legacy.load("src/features/annunci/announcement-model.ts");
	const oldDetail = await legacy.queries.loadPublicAnnouncementDetail(id);
	assert.equal(oldDetail.announcement.fields.find(({label}) => label === "Annate ricercate"), undefined);
	assert.equal(parseAnnouncementDirectoryQuery({type: "annuncio_squadra", ricercaSquadra: "giocatore", annata: "2005"}).filters.annoDa, "");

	const current = fixture({current: row("annuncio_squadra_cerca_giocatore", {annate_ricercate: [], annata_da: 2004, annata_a: 2007})});
	const newDetail = await current.queries.loadPublicAnnouncementDetail(id);
	assert.equal(newDetail.announcement.fields.find(({label}) => label === "Annate ricercate").value, "Dal 2004 al 2007");
	assert.equal(parseAnnouncementDirectoryQuery({type: "annuncio_squadra", ricercaSquadra: "giocatore", annata: "2005"}).filters.annoDa, "");
});

test("team staff search reads current figures and omits historical free text and dates", async () => {
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
	assert.equal(oldDetail.announcement.title, "Ricerca staff sportivo");
	assert.equal(oldDetail.announcement.fields.find(({label}) => label === "Periodo"), undefined);
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

test("referee categories are omitted even when historical announcements contain them", async () => {
	const oldAnnouncement = fixture({current: row("annuncio_arbitro", {categorie_ricercate: ["Calcio 11 (Maschile)::Eccellenza"]})});
	const oldDetail = await oldAnnouncement.queries.loadPublicAnnouncementDetail(id);
	assert.equal(oldDetail.status, "success");
	assert.ok(!oldDetail.announcement.fields.some(field => field.label.includes("Categorie")));
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
		assert.doesNotMatch(html, /lucide-sparkles|priority-announcement-level-badge/);
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
		assert.ok(!Object.hasOwn(result.announcement, "authorFollowerCount"));
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
		assert.match(html, /Pubblicato il:/);
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
		["annuncio_squadra_cerca_giocatore", "squadra", {ruoli_principali: ["Difensore"], ruoli_secondari: ["Terzino destro"], annata_da: 2004, annata_a: 2004, stagione: "2026/27", descrizione_aggiuntiva: "Cerchiamo difensore"}, ["Ricerca Terzino destro", "2004", "2026/27"]],
		["annuncio_squadra_cerca_staff", "squadra", {figure_ricercate: ["Allenatore"], settore: "Juniores", compenso_mensile: "1200", requisiti: "Patentino UEFA B", periodo_dal: "2026-10-01", periodo_al: "2027-06-30", descrizione_aggiuntiva: "Staff cercato"}, ["Ricerca Allenatore", "Patentino UEFA B"]],
		["annuncio_squadra_cerca_partita", "squadra", {categorie_avversario: ["Juniores"], disponibilita_trasferta: "Regionale", periodo_dal: "2026-10-01", periodo_al: "2026-10-31", orario_dalle: "18:00", orario_alle: "20:00", descrizione_aggiuntiva: "Amichevole cercata"}, ["Ricerca partite/amichevoli", "Juniores", "Dalle 18:00 alle 20:00"]],
		["annuncio_squadra_cerca_sponsor", "squadra", {categoria_settore: "Abbigliamento", supporto_cercato: "Materiale tecnico", offerta_fornita: "Visibilità", descrizione_aggiuntiva: "Sponsor cercato"}, ["Ricerca sponsor", "Abbigliamento", "Visibilità"]],
		["annuncio_staff_sportivo", "staff-sportivo", {tipologie_sport: ["Calcio a 11"], categorie_ricercate: ["Juniores"], disponibilita_spostamento: "Regionale", descrizione_aggiuntiva: "Collaborazioni cercate"}, ["Ricerca opportunità", "Juniores", "Calcio 11"]],
		["annuncio_arbitro", "arbitro", {tipologie_sport: ["Calcio a 11"], categorie_ricercate: ["Juniores"], disponibilita_spostamento: "Regionale", automunito: "Auto propria", descrizione_aggiuntiva: "Disponibile nel Lazio"}, ["Ricerca opportunità", "Auto propria", "Calcio 11"]],
		["annuncio_creators", "creators", {titolo_post: "Collaborazione creator", descrizione_post: "Produzione video"}, ["Annuncio creator", "Produzione video", "Zone di ricerca"]],
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
		assert.ok(!Object.hasOwn(result.announcement, "authorFollowerCount"));
		assert.equal(result.announcement.similarAnnouncementsUnavailable, true);
		assert.deepEqual(result.announcement.similarAnnouncements, []);
	}
	const {queries} = fixture({counts: {annuncio_salvato: 0, profilo_follow: 0}});
	const result = await queries.loadPublicAnnouncementDetail(id);
	assert.equal(result.announcement.saveCount, 0);
	assert.ok(!Object.hasOwn(result.announcement, "authorFollowerCount"));
});

test("all eleven types render the configured sections, author header and complete additional information", async () => {
	const load = sourceLoader();
	const types = load("src/features/annunci/announcement-content.ts").ACTIVE_ANNOUNCEMENT_TYPES;
	const Header = load("src/features/annunci/components/details/AnnouncementDetailsHeader.tsx").default;
	const Overview = load("src/features/annunci/components/details/AnnouncementDetailsOverview.tsx").default;
	for (const type of types) {
		const {announcement} = await fixture({current: row(type, {descrizione_post: "Post creator", presentazione_servizi: "Servizi completi", requisiti: "Requisiti completi", servizi_inclusi: "Spogliatoi"}), authors: []}).queries.loadPublicAnnouncementDetail(id);
		const header = renderToStaticMarkup(React.createElement(Header, {announcement, actions: React.createElement("button", null, "Salva annuncio")}));
		assert.match(header, /Salva annuncio/);
		assert.match(header, /Pubblicato il:/);
		assert.doesNotMatch(header, /<dt|Num\. salvataggi/);
		const html = renderToStaticMarkup(React.createElement(Overview, {announcement}));
		assert.equal([...html.matchAll(/<h2\b/g)].length, announcement.sections.length, type);
		assert.ok(announcement.sections.every(section => html.includes(section.title + ":")), type);
		assert.match(html, /Non specificat/);
		assert.match(html, type === "annuncio_creators" ? /Post creator/ : /Descrizione completa/);
		if (type === "annuncio_servizi_consulenze") {
			assert.match(html, /aria-label="Italia"/);
			assert.match(html, /Servizi completi/);
			assert.equal(announcement.sections.at(-1).value, null);
		}
		if (type === "annuncio_campo_impianto") assert.match(html, /Spogliatoi/);
	}
});

test("sidebar follows central content and orders profile, contacts, sponsor and copyable UUID", async () => {
	const load = sourceLoader({"@/features/interazioni/DetailActions": {__esModule: true, default: () => null}});
	const Layout = load("src/features/annunci/components/details/AnnouncementDetailsLayout.tsx").default;
	const {announcement} = await fixture().queries.loadPublicAnnouncementDetail(id);
	const html = renderToStaticMarkup(React.createElement(Layout, {announcement, authenticated: false, returnTo: "/dettagli-annuncio?id=" + id}));
	const aside = html.slice(html.indexOf('<aside aria-label="Profilo autore, contatti e sponsor"'));
	assert.ok(html.indexOf("Informazioni aggiuntive:") < html.indexOf('<aside'));
	const titles = ["Apri profilo", "Contatta", "Annuncio Giocatore", "UUID annuncio"];
	for (let index = 1; index < titles.length; index++) assert.ok(aside.indexOf(titles[index - 1]) < aside.indexOf(titles[index]));
	assert.equal((html.match(/Powered by/g) ?? []).length, 1);
	assert.doesNotMatch(html, /Informazioni sportive e contatti/);
	assert.match(html, /lg:grid-cols-/);
	assert.match(html, /aria-label="Copia UUID dell’annuncio"/);
});

test("similar announcements expose a tab and distinguish empty/error states", () => {
	const load = sourceLoader();
	const Tabs = load("src/features/annunci/components/details/AnnouncementDetailsTabs.tsx").default;
	const Similar = load("src/features/annunci/components/details/SimilarAnnouncements.tsx").default;
	assert.match(renderToStaticMarkup(React.createElement(Tabs, {overview: "Dettagli", similar: "Risultati"})), /role="tab"[\s\S]*Annunci simili/);
	assert.match(renderToStaticMarkup(React.createElement(Tabs, {overview: "Dettagli", similar: "Risultati"})), /Dettagli annuncio/);
	assert.match(renderToStaticMarkup(React.createElement(Similar, {announcements: [], unavailable: false})), /Nessun annuncio simile/);
	assert.match(renderToStaticMarkup(React.createElement(Similar, {announcements: [], unavailable: true})), /temporaneamente non disponibili/);
});

test("each announcement type preserves the requested section order including empty sections", async () => {
	const expected = {
		annuncio_giocatore: ["Zona/e di ricerca", "Calcio", "Ruolo/i", "Anno", "Categoria cercata", "Categorie precedenti", "Informazioni aggiuntive"],
		annuncio_squadra_cerca_giocatore: ["Zona/e di ricerca", "Calcio", "Gruppo squadra", "Ruolo/i cercati", "Ruolo/i specifici", "Annate / Età", "Stagione", "Informazioni aggiuntive"],
		annuncio_squadra_cerca_staff: ["Zona/e di ricerca", "Calcio", "Gruppo squadra", "Figura cercata", "Annate / Età", "Stagione", "Requisiti", "Informazioni aggiuntive"],
		annuncio_squadra_cerca_partita: ["Zona/e di ricerca", "Calcio", "Gruppo squadra", "Categoria avvers. cercato", "Periodo", "Orario indicativo", "Informazioni aggiuntive"],
		annuncio_squadra_cerca_sponsor: ["Sede della squadra", "Zona/e di ricerca", "Categoria attuale Prima Squadra", "Visibilità offerta", "Informazioni aggiuntive"],
		annuncio_staff_sportivo: ["Zona/e di ricerca", "Calcio", "Figura/e profilo", "Categoria / Settore cercato", "Qualifiche", "Esperienza", "Spostamento", "Informazioni aggiuntive"],
		annuncio_arbitro: ["Zona/e di ricerca", "Calcio", "Qualifiche", "Esperienza", "Automunito", "Disponibilità agli spostamenti", "Informazioni aggiuntive"],
		annuncio_torneo_evento: ["Zona/e di svolgimento per questo torneo", "Calcio", "Campo", "Data / Periodo", "Orari indicativi", "Numero Squadre", "Annate ammesse", "Costo iscrizione", "Premi", "Informazioni aggiuntive"],
		annuncio_campo_impianto: ["Località", "Tipologia del campo", "Disponibilità orari", "Prezzo orario", "Servizi inclusi", "Informazioni aggiuntive"],
		annuncio_servizi_consulenze: ["Sede Attività", "Tipologia di azienda/professionista", "Disponibilità", "Promozione/Offerta per la community", "Contenuto", "Informazioni aggiuntive"],
		annuncio_creators: ["Tipologia di contenuti", "Contenuto dell’annuncio"],
	};
	for (const [type, titles] of Object.entries(expected)) {
		const {announcement} = await fixture({current: row(type), authors: []}).queries.loadPublicAnnouncementDetail(id);
		assert.deepEqual(announcement.sections.map(section => section.title), titles, type);
		assert.equal(new Set(announcement.sections.map(section => section.id)).size, titles.length);
	}
});

test("badges use author values, limit staff figures and only use known referee booleans", () => {
	const load = sourceLoader();
	const {announcementAuthorBadges} = load("src/features/annunci/announcement-detail-sections.ts");
	const profile = {age: 24, birthYear: "2002", primaryRoles: ["Difensore", "Centrocampista"], sportTypes: ["Calcio 11"], currentCategory: "Promozione", figures: ["Allenatore", "Preparatore atletico", "Dirigente", "Fisioterapista"], companyType: "Studio professionale", availabilityLabel: "Disponibile", contentTypes: ["Interviste"]};
	const expected = {
		annuncio_giocatore: ["24 anni (2002)", "Difensore", "Centrocampista"],
		annuncio_squadra_cerca_giocatore: ["Calcio 11", "Promozione"],
		annuncio_squadra_cerca_staff: ["Calcio 11", "Promozione"],
		annuncio_squadra_cerca_partita: ["Calcio 11", "Promozione"],
		annuncio_squadra_cerca_sponsor: ["Calcio 11", "Promozione"],
		annuncio_staff_sportivo: ["Calcio 11", "Allenatore", "Preparatore atletico", "Dirigente", "+ altre…"],
		annuncio_arbitro: ["Calcio 11", "Automunito", "Solo in zone ricercate"],
		annuncio_torneo_evento: ["Calcio 11"], annuncio_campo_impianto: ["Calcio 11"],
		annuncio_servizi_consulenze: ["Studio professionale", "Disponibile"], annuncio_creators: ["Interviste"],
	};
	for (const [type, labels] of Object.entries(expected)) assert.deepEqual(announcementAuthorBadges(type, profile, [{id: "car", value: "Sì"}, {id: "travel", value: "No"}]).map(badge => badge.label), labels, type);
	assert.equal(announcementAuthorBadges("annuncio_staff_sportivo", profile, []).at(-1).title, "Fisioterapista");
	assert.deepEqual(announcementAuthorBadges("annuncio_arbitro", null, []), []);
	assert.deepEqual(announcementAuthorBadges("annuncio_arbitro", null, [{id: "car", value: "No"}, {id: "travel", value: "Si"}]).map(badge => badge.label), ["Non automunito", "Pronto a trasferirsi"]);
	assert.deepEqual(announcementAuthorBadges("annuncio_giocatore", {...profile, age: null}, []).map(badge => badge.label), profile.primaryRoles);
});

test("author projection exposes age and career categories without full birth dates or unrelated locations", async () => {
	const publicProfile = {...profile, profilo_giocatore: [{...profile.profilo_giocatore[0], giorno_nascita: "1", mese_nascita: "Gennaio", ruoli_sport: {principali: ["Portiere"]}, storico_carriera: [{ente: "Eccellenza", descrizione: "Private career note"}, {ente: "Eccellenza"}, {ente: "Promozione"}]}], localita_profilo: [{sottoprofilo: "giocatore", id_sottoprofilo: 7, regione: "Lazio", citta: "Roma"}, {sottoprofilo: "giocatore", id_sottoprofilo: 999, regione: "Piemonte", citta: "Torino"}, {sottoprofilo: "squadra", id_sottoprofilo: 7, regione: "Veneto", citta: "Verona"}]};
	const {queries, calls, load} = fixture({authors: [publicProfile]});
	const {announcement} = await queries.loadPublicAnnouncementDetail(id);
	assert.ok(announcement.authorProfile.age > 0);
	assert.equal(announcement.authorProfile.birthYear, "2005");
	assert.deepEqual(announcement.authorProfile.previousCategories, ["Eccellenza", "Promozione"]);
	assert.deepEqual(announcement.authorProfile.locations, [{region: "Lazio", city: "Roma"}]);
	assert.deepEqual(load("src/features/annunci/announcement-detail-sections.ts").announcementAuthorBadges(announcement.type, announcement.authorProfile, announcement.sections).map(badge => badge.label), [announcement.authorProfile.age + " anni (2005)", "Portiere"]);
	assert.doesNotMatch(JSON.stringify(announcement), /giorno_nascita|mese_nascita|Private career note|Torino|Verona/);
	const query = calls.find(call => call.table === "profilo" && call.operations.some(([method, value]) => method === "select" && value.includes("giorno_nascita")));
	assert.ok(query.operations.some(([method, key, value]) => method === "eq" && key === "nascosto" && value === false));
	assert.ok(query.operations.some(([method, key]) => method === "not" && key === "uuid_utente"));
	const before = calls.length;
	await queries.loadPublicAnnouncementsByIds([id]);
	assert.ok(!calls.slice(before).some(call => call.operations.some(([method, value]) => method === "select" && value.includes("giorno_nascita"))));
});

test("supplemental author query failures keep the announcement readable with placeholders", async () => {
	const {announcement} = await fixture({errors: {"author-detail": true}}).queries.loadPublicAnnouncementDetail(id);
	assert.equal(announcement.author.kind, "registered");
	assert.equal(announcement.authorProfile, null);
	assert.equal(announcement.sections.find(section => section.id === "birth-year").value, null);
	assert.equal(announcement.sections.find(section => section.id === "additional-info").value, "Descrizione completa");
});

test("year ranges format approximate ages and tolerate partial or invalid data", () => {
	const {announcementYearRange} = sourceLoader()("src/features/annunci/announcement-detail-sections.ts");
	const now = new Date("2026-10-08T12:00:00Z");
	assert.equal(announcementYearRange("2002", "2005", now), "2002–2005 · circa 21–24 anni");
	assert.equal(announcementYearRange("2002", "2002", now), "2002 · circa 24 anni");
	assert.equal(announcementYearRange("2002", null, now), "Dal 2002 · circa 24 anni");
	assert.equal(announcementYearRange(null, "2005", now), "Fino al 2005 · circa 21 anni");
	assert.equal(announcementYearRange("2005", "2002", now), null);
	assert.equal(announcementYearRange(null, "invalid", now), null);
});

test("age calculation uses the complete birthday and handles Italian calendar boundaries", () => {
	const {publicPlayerAge} = sourceLoader()("src/features/dettagli-profilo/server/player-profile-data.ts");
	const birth = {day: "9", month: "Ottobre", year: "2002"};
	assert.equal(publicPlayerAge(birth, new Date("2026-10-08T12:00:00Z")), 23);
	assert.equal(publicPlayerAge(birth, new Date("2026-10-09T12:00:00Z")), 24);
	assert.equal(publicPlayerAge({day: null, month: null, year: "2002"}), null);
});

test("optional link and image sections follow all details with a visible external-link notice", async () => {
	const load = sourceLoader();
	const Overview = load("src/features/annunci/components/details/AnnouncementDetailsOverview.tsx").default;
	const {announcement} = await fixture().queries.loadPublicAnnouncementDetail(id);
	const html = renderToStaticMarkup(React.createElement(Overview, {announcement: {...announcement, announcementLink: "https://example.com", shareImageUrl: "/api/metadata/annuncio-immagine?id=" + id}}));
	assert.ok(html.indexOf("Informazioni aggiuntive:") < html.indexOf("Link annuncio:"));
	assert.ok(html.indexOf("Link annuncio:") < html.indexOf("Immagine annuncio:"));
	assert.match(html, /sito esterno in una nuova scheda/);
	assert.match(html, /rel="noopener noreferrer"/);
	assert.match(html, /target="_blank"/);
	const absent = renderToStaticMarkup(React.createElement(Overview, {announcement}));
	assert.doesNotMatch(absent, /Link annuncio:|Immagine annuncio:/);
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


test("anonymous profile names protect existing announcement details and cards while preserving identity links", async () => {
 for (const [type, table, expected] of [
  ["annuncio_giocatore", "profilo_giocatore", "Giocatore"],
  ["annuncio_staff_sportivo", "profilo_staff_sportivo", "Staff sportivo"],
  ["annuncio_arbitro", "profilo_arbitro", "Arbitro"],
  ["annuncio_squadra_cerca_giocatore", "profilo_squadra", "Squadra"],
 ]) {
  const privateAuthor = {...profile, [table]: [{nascosto: false, nominativo_anonimo: true, nome: "Nome riservato", cognome: "Cognome riservato", nome_societa: "Società riservata"}]};
  const {queries} = fixture({current: row(type), authors: [privateAuthor]});
  const detail = await queries.loadPublicAnnouncementDetail(id);
  assert.equal(detail.status, "success");
  assert.equal(detail.announcement.author.kind, "registered");
  assert.equal(detail.announcement.author.profileId, authorId);
  assert.equal(detail.announcement.author.title, expected);
  assert.doesNotMatch(JSON.stringify(detail), /Nome riservato|Cognome riservato|Società riservata/);
  const [card] = await queries.loadPublicAnnouncementsByIds([id]);
  assert.equal(card.author.title, expected);
  assert.doesNotMatch(JSON.stringify(card), /Nome riservato|Cognome riservato|Società riservata/);
 }
});

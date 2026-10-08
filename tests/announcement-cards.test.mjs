import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function sourceLoader() {
	const cache = new Map();
	function load(file) {
		if (cache.has(file)) return cache.get(file).exports;
		const loadedModule = {exports: {}};
		cache.set(file, loadedModule);
		const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				target: ts.ScriptTarget.ES2022,
				jsx: ts.JsxEmit.ReactJSX,
				esModuleInterop: true,
			},
			fileName: file,
		});
		const localRequire = (specifier) => {
			if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
			const base = specifier.startsWith("@/")
				? path.join(root, "src", specifier.slice(2))
				: path.resolve(path.dirname(file), specifier);
			const target = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate));
			if (!target) throw new Error(`Cannot resolve ${specifier}`);
			return load(target);
		};
		new Function("require", "module", "exports", outputText)(localRequire, loadedModule, loadedModule.exports);
		return loadedModule.exports;
	}
	return (relative) => load(path.join(root, relative));
}

const load = sourceLoader();
const AnnouncementCard = load("src/features/annunci/components/cards/AnnouncementCard.tsx").default;
const {getAnnouncementFacts} = load("src/features/annunci/components/cards/announcement-card-model.ts");
const {buildAnnouncementCardRows} = load("src/features/annunci/announcement-card-rows.ts");

const FACTS = [
	{kind: "roles", label: "Ruoli principali", value: "Difensore"},
	{kind: "roles", label: "Ruoli specifici", value: "Terzino destro"},
	{kind: "types", label: "Tipologie", value: "Calcio 11"},
	{kind: "categories", label: "Categorie ricercate", value: "Eccellenza"},
	{kind: "location", label: "Località", value: "Roma, Lazio"},
	{kind: "roles", label: "Ruoli", value: "Attaccante"},
	{kind: "categories", label: "Annate", value: "2004"},
	{kind: "season", label: "Stagione", value: "2026/27"},
	{kind: "figures", label: "Figura", value: "Allenatore"},
	{kind: "sector", label: "Settore", value: "Prima squadra"},
	{kind: "compensation", label: "Compenso mensile", value: "1.000 €"},
	{kind: "categories", label: "Categorie", value: "Juniores"},
	{kind: "period", label: "Periodo", value: "Giugno"},
	{kind: "availability", label: "Trasferta", value: "Sì"},
	{kind: "services", label: "Supporto cercato", value: "Materiale"},
	{kind: "services", label: "Visibilità offerta", value: "Visibilità"},
	{kind: "figures", label: "Figure", value: "Preparatore"},
	{kind: "availability", label: "Spostamenti", value: "Disponibile"},
	{kind: "availability", label: "Disponibilità", value: "Disponibile subito"},
	{kind: "car", label: "Automunito", value: "Sì"},
	{kind: "registration", label: "Iscrizione", value: "Online"},
	{kind: "participation", label: "Partecipazione", value: "Squadre"},
	{kind: "price", label: "Costo", value: "50 €"},
	{kind: "services", label: "Servizi", value: "Spogliatoi"},
];

const PROFILE_TYPE_BY_ANNOUNCEMENT = {
	annuncio_giocatore: "giocatore",
	annuncio_squadra_cerca_giocatore: "squadra",
	annuncio_squadra_cerca_staff: "squadra",
	annuncio_squadra_cerca_partita: "squadra",
	annuncio_squadra_cerca_sponsor: "squadra",
	annuncio_staff_sportivo: "staff-sportivo",
	annuncio_arbitro: "arbitro",
	annuncio_torneo_evento: "torneo-evento",
	annuncio_campo_impianto: "campi-impianti-sportivi",
	annuncio_servizi_consulenze: "servizi-consulenze",
	annuncio_creators: "creators",
};

function fixtureAnnouncement(type, facts = FACTS, linkedTeams = [], isPriority = false) {
	return {
		id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
		type,
		typeLabel: `Tipo ${type}`,
		profileType: PROFILE_TYPE_BY_ANNOUNCEMENT[type],
		title: "Titolo annuncio dimostrativo",
		description: "Descrizione dimostrativa.",
		createdAt: "2026-09-16T12:00:00.000Z",
		level: isPriority ? "prioritario" : "gratuito",
		isPriority,
		location: "Roma, Lazio",
		facts,
		cardRows: [{key: `${type}:0`, label: "Zona/e di ricerca", value: "Roma + altre"}],
		linkedTeams,
		author: {
			kind: "registered",
			profileId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
			profileType: "giocatore",
			title: "Autore dimostrativo",
			imageUrl: null,
			emailConfirmed: true,
			officialVerified: false,
			presentation: null,
			location: "Roma, Lazio",
			locations: [],
			highlights: [],
		},
	};
}

function renderAnnouncement(type, facts, isPriority = false) {
	return renderToStaticMarkup(React.createElement(AnnouncementCard, {
		announcement: fixtureAnnouncement(type, facts, [], isPriority),
	}));
}

function factLabelIndex(html, label) {
	return html.indexOf(`>${label}</span>`);
}

test("the dispatcher shows compact metadata rows for every announcement type without description", () => {
	for (const type of Object.keys(PROFILE_TYPE_BY_ANNOUNCEMENT)) {
		const html = renderAnnouncement(type);
		assert.match(html, /Titolo annuncio dimostrativo/);
		assert.doesNotMatch(html, /Descrizione dimostrativa/);
		assert.match(html, /<time /);
		assert.match(html, /Apri annuncio/);
		assert.match(html, /data-icon="inline-start"/);
		assert.doesNotMatch(html, /data-profile-icon=/);
		assert.match(html, /<dl\b/);
		assert.match(html, /Zona\/e di ricerca:/);
		assert.match(html, />\.\.\.<\/p>/);
	}
});

test("service and creator result cards have a subtle theme without overriding priority", () => {
	for (const type of ["annuncio_servizi_consulenze", "annuncio_creators"]) {
		assert.match(renderAnnouncement(type), /announcement-themed-card/, type);
		const priority = renderAnnouncement(type, FACTS, true);
		assert.match(priority, /priority-announcement-card/, type);
		assert.doesNotMatch(priority, /announcement-themed-card/, type);
	}
});

test("card row mappings compact locations and translate player roles", () => {
	const rows = buildAnnouncementCardRows({
		type: "annuncio_giocatore",
		fields: [
			{label: "Tipologie", items: ["Calcio a 11"], value: "Selezionate"},
			{label: "Ruoli principali", items: ["Difensore", "Attaccante"], value: "Selezionati"},
			{label: "Ruoli specifici", items: ["Terzino destro"], value: "Selezionati"},
		],
		locations: [{region: "Lazio", city: "Roma"}, {region: "Lombardia", city: "Milano"}],
		previousCategories: ["Eccellenza"],
	});
	assert.deepEqual(rows.map(({label, value}) => [label, value]), [
		["Zona/e di ricerca", "Lazio, Roma + altre"],
		["Calcio", "Calcio a 11"],
		["Ruolo/i", "DIF, ATT"],
		["Categorie precedenti", "Eccellenza"],
	]);
});

test("recent profile announcements show the same saved title and meaningful facts as public cards", () => {
	const ProfileAnnouncementCard = load("src/features/dettagli-profilo/components/ProfileAnnouncementCard.tsx").default;
	const announcement = fixtureAnnouncement("annuncio_torneo_evento", [
		{kind: "registration", label: "Iscrizione", value: "Online"},
		{kind: "price", label: "Costo", value: "50 €"},
		{kind: "location", label: "Località", value: "Roma, Lazio"},
		{kind: "participation", label: "Partecipazione", value: "Squadre"},
	]);
	announcement.typeLabel = "Torneo / evento";
	announcement.title = "Coppa Lazio";
	const html = renderToStaticMarkup(React.createElement(ProfileAnnouncementCard, {announcement}));
	assert.match(html, /Coppa Lazio/);
	assert.match(html, /Torneo \/ evento/);
	assert.match(html, /Iscrizione/);
	assert.match(html, /Costo/);
	assert.match(html, /50 €/);
	assert.match(html, /Roma, Lazio/);
	assert.match(html, /Apri annuncio/);
	assert.doesNotMatch(html, /<dt[^>]*>Località<\/dt>/);
	assert.match(html, /href="\/dettagli-annuncio\?id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"/);
});

test("unspecified announcement facts are filtered without reintroducing them into compact cards", () => {
	const facts = [
		{kind: "roles", label: "Ruoli principali", value: " Non specificato "},
		{kind: "roles", label: "Ruoli specifici", value: "Terzino destro"},
		{kind: "types", label: "Tipologie", value: ""},
		{kind: "categories", label: "Categorie ricercate", value: "Non specificato"},
		{kind: "location", label: "Località", value: "Roma, Lazio"},
	];
	assert.deepEqual(
		getAnnouncementFacts({facts}, ["Ruoli principali", "Ruoli specifici", "Tipologie", "Categorie ricercate", "Località"])
			.map(({label}) => label),
		["Ruoli specifici", "Località"],
	);

	const html = renderAnnouncement("annuncio_giocatore", facts);
	assert.equal(factLabelIndex(html, "Ruoli principali"), -1);
	assert.equal(factLabelIndex(html, "Tipologie"), -1);
	assert.equal(factLabelIndex(html, "Categorie ricercate"), -1);
	assert.equal(factLabelIndex(html, "Ruoli specifici"), -1);
	assert.equal(factLabelIndex(html, "Località"), -1);
	assert.doesNotMatch(html, /Non specificato/);
});

test("only active priority cards receive the indigo treatment", () => {
	const active = renderAnnouncement("annuncio_giocatore", FACTS, true);
	const free = renderAnnouncement("annuncio_giocatore", FACTS);
	assert.match(active, /priority-announcement-card/);
	assert.match(active, /priority-announcement-level-badge/);
	assert.match(active, /lucide-sparkles/);
	assert.match(active, /lucide-pin/);
	assert.doesNotMatch(free, /priority-announcement/);
	assert.doesNotMatch(free, /lucide-sparkles/);
	assert.doesNotMatch(free, /lucide-pin/);
});

test("the detail overlay and author link remain separate interactive links", () => {
	const html = renderAnnouncement("annuncio_giocatore", FACTS);
	const detailHref = "/dettagli-annuncio?id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	const profileHref = "/dettagli-profilo?id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb&amp;type=giocatore";
	const detailIndex = html.indexOf(`href="${detailHref}"`);
	const profileIndex = html.indexOf(`href="${profileHref}"`);
	const detailAnchorEnd = html.indexOf("</a>", detailIndex);

	assert.ok(detailIndex >= 0);
	assert.ok(profileIndex > detailAnchorEnd);
	assert.equal((html.match(/<a\b/g) ?? []).length, 2);
	assert.equal(/<a\b[^>]*>(?:(?!<\/a>).)*<a\b/s.test(html), false);
	assert.match(html, /pointer-events-auto/);
});

test("an officially verified author has a blue check beside the name", () => {
	const announcement = fixtureAnnouncement("annuncio_giocatore", FACTS);
	announcement.author.officialVerified = true;
	const html = renderToStaticMarkup(React.createElement(AnnouncementCard, {announcement}));
	assert.match(html, /Apri il profilo di Autore dimostrativo, verificato ufficialmente/);
	assert.match(html, /aria-label="Profilo verificato ufficialmente"/);
});

test("anonymous authors have no registration or official verification marks", () => {
	const announcement = fixtureAnnouncement("annuncio_giocatore", FACTS);
	announcement.author = {kind: "anonymous", profileType: "giocatore", label: "Autore anonimo"};
	const html = renderToStaticMarkup(React.createElement(AnnouncementCard, {announcement}));
	assert.doesNotMatch(html, /Utente registrato|Profilo verificato ufficialmente/);
});

test("announcement result cards do not show team references", () => {
	const linkedTeams = [1, 2, 3].map((index) => ({
		profileId: `00000000-0000-4000-8000-00000000000${index}`,
		name: `Squadra ${index}`,
		imageUrl: null,
		location: null,
	}));
	const html = renderToStaticMarkup(React.createElement(AnnouncementCard, {
		announcement: fixtureAnnouncement("annuncio_staff_sportivo", FACTS, linkedTeams),
	}));

	assert.doesNotMatch(html, /Squadra [123]/);
	assert.equal(/<a\b[^>]*>(?:(?!<\/a>).)*<a\b/s.test(html), false);
});

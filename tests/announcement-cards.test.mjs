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

const FACTS = [
	{kind: "roles", label: "Ruoli principali", value: "Difensore"},
	{kind: "roles", label: "Ruoli secondari", value: "Terzino destro"},
	{kind: "types", label: "Tipologie", value: "Calcio a 11"},
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
	{kind: "services", label: "Offerta", value: "Visibilità"},
	{kind: "figures", label: "Figure", value: "Preparatore"},
	{kind: "availability", label: "Spostamenti", value: "Disponibile"},
	{kind: "availability", label: "Disponibilità", value: "Disponibile subito"},
	{kind: "car", label: "Automunito", value: "Sì"},
	{kind: "registration", label: "Iscrizione", value: "Online"},
	{kind: "participation", label: "Partecipazione", value: "Squadre"},
	{kind: "price", label: "Costo", value: "50 €"},
	{kind: "services", label: "Servizi", value: "Spogliatoi"},
];

const EXPECTED_FACTS = {
	annuncio_giocatore: ["Ruoli principali", "Ruoli secondari", "Tipologie", "Categorie ricercate", "Località"],
	annuncio_squadra_cerca_giocatore: ["Ruoli", "Annate", "Stagione", "Località"],
	annuncio_squadra_cerca_staff: ["Figura", "Settore", "Compenso mensile", "Località"],
	annuncio_squadra_cerca_partita: ["Categorie", "Periodo", "Trasferta", "Località"],
	annuncio_squadra_cerca_sponsor: ["Settore", "Supporto cercato", "Offerta", "Località"],
	annuncio_staff_sportivo: ["Figure", "Categorie", "Spostamenti", "Località"],
	annuncio_arbitro: ["Categorie", "Disponibilità", "Automunito", "Località"],
	annuncio_torneo_evento: ["Iscrizione", "Partecipazione", "Costo", "Località"],
	annuncio_campo_impianto: ["Tipologie", "Costo", "Servizi", "Località"],
};

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
};

function fixtureAnnouncement(type, facts = FACTS, linkedTeams = []) {
	return {
		id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
		type,
		typeLabel: `Tipo ${type}`,
		profileType: PROFILE_TYPE_BY_ANNOUNCEMENT[type],
		title: "Titolo annuncio dimostrativo",
		description: "Descrizione dimostrativa.",
		createdAt: "2026-09-16T12:00:00.000Z",
		level: "prioritario",
		location: "Roma, Lazio",
		facts,
		linkedTeams,
		author: {
			kind: "registered",
			profileId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
			profileType: "giocatore",
			title: "Autore dimostrativo",
			imageUrl: null,
			verified: false,
			presentation: null,
			location: "Roma, Lazio",
			locations: [],
			highlights: [],
		},
	};
}

function renderAnnouncement(type, facts) {
	return renderToStaticMarkup(React.createElement(AnnouncementCard, {
		announcement: fixtureAnnouncement(type, facts),
	}));
}

function factLabelIndex(html, label) {
	return html.indexOf(`>${label}</span>`);
}

test("the dispatcher renders type-specific facts in order for all concrete announcement types", () => {
	const allLabels = FACTS.map(({label}) => label);

	for (const [type, expectedLabels] of Object.entries(EXPECTED_FACTS)) {
		const html = renderAnnouncement(type);
		assert.match(html, /Apri annuncio/);
		assert.match(html, /data-icon="inline-start"/);
		assert.doesNotMatch(html, /data-profile-icon=/);

		let previousIndex = -1;
		for (const label of expectedLabels) {
			const index = factLabelIndex(html, label);
			assert.ok(index > previousIndex, `${type} must render ${label} after the preceding fact`);
			previousIndex = index;
		}

		for (const label of allLabels.filter((label) => !expectedLabels.includes(label))) {
			assert.equal(factLabelIndex(html, label), -1, `${type} must not render ${label}`);
		}
	}
});

test("unspecified announcement facts are excluded before rendering", () => {
	const facts = [
		{kind: "roles", label: "Ruoli principali", value: " Non specificato "},
		{kind: "roles", label: "Ruoli secondari", value: "Terzino destro"},
		{kind: "types", label: "Tipologie", value: ""},
		{kind: "categories", label: "Categorie ricercate", value: "Non specificato"},
		{kind: "location", label: "Località", value: "Roma, Lazio"},
	];
	assert.deepEqual(
		getAnnouncementFacts({facts}, ["Ruoli principali", "Ruoli secondari", "Tipologie", "Categorie ricercate", "Località"])
			.map(({label}) => label),
		["Ruoli secondari", "Località"],
	);

	const html = renderAnnouncement("annuncio_giocatore", facts);
	assert.equal(factLabelIndex(html, "Ruoli principali"), -1);
	assert.equal(factLabelIndex(html, "Tipologie"), -1);
	assert.equal(factLabelIndex(html, "Categorie ricercate"), -1);
	assert.ok(factLabelIndex(html, "Ruoli secondari") >= 0);
	assert.ok(factLabelIndex(html, "Località") >= 0);
	assert.doesNotMatch(html, /Non specificato/);
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

test("announcement cards render at most two independent linked-team profiles", () => {
	const linkedTeams = [1, 2, 3].map((index) => ({
		profileId: `00000000-0000-4000-8000-00000000000${index}`,
		name: `Squadra ${index}`,
		imageUrl: null,
		location: null,
	}));
	const html = renderToStaticMarkup(React.createElement(AnnouncementCard, {
		announcement: fixtureAnnouncement("annuncio_staff_sportivo", FACTS, linkedTeams),
	}));

	assert.match(html, /Squadra 1/);
	assert.match(html, /Squadra 2/);
	assert.doesNotMatch(html, /Squadra 3/);
	assert.match(html, />\+1</);
	assert.equal(/<a\b[^>]*>(?:(?!<\/a>).)*<a\b/s.test(html), false);
});

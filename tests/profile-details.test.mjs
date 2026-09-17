import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

// Load the actual TS modules using the existing compiler, without a test dependency.
function sourceLoader(overrides = {}) {
	const cache = new Map();
	function load(file) {
		if (cache.has(file)) return cache.get(file).exports;
		const loadedModule = {exports: {}};
		cache.set(file, loadedModule);
		const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {
			compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
			fileName: file,
		});
		const localRequire = (specifier) => {
			if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
			if (specifier === "server-only") return {};
			if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
			const base = specifier.startsWith("@/")
				? path.join(root, "src", specifier.slice(2))
				: path.resolve(path.dirname(file), specifier);
			const target = [base, base + ".ts", base + ".tsx"].find(candidate => existsSync(candidate));
			if (!target) throw new Error("Cannot resolve " + specifier);
			return load(target);
		};
		new Function("require", "module", "exports", outputText)(localRequire, loadedModule, loadedModule.exports);
		return loadedModule.exports;
	}
	return (relative) => load(path.join(root, relative));
}

const load = sourceLoader();
const {publicPlayerAge, parsePlayerCareer, toPublicPlayerData} = load("src/features/dettagli-profilo/server/player-profile-data.ts");
const {availabilityLabel} = load("src/features/profilo/public-profile-display.ts");
const {groupPublicProfileLocations, publicProfileLocationLabel} = load("src/features/profilo/public-profile-locations.ts");
const {parseProfileDetailParams} = load("src/features/dettagli-profilo/profile-detail-model.ts");
const {profileImageMapKey, profileImageRowsToMap, resolvedProfileImageUrl} = load("src/features/profilo/profile-image.ts");
const {getPlayerRolePitchMarkers} = load("src/features/dettagli-profilo/components/player/PlayerRolePitch.tsx");
const now = new Date("2026-09-14T12:00:00Z");
const player = {
	id: 7, nome: "Mario", cognome: "Rossi", disponibilita: "disponibile-subito",
	giorno_nascita: "14", mese_nascita: "Settembre", anno_nascita: "2000",
	tipologie_sport: ["Calcio a 11", "Calcio a 11"],
	ruoli_sport: {principali: ["Difensore"], specifici: ["Terzino destro"]},
	categorie_ricercate: ["Eccellenza"], piede_principale: "Destro",
	altezza: "180", peso: "75", presentazione: " Presentazione ",
	storico_carriera: [{titolo: "Prima squadra", ente: "Società", periodoDa: "2024/25", stato: "in-corso"}],
};

test("age changes on the birthday in Europe/Rome", () => {
	const birth = {day: "14", month: "Settembre", year: "2000"};
	assert.equal(publicPlayerAge(birth, new Date("2026-09-13T21:59:00Z")), 25);
	assert.equal(publicPlayerAge(birth, new Date("2026-09-13T22:00:00Z")), 26);
	assert.equal(publicPlayerAge(birth, now), 26);
	assert.equal(publicPlayerAge(birth, new Date("2026-09-15T12:00:00Z")), 26);
});

test("incomplete, invalid, future and underage dates do not produce a public age", () => {
	for (const birth of [
		{year: "2000"}, {year: "2000", month: "Settembre"}, {},
		{year: "2000", month: "Febbraio", day: "30"},
		{year: "2027", month: "Gennaio", day: "1"},
		{year: "2020", month: "Gennaio", day: "1"},
		{year: "2000", month: "Unknown", day: "1"},
	]) assert.equal(publicPlayerAge(birth, now), null);
});

test("leap birthdays use March 1 in a non-leap year", () => {
	const birth = {year: "2000", month: "Febbraio", day: "29"};
	assert.equal(publicPlayerAge(birth, new Date("2025-02-28T12:00:00Z")), 24);
	assert.equal(publicPlayerAge(birth, new Date("2025-03-01T12:00:00Z")), 25);
});

test("public projection contains only approved properties and safe highlights", () => {
	const result = toPublicPlayerData({...player, email: "private@example.test", note: "private"}, "javascript:alert(1)", now);
	assert.deepEqual(Object.keys(result).sort(), ["age", "sportTypes", "primaryRoles", "specificRoles", "preferredCategories", "preferredFoot", "height", "weight", "presentation", "career", "highlightsUrl"].sort());
	assert.equal(result.age, 26);
	assert.equal(result.highlightsUrl, null);
	assert.deepEqual(result.sportTypes, ["Calcio a 11"]);
	assert.equal(result.presentation, "Presentazione");
	assert.doesNotMatch(JSON.stringify(result), /nascita|private@example|2000/);
	assert.equal(toPublicPlayerData(player, "https://example.test/video", now).highlightsUrl, "https://example.test/video");
});

test("career keeps entered order and tolerates empty or malformed JSON", () => {
	assert.deepEqual(parsePlayerCareer(null), []);
	assert.deepEqual(parsePlayerCareer({titolo: "not an array"}), []);
	const result = parsePlayerCareer([null, {}, 42, {titolo: "Vecchia", periodoDa: "2010"}, {ente: "Nuova", stato: "in-corso"}, {descrizione: "Solo testo"}]);
	assert.equal(result.length, 3);
	assert.equal(result[0].title, "Vecchia");
	assert.equal(result[1].organization, "Nuova");
	assert.equal(result[1].status, "in-corso");
	assert.equal(result[2].description, "Solo testo");
	assert.equal(new Set(result.map(entry => entry.id)).size, 3);
});

test("unspecified availability stays hidden and URL validation stays strict", () => {
	assert.equal(availabilityLabel("non-specificare"), null);
	assert.equal(availabilityLabel("unknown"), null);
	assert.equal(availabilityLabel("disponibile-subito"), "Disponibile subito");
	assert.equal(parseProfileDetailParams({id: "invalid", type: "giocatore"}), null);
	assert.equal(parseProfileDetailParams({id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "unknown"}), null);
	assert.deepEqual(parseProfileDetailParams({id: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA", type: "giocatore"}), {id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "giocatore"});
});

test("public locations group cities by region without hiding selections", () => {
	const locations = [
		{region: "Lazio", city: "Roma"},
		{region: "Lazio", city: "Viterbo"},
		{region: "Lazio", city: "Roma"},
		{region: "Toscana", city: null},
	];
	assert.deepEqual(groupPublicProfileLocations(locations), [
		{region: "Lazio", cities: ["Roma", "Viterbo"], hasWholeRegion: false},
		{region: "Toscana", cities: [], hasWholeRegion: true},
	]);
	assert.equal(publicProfileLocationLabel(locations), "2 regioni selezionate");
});

test("subprofile images override the main image and otherwise inherit it", () => {
	const profileId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	const images = profileImageRowsToMap([
		{uuid_profilo: profileId, sottoprofilo: "squadra", link_media: " https://cdn.test/squadra.webp "},
		{uuid_profilo: profileId, sottoprofilo: "invalid", link_media: "https://cdn.test/invalid.webp"},
		{uuid_profilo: profileId, sottoprofilo: null, link_media: "https://cdn.test/main.webp"},
	]);
	assert.equal(images.get(profileImageMapKey(profileId, "squadra")), "https://cdn.test/squadra.webp");
	assert.equal(resolvedProfileImageUrl(images, profileId, "squadra", "https://cdn.test/main.webp"), "https://cdn.test/squadra.webp");
	assert.equal(resolvedProfileImageUrl(images, profileId, "giocatore", "https://cdn.test/main.webp"), "https://cdn.test/main.webp");
	assert.equal(resolvedProfileImageUrl(images, profileId, "giocatore", null), null);
});

test("profile image uploads remain outside the registration flow", () => {
	const registration = readFileSync(path.join(root, "src/features/registrati/Registrati.tsx"), "utf8");
	const sharedDetails = readFileSync(path.join(root, "src/features/profilo/ProfileDetailsForm.tsx"), "utf8");
	assert.doesNotMatch(registration, /ProfileImageEditor|saveProfileImage|type="file"/);
	assert.doesNotMatch(sharedDetails, /ProfileImageEditor|saveProfileImage|type="file"/);
});

test("profile images are center-cropped to a square WebP and invalid payloads are rejected", async () => {
	const {optimizeProfileImage} = load("src/features/profilo/server/profile-image-processing.ts");
	const source = await sharp({
		create: {width: 1200, height: 600, channels: 3, background: "#336699"},
	}).png().toBuffer();
	const output = await optimizeProfileImage(new File([source], "wide.png", {type: "image/png"}));
	const metadata = await sharp(output).metadata();
	assert.equal(metadata.format, "webp");
	assert.equal(metadata.width, 1024);
	assert.equal(metadata.height, 1024);
	await assert.rejects(
		optimizeProfileImage(new File(["not an image"], "fake.png", {type: "image/png"})),
		/INVALID_PROFILE_IMAGE/,
	);
});

test("location details use a dialog instead of an accordion", () => {
	const source = readFileSync(path.join(root, "src/features/dettagli-profilo/components/ProfileLocationSummary.tsx"), "utf8");
	assert.doesNotMatch(source, /Accordion/);
	assert.match(source, /<DialogTrigger/);
	assert.match(source, /<DialogTitle>Zone di interesse<\/DialogTitle>/);
	assert.match(source, /<DialogClose>Chiudi<\/DialogClose>/);
});

test("player role pitch prioritizes specific roles and falls back to primary roles", () => {
	assert.deepEqual(
		getPlayerRolePitchMarkers(["Difensore"], ["Non mappato", "Terzino destro", "Terzino destro"]),
		[{role: "Terzino destro", abbreviation: "TD", left: 82, top: 70}],
	);
	assert.deepEqual(
		getPlayerRolePitchMarkers(["Portiere", "Attaccante"], []),
		[
			{role: "Portiere", abbreviation: "POR", left: 50, top: 89},
			{role: "Attaccante", abbreviation: "ATT", left: 50, top: 18},
		],
	);
});

test("player header renders the pitch and the primary role in the detail header", () => {
	const PlayerHeader = load("src/features/dettagli-profilo/components/player/PlayerHeader.tsx").default;
	const html = renderToStaticMarkup(React.createElement(PlayerHeader, {
		title: "Mario Rossi", imageUrl: null, verified: false, primary: false,
		availabilityLabel: null, locations: [], age: 26,
		primaryRoles: ["Difensore"], specificRoles: ["Terzino destro", "Difensore centrale"],
	}));
	assert.match(html, /campo\.png/);
	assert.match(html, /Principale:/);
	assert.match(html, /aria-label="Terzino destro"/);
	assert.match(html, />TD</);
});

function fixtureClient(results) {
	const calls = [];
	return {
		calls,
		from(table) {
			const call = {table, operations: []};
			calls.push(call);
			const query = {};
			for (const method of ["select", "eq", "not", "in", "order", "limit", "maybeSingle"]) {
				query[method] = (...args) => {call.operations.push([method, ...args]); return query;};
			}
			query.then = (resolve, reject) => Promise.resolve(results[table] ?? {data: [], error: null}).then(resolve, reject);
			return query;
		},
	};
}

test("detail query preserves visibility filters and exposes age without birth parts", async () => {
	const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	const client = fixtureClient({
		profilo: {data: {uuid: id, tipologia_principale: "giocatore"}, error: null},
		profilo_giocatore: {data: player, error: null},
		media_profilo: {data: null, error: null},
		localita_profilo: {data: [{id_sottoprofilo: 7, citta: "Roma", regione: "Lazio"}, {id_sottoprofilo: null, citta: null, regione: "Toscana"}, {id_sottoprofilo: 8, citta: "Wrong", regione: "Lazio"}], error: null},
	});
	const queryLoad = sourceLoader({"@/lib/supabase/admin": {createAdminClient: () => client}});
	const {getProfileDetail} = queryLoad("src/features/dettagli-profilo/server/profile-detail-query.ts");
	const result = await getProfileDetail(id, "giocatore");
	assert.equal(result.status, "ok");
	assert.deepEqual(result.profile.locations, [{region: "Lazio", city: "Roma"}, {region: "Toscana", city: null}]);
	assert.doesNotMatch(JSON.stringify(result), /nascita|2000|Wrong/);
	for (const table of ["profilo", "profilo_giocatore", "annuncio"]) {
		assert.ok(client.calls.find(call => call.table === table).operations.some(operation => JSON.stringify(operation) === JSON.stringify(["eq", "nascosto", false])));
	}
	const announcements = client.calls.find(call => call.table === "annuncio").operations;
	for (const expected of [["eq", "autore_annuncio", id], ["eq", "privato", false], ["eq", "stato_annuncio", "pubblicato"], ["in", "tipologia_annuncio", ["annuncio_giocatore"]], ["limit", 4]]) {
		assert.ok(announcements.some(operation => JSON.stringify(operation) === JSON.stringify(expected)));
	}
});

test("missing or hidden profiles keep returning not-found", async () => {
	const client = fixtureClient({profilo: {data: null, error: null}, profilo_giocatore: {data: null, error: null}, media_profilo: {data: null, error: null}});
	const {getProfileDetail} = sourceLoader({"@/lib/supabase/admin": {createAdminClient: () => client}})("src/features/dettagli-profilo/server/profile-detail-query.ts");
	assert.deepEqual(await getProfileDetail("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "giocatore"), {status: "not-found"});
});

test("an announcement failure leaves player details available", async (t) => {
	t.mock.method(console, "error", () => {});
	const client = fixtureClient({
		profilo: {data: {uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}, error: null},
		profilo_giocatore: {data: player, error: null},
		media_profilo: {data: null, error: null},
		annuncio: {data: null, error: {code: "TEST_UNAVAILABLE"}},
	});
	const {getProfileDetail} = sourceLoader({"@/lib/supabase/admin": {createAdminClient: () => client}})("src/features/dettagli-profilo/server/profile-detail-query.ts");
	const result = await getProfileDetail("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "giocatore");
	assert.equal(result.status, "ok");
	assert.equal(result.profile.announcementsUnavailable, true);
	assert.equal(result.profile.title, "Mario Rossi");
});

test("every non-player detail page preserves its configured content", () => {
	for (const [type, name] of [
		["squadra", "ProfiloSquadra"], ["staff-sportivo", "ProfiloStaffSportivo"],
		["professionisti-studi", "ProfiloProfessionistiStudi"], ["arbitro", "ProfiloArbitro"],
		["creators", "ProfiloCreator"], ["torneo-evento", "ProfiloTorneoEvento"],
		["campi-impianti-sportivi", "ProfiloCampiImpianti"],
	]) {
		const Component = load("src/features/dettagli-profilo/components/types/Dettagli" + name + ".tsx").default;
		const html = renderToStaticMarkup(React.createElement(Component, {profile: {
			id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type, title: "Profilo dimostrativo",
			imageUrl: null, verified: true, primary: true, availabilityLabel: null,
			locations: [{region: "Lazio", city: "Città dimostrativa"}],
			primaryFields: [{label: "Località", value: "Città dimostrativa"}],
			fields: [{label: "Presentazione", value: "Descrizione dimostrativa", wide: true}],
			announcements: [], announcementsUnavailable: false,
		}}));
		assert.match(html, /Profilo dimostrativo/);
		assert.match(html, /Città dimostrativa/);
		assert.match(html, /Descrizione dimostrativa/);
		assert.match(html, /aria-label="Informazioni del profilo"/);
		assert.match(html, /Annunci/);
	}
});

test("directory cards keep a single profile link, badges before the avatar, and type-specific facts", () => {
	const Card = load("src/features/profili/components/cards/ProfileCard.tsx").default;
	const facts = [
		{kind: "availability", label: "Disponibilità", value: "Disponibile subito"},
		{kind: "content", label: "Contenuti", value: "Video"},
		{kind: "figures", label: "Figure", value: "Allenatore"},
		{kind: "headquarters", label: "Sede", value: "Roma"},
		{kind: "location", label: "Località", value: "Città dimostrativa"},
		{kind: "price", label: "Costo", value: "Da 30 €"},
		{kind: "roles", label: "Ruoli", value: "Difensore"},
		{kind: "services", label: "Servizi", value: "Spogliatoi"},
		{kind: "specializations", label: "Specializzazioni", value: "Fisioterapia"},
		{kind: "types", label: "Tipologie", value: "Calcio a 11"},
	];
	const expectedLabels = {
		giocatore: ["Ruoli", "Tipologie", "Località", "Disponibilità"],
		squadra: ["Tipologie", "Sede", "Località"],
		"staff-sportivo": ["Figure", "Disponibilità", "Località"],
		"professionisti-studi": ["Figure", "Specializzazioni", "Disponibilità", "Località"],
		arbitro: ["Disponibilità", "Località"],
		creators: ["Contenuti", "Località"],
		"torneo-evento": ["Tipologie", "Sede", "Località"],
		"campi-impianti-sportivi": ["Tipologie", "Costo", "Servizi", "Località"],
	};
	for (const [type, labels] of Object.entries(expectedLabels)) {
		const html = renderToStaticMarkup(React.createElement(Card, {profile: {
			id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type, title: "Profilo dimostrativo",
			presentation: null, imageUrl: null, verified: true, availabilityLabel: null,
			location: "Città dimostrativa", facts,
			filterData: {ruoli: ["Difensore"], tipologie: ["Calcio a 11"]},
		}}));
		assert.equal((html.match(/<a /g) ?? []).length, 1);
		assert.ok(html.includes('data-profile-icon="' + type + '"'));
		assert.match(html, /Apri profilo/);
		assert.match(html, /Profilo dimostrativo/);
		for (const label of labels) assert.match(html, new RegExp(">" + label + "<"));
		const badgeIndex = html.indexOf(`data-profile-icon="${type}"`);
		const avatarIndex = html.indexOf('data-slot="avatar"');
		const titleIndex = html.indexOf("Profilo dimostrativo", avatarIndex);
		assert.ok(badgeIndex >= 0 && badgeIndex < avatarIndex);
		assert.ok(avatarIndex < titleIndex);
	}
});

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
const {getAnnouncementPlayerRolePitchMarkers} = load("src/features/annunci/components/details/AnnouncementPlayerRolePitch.tsx");
const {
	PLAYER_PRIMARY_ROLES,
	PLAYER_SPECIFIC_ROLES_BY_PRIMARY,
	normalizePlayerSpecificRoles,
} = load("src/features/profilo/player-roles.ts");
const now = new Date("2026-09-14T12:00:00Z");
const player = {
	id: 7, nome: "Mario", cognome: "Rossi", disponibilita: "disponibile-subito",
	giorno_nascita: "14", mese_nascita: "Settembre", anno_nascita: "2000",
	tipologie_sport: ["Calcio a 5", "Calcio a 11", "Calcio storico"],
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
	assert.deepEqual(result.sportTypes, ["Calcio a 11", "Calcio a 5", "Calcio storico"]);
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

test("subprofile image removal selects its avatar fallback without changing other subprofiles", () => {
	const profileId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	const images = profileImageRowsToMap([
		{uuid_profilo: profileId, sottoprofilo: "squadra", link_media: " https://cdn.test/squadra.webp "},
		{uuid_profilo: profileId, sottoprofilo: "arbitro", link_media: ""},
		{uuid_profilo: profileId, sottoprofilo: "invalid", link_media: "https://cdn.test/invalid.webp"},
		{uuid_profilo: profileId, sottoprofilo: null, link_media: "https://cdn.test/main.webp"},
	]);
	assert.equal(images.get(profileImageMapKey(profileId, "squadra")), "https://cdn.test/squadra.webp");
	assert.equal(resolvedProfileImageUrl(images, profileId, "squadra", "https://cdn.test/main.webp"), "https://cdn.test/squadra.webp");
	assert.equal(resolvedProfileImageUrl(images, profileId, "giocatore", "https://cdn.test/main.webp"), "https://cdn.test/main.webp");
	assert.equal(resolvedProfileImageUrl(images, profileId, "arbitro", "https://cdn.test/main.webp"), null);
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

test("player role catalog exposes only the canonical taxonomy and normalizes legacy labels", () => {
	assert.deepEqual(PLAYER_PRIMARY_ROLES, ["Portiere", "Difensore", "Centrocampista", "Attaccante"]);
	assert.deepEqual(PLAYER_SPECIFIC_ROLES_BY_PRIMARY, {
		Portiere: [],
		Difensore: ["Terzino destro", "Difensore centrale", "Terzino sinistro"],
		Centrocampista: ["Mediano", "Esterno sinistro", "Centrale", "Esterno destro", "Trequartista"],
		Attaccante: ["Ala sinistra", "Seconda Punta", "Ala destra", "Punta centrale"],
	});
	assert.deepEqual(normalizePlayerSpecificRoles([
		"Libero", "Esterno sinistro a tutta fascia", "Centrocampista sinistro",
		"Centrocampista centrale", "Centrocampista destro", "Esterno destro a tutta fascia",
		"Attaccante sinistro / Seconda punta sinistra", "Attaccante destro / Seconda punta destra",
		"Centravanti", "Seconda punta", "Non mappato",
	]), ["Difensore centrale", "Esterno sinistro", "Centrale", "Esterno destro", "Ala sinistra", "Ala destra", "Punta centrale", "Seconda Punta"]);
});

test("player role pitch uses the 3x7 grid and hides only specialized primary groups", () => {
	assert.deepEqual(
		getPlayerRolePitchMarkers(["Difensore", "Centrocampista", "Attaccante", "Portiere"], ["Terzino destro", "Centrale", "Ala sinistra"]),
		[
			{role: "Ala sinistra", isPrimary: false, abbreviation: "AS", column: 1, row: 2},
			{role: "Centrale", isPrimary: false, abbreviation: "CC", column: 2, row: 4},
			{role: "Terzino destro", isPrimary: false, abbreviation: "TD", column: 3, row: 6},
			{role: "Portiere", isPrimary: true, abbreviation: "POR", column: 2, row: 7},
		],
	);
	assert.deepEqual(
		getPlayerRolePitchMarkers(["Difensore", "Centrocampista"], ["Terzino destro", "Terzino destro", "Non mappato"]),
		[
			{role: "Centrocampista", isPrimary: true, abbreviation: "CEN", column: 2, row: 4},
			{role: "Terzino destro", isPrimary: false, abbreviation: "TD", column: 3, row: 6},
		],
	);
	assert.deepEqual(
		getAnnouncementPlayerRolePitchMarkers(["Difensore", "Centrocampista"], ["Terzino destro"]),
		getPlayerRolePitchMarkers(["Difensore", "Centrocampista"], ["Terzino destro"]),
	);
});

test("player header renders the ordered eight-fact grid", () => {
	const PlayerHeader = load("src/features/dettagli-profilo/components/player/PlayerHeader.tsx").default;
	const html = renderToStaticMarkup(React.createElement(PlayerHeader, {
		title: "Mario Rossi", imageUrl: null, emailConfirmed: false, officialVerified: false, primary: false,
		availabilityLabel: "Disponibile subito",
		followerCount: 42,
		announcementCount: 7,
		player: {...toPublicPlayerData(player, null, now), sportTypes: ["Calcio a 11", "Calcio a 5"], specificRoles: ["Terzino destro", "Difensore centrale"]},
		actions: React.createElement("button", null, "Condividi"),
	}));
	assert.doesNotMatch(html, /campo\.png/);
	assert.match(html, /lucide-user-round-plus/);
	assert.match(html, /lucide-megaphone/);
	assert.match(html, /min-h-24/);
	assert.match(html, /Calcio a 11, Calcio a 5/);
	const factLabels = ["Età", "Altezza", "Peso", "Piede", "Disponibilità", "Tipologie di calcio", "Follower", "Num. annunci"];
	for (let index = 1; index < factLabels.length; index += 1) {
		assert.ok(html.indexOf(`>${factLabels[index - 1]}<`) < html.indexOf(`>${factLabels[index]}<`), factLabels[index]);
	}
	for (const value of [">42<", ">7<"]) assert.ok(html.includes(value), value);
	assert.doesNotMatch(html, /Principale:/);
	for (const value of ["26 anni", "Disponibile subito", "Destro", "180 cm", "75 kg", "Calcio a 11", "Condividi"]) assert.ok(html.includes(value), value);
	assert.doesNotMatch(html, /Ruoli principali|Ruoli specifici|Categorie ricercate|Eccellenza/);
	assert.match(html, /<header[^>]*>[\s\S]*public-profile-hero[\s\S]*<dl[\s\S]*<\/header>/);
	assert.doesNotMatch(html, /nascita|>2000<|Una presentazione/);
});

test("player header handles missing sports data without exposing unspecified availability", () => {
	const PlayerHeader = load("src/features/dettagli-profilo/components/player/PlayerHeader.tsx").default;
	const html = renderToStaticMarkup(React.createElement(PlayerHeader, {
		title: "Mario Rossi", imageUrl: null, emailConfirmed: false, officialVerified: false, primary: false,
		availabilityLabel: null, followerCount: null, announcementCount: null,
		player: toPublicPlayerData({}, null, now),
	}));
	assert.match(html, /Non specificato/);
	assert.match(html, />MR</);
	assert.doesNotMatch(html, /campo\.png|Verificato|Profilo principale|undefined|null/);
});

test("email confirmation and official verification have distinct profile marks", () => {
	const PlayerHeader = load("src/features/dettagli-profilo/components/player/PlayerHeader.tsx").default;
	const base = {
		title: "Mario Rossi", imageUrl: null, primary: false, availabilityLabel: null,
		followerCount: null, announcementCount: null, player: toPublicPlayerData(player, null, now),
	};
	const registered = renderToStaticMarkup(React.createElement(PlayerHeader, {...base, emailConfirmed: true, officialVerified: false}));
	assert.match(registered, /Utente registrato/);
	assert.match(registered, /lucide-user-round-check/);
	assert.doesNotMatch(registered, /Profilo verificato ufficialmente/);

	const official = renderToStaticMarkup(React.createElement(PlayerHeader, {...base, emailConfirmed: true, officialVerified: true}));
	assert.match(official, /Utente registrato/);
	assert.match(official, /Profilo verificato ufficialmente/);
	assert.match(official, /role="img" aria-label="Profilo verificato ufficialmente"/);
	assert.match(official, /lucide-badge-check/);

	const unconfirmed = renderToStaticMarkup(React.createElement(PlayerHeader, {...base, emailConfirmed: false, officialVerified: false}));
	assert.doesNotMatch(unconfirmed, /Utente registrato|Profilo verificato ufficialmente/);
});

test("player overview shows grouped locations, visible social URLs and highlights below description", () => {
	const Overview = load("src/features/dettagli-profilo/components/player/PlayerOverview.tsx").default;
	const href = "https://instagram.com/mario.rossi?ref=profilo";
	const html = renderToStaticMarkup(React.createElement(Overview, {
		profileId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
		primaryRoles: ["Difensore"], specificRoles: ["Terzino destro"], preferredCategories: ["Eccellenza"],
		presentation: "Descrizione del giocatore", highlightsUrl: "https://youtu.be/abcdefghijk",
		locations: [{region: "Toscana", city: null}, {region: "Lazio", city: "Roma"}, {region: "Lazio", city: "Roma"}, {region: "Lazio", city: "Viterbo"}],
		socialLinks: {instagram: href, facebook: "", youtube: "", linkedin: ""},
	}));
	assert.match(html, /youtube-nocookie\.com\/embed\/abcdefghijk/);
	assert.ok(html.indexOf("Descrizione del giocatore") < html.indexOf(">Highlights<"));
	assert.ok(html.indexOf(">Lazio<") < html.indexOf(">Toscana<"));
	assert.equal((html.match(/>Roma</g) ?? []).length, 1);
	assert.match(html, /Tutta la regione/);
	assert.ok(html.includes(`href="${href}"`));
	assert.match(html, />instagram\.com\/mario\.rossi\?ref=profilo</);
	assert.match(html, /target="_blank" rel="noopener noreferrer"/);
	const sidebar = html.match(/<aside[\s\S]*<\/aside>/)?.[0];
	assert.ok(sidebar);
	assert.match(sidebar, /campo\.png/);
	assert.match(sidebar, /grid-cols-3 grid-rows-7/);
	assert.doesNotMatch(sidebar, /player-role-pitch-title|Principale:/);
	for (const value of ["Ruoli principali", "Difensore", "Ruoli specifici", "Terzino destro", "Categorie ricercate", "Eccellenza", "Social", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]) assert.ok(sidebar.includes(value), value);
	assert.ok(sidebar.indexOf("Categorie ricercate") < sidebar.indexOf(">Località<"));
	assert.ok(sidebar.indexOf(">Social<") < sidebar.indexOf("UUID profilo"));
	assert.match(sidebar, /data-social-brand="instagram"/);
	assert.match(sidebar, /aria-label="Copia UUID del profilo"/);
	assert.doesNotMatch(html, /Una presentazione|Guarda il giocatore|Scheda sportiva|Facebook|role="dialog"/);
});

test("player overview omits absent media and socials and supports non-YouTube highlights", () => {
	const Overview = load("src/features/dettagli-profilo/components/player/PlayerOverview.tsx").default;
	const props = {profileId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", primaryRoles: [], specificRoles: [], preferredCategories: [], presentation: null, highlightsUrl: null, locations: [], socialLinks: {instagram: "", facebook: "", youtube: "", linkedin: ""}};
	const empty = renderToStaticMarkup(React.createElement(Overview, props));
	assert.match(empty, /Descrizione non disponibile/);
	assert.match(empty, /Nessuna località indicata/);
	assert.doesNotMatch(empty, /Highlights|Social|<iframe/);
	const external = renderToStaticMarkup(React.createElement(Overview, {...props, highlightsUrl: "https://example.test/video"}));
	assert.match(external, /href="https:\/\/example.test\/video"/);
	assert.match(external, /Guarda video highlights/);
	assert.doesNotMatch(external, /<iframe/);
});

test("all populated player social links use their brand icon, including LinkedIn", () => {
	const SocialLinks = load("src/features/dettagli-profilo/components/ProfileSocialLinks.tsx").default;
	const socialLinks = {instagram: "https://instagram.com/player", facebook: "https://facebook.com/player", youtube: "https://youtube.com/@player", linkedin: "https://linkedin.com/in/player"};
	const html = renderToStaticMarkup(React.createElement(SocialLinks, {socialLinks, presentation: "profile"}));
	for (const [platform, href] of Object.entries(socialLinks)) {
		assert.ok(html.includes(`data-social-brand="${platform}"`));
		assert.ok(html.includes(`href="${href}"`));
	}
	assert.doesNotMatch(html, /briefcase-business/);
});

function fixtureClient(results) {
	const calls = [];
	return {
		calls,
		from(table) {
			const call = {table, operations: []};
			calls.push(call);
			const query = {};
			for (const method of ["select", "eq", "neq", "not", "in", "order", "limit", "range", "maybeSingle"]) {
				query[method] = (...args) => {call.operations.push([method, ...args]); return query;};
			}
			query.then = (resolve, reject) => Promise.resolve(typeof results[table] === "function" ? results[table](call) : results[table] ?? {data: [], error: null, count: 0}).then(resolve, reject);
			return query;
		},
	};
}

test("detail query preserves visibility filters and exposes age without birth parts", async () => {
	const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	const client = fixtureClient({
		profilo: {data: {uuid: id, tipologia_principale: "giocatore", confermato_il: "2026-09-01T10:00:00Z", verificato_il: "2026-09-02T10:00:00Z"}, error: null},
		profilo_giocatore: {data: player, error: null},
		media_profilo: {data: null, error: null},
		annuncio: {data: [], count: 7, error: null},
		profilo_follow: {data: null, count: 42, error: null},
		localita_profilo: {data: [{id_sottoprofilo: 7, citta: "Roma", regione: "Lazio"}, {id_sottoprofilo: null, citta: null, regione: "Toscana"}, {id_sottoprofilo: 8, citta: "Wrong", regione: "Lazio"}], error: null},
	});
	const queryLoad = sourceLoader({"@/lib/supabase/admin": {createAdminClient: () => client}});
	const {getProfileDetail} = queryLoad("src/features/dettagli-profilo/server/profile-detail-query.ts");
	const result = await getProfileDetail(id, "giocatore");
	assert.equal(result.status, "ok");
	assert.equal(result.profile.followerCount, 42);
	assert.equal(result.profile.announcementCount, 7);
	assert.equal(result.profile.emailConfirmed, true);
	assert.equal(result.profile.officialVerified, true);
	assert.doesNotMatch(JSON.stringify(result.profile), /2026-09-01T10:00:00Z|2026-09-02T10:00:00Z/);
	const followerQuery = client.calls.find(call => call.table === "profilo_follow");
	assert.deepEqual(followerQuery.operations, [["select", "uuid_profilo_seguito", {count: "exact", head: true}], ["eq", "uuid_profilo_seguito", id]]);
	assert.deepEqual(result.profile.locations, [{region: "Lazio", city: "Roma"}, {region: "Toscana", city: null}]);
	assert.doesNotMatch(JSON.stringify(result), /nascita|2000|Wrong/);
	for (const table of ["profilo", "profilo_giocatore", "annuncio"]) {
		assert.ok(client.calls.find(call => call.table === table).operations.some(operation => JSON.stringify(operation) === JSON.stringify(["eq", "nascosto", false])));
	}
	const announcements = client.calls.find(call => call.table === "annuncio").operations;
	assert.deepEqual(announcements[0][2], {count: "exact"});
	for (const expected of [["eq", "autore_annuncio", id], ["eq", "privato", false], ["eq", "stato_annuncio", "pubblicato"], ["in", "tipologia_annuncio", ["annuncio_giocatore"]], ["limit", 4]]) {
		assert.ok(announcements.some(operation => JSON.stringify(operation) === JSON.stringify(expected)));
	}
});

test("missing or hidden profiles keep returning not-found", async () => {
	const client = fixtureClient({profilo: {data: null, error: null}, profilo_giocatore: {data: null, error: null}, media_profilo: {data: null, error: null}});
	const {getProfileDetail} = sourceLoader({"@/lib/supabase/admin": {createAdminClient: () => client}})("src/features/dettagli-profilo/server/profile-detail-query.ts");
	assert.deepEqual(await getProfileDetail("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "giocatore"), {status: "not-found"});
	assert.ok(!client.calls.some(call => call.table === "profilo_follow"));
});

test("similar profiles select six newest visible children of the same type and retain child order", async () => {
	const current = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	const older = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
	const newest = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
	const row = (id, childId) => ({uuid: id, tipologia_principale: "squadra", ultima_modifica_il: "2026-09-21", profilo_giocatore: [{...player, id: childId, nascosto: false}], profilo_squadra: [{id: 1, nascosto: false, nome_societa: "Squadra"}]});
	const client = fixtureClient({
		profilo_giocatore: {data: [{id: 12, uuid_profilo: newest}, {id: 11, uuid_profilo: older}], error: null},
		profilo: {data: [row(older, 11), row(newest, 12)], error: null},
	});
	const {loadRecentSimilarProfiles} = sourceLoader()("src/features/profili/server/queries.ts");
	const profiles = await loadRecentSimilarProfiles(client, current, "giocatore");
	assert.deepEqual(profiles.map(profile => [profile.id, profile.type]), [[newest, "giocatore"], [older, "giocatore"]]);
	const childQuery = client.calls[0];
	assert.equal(childQuery.table, "profilo_giocatore");
	for (const expected of [["eq", "nascosto", false], ["eq", "profilo.nascosto", false], ["not", "profilo.uuid_utente", "is", null], ["neq", "uuid_profilo", current], ["order", "id", {ascending: false}], ["limit", 6]]) {
		assert.ok(childQuery.operations.some(operation => JSON.stringify(operation) === JSON.stringify(expected)), JSON.stringify(expected));
	}
	assert.match(childQuery.operations[0][1], /profilo!inner/);
	const emptyClient = fixtureClient({});
	assert.deepEqual(await loadRecentSimilarProfiles(emptyClient, current, "giocatore"), []);
	assert.equal(emptyClient.calls.length, 1);
});

test("follower and similar-profile failures do not hide the current profile", async (t) => {
	t.mock.method(console, "error", () => {});
	const client = fixtureClient({
		profilo: {data: {uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}, error: null},
		profilo_giocatore: call => call.operations.some(([method]) => method === "maybeSingle")
			? {data: player, error: null} : {data: null, error: {code: "TEST_UNAVAILABLE"}},
		profilo_follow: {data: null, count: null, error: {code: "TEST_UNAVAILABLE"}},
	});
	const {getProfileDetail} = sourceLoader({"@/lib/supabase/admin": {createAdminClient: () => client}})("src/features/dettagli-profilo/server/profile-detail-query.ts");
	const result = await getProfileDetail("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "giocatore");
	assert.equal(result.status, "ok");
	assert.equal(result.profile.followerCount, null);
	assert.equal(result.profile.similarProfilesUnavailable, true);
	assert.deepEqual(result.profile.similarProfiles, []);
});

test("similar profiles tab and empty/error states are available", () => {
	const Tabs = load("src/features/dettagli-profilo/components/player/PlayerTabs.tsx").default;
	const SimilarProfiles = load("src/features/dettagli-profilo/components/SimilarProfiles.tsx").default;
	const html = renderToStaticMarkup(React.createElement(Tabs, {overview: "Panoramica", career: "Carriera", announcements: "Annunci", similarProfiles: React.createElement(SimilarProfiles, {profiles: [], unavailable: false})}));
	assert.match(html, /role="tab"[^>]*[\s\S]*Profili simili/);
	assert.match(renderToStaticMarkup(React.createElement(SimilarProfiles, {profiles: [], unavailable: false})), /Nessun profilo simile/);
	assert.match(renderToStaticMarkup(React.createElement(SimilarProfiles, {profiles: [], unavailable: true})), /temporaneamente non disponibili/);
	const Count = load("src/features/dettagli-profilo/components/ProfileFollowerCount.tsx").default;
	assert.match(renderToStaticMarkup(React.createElement(Count, {count: 0})), /0 follower/);
	assert.equal(renderToStaticMarkup(React.createElement(Count, {count: null})), "");
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
	assert.equal(result.profile.announcementCount, null);
	assert.equal(result.profile.title, "Mario Rossi");
});

const nonPlayerCases = [
	["squadra", "Squadra", ["Tipologie sportive", "Sede principale"]],
	["staff-sportivo", "StaffSportivo", ["Figure professionali", "Disponibilità"]],
	["professionisti-studi", "ProfessionistiStudi", ["Figure professionali", "Tipologie sportive", "Disponibilità", "Automunito"]],
	["arbitro", "Arbitro", ["Disponibilità", "Esperienze"]],
	["creators", "Creator", ["Tipologia di contenuti", "Canali social"]],
	["torneo-evento", "TorneoEvento", ["Tipologie sportive", "Sede principale"]],
	["campi-impianti-sportivi", "CampiImpianti", ["Tipologie sportive", "Sede principale", "Costo di partenza"]],
];

function genericProfile(type, overrides = {}) {
	return {
		id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type, title: "Profilo dimostrativo",
		imageUrl: null, emailConfirmed: true, officialVerified: true, primary: true, availabilityLabel: "Disponibile subito",
		socialLinks: {instagram: "https://instagram.com/profilo", facebook: "", youtube: "https://youtube.com/@profilo", linkedin: ""},
		locations: [{region: "Lazio", city: "Roma"}, {region: "Lazio", city: "Viterbo"}],
		primaryFields: [], fields: [{label: "Presentazione", value: "Descrizione dimostrativa", wide: true}],
		experiences: [{id: "experience-1", title: "Esperienza dimostrativa", from: "2024", to: null, status: "in-corso", organization: "Ente sportivo", description: "Attività sul campo", linkedTeam: null, teamProfileId: null}],
		followerCount: 1234, announcementCount: 7, announcements: [], announcementsUnavailable: false,
		similarProfiles: [], similarProfilesUnavailable: false,
		...overrides,
	};
}

function renderedFacts(html) {
	const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] ?? html;
	return [...header.matchAll(/<dt\b[^>]*>(.*?)<\/dt>\s*<dd\b[^>]*>(.*?)<\/dd>/gs)]
		.map(([, label, value]) => [label.replace(/<[^>]*>/g, ""), value.replace(/<[^>]*>/g, "")]);
}

test("all seven non-player profiles show ordered facts, integrated actions and sidebar contacts", () => {
	const values = {
		"Tipologie sportive": "Calcio a 11, Calcio a 5", "Sede principale": "Sede di Roma",
		"Figure professionali": "Allenatore, Preparatore", "Disponibilità": "Disponibile subito",
		"Automunito": "Sì", "Tipologia di contenuti": "Video, podcast", "Costo di partenza": "30 € / 1h",
	};
	for (const [type, name, labels] of nonPlayerCases) {
		const Component = load(`src/features/dettagli-profilo/components/types/DettagliProfilo${name}.tsx`).default;
		const profile = genericProfile(type, {primaryFields: labels.filter(label => label in values).map(label => ({label, value: values[label]}))});
		const html = renderToStaticMarkup(React.createElement(Component, {profile, actions: React.createElement("button", null, "Condividi") }));
		assert.deepEqual(renderedFacts(html), [...labels.map(label => [label, values[label] ?? (label === "Esperienze" ? "1" : "2")]), ["Follower", (1234).toLocaleString("it-IT")], ["Num. annunci", "7"]], type);
		assert.match(html, /<header\b[\s\S]*Condividi[\s\S]*<\/header>/);
		assert.match(html, /public-profile-hero/);
		assert.match(html, /Utente registrato/);
		assert.match(html, /Profilo verificato ufficialmente/);
		assert.match(html, /profile-section-navigation/);
		assert.match(html, /aria-label="Informazioni del profilo"/);
		assert.match(html, /Profili simili/);
		assert.match(html, /Descrizione dimostrativa/);
		const sidebar = html.match(/<aside\b[\s\S]*?<\/aside>/)?.[0] ?? "";
		for (const content of ["Lazio", "Roma", "Viterbo", "instagram.com/profilo", "youtube.com/@profilo", "Copia UUID del profilo"]) assert.ok(sidebar.includes(content), `${type}: ${content}`);
		const overview = html.slice(html.indexOf("</header>"));
		for (const label of labels.filter(label => label !== "Esperienze")) assert.ok(!overview.includes(`>${label}<`), `${type}: duplicated ${label}`);
		const hasExperiences = ["staff-sportivo", "professionisti-studi", "arbitro"].includes(type);
		assert.equal(/role="tab"[^>]*>[\s\S]*?<span>Esperienze<\/span>/.test(html), hasExperiences, type);
		assert.doesNotMatch(html, /Esperienza dimostrativa|campo\.png|undefined|null/);
	}
});

test("non-player facts retain four or more cells with missing data and distinguish unknown counts from zero", () => {
	for (const [type, name, labels] of nonPlayerCases) {
		const Component = load(`src/features/dettagli-profilo/components/types/DettagliProfilo${name}.tsx`).default;
		const profile = genericProfile(type, {
			availabilityLabel: null, primaryFields: [], fields: [], experiences: [],
			locations: [], socialLinks: {instagram: "", facebook: "", youtube: "", linkedin: ""},
			followerCount: 0, announcementCount: null, announcementsUnavailable: true,
		});
		const html = renderToStaticMarkup(React.createElement(Component, {profile}));
		const facts = renderedFacts(html);
		assert.equal(facts.length, labels.length + 2, type);
		assert.deepEqual(facts.slice(-2), [["Follower", "0"], ["Num. annunci", "Non specificato"]]);
		if (type === "arbitro") assert.deepEqual(facts[1], ["Esperienze", "0"]);
		if (type === "creators") assert.deepEqual(facts[1], ["Canali social", "0"]);
		assert.match(html, /Descrizione non disponibile/);
		assert.match(html, /Nessuna località indicata/);
		assert.doesNotMatch(html, /undefined|null|data-social-brand/);
	}
});

test("the detail page places one profile action group inside every non-player header", () => {
	const Page = sourceLoader({
		"@/features/interazioni/DetailActions": props => React.createElement("button", {"data-presentation": props.presentation, "data-target": props.target.id}, "Azioni profilo"),
		"./components/ProfileHistoryBackButton": () => React.createElement("button", null, "Indietro"),
	})("src/features/dettagli-profilo/DettagliProfilo.tsx").default;
	for (const [type] of nonPlayerCases) {
		const html = renderToStaticMarkup(React.createElement(Page, {result: {status: "ok", profile: genericProfile(type)}}));
		assert.match(html, /public-profile-page/);
		assert.match(html, /<header\b[\s\S]*data-presentation="profile"[\s\S]*Azioni profilo[\s\S]*<\/header>/);
		assert.equal(html.split("Azioni profilo").length - 1, 1, type);
	}
	const error = renderToStaticMarkup(React.createElement(Page, {result: {status: "error"}}));
	assert.match(error, /Profilo temporaneamente non disponibile/);
	assert.doesNotMatch(error, /Azioni profilo|public-profile-hero/);
});

test("long-form primary fields remain in dedicated overview cards without duplication", () => {
	for (const [type, name, narrativeFields] of [
		["professionisti-studi", "ProfessionistiStudi", [
			{label: "Specializzazioni", value: "Riabilitazione sportiva"},
			{label: "Servizi offerti", value: "Valutazioni e trattamenti"},
		]],
		["campi-impianti-sportivi", "CampiImpianti", [
			{label: "Orari", value: "Lunedì: 09:00–18:00\nMartedì: 10:00–20:00"},
			{label: "Servizi inclusi", value: "Spogliatoi e parcheggio"},
			{label: "Informazioni aggiuntive", value: "Accesso senza barriere"},
		]],
	]) {
		const Component = load(`src/features/dettagli-profilo/components/types/DettagliProfilo${name}.tsx`).default;
		const profile = genericProfile(type, {primaryFields: narrativeFields, fields: [{label: "Presentazione", value: "Descrizione dimostrativa"}, ...narrativeFields.slice(0, 1)]});
		const html = renderToStaticMarkup(React.createElement(Component, {profile}));
		for (const {label, value} of narrativeFields) {
			assert.ok(html.includes(`>${label}</h2>`), label);
			assert.equal(html.split(value).length - 1, 1, value);
			assert.ok(html.indexOf("Descrizione dimostrativa") < html.indexOf(value));
		}
	}
});

test("experience timeline preserves roles, team links, periods and the empty state", () => {
	const History = load("src/features/dettagli-profilo/components/ProfileExperienceHistory.tsx").default;
	const teamId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
	const experiences = [
		{...genericProfile("arbitro").experiences[0], linkedTeam: {profileId: teamId, name: "Squadra collegata", imageUrl: null, location: "Roma"}},
		{id: "experience-2", title: "Qualifica tecnica", organization: "Ente formativo", from: "2022", to: "2023", status: "conseguito", description: null, linkedTeam: null, teamProfileId: null},
	];
	const html = renderToStaticMarkup(React.createElement(History, {experiences}));
	for (const content of ["Esperienza dimostrativa", "Squadra collegata", teamId, "2024 — In corso", "Qualifica tecnica", "Ente formativo", "2022 — 2023", "Conseguito"]) assert.ok(html.includes(content), content);
	assert.ok(html.indexOf("Esperienza dimostrativa") < html.indexOf("Qualifica tecnica"));
	assert.match(renderToStaticMarkup(React.createElement(History, {experiences: []})), /Nessuna esperienza inserita/);
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
			presentation: null, imageUrl: null, emailConfirmed: true, officialVerified: true, availabilityLabel: null,
			location: "Città dimostrativa", facts,
			filterData: {ruoli: ["Difensore"], tipologie: ["Calcio a 11"], figure: []},
		}}));
		assert.equal((html.match(/<a /g) ?? []).length, 1);
		assert.ok(html.includes('data-profile-icon="' + type + '"'));
		assert.match(html, /Apri il profilo di/);
		assert.match(html, /Utente registrato/);
		assert.match(html, /aria-label="Profilo verificato ufficialmente"/);
		assert.match(html, /Profilo dimostrativo/);
		for (const label of labels) assert.match(html, new RegExp(">" + label + "<"));
		const badgeIndex = html.indexOf(`data-profile-icon="${type}"`);
		const avatarIndex = html.indexOf('data-slot="avatar"');
		const titleIndex = html.indexOf("Profilo dimostrativo", avatarIndex);
		assert.ok(badgeIndex >= 0 && badgeIndex < avatarIndex);
		assert.ok(avatarIndex < titleIndex);
	}
});

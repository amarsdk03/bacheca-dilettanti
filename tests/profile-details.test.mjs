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

test("current qualifications ignore obsolete free text and unknown properties", () => {
 const parsed = parsePlayerCareer(["testo libero precedente", {titolo: "Licenza attuale", note: "annotazione storica", stato: "conseguito"}]);
 assert.equal(parsed.length, 1);
 assert.equal(parsed[0].title, "Licenza attuale");
 assert.equal(parsed[0].status, "conseguito");
 assert.doesNotMatch(JSON.stringify(parsed), /testo libero precedente|annotazione storica/);
});
const {availabilityLabel} = load("src/features/profilo/public-profile-display.ts");
const {groupPublicProfileLocations, publicProfileLocationLabel} = load("src/features/profilo/public-profile-locations.ts");
const {parseProfileDetailParams} = load("src/features/dettagli-profilo/profile-detail-model.ts");
const {profileImageMapKey, profileImageRowsToMap, resolvedProfileImageUrl} = load("src/features/profilo/profile-image.ts");
const {getPlayerRolePitchMarkers} = load("src/features/dettagli-profilo/components/player/PlayerRolePitch.tsx");
const {getAnnouncementPlayerRolePitchMarkers} = load("src/features/annunci/components/details/AnnouncementPlayerRolePitch.tsx");
const {
	PLAYER_PRIMARY_ROLES,
	PLAYER_SPECIFIC_ROLES_BY_PRIMARY,
	getPlayerSpecificRoleGroups,
	normalizePlayerSpecificRoles,
} = load("src/features/profilo/player-roles.ts");
const now = new Date("2026-09-14T12:00:00Z");

test("directory cards always show their supported facts and distinguish missing values from supplied values", () => {
	const {PROFILE_CARD_FACTS, getProfileFacts} = load("src/features/profili/components/cards/profile-card-model.ts");
	const Card = load("src/features/profili/components/cards/ProfileCard.tsx").default;
	for (const [type, definitions] of Object.entries(PROFILE_CARD_FACTS)) {
		const profile = {id: "card-1", type, title: "Profilo", imageUrl: null, presentation: null,
			emailConfirmed: false, officialVerified: false, facts: [], filterData: {ruoli: [], tipologie: [], figure: []}};
		for (const missing of [undefined, null, "", "  \n ", "Non specificato", "non specificata", " Non specificate ", "Non specificati"]) {
			profile.facts = missing === undefined ? [] : definitions.map(({kind, label}) => ({kind, label, value: missing}));
			const html = renderToStaticMarkup(React.createElement(Card, {profile}));
			const facts = [...html.matchAll(/<dd class="([^"]*)"[^>]*>(.*?)<\/dd>/g)];
			assert.equal(facts.length, definitions.length, type);
			assert.deepEqual(facts.map(([, , value]) => value), definitions.map(({emptyValue}) => emptyValue), type);
			for (const [, className] of facts) assert.match(className, /font-normal text-muted-foreground/);
			assert.doesNotMatch(html, /undefined|null|Informazioni non specificate/);
		}
		profile.facts = definitions.map(({kind, label}, index) => ({kind, label, value: index === 0 ? " 0 " : "Valore compilato"}));
		assert.equal(getProfileFacts(profile)[0].value, "0");
		assert.ok(getProfileFacts(profile).every(({unspecified}) => !unspecified));
		const html = renderToStaticMarkup(React.createElement(Card, {profile}));
		assert.equal((html.match(/<dd class="mt-1 font-medium"/g) ?? []).length, definitions.length);
		assert.deepEqual([...html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>/g)].map(([, value]) => value.replace(/<[^>]+>/g, "")), definitions.map(({label}) => label));
	}
});

test("player overview puts Social last in the main column and Ecosystem above UUID in responsive footers", () => {
	const Overview = load("src/features/dettagli-profilo/components/player/PlayerOverview.tsx").default;
	const props = {presentation: "Descrizione", highlightsUrl: null, privateHighlights: false,
		locations: [{city: "Roma", region: "Lazio"}], socialLinks: {instagram: "https://instagram.com/giocatore"},
		sportTypes: [], primaryRoles: [], specificRoles: [], height: null, weight: null,
		profileId: "player-id", authenticated: true, returnTo: "/dettagli-profilo"};
	for (const highlightsUrl of [null, "https://youtu.be/dQw4w9WgXcQ"]) {
		const html = renderToStaticMarkup(React.createElement(Overview, {...props, highlightsUrl}));
		const sidebar = html.match(/<aside[^>]*>([\s\S]*?)<\/aside>/)[1];
		assert.match(sidebar, /Vive a[\s\S]*Ecosistema giocatori[\s\S]*Powered by[\s\S]*UUID giocatore/);
		assert.doesNotMatch(sidebar, /instagram|>Social</);
		assert.equal((html.match(/instagram.com\/giocatore/g) ?? []).length, 2); // href and visible label in a single card
		assert.equal((html.match(/>Social<\/span>/g) ?? []).length, 1);
		const main = html.indexOf('class="order-2 flex min-w-0 flex-col gap-5 lg:order-1');
		const social = html.indexOf(">Social</span>", main);
		const mobile = html.indexOf('class="order-3 flex flex-col gap-5 lg:hidden"');
		assert.ok(main < social && social < mobile);
		if (highlightsUrl) assert.ok(html.indexOf("Video Highlights", main) < social);
		assert.match(html.slice(mobile), /Ecosistema giocatori[\s\S]*Powered by[\s\S]*UUID giocatore/);
	}
	const anonymous = renderToStaticMarkup(React.createElement(Overview, {...props, authenticated: false}));
	assert.doesNotMatch(anonymous, /instagram.com/);
	assert.match(anonymous, /Accedi/);
});

test("all profile overview sections expose one decorative icon and retain readable headings", () => {
	const Overview = load("src/features/dettagli-profilo/components/ProfileDetailsOverview.tsx").default;
	const {NON_PLAYER_PRESENTATIONS} = load("src/features/dettagli-profilo/components/non-player-presentations.ts");
	for (const [type, presentation] of Object.entries(NON_PLAYER_PRESENTATIONS)) {
		const html = renderToStaticMarkup(React.createElement(Overview, {profile: genericProfile(type), presentation, authenticated: true, returnTo: "/dettagli-profilo"}));
		const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
		assert.ok(headings.length > 0);
		for (const [, heading] of headings) {
			assert.equal((heading.match(/<svg /g) ?? []).length, 1, type);
			assert.match(heading, /aria-hidden="true"/);
			assert.match(heading, /<span[^>]*>[^<]+<\/span>/);
		}
	}
});
const player = {
	id: 7, nome: "Mario", cognome: "Rossi", disponibilita: "disponibile-subito",
	giorno_nascita: "14", mese_nascita: "Settembre", anno_nascita: "2000",
	tipologie_sport: ["Calcio a 5", "Calcio a 11", "Calcio storico"],
	ruoli_sport: {principali: ["Difensore"], specifici: ["Terzino destro"]},
	categoria_attuale: "Calcio 11 (Maschile)::Eccellenza", categorie_ricercate: ["Eccellenza"],
	genere: "Uomo", nazionalita: "IT", piede_principale: "Destro",
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
	assert.deepEqual(Object.keys(result).sort(), ["age", "birthYear", "sportTypes", "primaryRoles", "specificRoles", "currentCategory", "preferredFoot", "gender", "nationality", "nationalityCode", "height", "weight", "presentation", "career", "highlightsUrl"].sort());
	assert.equal(result.age, 26);
	assert.equal(result.birthYear, "2000");
	assert.equal(result.highlightsUrl, null);
	assert.deepEqual(result.sportTypes, ["Calcio 11", "Calcio 5", "Calcio storico"]);
	assert.equal(result.presentation, "Presentazione");
	assert.equal(result.currentCategory, "Calcio 11 (Maschile) · Eccellenza");
	assert.equal(result.gender, "Uomo");
	assert.equal(result.nationality, "Italia");
	assert.equal(result.nationalityCode, "IT");
	assert.doesNotMatch(JSON.stringify(result), /nascita|private@example/);
	assert.equal(toPublicPlayerData(player, "https://example.test/video", now).highlightsUrl, "https://example.test/video");
});

test("nationality uses an SVG flag when available", () => {
	const Flag = load("src/components/dynamic/DynamicReactFlag.tsx").default;
	const italy = renderToStaticMarkup(React.createElement(Flag, {code: "IT"}));
	assert.match(italy, /<svg\b/);
	assert.match(italy, /aria-hidden="true"/);
	assert.equal(renderToStaticMarkup(React.createElement(Flag, {code: "AN"})), "");
	assert.equal(renderToStaticMarkup(React.createElement(Flag, {code: "?"})), "");
});

test("obsolete nationality codes cannot be selected or shown as valid public facts", () => {
	const {PLAYER_NATIONALITIES, isPlayerNationalityCode} = load("src/features/profilo/player-nationalities.ts");
	const {getProfileRequiredFieldErrors} = load("src/features/profilo/profile-required-fields.ts");
	const excluded = "DY HV ZR AN FX DD BU UK SU CQ CS YU TP NH VD YD RH".split(" ");
	const available = new Set(PLAYER_NATIONALITIES.map(({code}) => code));
	for (const code of excluded) {
		assert.equal(available.has(code), false, code);
		assert.equal(isPlayerNationalityCode(code), false, code);
		assert.ok(getProfileRequiredFieldErrors("giocatore", {nazionalita: code}, []).nationality, code);
		const publicData = toPublicPlayerData({...player, nazionalita: code}, null, now);
		assert.equal(publicData.nationality, null, code);
		assert.equal(publicData.nationalityCode, null, code);
	}
	assert.equal(isPlayerNationalityCode("IT"), true);
	assert.equal(getProfileRequiredFieldErrors("giocatore", {nazionalita: ""}, []).nationality, undefined);
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
	assert.equal(availabilityLabel("svincolato"), "Svincolato");
	assert.equal(parseProfileDetailParams({id: "invalid", type: "giocatore"}), null);
	assert.equal(parseProfileDetailParams({id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "unknown"}), null);
	assert.equal(parseProfileDetailParams({id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "professionisti-studi"}), null);
	assert.deepEqual(parseProfileDetailParams({id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "servizi-consulenze"}), {id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type: "servizi-consulenze"});
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
		Centrocampista: ["Mediano", "Esterno sinistro", "Centrocampista Centrale", "Esterno destro", "Trequartista"],
		Attaccante: ["Ala sinistra", "Seconda Punta", "Ala destra", "Punta centrale"],
	});
	assert.deepEqual(getPlayerSpecificRoleGroups(["Portiere", "Difensore", "Attaccante"]), [
		{label: "Difensore", options: ["Terzino destro", "Difensore centrale", "Terzino sinistro"]},
		{label: "Attaccante", options: ["Ala sinistra", "Seconda Punta", "Ala destra", "Punta centrale"]},
	]);
	assert.deepEqual(normalizePlayerSpecificRoles([
		"Libero", "Esterno sinistro a tutta fascia", "Centrocampista sinistro",
		"Centrale", "Centrocampista Centrale", "Centrocampista centrale", "Centrocampista destro", "Esterno destro a tutta fascia",
		"Attaccante sinistro / Seconda punta sinistra", "Attaccante destro / Seconda punta destra",
		"Centravanti", "Seconda punta", "Non mappato",
	]), ["Difensore centrale", "Esterno sinistro", "Centrocampista Centrale", "Esterno destro", "Ala sinistra", "Ala destra", "Punta centrale", "Seconda Punta"]);
});

test("legacy football type filters resolve to the current label", () => {
	const {parseProfileDirectoryQuery} = load("src/features/profili/profile-directory-model.ts");
	const {parseAnnouncementDirectoryQuery, announcementOption, isAnnouncementType} = load("src/features/annunci/announcement-model.ts");
	assert.equal(parseProfileDirectoryQuery({type: "giocatore", tipologia: "Calcio a 11"}).filters.tipologia, "Calcio 11");
	assert.equal(parseAnnouncementDirectoryQuery({type: "annuncio_giocatore", tipologia: "Calcio a 11"}).filters.tipologia, "Calcio 11");
	assert.equal(isAnnouncementType("annuncio_professionisti_studi"), false);
	assert.equal(announcementOption("annuncio_servizi_consulenze").profileType, "servizi-consulenze");
});

test("profile directory keeps completion and activity ahead of stable randomized ties", () => {
	const {sortRankedDirectoryProfiles} = load("src/features/profili/profile-directory-ranking.ts");
	const {parseProfileDirectoryQuery, buildProfilesHref} = load("src/features/profili/profile-directory-model.ts");
	const profiles = Array.from({length: 20}, (_, index) => ({
		profile: {id: `profile-${index}`, type: "giocatore"},
		completionPercentage: index === 0 ? 90 : 80,
		lastActivityAt: index === 1 ? "2026-10-05T10:00:00Z" : "2026-10-01T10:00:00Z",
		followerCount: index === 2 ? 999 : 0,
	}));
	const ids = seed => sortRankedDirectoryProfiles([...profiles], seed).map(({profile}) => profile.id);
	const first = ids("seed-one");
	assert.deepEqual(first.slice(0, 2), ["profile-0", "profile-1"]);
	assert.deepEqual(first, ids("seed-one"));
	assert.notDeepEqual(first.slice(2), ids("seed-two").slice(2));
	const seed = "a".repeat(32);
	const query = parseProfileDirectoryQuery({page: "2", seed});
	assert.equal(query.sortSeed, seed);
	assert.match(buildProfilesHref(query, {page: 3, sortSeed: query.sortSeed}), /page=3&seed=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/);
	assert.equal(parseProfileDirectoryQuery({seed: "invalid"}).sortSeed, null);
});

test("single-location profile editor shows only the first saved location", () => {
	const ProfileLocationsField = sourceLoader()("src/features/profilo/ProfileLocationsField.tsx").default;
	const html = renderToStaticMarkup(React.createElement(ProfileLocationsField, {
		idPrefix: "player-location", mode: "single", label: "In che zona vivi?", required: true,
		value: [{regione: "Lazio", citta: "Roma"}, {regione: "Sicilia", citta: "Palermo"}], onValueChange: () => {},
	}));
	assert.match(html, /In che zona vivi\?/);
	assert.match(html, /value="Roma"/);
	assert.doesNotMatch(html, /value="Palermo"/);
	assert.doesNotMatch(html, /Altre 1 località storiche/);
});

test("player form disables current category when availability is Svincolato", () => {
	const Form = load("src/features/profilo/ProfileDetailsForm.tsx").default;
	const {createProfileDrafts, createProfileLocations} = load("src/features/profilo/profile-model.ts");
	const {createProfileSocialLinks} = load("src/features/profilo/profile-social-links.ts");
	const drafts = createProfileDrafts();
	drafts.giocatore.disponibilita = "svincolato";
	const html = renderToStaticMarkup(React.createElement(Form, {type: "giocatore", drafts, locations: createProfileLocations(), socialLinks: createProfileSocialLinks().giocatore, onChange: () => {}, onLocationsChange: () => {}, onSocialLinksChange: () => {}}));
	assert.match(html, /Categoria attuale/);
	assert.match(html, /id="[^"]*-categoria-attuale"[^>]*disabled/);
	assert.match(html, /Data di nascita/);
	assert.match(html, /Nazionalità/);
});

test("player role pitch uses the 3x7 grid and hides only specialized primary groups", () => {
	assert.deepEqual(
		getPlayerRolePitchMarkers(["Difensore", "Centrocampista", "Attaccante", "Portiere"], ["Terzino destro", "Centrale", "Ala sinistra"]),
		[
			{role: "Ala sinistra", isPrimary: false, abbreviation: "AS", column: 1, row: 2},
			{role: "Centrocampista Centrale", isPrimary: false, abbreviation: "CC", column: 2, row: 4},
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

test("player header renders the ordered public facts", () => {
	const PlayerHeader = load("src/features/dettagli-profilo/components/player/PlayerHeader.tsx").default;
	const html = renderToStaticMarkup(React.createElement(PlayerHeader, {
		title: "Mario Rossi", imageUrl: null, emailConfirmed: false, officialVerified: false, primary: false,
		availabilityLabel: "Disponibile subito",
		followerCount: 42,
		announcementCount: 7,
		player: {...toPublicPlayerData(player, null, now), sportTypes: ["Calcio 11", "Calcio 5"], specificRoles: ["Terzino destro", "Difensore centrale"]},
		actions: React.createElement("button", null, "Condividi"),
	}));
	assert.match(html, /campo\.png/);
	assert.match(html, /lucide-shirt/);
	assert.match(html, /min-h-22/);
	const roleBadge = html.indexOf(">Difensore</span>");
	const nationalityFlag = html.indexOf('class="h-4 w-6 rounded-xs ring-1 ring-border"');
	const profileBadge = html.indexOf("Giocatore</span>");
	assert.ok(roleBadge >= 0 && roleBadge < nationalityFlag && nationalityFlag < profileBadge);
	const factLabels = [...html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>/g)]
		.map(match => match[1].replace(/<[^>]+>/g, ""));
	assert.deepEqual(factLabels, ["Età", "Genere", "Altezza", "Piede", "Categoria attuale", "Disponibilità"]);
	assert.doesNotMatch(html, /Principale:/);
	for (const value of ["26 (2000)", "180 cm", "Destro", "Uomo", "Eccellenza", "Disponibile subito", "Difensore", "Condividi"]) assert.ok(html.includes(value), value);
	assert.match(html, /<header[^>]*>[\s\S]*public-profile-hero[\s\S]*<dl[\s\S]*<\/header>/);
	assert.doesNotMatch(html, /nascita|Una presentazione/);
});

test("player results card shows only the requested four facts", () => {
	const CardShell = ({facts}) => React.createElement("dl", null, facts.map(({kind, label, value}) => React.createElement("div", {key: kind}, React.createElement("dt", null, label), React.createElement("dd", null, value))));
	const GiocatoreCard = sourceLoader({"./ProfileCardShell": CardShell})("src/features/profili/components/cards/GiocatoreCard.tsx").default;
	const html = renderToStaticMarkup(React.createElement(GiocatoreCard, {profile: {
		id: "player-1", type: "giocatore", title: "Mario Rossi", presentation: null,
		imageUrl: null, emailConfirmed: true, officialVerified: false, roles: [],
		facts: [
			{kind: "age", label: "Età", value: "26 anni"},
			{kind: "gender", label: "Genere", value: "Uomo"},
			{kind: "availability", label: "Disponibilità", value: "Disponibile subito"},
			{kind: "category", label: "Categoria attuale", value: "Eccellenza"},
			{kind: "roles", label: "Ruoli", value: "Difensore"},
		],
	}}));
	const labels = [...html.matchAll(/<dt>(.*?)<\/dt>/g)].map(([, label]) => label);
	assert.deepEqual(labels, ["Età", "Genere", "Disponibilità", "Categoria attuale"]);
	assert.doesNotMatch(html, /Difensore/);
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

test("registered profile hover card links to complete information with or without a presentation", () => {
	const passthrough = ({children}) => React.createElement("div", null, children);
	const HoverCard = sourceLoader({
		"@/components/ui/hover-card": {
			HoverCard: passthrough,
			HoverCardTrigger: ({render, children, className, "aria-label": ariaLabel}) => React.cloneElement(render, {className, "aria-label": ariaLabel}, children),
			HoverCardContent: passthrough,
		},
	})("src/features/annunci/AnnouncementAuthorHoverCard.tsx").default;
	const author = {
		kind: "registered", profileId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", profileType: "giocatore",
		title: "Mario Rossi", imageUrl: null, emailConfirmed: true, officialVerified: false,
		presentation: "Presentazione del giocatore",
	};
	const withPresentation = renderToStaticMarkup(React.createElement(HoverCard, {author}));
	assert.match(withPresentation, /Vedi scheda Giocatore/);
	assert.match(withPresentation, /href="\/dettagli-profilo\?id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&amp;type=giocatore"/);
	assert.match(withPresentation, /Presentazione del giocatore/);

	const withoutPresentation = renderToStaticMarkup(React.createElement(HoverCard, {author: {...author, presentation: null}}));
	assert.match(withoutPresentation, /Vedi scheda Giocatore/);
	assert.doesNotMatch(withoutPresentation, /Presentazione del giocatore/);

	const anonymous = renderToStaticMarkup(React.createElement(HoverCard, {author: {kind: "anonymous", profileType: "giocatore", label: "Giocatore anonimo"}}));
	assert.doesNotMatch(anonymous, /Vedi scheda/);
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
		sportTypes: ["Calcio 11", "Calcio 5"], primaryRoles: ["Difensore"], specificRoles: ["Terzino destro"], preferredCategories: ["Eccellenza"],
		presentation: "Descrizione del giocatore", highlightsUrl: "https://youtu.be/abcdefghijk",
		locations: [{region: "Toscana", city: null}, {region: "Lazio", city: "Roma"}, {region: "Lazio", city: "Roma"}, {region: "Lazio", city: "Viterbo"}],
		socialLinks: {instagram: href, facebook: "", youtube: "", linkedin: ""},
	}));
	assert.match(html, /youtube-nocookie\.com\/embed\/abcdefghijk/);
	assert.ok(html.indexOf("Descrizione del giocatore") < html.indexOf("Video Highlights"));
	assert.match(html, /Vive a/);
	assert.ok(html.indexOf(">Lazio</span>") < html.indexOf(">Toscana</span>"));
	assert.ok(html.indexOf(">Roma</span>") < html.indexOf(">Lazio</span>"));
	assert.ok(html.indexOf(">Viterbo</span>") < html.lastIndexOf(">Lazio</span>"));
	assert.match(html, /Intera regione/);
	assert.ok(html.includes(`href="${href}"`));
	assert.match(html, />instagram\.com\/mario\.rossi\?ref=profilo</);
	assert.match(html, /target="_blank" rel="noopener noreferrer"/);
	const sidebar = html.match(/<aside[\s\S]*<\/aside>/)?.[0];
	assert.ok(sidebar);
	assert.doesNotMatch(html, /campo\.png/);
	assert.doesNotMatch(sidebar, /campo\.png|grid-cols-3 grid-rows-7|Principale:/);
	for (const value of ["Tipologie calcio", "Calcio 11", "Calcio 5", "Ruoli principali", "Difensore", "Ecosistema giocatori", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]) assert.ok(sidebar.includes(value), value);
	assert.match(html, /<h2[^>]*>[\s\S]*?Informazioni<\/span><\/h2>[\s\S]*Terzino destro[\s\S]*Descrizione del giocatore/);
	assert.ok(html.indexOf('aria-label="Località, ecosistema e identificativo del giocatore"') < html.indexOf('>Descrizione giocatore</span>'));
	assert.ok(sidebar.indexOf(">Tipologie calcio<") < sidebar.indexOf(">Ruoli principali<"));
	assert.ok(sidebar.indexOf(">Vive a<") >= 0);
	assert.ok(sidebar.indexOf("Ecosistema giocatori") < sidebar.indexOf("UUID giocatore"));
	assert.ok(html.indexOf("Video Highlights") < html.indexOf(">Social<"));
	assert.ok(sidebar.indexOf(">Vive a<") >= 0);
	assert.match(sidebar, /class="hidden flex-col gap-5 lg:flex"/);
	assert.ok(html.indexOf('class="order-3 flex flex-col gap-5 lg:hidden"') > html.indexOf("Video Highlights"));
	assert.doesNotMatch(sidebar, /data-social-brand="instagram"/);
	assert.match(html, /data-social-brand="instagram"/);
	assert.match(sidebar, /aria-label="Copia UUID del profilo"/);
	assert.doesNotMatch(html, /Una presentazione|Guarda il giocatore|Scheda sportiva|Facebook|role="dialog"/);
});

test("player overview omits absent media and socials and supports non-YouTube highlights", () => {
	const Overview = load("src/features/dettagli-profilo/components/player/PlayerOverview.tsx").default;
	const props = {profileId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", sportTypes: [], primaryRoles: [], specificRoles: [], preferredCategories: [], presentation: null, highlightsUrl: null, locations: [], socialLinks: {instagram: "", facebook: "", youtube: "", linkedin: ""}};
	const empty = renderToStaticMarkup(React.createElement(Overview, props));
	assert.match(empty, /Descrizione non disponibile/);
	assert.match(empty, /Nessuna località indicata/);
	assert.doesNotMatch(empty, /Highlights|Social|<iframe/);
	const external = renderToStaticMarkup(React.createElement(Overview, {...props, highlightsUrl: "https://example.test/video"}));
	assert.match(external, /href="https:\/\/example.test\/video"/);
	assert.match(external, /Guarda video highlights/);
	assert.doesNotMatch(external, /<iframe/);
});

test("all populated player social links use their brand icon, including website and LinkedIn", () => {
	const SocialLinks = load("src/features/dettagli-profilo/components/ProfileSocialLinks.tsx").default;
	const socialLinks = {website: "https://player.example.com", instagram: "https://instagram.com/player", facebook: "https://facebook.com/player", youtube: "https://youtube.com/@player", linkedin: "https://linkedin.com/in/player"};
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

test("directory ranks completion then activity without reading followers or exposing ranking inputs", async () => {
	const id = suffix => `${suffix.repeat(8)}-${suffix.repeat(4)}-4${suffix.repeat(3)}-8${suffix.repeat(3)}-${suffix.repeat(12)}`;
	const row = (suffix, childId, presentation) => ({
		uuid: id(suffix), tipologia_principale: "squadra", ultima_modifica_il: "2026-10-01T10:00:00Z",
		confermato_il: null, verificato_il: null, link_foto_profilo: null,
		localita_profilo: [{id_sottoprofilo: childId, sottoprofilo: "squadra", regione: "Lazio", citta: "Roma"}],
		profilo_squadra: [{id: childId, nascosto: false, nome_societa: `Squadra ${suffix}`, tipologie_sport: ["Calcio 11"], categoria_attuale: "eccellenza", presentazione: presentation}],
	});
	const rows = [row("a", 1, "Completo A"), row("b", 2, null), row("c", 3, "Completo C")];
	const follows = Array.from({length: 5}, (_, index) => ({uuid_profilo_seguito: index === 0 ? id("c") : id("b")}));
	const client = fixtureClient({profilo: {data: rows, error: null}, profilo_follow: {data: follows, error: null}});
	client.rpc = async (name, args) => {
		assert.equal(name, "get_profile_activity_v1");
		assert.deepEqual(args.p_ids, rows.map(row => row.uuid));
		return {data: [{profile_id: id("c"), profile_type: "squadra", last_activity: "2026-10-05T10:00:00Z"}], error: null};
	};
	const {getProfileDirectory} = sourceLoader({
		"@/lib/supabase/admin": {createAdminClient: () => client},
		"@/features/profilo/server/profile-images": {loadProfileImageUrlMap: async () => new Map()},
	})("src/features/profili/server/queries.ts");
	const query = {...load("src/features/profili/profile-directory-model.ts").parseProfileDirectoryQuery({}), sortSeed: "a".repeat(32)};
	const result = await getProfileDirectory(query);
	assert.equal(result.error, false);
	assert.deepEqual(result.profiles.map(profile => profile.id), [id("c"), id("a"), id("b")]);
	assert.ok(!client.calls.some(call => call.table === "profilo_follow"));
	assert.ok(result.profiles.every(profile => !Object.hasOwn(profile, "completionPercentage") && !Object.hasOwn(profile, "followerCount")));
});

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
	assert.ok(!Object.hasOwn(result.profile, "followerCount"));
	assert.ok(!client.calls.some(call => call.table === "profilo_follow"));
	assert.equal(result.profile.announcementCount, 7);
	assert.equal(result.profile.emailConfirmed, true);
	assert.equal(result.profile.officialVerified, true);
	assert.doesNotMatch(JSON.stringify(result.profile), /2026-09-01T10:00:00Z|2026-09-02T10:00:00Z/);
	assert.deepEqual(result.profile.locations, [{region: "Lazio", city: "Roma"}, {region: "Toscana", city: null}]);
	assert.equal(result.profile.player.birthYear, "2000");
	assert.doesNotMatch(JSON.stringify(result), /nascita|Wrong/);
	for (const table of ["profilo", "profilo_giocatore", "annuncio"]) {
		assert.ok(client.calls.find(call => call.table === table).operations.some(operation => JSON.stringify(operation) === JSON.stringify(["eq", "nascosto", false])));
	}
	const announcements = client.calls.find(call => call.table === "annuncio").operations;
	assert.deepEqual(announcements[0][2], {count: "exact"});
	for (const expected of [["eq", "autore_annuncio", id], ["eq", "privato", false], ["eq", "stato_annuncio", "pubblicato"], ["in", "tipologia_annuncio", ["annuncio_giocatore"]], ["limit", 4]]) {
		assert.ok(announcements.some(operation => JSON.stringify(operation) === JSON.stringify(expected)));
	}
});

test("referee detail query exposes calculated age without returning birth date parts", async () => {
	const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	const client = fixtureClient({
		profilo: {data: {uuid: id, tipologia_principale: "arbitro"}, error: null},
		profilo_arbitro: call => call.operations.some(([method]) => method === "maybeSingle")
			? {data: {id: 19, nome: "Anna", cognome: "Bianchi", giorno_nascita: "14", mese_nascita: "Settembre", anno_nascita: "2000", disponibilita: "disponibile-subito", presentazione: "Profilo", storico_esperienze: [], lista_esperienze: [], qualifiche_licenze: []}, error: null}
			: {data: [], error: null},
		media_profilo: {data: null, error: null},
		annuncio: {data: [], count: 0, error: null},
		profilo_follow: {data: null, count: 0, error: null},
	});
	const queryLoad = sourceLoader({"@/lib/supabase/admin": {createAdminClient: () => client}});
	const {getProfileDetail} = queryLoad("src/features/dettagli-profilo/server/profile-detail-query.ts");
	const result = await getProfileDetail(id, "arbitro");
	assert.equal(result.status, "ok");
	assert.ok(result.profile.primaryFields.some(field => field.label === "Età" && /^\d+ \(2000\)$/.test(field.value)));
	assert.doesNotMatch(JSON.stringify(result.profile), /giorno_nascita|mese_nascita|anno_nascita|Settembre/);
	const refereeQuery = client.calls.find(call => call.table === "profilo_arbitro" && call.operations.some(([method]) => method === "maybeSingle"));
	assert.match(refereeQuery.operations.find(([method]) => method === "select")[1], /giorno_nascita.*mese_nascita.*anno_nascita/);
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

test("similar-profile failures do not hide the current profile", async (t) => {
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
	assert.ok(!Object.hasOwn(result.profile, "followerCount"));
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
	["squadra", "Squadra", ["Follower", "Annunci pubblicati"]],
	["staff-sportivo", "StaffSportivo", ["Età", "Tipologie calcio", "Disponibilità", "Disponibile da remoto"]],
	["servizi-consulenze", "ServiziConsulenze", ["Sede azienda / professionista", "Disponibilità", "Num. follower", "Contenuti pubblicati"]],
	["arbitro", "Arbitro", ["Età", "Disponibilità"]],
	["creators", "Creator", ["Num. follower", "Num. annunci pubblicati"]],
	["torneo-evento", "TorneoEvento", ["Num. follower", "Eventi pubblicati"]],
	["campi-impianti-sportivi", "CampiImpianti", ["Sede dell’impianto", "Num. follower", "Campi pubblicati"]],
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
		.map(([, label, value]) => [label.replace(/<[^>]*>/g, ""), value.replace(/<\/span><span\b[^>]*>/g, "\n").replace(/<[^>]*>/g, "")]);
}

test("all seven non-player profiles show configured badges, facts, central sections and responsive ecosystem cards", () => {
	const values = {
		"Tipologie sportive": ["Calcio 11", "Calcio 8", "Calcio 5"],
		"Tipologia campi disponibili": ["Calcio 11", "Calcio 8", "Calcio 5"], "Indirizzo del campo": "Via Roma 1",
		"Tipologie calcio": ["Calcio 11", "Calcio 8", "Calcio 5"],
		"Categoria attuale Prima Squadra": "Calcio a 11 maschile — FIGC-LND — Eccellenza",
		"Tipo di azienda / professione": "Fisioterapia", "Sede Azienda / Professionista": "Via Roma 2",
		"Figure professionali": ["Allenatore", "Preparatore atletico", "Match analyst"],
		"Disponibile anche da remoto": "No", "Tipologia di contenuti": "Video, podcast e interviste", "Età": "35 (1991)",
		"Informazioni aggiuntive": "Accesso facilitato", "Servizi offerti": "Valutazioni e trattamenti",
	};
	const sections = {
		squadra: ["Località", "Descrizione", "Social"],
		"staff-sportivo": ["Località", "Descrizione", "Social"],
		arbitro: ["Località", "Descrizione", "Social"],
		"torneo-evento": ["Località", "Presentazione", "Social"],
		"campi-impianti-sportivi": ["Località", "Tipologia campi disponibili", "Descrizione", "Informazioni aggiuntive", "Social"],
		"servizi-consulenze": ["Presentazione", "Presentazione servizi", "Social"],
		creators: ["Tipologia contenuti", "Presentazione", "Zona/e di competenza", "Social"],
	};
	const badges = {
		squadra: [values["Categoria attuale Prima Squadra"]],
		"staff-sportivo": values["Figure professionali"],
		arbitro: values["Tipologie calcio"],
		"torneo-evento": ["Torneo calcio 11", "Torneo calcio 8", "Torneo calcio 5"],
		"campi-impianti-sportivi": values["Tipologia campi disponibili"],
		"servizi-consulenze": ["Fisioterapia", "Lazio"],
		creators: [values["Tipologia di contenuti"]],
	};
	const expectedValues = {
		squadra: ["1234", "7"],
		"staff-sportivo": ["35 (1991)", "Calcio 11\nCalcio 8\n+1", "Disponibile subito", "No"],
		"servizi-consulenze": ["Via Roma 2", "Disponibile subito", "1234", "7"],
		arbitro: ["35 (1991)", "Disponibile subito"],
		creators: ["1234", "7"], "torneo-evento": ["1234", "7"],
		"campi-impianti-sportivi": ["Via Roma 1, Roma, Lazio, Viterbo, Lazio", "1234", "7"],
	};
	const {NON_PLAYER_PRESENTATIONS} = load("src/features/dettagli-profilo/components/non-player-presentations.ts");
	const Overview = load("src/features/dettagli-profilo/components/ProfileDetailsOverview.tsx").default;
	for (const [type, name, labels] of nonPlayerCases) {
		const primaryFields = Object.entries(values).map(([label, value]) => ({label, value: Array.isArray(value) ? value.join(", ") : value, ...(Array.isArray(value) ? {items: value} : {})}));
		const profile = genericProfile(type, {primaryFields, contacts: {email: "private@example.test", phone: "123456789"}});
		const Component = load("src/features/dettagli-profilo/components/types/DettagliProfilo" + name + ".tsx").default;
		const html = renderToStaticMarkup(React.createElement(Component, {profile, authenticated: true, returnTo: "/dettagli-profilo", actions: React.createElement("button", null, "Condividi")}));
		assert.deepEqual(renderedFacts(html), labels.map((label, index) => [label, expectedValues[type][index]]), type);
		const badgeGroup = html.match(/<div role="group" aria-label="Caratteristiche del profilo"[^>]*>([\s\S]*?)<\/div>/)?.[1];
		assert.ok(badgeGroup, type);
		for (const value of badges[type]) assert.ok(badgeGroup.includes('title="' + value + '"'), type + ": " + value);
		assert.equal((badgeGroup.match(/data-slot="badge"/g) ?? []).length, badges[type].length, type);
		assert.match(html, /<header\b[\s\S]*Condividi[\s\S]*<\/header>/);
		assert.match(html, /Utente registrato/);
		assert.match(html, /Profilo verificato ufficialmente/);
		assert.match(html, /Profili simili/);
		const overview = renderToStaticMarkup(React.createElement(Overview, {profile, presentation: NON_PLAYER_PRESENTATIONS[type], authenticated: true, returnTo: "/dettagli-profilo"}));
		const center = overview.match(/<section aria-label="Panoramica del profilo"[^>]*>([\s\S]*?)<\/section>/)?.[1];
		assert.ok(center, type);
		const headings = [...center.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(([,value]) => value.replace(/<[^>]+>/g, ""));
		assert.deepEqual(headings, sections[type], type);
		assert.match(center, /instagram.com\/profilo/);
		assert.match(center, /Descrizione dimostrativa/);
		const sidebar = overview.match(/<aside[^>]*>([\s\S]*?)<\/aside>/)?.[1];
		assert.ok(sidebar);
		assert.match(sidebar, /Ecosistema[\s\S]*Powered by[\s\S]*placeholder[\s\S]*UUID/);
		assert.doesNotMatch(sidebar, /instagram.com\/profilo/);
		assert.doesNotMatch(overview, /private@example.test|123456789|Altre informazioni/);
		assert.ok(overview.indexOf('class="order-3 flex min-w-0 flex-col gap-5 lg:hidden"') > overview.indexOf("</section>"));
		if (type === "servizi-consulenze") {
			assert.ok(sidebar.indexOf("Tipo di azienda / professione") < sidebar.indexOf("Sede azienda / professionista"));
			assert.ok(sidebar.indexOf("Sede azienda / professionista") < sidebar.indexOf("Ecosistema"));
			assert.match(overview, /lg:flex order-1 flex lg:order-2/);
		} else assert.match(overview, /lg:flex order-2 hidden/);
		assert.equal((overview.match(/Powered by/g) ?? []).length, 2, type);
	}
});

test("non-player facts retain expected cells with missing data and distinguish unknown counts from zero", () => {
	for (const [type, name, labels] of nonPlayerCases) {
		const Component = load(`src/features/dettagli-profilo/components/types/DettagliProfilo${name}.tsx`).default;
		const profile = genericProfile(type, {
			availabilityLabel: null, primaryFields: [], fields: [], experiences: [],
			locations: [], socialLinks: {instagram: "", facebook: "", youtube: "", linkedin: ""},
			followerCount: 0, announcementCount: null, announcementsUnavailable: true,
		});
		const html = renderToStaticMarkup(React.createElement(Component, {profile, authenticated: false, returnTo: "/dettagli-profilo"}));
		const facts = renderedFacts(html);
		assert.equal(facts.length, labels.length, type);
		assert.deepEqual(facts, labels.map(label => [label, label.toLowerCase().includes("follower") ? "0" : /pubblicati/.test(label) ? "Non disponibile" : "Non specificato"]));
		assert.match(html, /(?:Descrizione|Presentazione) non disponibile/);
		if (type !== "servizi-consulenze") assert.match(html, /Nessuna località indicata/);
		assert.doesNotMatch(html, /undefined|null|data-social-brand/);
	}
});

test("the detail page places one profile action group inside every non-player header", () => {
	const Page = sourceLoader({
		"@/features/interessi/ProfileInterestDialog": ({children}) => children,
		"@/features/interazioni/DetailActions": props => React.createElement("button", {"data-presentation": props.presentation, "data-target": props.target.id}, "Azioni profilo"),
		"./components/ProfileHistoryBackButton": () => React.createElement("button", null, "Indietro"),
	})("src/features/dettagli-profilo/DettagliProfilo.tsx").default;
	for (const [type] of nonPlayerCases) {
		const html = renderToStaticMarkup(React.createElement(Page, {result: {status: "ok", profile: genericProfile(type)}}));
		assert.match(html, /public-profile-page/);
		assert.equal((html.match(/Powered by/g) ?? []).length, 2);
		assert.doesNotMatch(html, /aria-label="Sponsor"/);
		assert.match(html, /<header\b[\s\S]*data-presentation="profile"[\s\S]*Azioni profilo[\s\S]*<\/header>/);
		assert.equal(html.split("Azioni profilo").length - 1, 1, type);
		assert.match(html, /Powered by[\s\S]*placeholder\.png/);
	}
	const error = renderToStaticMarkup(React.createElement(Page, {result: {status: "error"}}));
	assert.match(error, /Profilo temporaneamente non disponibile/);
	assert.doesNotMatch(error, /Azioni profilo|public-profile-hero/);
});

test("long-form fields remain in dedicated overview cards without duplication", () => {
	for (const [type, name, narrativeFields] of [
		["servizi-consulenze", "ServiziConsulenze", [
			{label: "Servizi offerti", value: "Valutazioni e trattamenti"},
		]],
		["campi-impianti-sportivi", "CampiImpianti", [
			{label: "Informazioni aggiuntive", value: "Accesso senza barriere"},
		]],
	]) {
		const Component = load(`src/features/dettagli-profilo/components/types/DettagliProfilo${name}.tsx`).default;
		const profile = genericProfile(type, {primaryFields: narrativeFields, fields: [{label: "Presentazione", value: "Descrizione dimostrativa"}, ...narrativeFields.slice(0, 1)]});
		const html = renderToStaticMarkup(React.createElement(Component, {profile, authenticated: false, returnTo: "/dettagli-profilo"}));
		for (const {label, value} of narrativeFields) {
			const headings = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(([, value]) => value.replace(/<[^>]+>/g, ""));
			assert.ok(headings.includes(label === "Servizi offerti" ? "Presentazione servizi" : label), label);
			assert.equal(html.split(value).length - 1, 1, value);
			assert.ok(html.indexOf("Descrizione dimostrativa") < html.indexOf(value));
		}
	}
});

test("facility overview hides obsolete cost, hours, services and historic location", () => {
	const Facility = load("src/features/dettagli-profilo/components/types/DettagliProfiloCampiImpianti.tsx").default;
	const profile = genericProfile("campi-impianti-sportivi", {fields: [
		{label: "Costo di partenza", value: "€ 45 / 1h"},
		{label: "Sede principale storica", value: "Vecchia sede"},
		{label: "Orari", value: "Lunedì 09:00"},
		{label: "Servizi inclusi", value: "Parcheggio"},
		{label: "Presentazione", value: "Descrizione campo"},
		{label: "Informazioni aggiuntive", value: "Accesso facilitato"},
	]});
	const html = renderToStaticMarkup(React.createElement(Facility, {profile}));
	assert.doesNotMatch(html, /Costo di partenza/);
	assert.match(html, /Accesso facilitato/);
	assert.doesNotMatch(html, /Altre informazioni|Vecchia sede|Lunedì 09:00|Parcheggio/);
});

test("new announcement CTA is shown only for the profile owner", () => {
	const Announcements = load("src/features/dettagli-profilo/components/LatestProfileAnnouncements.tsx").default;
	const base = {announcements: [], announcementsUnavailable: false};
	const owned = renderToStaticMarkup(React.createElement(Announcements, {...base, isOwner: true}));
	const visitor = renderToStaticMarkup(React.createElement(Announcements, {...base, isOwner: false}));
	assert.match(owned, /href="\/pubblica-annuncio"[^>]*>Crea nuovo annuncio/);
	assert.doesNotMatch(visitor, /Crea nuovo annuncio/);
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
		{kind: "age", label: "Età", value: "26 anni"},
		{kind: "availability", label: "Disponibilità", value: "Disponibile subito"},
		{kind: "category", label: "Categoria attuale", value: "Calcio 11 (Maschile) · Eccellenza"},
		{kind: "content", label: "Contenuti", value: "Video"},
		{kind: "figures", label: "Figure", value: "Allenatore"},
		{kind: "gender", label: "Genere", value: "Uomo"},
		{kind: "headquarters", label: "Sede", value: "Roma"},
		{kind: "location", label: "Località", value: "Città dimostrativa"},
		{kind: "price", label: "Costo", value: "Da 30 €"},
		{kind: "roles", label: "Ruoli", value: "Difensore"},
		{kind: "services", label: "Servizi", value: "Spogliatoi"},
		{kind: "specializations", label: "Specializzazioni", value: "Fisioterapia"},
		{kind: "types", label: "Tipologie", value: "Calcio 11"},
	];
	const expectedLabels = {
		giocatore: ["Età", "Genere", "Disponibilità", "Categoria attuale"],
		squadra: ["Tipologie", "Categoria attuale Prima Squadra", "Località"],
		"staff-sportivo": ["Figure", "Disponibilità", "Località"],
		"servizi-consulenze": ["Tipo di azienda / professione", "Disponibilità", "Località"],
		arbitro: ["Disponibilità", "Località"],
		creators: ["Contenuti", "Località"],
		"torneo-evento": ["Tipologie", "Località"],
		"campi-impianti-sportivi": ["Tipologia campi disponibili", "Località"],
	};
	for (const [type, labels] of Object.entries(expectedLabels)) {
		const html = renderToStaticMarkup(React.createElement(Card, {profile: {
			id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", type, title: "Profilo dimostrativo",
			presentation: null, imageUrl: null, emailConfirmed: true, officialVerified: true, availabilityLabel: null,
			location: "Città dimostrativa", facts,
			filterData: {ruoli: ["Difensore"], tipologie: ["Calcio 11"], figure: []},
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


test("public profiles conceal the nominative for every supported subprofile without losing current data", async () => {
 const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
 for (const [type, table, name] of [
  ["giocatore", "profilo_giocatore", "Giocatore anonimo"],
  ["squadra", "profilo_squadra", "Squadra anonima"],
  ["staff-sportivo", "profilo_staff_sportivo", "Staff sportivo anonimo"],
  ["arbitro", "profilo_arbitro", "Arbitro anonimo"],
 ]) {
  const child = {...player, nome: "Nome riservato", cognome: "Cognome riservato", nome_societa: "Società riservata", nominativo_anonimo: true,
   storico_carriera: [], lista_esperienze: [{titolo: "Esperienza attuale", ente: "Ente sportivo"}],
   qualifiche_licenze: [{titolo: "Licenza attuale", stato: "conseguito"}], storico_esperienze: [{titolo: "Licenza obsoleta"}]};
  const client = fixtureClient({
   profilo: {data: {uuid: id, tipologia_principale: type}, error: null},
   [table]: call => call.operations.some(([method]) => method === "maybeSingle") ? {data: child, error: null} : {data: [], error: null},
   media_profilo: {data: null, error: null}, annuncio: {data: [], count: 0, error: null},
  });
  const {getProfileDetail} = sourceLoader({"@/lib/supabase/admin": {createAdminClient: () => client}})("src/features/dettagli-profilo/server/profile-detail-query.ts");
  const result = await getProfileDetail(id, type);
  assert.equal(result.status, "ok", type);
  assert.equal(result.profile.title, name);
  assert.doesNotMatch(JSON.stringify(result), /Nome riservato|Cognome riservato|Società riservata|Licenza obsoleta/);
  if (type === "staff-sportivo" || type === "arbitro") {
   assert.equal(result.profile.experiences[0].title, "Esperienza attuale");
   assert.equal(result.profile.qualifications[0].title, "Licenza attuale");
  }
 }
});

test("linked team names are resolved publicly and stale identifying copies never become fallbacks", () => {
 const {publicTeamExperienceNames} = load("src/features/profilo/team-profile.ts");
 const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
 const source = [{titolo: "Società riservata", ente: "Società riservata", squadraProfiloId: id, periodoDa: "2024"}];
 const teams = new Map([[id, {profileId: id, name: "Squadra anonima", anonymousName: true}]]);
 const concealed = publicTeamExperienceNames(source, teams, "titolo");
 assert.doesNotMatch(JSON.stringify(concealed), /Società riservata/);
 assert.equal(concealed[0].titolo, "Squadra anonima");
 assert.equal(concealed[0].periodoDa, "2024");
 assert.doesNotMatch(JSON.stringify(publicTeamExperienceNames(source, new Map(), "titolo")), /Società riservata/);
 assert.equal(source[0].titolo, "Società riservata");
});

test("follower count is aggregated for the exact target subprofile and tolerates lookup errors", async (t) => {
	t.mock.method(console, "error", () => {});
	const {loadProfileFollowerCount} = load("src/features/dettagli-profilo/server/profile-follower-count.ts");
	const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	for (const count of [0, 42]) {
		const client = fixtureClient({profilo_follow: call => {
			assert.deepEqual(call.operations, [
				["select", "uuid_profilo_seguito", {count: "exact", head: true}],
				["eq", "uuid_profilo_seguito", id], ["eq", "sottoprofilo_seguito", "squadra"],
			]);
			return {data: null, count, error: null};
		}});
		assert.equal(await loadProfileFollowerCount(client, id, "squadra"), count);
	}
	const failed = fixtureClient({profilo_follow: {data: null, count: null, error: {code: "TEST_UNAVAILABLE"}}});
	assert.equal(await loadProfileFollowerCount(failed, id, "squadra"), null);
});

test("staff details load public age and subprofile follower count without exposing birth parts", async (t) => {
	t.mock.method(console, "error", () => {});
	const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	for (const unavailable of [false, true]) {
		const client = fixtureClient({
			profilo: {data: {uuid: id, tipologia_principale: "staff-sportivo"}, error: null},
			profilo_staff_sportivo: call => call.operations.some(([method]) => method === "maybeSingle")
				? {data: {...player, lista_esperienze: [], qualifiche_licenze: [], disponibile_remoto: true, figure_professionali: ["Allenatore"]}, error: null}
				: {data: [], error: null},
			profilo_follow: {data: null, count: unavailable ? null : 12, error: unavailable ? {code: "TEST_UNAVAILABLE"} : null},
		});
		const {getProfileDetail} = sourceLoader({
			"@/lib/supabase/admin": {createAdminClient: () => client},
			"@/features/annunci/server/queries": {loadPublicProfileAnnouncements: async () => ({announcements: [], announcementCount: 0, unavailable: false})},
		})("src/features/dettagli-profilo/server/profile-detail-query.ts");
		const result = await getProfileDetail(id, "staff-sportivo");
		assert.equal(result.status, "ok");
		assert.equal(result.profile.followerCount, unavailable ? null : 12);
		assert.equal(result.profile.announcementCount, 0);
		assert.ok(result.profile.fields.some(field => field.label === "Età" && /^\d+ \(2000\)$/.test(field.value)));
		assert.doesNotMatch(JSON.stringify(result.profile), /giorno_nascita|mese_nascita|anno_nascita|Settembre/);
		assert.ok(client.calls.find(call => call.table === "profilo_follow").operations.some(operation => JSON.stringify(operation) === JSON.stringify(["eq", "sottoprofilo_seguito", "staff-sportivo"])));
	}
});

test("player result cards carry nationality through the directory mapper and display it beside roles", async () => {
	const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
	const {loadRecentSimilarProfiles} = load("src/features/profili/server/queries.ts");
	const Card = load("src/features/profili/components/cards/ProfileCard.tsx").default;
	for (const nationality of ["IT", null, "ZZ"]) {
		const client = fixtureClient({
			profilo_giocatore: {data: [{id: 7, uuid_profilo: id}], error: null},
			profilo: {data: [{uuid: id, ultima_modifica_il: "2026-10-01", profilo_giocatore: [{...player, nascosto: false, nazionalita: nationality}]}], error: null},
		});
		const [profile] = await loadRecentSimilarProfiles(client, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "giocatore");
		assert.equal(profile.nationalityCode, nationality === "IT" ? "IT" : null);
		const html = renderToStaticMarkup(React.createElement(Card, {profile}));
		if (nationality === "IT") {
			assert.match(html, /aria-label="Nazionalità: Italia" title="Italia"/);
			assert.match(html, /<svg[^>]*aria-hidden="true"/);
			assert.ok(html.indexOf(">Difensore</span>") < html.indexOf('aria-label="Nazionalità: Italia"'));
		} else assert.doesNotMatch(html, /aria-label="Nazionalità:/);
		assert.equal((html.match(/<a /g) ?? []).length, 1);
	}
});

test("free-text badges stay compact while overview cards preserve their complete content", () => {
	const {NON_PLAYER_PRESENTATIONS} = load("src/features/dettagli-profilo/components/non-player-presentations.ts");
	const {ProfileDetailsHeader, default: Overview} = load("src/features/dettagli-profilo/components/ProfileDetailsOverview.tsx");
	for (const [type, label] of [["servizi-consulenze", "Tipo di azienda / professione"], ["creators", "Tipologia di contenuti"]]) {
		const content = "Descrizione lunga con virgole, e contenuto integrale. ".repeat(30);
		const profile = genericProfile(type, {primaryFields: [{label, value: content}]});
		const presentation = NON_PLAYER_PRESENTATIONS[type];
		const header = renderToStaticMarkup(React.createElement(ProfileDetailsHeader, {profile, presentation}));
		assert.match(header, /line-clamp-2/);
		assert.ok(header.includes('title="' + content.trim() + '"'));
		const overview = renderToStaticMarkup(React.createElement(Overview, {profile, presentation, authenticated: true, returnTo: "/dettagli-profilo"}));
		assert.equal(overview.split(content).length - 1, 1);
	}
});

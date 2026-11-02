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
		const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}});
		new Function("require", "module", "exports", outputText)(specifier => {
			if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
			if (specifier === "server-only") return {};
			if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
			const base = specifier.startsWith("@/") ? path.join(root, "apps/web/src", specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
			return load([base, base + ".ts", base + ".tsx"].find(candidate => existsSync(candidate)));
		}, loaded, loaded.exports);
		return loaded.exports;
	}
	return relative => load(path.join(root, relative));
}

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", profileId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const locations = [{regione: "Lazio", citta: "Roma"}, {regione: "Lazio", citta: "Viterbo"}, {regione: "Toscana", citta: null}];
const experience = [{titolo: "Allenatore", ente: "Società locale", periodoDa: "2020", periodoA: "2025", descrizione: "Prima riga\nSeconda riga"}];
const qualifications = [{titolo: "Licenza UEFA B", ente: "FIGC", periodoDa: "2023", periodoA: "2024", stato: "conseguito"}];
const cases = [
	["annuncio_giocatore", "giocatore", {categorie_ricercate: ["Eccellenza"], tipologie_sport: ["Calcio 11"], ruoli_principali: ["Difensore"], ruoli_secondari: ["Terzino destro"]}, ["Categorie", "Eccellenza", "Carriera sportiva", "2000", "Società locale", "Terzino destro"]],
	["annuncio_squadra_cerca_giocatore", "squadra", {gruppo_squadra: "Juniores", ruoli_principali: ["Difensore"], ruoli_secondari: ["Terzino destro"], tipologie_sport: ["Calcio 11"], annata_da: 2001, annata_a: 2004, stagione: "2026/2027"}, ["Juniores", "Terzino destro", "2001–2004", "2026/2027"]],
	["annuncio_squadra_cerca_staff", "squadra", {figure_ricercate: ["Allenatore"], settore: "Allievi", compenso_mensile: 0, requisiti: "Patentino\nEsperienza", stagione: "2026/2027"}, ["Allenatore", "Allievi", "Compenso mensile", "0,00", "Patentino\nEsperienza"]],
	["annuncio_squadra_cerca_partita", "squadra", {gruppo_squadra: "Prima squadra", categorie_avversario: ["Eccellenza"], disponibilita_trasferta: "Si", periodo_dal: "2026-11-01", periodo_al: "2026-11-30", orario_dalle: "18:00", orario_alle: ""}, ["Eccellenza", "Sì", "novembre", "Dalle 18:00"]],
	["annuncio_squadra_cerca_sponsor", "squadra", {categoria_settore: "Abbigliamento", offerta_fornita: "Logo sulla maglia\nVisibilità online"}, ["Abbigliamento", "Logo sulla maglia\nVisibilità online", "Categoria attuale Prima Squadra", "Sede della squadra"]],
	["annuncio_staff_sportivo", "staff-sportivo", {tipologie_sport: ["Calcio 11"], figure_professionali: ["Allenatore"], categorie_ricercate: ["Juniores"], disponibilita_occupazione: "disponibile-subito", disponibilita_spostamento: "No", disponibile_remoto: false, lista_esperienze: experience, qualifiche_licenze: qualifications}, ["Allenatore", "Juniores", "Disponibile subito", "Disponibile anche da remoto", "No", "Licenza UEFA B", "Prima riga\nSeconda riga", "Conseguito"]],
	["annuncio_arbitro", "arbitro", {tipologie_sport: ["Calcio 11"], disponibilita_occupazione: "disponibile-subito", automunito: "Si", disponibilita_spostamento: "No", lista_esperienze: [{titolo: "Prima categoria e Juniores", ente: "CSI", periodoDa: "2020", periodoA: "oggi"}], qualifiche_licenze: qualifications}, ["Prima categoria e Juniores", "CSI", "Disponibile subito", "Sì", "Licenza UEFA B"]],
	["annuncio_torneo_evento", "torneo-evento", {nome_evento: "Coppa regionale", tipologie_sport: ["Calcio 11"], modalita_iscrizione: "posti-limitati", annate_ammesse_da: "2000", annate_ammesse_a: "2005", numero_squadre: 8, costo_partecipazione: 0, tipo_partecipazione: "giocatore", lista_premi_trofei: [{posto: "Fair play", titoloPremio: "Coppa correttezza"}]}, ["Coppa regionale", "Posti limitati", "2000 – 2005", "8", "0,00", "/ giocatore", "Fair play", "Coppa correttezza"]],
	["annuncio_campo_impianto", "campi-impianti-sportivi", {tipologie_sport: ["Calcio 11"], indirizzo: "Via Roma 12", costo_partenza: 0, orari: [{giorno: "lunedi", attivo: true, dalle: "18:00", alle: ""}, {giorno: "martedi", attivo: true, dalle: "", alle: "22:00"}, {giorno: "domenica", attivo: false}], servizi_inclusi: "Spogliatoi\nParcheggio"}, ["Via Roma 12", "Lunedì", "Dalle 18:00", "Fino alle 22:00", "Spogliatoi\nParcheggio", "Da 0,00", "/ ora"]],
	["annuncio_servizi_consulenze", "servizi-consulenze", {figura_professionale: ["Fisioterapista"], tipologie_sport: ["Calcio 11"], specializzazione: "Recupero sportivo", presentazione_servizi: "Trattamenti\nSu appuntamento"}, ["Fisioterapista", "Recupero sportivo", "Trattamenti\nSu appuntamento", "Sede Attività", "Studio medico", "In presenza"]],
	["annuncio_creators", "creators", {titolo_post: "Collaborazione", descrizione_post: "Riprese video\nInterviste"}, ["Riprese video\nInterviste", "Tipologia di contenuti", "Video", "Di che zona/e ti occupi"]],
];

function setupDrafts(load) {
	const drafts = load("apps/web/src/features/profilo/profile-model.ts").createProfileDrafts();
	drafts.giocatore = {...drafts.giocatore, nome: "Mario", cognome: "Rossi", anno_nascita: "2000", mese_nascita: "Gennaio", giorno_nascita: "01", tipologie_sport: ["Calcio 11"], ruoli_sport: {principali: ["Difensore"], specifici: ["Terzino destro"]}, storico_carriera: [{titolo: "Società locale", ente: "Eccellenza", periodoDa: "2020", periodoA: "2025"}]};
	drafts.squadra = {...drafts.squadra, nome_societa: "Società locale", tipologie_sport: ["Calcio 11"], categoria_attuale: "Calcio a 11 maschile::Eccellenza"};
	drafts["staff-sportivo"] = {...drafts["staff-sportivo"], nome: "Andrea", cognome: "Bianchi", figure_professionali: ["Allenatore"], tipologie_sport: ["Calcio 11"], disponibilita: "disponibile-subito", disponibile_remoto: false, lista_esperienze: experience, storico_esperienze: [], qualifiche_licenze: qualifications};
	drafts.arbitro = {...drafts.arbitro, nome: "Luca", cognome: "Verdi", disponibilita: "disponibile-subito", tipologie_sport: ["Calcio 11"], lista_esperienze: cases[6][2].lista_esperienze, qualifiche_licenze: qualifications};
	drafts["servizi-consulenze"] = {...drafts["servizi-consulenze"], nome: "Studio medico", specializzazioni: "Studio medico", sede_professionista: "Via Milano 8", disponibilita: "in-presenza"};
	drafts.creators = {...drafts.creators, nome_creator: "Videomaker locale", tipologia_contenuti: ["Video"]};
	drafts["torneo-evento"].nome_organizzazione = "Organizzazione tornei";
	drafts["campi-impianti-sportivi"].nome_organizzazione = "Centro sportivo";
	return drafts;
}

function request(type, profileType, detail) {
	return {profileType, anonymousProfile: null, announcement: {type, title: "Titolo personalizzato", detail: {descrizione_aggiuntiva: "Dettaglio aggiuntivo\nSecondo paragrafo", ...detail}, locations: type === "annuncio_squadra_cerca_sponsor" ? [] : locations, contacts: {email: "recap@example.test", phone: "+39 333 1234567", contactRole: "Segreteria"}, extras: {genericLink: "https://example.test/annuncio"}}};
}

function savedFixture(type, profileType, detail, drafts, overrides = {}) {
	const relations = {giocatore: "profilo_giocatore", squadra: "profilo_squadra", "staff-sportivo": "profilo_staff_sportivo", arbitro: "profilo_arbitro", "torneo-evento": "profilo_torneo_evento", "campi-impianti-sportivi": "profilo_campi_impianti", "servizi-consulenze": "profilo_servizi_consulenze", creators: "profilo_creator"};
	const payload = request(type, profileType, detail);
	const row = {uuid: id, autore_annuncio: profileId, titolo_annuncio: payload.announcement.title, tipologia_annuncio: type, stato_annuncio: "pubblicato", nascosto: false, privato: false, eliminato_il: null, creato_il: "2026-11-01", livello_annuncio: null, [type === "annuncio_creators" ? "annuncio_creator" : type]: payload.announcement.detail, localita_annuncio: payload.announcement.locations, contatto_annuncio: [{tipo: "email", valore: "recap@example.test", referente: "Segreteria"}]};
	const child = {id: 7, nascosto: false, ...drafts[profileType]};
	const profile = {uuid: profileId, uuid_utente: "local-user", nascosto: false, confermato_il: "2026-09-01", [relations[profileType]]: [child], localita_profilo: locations.map(location => ({...location, sottoprofilo: profileType, id_sottoprofilo: 7}))};
	const calls = [];
	const client = {from(table) {
		const call = {table, operations: []}; calls.push(call);
		const query = {};
		for (const method of ["select", "eq", "neq", "in", "not", "is", "or", "like", "order", "limit", "range", "maybeSingle"]) query[method] = (...args) => {call.operations.push([method, ...args]); return query;};
		query.then = (resolve, reject) => {
			const single = call.operations.some(([method]) => method === "maybeSingle");
			let data = table === "annuncio" ? call.operations.some(([method]) => method === "neq") ? [] : [row]
				: table === "profilo" ? [profile].filter(candidate => call.operations.every(([method, key, value]) => {
					if (key !== "uuid_utente") return true;
					if (method === "is") return candidate.uuid_utente === value;
					if (method === "not") return candidate.uuid_utente !== null;
					return true;
				})) : table === "profilo_giocatore" ? [drafts.giocatore] : table === "localita_profilo" ? profile.localita_profilo : table === "contatto_annuncio" ? row.contatto_annuncio : [];
			if (single) data = data[0] ?? null;
			return Promise.resolve({data, error: null, count: 0}).then(resolve, reject);
		};
		return query;
	}};
	const load = sourceLoader({"@/lib/supabase/admin": {createAdminClient: () => client}, "@/lib/supabase/server": {createClient: async () => client}, "@/features/profilo/server/profile-images": {loadProfileImageUrlMap: async () => new Map()}, "@/features/profilo/server/public-team-profiles": {loadPublicTeamProfiles: async () => []}, ...overrides});
	return {load, payload, calls, row, profile, client};
}

test("all eleven summaries retain current form fields and public profile information across draft, confirmation and detail", async () => {
	const baseLoad = sourceLoader(), drafts = setupDrafts(baseLoad);
	for (const [type, profileType, detail, expected] of cases) {
		const {load, payload} = savedFixture(type, profileType, detail, drafts);
		const {buildPublishPreview} = load("apps/web/src/features/pubblica-annuncio/announcement-preview.ts");
		const Card = load("apps/web/src/features/pubblica-annuncio/components/AnnouncementPreviewCard.tsx").default;
		const draft = buildPublishPreview(payload, drafts, null, null, locations);
		const confirmation = await load("apps/web/src/features/pubblica-annuncio/server/confirmation.ts").loadPublishConfirmation(id);
		assert.equal(confirmation.status, "ok", type);
		const result = await load("apps/web/src/features/annunci/server/queries.ts").loadPublicAnnouncementDetail(id);
		assert.equal(result.status, "success", type);
		const {announcementDetailPreview} = load("apps/web/src/features/annunci/components/details/AnnouncementDetailsRecap.tsx");
		const publicPreview = announcementDetailPreview(result.announcement);
		assert.deepEqual(draft.summarySections, confirmation.preview.summarySections, `${type}: draft/confirmation`);
		assert.deepEqual(draft.summarySections, publicPreview.summarySections, `${type}: draft/public`);
		for (const preview of [draft, confirmation.preview, publicPreview]) {
			assert.equal(preview.title, "Titolo personalizzato");
			const html = renderToStaticMarkup(React.createElement(Card, {preview}));
			for (const value of expected) assert.ok(html.includes(value), `${type}: missing ${value}`);
			const ids = [...html.matchAll(/data-summary-field="([^"]+)"/g)].map(match => match[1]);
			assert.equal(new Set(ids).size, ids.length, `${type}: duplicate field`);
			assert.doesNotMatch(html, /giorno_nascita|mese_nascita|01\/01\/2000|posti-limitati|disponibile-subito|non-specificare/);
		}
		assert.deepEqual(publicPreview.contacts, []);
		assert.ok(confirmation.preview.contacts.includes("recap@example.test (Segreteria)"));
	}
});

test("default titles match public details for every type and both registered and anonymous publishers", async () => {
	const drafts = setupDrafts(sourceLoader());
	for (const [type, profileType, detail] of cases) for (const anonymous of [false, true]) {
		const fixture = savedFixture(type, profileType, detail, drafts);
		fixture.row.titolo_annuncio = fixture.payload.announcement.title = "";
		if (anonymous) {
			fixture.profile.uuid_utente = null;
			fixture.payload.anonymousProfile = {type: profileType, draft: drafts[profileType], locations};
		}
		const draft = fixture.load("apps/web/src/features/pubblica-annuncio/announcement-preview.ts").buildPublishPreview(fixture.payload, drafts, null, null, locations);
		const confirmation = await fixture.load("apps/web/src/features/pubblica-annuncio/server/confirmation.ts").loadPublishConfirmation(id);
		const detailResult = await fixture.load("apps/web/src/features/annunci/server/queries.ts").loadPublicAnnouncementDetail(id);
		assert.equal(confirmation.status, "ok"); assert.equal(detailResult.status, "success");
		assert.equal(draft.title, detailResult.announcement.title, `${type} anonymous=${anonymous}: draft`);
		assert.equal(confirmation.preview.title, detailResult.announcement.title, `${type} anonymous=${anonymous}: confirmation`);
	}
});

test("locations distinguish selected cities from whole regions and tolerate duplicate or mixed legacy rows", () => {
	const load = sourceLoader();
	const {summaryLocationGroups} = load("apps/web/src/features/annunci/announcement-summary.ts");
	const groups = summaryLocationGroups([{region: "Lazio", city: null}, {region: "Lazio", city: "Roma"}, {region: "Lazio", city: " roma "}, {region: "Lazio", city: "Viterbo"}, {region: "Toscana", city: null}]);
	assert.equal(groups[0].cities.length, 2);
	assert.equal(groups[0].hasWholeRegion, false);
	assert.equal(groups[1].hasWholeRegion, true);
	const Value = load("apps/web/src/features/annunci/components/details/AnnouncementSummaryValue.tsx").default;
	const html = renderToStaticMarkup(React.createElement(Value, {section: {locations: groups.flatMap(group => group.cities.length ? group.cities.map(city => ({region: group.region, city})) : [{region: group.region, city: null}])}}));
	assert.match(html, /Lazio:<\/span> [Rr]oma, Viterbo/);
	assert.doesNotMatch(html, /Lazio:<\/span> tutta la regione/);
	assert.match(html, /Toscana:<\/span> tutta la regione/);
});

test("staff summary retains announcement snapshots after the live profile changes", async () => {
	const drafts = setupDrafts(sourceLoader());
	const fixture = savedFixture(...cases[5].slice(0, 3), drafts);
	fixture.profile.profilo_staff_sportivo[0].figure_professionali = ["Direttore sportivo"];
	fixture.profile.profilo_staff_sportivo[0].disponibilita = "sotto-contratto";
	const confirmation = await fixture.load("apps/web/src/features/pubblica-annuncio/server/confirmation.ts").loadPublishConfirmation(id);
	const result = await fixture.load("apps/web/src/features/annunci/server/queries.ts").loadPublicAnnouncementDetail(id);
	for (const sections of [confirmation.preview.summarySections, result.announcement.summarySections]) {
		assert.deepEqual(sections.find(item => item.id === "figures").items, ["Allenatore"]);
		assert.equal(sections.find(item => item.id === "availability").value, "Disponibile subito");
		assert.ok(sections.find(item => item.id === "experience").presentation.rows.length > 0);
	}
});

test("optional empty values stay hidden, false and zero stay visible and equal texts keep their own labels", () => {
	const load = sourceLoader(), drafts = setupDrafts(load);
	const {buildPublishPreview} = load("apps/web/src/features/pubblica-annuncio/announcement-preview.ts");
	const Card = load("apps/web/src/features/pubblica-annuncio/components/AnnouncementPreviewCard.tsx").default;
	const payload = request("annuncio_squadra_cerca_staff", "squadra", {figure_ricercate: ["Allenatore"], requisiti: "Stesso testo", descrizione_aggiuntiva: "Stesso testo", compenso_mensile: 0, settore: "", stagione: ""});
	const preview = buildPublishPreview(payload, drafts, null, null, locations);
	const html = renderToStaticMarkup(React.createElement(Card, {preview}));
	assert.equal((html.match(/Stesso testo/g) ?? []).length, 2);
	assert.match(html, /Requisiti/); assert.match(html, /Informazioni aggiuntive/);
	assert.doesNotMatch(html, /data-summary-field="(?:team-group|season|birth-years)"/);
	assert.match(html, /0,00/);
	const staff = buildPublishPreview(request("annuncio_staff_sportivo", "staff-sportivo", cases[5][2]), drafts, null, null, locations);
	assert.equal(staff.summarySections.find(field => field.id === "remote").value, "No");
	const profile = load("apps/web/src/features/annunci/announcement-summary-profile.ts").projectAnnouncementSummaryProfile("giocatore", drafts.giocatore, []);
	assert.deepEqual(Object.keys(profile).filter(key => /giorno|mese|nome|cognome|uuid/.test(key)), []);
});

test("public details retain the hidden Overview, show the shared summary and leave contact gating in the sidebar", async () => {
	const baseLoad = sourceLoader(), drafts = setupDrafts(baseLoad);
	const overrides = {
		"@/features/interessi/ProfileInterestDialog": {__esModule: true, default: ({children}) => children},
		"@/features/interazioni/DetailActions": {__esModule: true, default: () => null},
		"./AnnouncementAuthorCard": {__esModule: true, default: () => React.createElement("div", null, "Profilo autore")},
	};
	const {load} = savedFixture(...cases[0].slice(0, 3), drafts, overrides);
	const result = await load("apps/web/src/features/annunci/server/queries.ts").loadPublicAnnouncementDetail(id);
	const Layout = load("apps/web/src/features/annunci/components/details/AnnouncementDetailsLayout.tsx").default;
	for (const authenticated of [true, false]) {
		const html = renderToStaticMarkup(React.createElement(Layout, {announcement: result.announcement, authenticated, returnTo: `/dettagli-annuncio?id=${id}`}));
		assert.match(html, /<div hidden=""><section aria-label="Dettagli dell’annuncio"/);
		assert.equal((html.match(/announcement-preview-card/g) ?? []).length, 1);
		const cardEnd = html.indexOf('<aside aria-label="Profilo autore, contatti e sponsor"');
		assert.ok(cardEnd > html.indexOf("announcement-preview-card"));
		assert.doesNotMatch(html.slice(0, cardEnd), /recap@example.test|mailto:/);
		assert.equal(html.includes("mailto:recap@example.test"), authenticated);
		assert.match(html, /Contatta/);
		assert.match(html, /Annunci simili/);
	}
});

test("leaving the city field commits the city before confirmation without duplicating plus, Enter or comma additions", () => {
	let active;
	const hooks = {...React, useId: () => "local-id", useEffect: effect => effect(), useRef(initial) {const index = active.cursor++; return active.slots[index] ??= {current: initial};}, useState(initial) {const state = active, index = state.cursor++; if (!(index in state.slots)) state.slots[index] = initial; return [state.slots[index], value => {state.slots[index] = typeof value === "function" ? value(state.slots[index]) : value;}];}};
	const load = sourceLoader({react: hooks}), Parent = load("apps/web/src/features/profilo/ProfileLocationsField.tsx").default;
	const parentState = {cursor: 0, slots: []}, childState = {cursor: 0, slots: []};
	let value = [{regione: "Lazio", citta: null}];
	const find = (tree, predicate) => {
		if (!tree || typeof tree !== "object") return null;
		if (predicate(tree)) return tree;
		for (const child of React.Children.toArray(tree.props?.children)) {const result = find(child, predicate); if (result) return result;}
		return null;
	};
	const cityField = () => {
		active = parentState; active.cursor = 0;
		const parent = Parent({idPrefix: "zones", value, onValueChange: next => {value = next;}});
		active = childState; active.cursor = 0;
		const child = parent.type(parent.props);
		const regionCard = find(child, node => node.type?.name === "RegioneCittaCard");
		return find(regionCard.type(regionCard.props), node => node.props?.id === "zones-citta-Lazio");
	};
	cityField().props.onChange({target: {value: " Roma "}});
	const input = cityField();
	input.props.onBlur();
	input.props.onBlur(); // A plus click after blur is idempotent too.
	assert.deepEqual(value, [{regione: "Lazio", citta: "Roma"}]);
	for (const [city, key] of [["Viterbo", "Enter"], ["Latina", ","]]) {
		cityField().props.onChange({target: {value: city}});
		cityField().props.onKeyDown({key, preventDefault() {}});
	}
	assert.deepEqual(value.map(row => row.citta), ["Roma", "Viterbo", "Latina"]);
	const drafts = setupDrafts(load), payload = request(...cases[0].slice(0, 3));
	payload.announcement.locations = value;
	const preview = load("apps/web/src/features/pubblica-annuncio/announcement-preview.ts").buildPublishPreview(payload, drafts, null, null, []);
	assert.deepEqual(preview.locations.map(row => row.city), ["Roma", "Viterbo", "Latina"]);
	assert.ok(preview.locations.every(row => row.city !== null));
});

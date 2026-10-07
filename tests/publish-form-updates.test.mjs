import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {test} from "node:test";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
function sourceLoader(overrides = {}) {
	const cache = new Map();
	function load(file) {
		if (cache.has(file)) return cache.get(file).exports;
		const loaded = {exports: {}};
		cache.set(file, loaded);
		const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}});
		new Function("require", "module", "exports", outputText)((specifier) => {
			if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
			if (specifier === "server-only") return {};
			if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
			const base = specifier.startsWith("@/") ? path.join(root, "src", specifier.slice(2)) : path.resolve(path.dirname(file), specifier);
			return load([base, `${base}.ts`, `${base}.tsx`].find(candidate => existsSync(candidate)));
		}, loaded, loaded.exports);
		return loaded.exports;
	}
	return relative => load(path.join(root, relative));
}

const load = sourceLoader();
const model = load("src/features/pubblica-annuncio/publish-model.ts");
const {parsePublishPayload} = load("src/features/pubblica-annuncio/server/validation.ts");
const {announcementContent} = load("src/features/annunci/announcement-content.ts");

function payload(type, teamSubtype, detail) {
	return {version: model.PUBLISH_PAYLOAD_VERSION, submissionId: "11111111-1111-4111-8111-111111111111", visibility: "gratuito", profileType: type, teamSubtype, anonymousProfile: null, profileUpdate: null, announcement: {
		type: model.getDatabaseAnnouncementType(type, teamSubtype), title: "", detail, locations: [{regione: "Lazio", citta: null}], contacts: {email: "", phone: ""}, extras: {genericLink: ""},
	}, consents: {dataConfirmed: true, termsAccepted: true, privacyAccepted: true, newsletterSubscribed: false}};
}

test("opponent free text and optional team group survive draft serialization and server normalization", () => {
	const drafts = model.createAnnouncementDetailsDrafts();
	drafts.squadraCercaPartita.gruppo_squadra = "  Allievi  ";
	drafts.squadraCercaPartita.categorie_avversario = " Categoria fuori catalogo ";
	const detail = model.getAnnouncementDetail("squadra", "cerca-partite-amichevoli", drafts);
	assert.deepEqual(detail.categorie_avversario, ["Categoria fuori catalogo"]);
	const request = payload("squadra", "cerca-partite-amichevoli", detail);
	const normalized = parsePublishPayload(request, true);
	assert.deepEqual(normalized.detail.categorie_avversario, ["Categoria fuori catalogo"]);
	assert.equal(normalized.detail.gruppo_squadra, "Allievi");
	assert.equal(detail.gruppo_squadra, "  Allievi  ", "normalization must not mutate the submitted detail");
	for (const value of [["Prima", "Seconda"], [], [" "], ["x".repeat(161)]]) {
		assert.throws(() => parsePublishPayload({...request, announcement: {...request.announcement, detail: {...detail, categorie_avversario: value}}}, true));
	}
	const errors = model.getAnnouncementValidationErrors("squadra", "cerca-partite-amichevoli", {...drafts, squadraCercaPartita: {...drafts.squadraCercaPartita, categorie_avversario: " "}}, request.announcement.locations, request.announcement.contacts, undefined, "", true);
	assert.match(errors.matchCategories, /categoria avversario/);
});

test("money fields accept zero and typed cents, rejecting negatives and excess precision", () => {
	const drafts = model.createAnnouncementDetailsDrafts();
	for (const amount of ["", "0", "12,50", "12.50", "105"]) {
		drafts.squadraCercaStaff = {...drafts.squadraCercaStaff, figure_ricercate: ["Allenatore"], requisiti: "Esperienza", compenso_mensile: amount};
		const normalized = parsePublishPayload(payload("squadra", "cerca-staff", drafts.squadraCercaStaff), true);
		assert.equal(normalized.detail.compenso_mensile, amount ? Number(amount.replace(",", ".")) : null);
	}
	for (const amount of ["-1", "12.501", "100000000"]) {
		assert.throws(() => parsePublishPayload(payload("squadra", "cerca-staff", {...drafts.squadraCercaStaff, compenso_mensile: amount}), true));
	}
});

test("public supporting fields expose team groups, content and promotion with the new labels", () => {
	for (const type of ["annuncio_squadra_cerca_giocatore", "annuncio_squadra_cerca_partita"]) {
		const content = announcementContent(type, {gruppo_squadra: "Juniores", categorie_avversario: ["Categoria libera"]}, [], true);
		assert.equal(content.fields.find(({label}) => label === "Gruppo squadra").value, "Juniores");
	}
	const services = announcementContent("annuncio_servizi_consulenze", {presentazione_servizi: "Il contenuto", descrizione_aggiuntiva: "L’offerta"}, [], true);
	assert.equal(services.description, "Il contenuto");
	assert.equal(services.fields.find(({label}) => label === "Promozione/offerta per la Community").value, "L’offerta");
	const oldMatch = announcementContent("annuncio_squadra_cerca_partita", {categorie_avversario: ["Calcio 11 (Maschile)::Eccellenza", "Categoria libera"]}, [], true);
	assert.deepEqual(oldMatch.fields[0].items, ["Calcio 11 (Maschile) · Eccellenza", "Categoria libera"]);
	assert.equal(announcementContent("annuncio_squadra_cerca_partita", {categorie_avversario: ["Serie C"]}, [], true).fields[0].value, "Serie C");
});

test("rendered fields use the requested labels, empty placeholders, monetary controls and restricted regions", () => {
	const Details = load("src/features/pubblica-annuncio/components/AnnouncementDetailsForm.tsx").default;
	const props = {registered: true, showMinorContactNotice: false, teamSubtype: null, announcementTitle: "", onAnnouncementTitleChange() {}, drafts: model.createAnnouncementDetailsDrafts(), onDraftsChange() {}, locations: [], onLocationsChange() {}, contacts: {email: "", phone: ""}, onContactsChange() {}, extras: {genericLink: ""}, onExtrasChange() {}, image: null, onImageChange() {}};
	const render = (profileType, extra = {}) => renderToStaticMarkup(React.createElement(Details, {...props, profileType, ...extra}));
	for (const subtype of ["cerca-staff", "cerca-giocatore", "cerca-partite-amichevoli"]) {
		const html = render("squadra", {teamSubtype: subtype});
		assert.match(html, /Gruppo squadra/);
		assert.match(html, /placeholder="Prima squadra, Allievi, Juniores, U15…"/);
		if (subtype === "cerca-partite-amichevoli") assert.match(html, /placeholder="Inserisci la categoria"/);
		if (subtype === "cerca-staff") {assert.match(html, />€</); assert.match(html, /step="5"/);}
	}
	const services = render("servizi-consulenze", {allowedRegions: ["Lombardia", "Campania"]});
	assert.match(services, /Promozione\/offerta per la Community/);
	assert.doesNotMatch(services, /id="service-(?:presentation|description)"[^>]*placeholder=/);
	assert.match(services, /aria-label="Lombardia"/);
	assert.match(services, /aria-label="Campania"/);
	assert.doesNotMatch(services, /aria-label="Lazio"/);
	const creators = render("creators");
	assert.match(creators, /Contenuto dell’annuncio/);
	assert.doesNotMatch(creators, /id="creator-announcement-description"[^>]*placeholder=/);
	const tournament = render("torneo-evento");
	assert.match(tournament, /Zona\/e di svolgimento per questo torneo/);
	assert.match(tournament, /step="5"/);
	assert.match(tournament, />€</);
});

// Invoke the actual wizard event handlers with deterministic React hook state.
// Child components are markers: assertions inspect their real controlled props.
function wizardHarness() {
	let active;
	const hooks = {
		...React,
		useState(initial) {
			const index = active.cursor++;
			const session = active;
			if (!(index in session.slots)) session.slots[index] = typeof initial === "function" ? initial() : initial;
			return [session.slots[index], value => {session.slots[index] = typeof value === "function" ? value(session.slots[index]) : value;}];
		},
		useRef(initial) {
			const index = active.cursor++;
			return active.slots[index] ??= {current: initial};
		},
		useMemo(factory) {return factory();},
		useEffect() {},
		useLayoutEffect(effect) {
			const index = active.cursor++;
			if (!(index in active.slots)) active.slots[index] = effect();
		},
	};
	const marker = () => null;
	const ProfileStep = () => null;
	const Details = () => null;
	const Selector = () => null;
	const Confirmation = () => null;
	const wizardLoader = sourceLoader({react: hooks,
		"@/features/pubblica-annuncio/components/AnnouncementDetailsForm": {default: Details, __esModule: true},
		"@/features/pubblica-annuncio/components/PublishProfileStep": {default: ProfileStep, __esModule: true},
		"@/features/pubblica-annuncio/components/SelezionaTipologiaAnnuncio": {default: Selector, __esModule: true},
		"@/features/pubblica-annuncio/components/ConfermaInvioAnnuncio": {default: Confirmation, __esModule: true},
		"@/components/ui/tooltip": {Tooltip: marker, TooltipContent: marker, TooltipTrigger: marker},
	});
	const Wrapper = wizardLoader("src/features/pubblica-annuncio/PubblicaAnnuncio.tsx").default;
	const session = (component, props) => {
		const state = {slots: [], cursor: 0};
		return {state, render() {active = state; active.cursor = 0; return component(props);}};
	};
	const find = (tree, type) => {
		if (!tree || typeof tree !== "object") return null;
		if (tree.type === type) return tree;
		for (const child of React.Children.toArray(tree.props?.children)) {
			const found = find(child, type);
			if (found) return found;
		}
		return null;
	};
	return {Wrapper, session, find, ProfileStep, Details, Selector, Confirmation};
}

test("changing profile or team subtype discards unsaved social and announcement data while step changes preserve them", () => {
	const events = new Map();
	const previousWindow = globalThis.window;
	globalThis.window = {addEventListener: (event, handler) => events.set(event, handler), removeEventListener: event => events.delete(event), scrollTo() {}};
	try {
		const harness = wizardHarness();
		const profileLoader = sourceLoader();
		const {createProfileDrafts, createProfileLocations} = profileLoader("src/features/profilo/profile-model.ts");
		const {createProfileSocialLinks} = profileLoader("src/features/profilo/profile-social-links.ts");
		const context = {profileId: "saved-profile", enabledProfileTypes: ["squadra", "creators", "servizi-consulenze"], authorizedRestrictedProfileTypes: ["creators", "servizi-consulenze"], drafts: createProfileDrafts(), locations: createProfileLocations(), socialLinks: createProfileSocialLinks()};
		context.socialLinks.squadra.instagram = "saved-team";
		context.locations["servizi-consulenze"] = [{regione: "Lombardia", citta: null}, {regione: "Campania", citta: null}];
		const wrapper = harness.session(harness.Wrapper, {registered: true, authenticated: true, initialEmail: "saved@example.com", profileContext: context});
		const element = wrapper.render();
		const form = harness.session(element.type, element.props);
		const component = type => harness.find(form.render(), type);
		component(harness.Selector).props.onTipologiaChangeAction("squadra");
		component(harness.Selector).props.onSottotipologiaChangeAction("cerca-giocatore");
		component(harness.ProfileStep).props.onSocialLinksChange("instagram", "unsaved-team");
		component(harness.Details).props.onAnnouncementTitleChange("Bozza");
		component(harness.Details).props.onExtrasChange({genericLink: "https://example.com"});
		component(harness.Selector).props.onContinueAction();
		assert.equal(component(harness.ProfileStep).props.socialLinks.instagram, "unsaved-team");
		assert.equal(component(harness.Details).props.announcementTitle, "Bozza");
		const oldKey = component(harness.ProfileStep).key;
		component(harness.Selector).props.onSottotipologiaChangeAction("cerca-staff");
		assert.equal(component(harness.ProfileStep).props.socialLinks.instagram, "saved-team");
		assert.equal(component(harness.Details).props.announcementTitle, "");
		assert.equal(component(harness.Details).props.extras.genericLink, "");
		assert.notEqual(component(harness.ProfileStep).key, oldKey);
		component(harness.ProfileStep).props.onSocialLinksChange("instagram", "another-draft");
		component(harness.Selector).props.onTipologiaChangeAction("creators");
		component(harness.Selector).props.onTipologiaChangeAction("squadra");
		assert.equal(component(harness.ProfileStep).props.socialLinks.instagram, "saved-team");
		component(harness.Selector).props.onTipologiaChangeAction("servizi-consulenze");
		assert.deepEqual(component(harness.Details).props.allowedRegions, ["Lombardia", "Campania"]);
		component(harness.Details).props.onLocationsChange([{regione: "Lombardia", citta: null}, {regione: "Campania", citta: null}]);
		component(harness.ProfileStep).props.onLocationsChange("servizi-consulenze", [{regione: "Campania", citta: null}]);
		assert.deepEqual(component(harness.Details).props.locations, [{regione: "Campania", citta: null}]);
		assert.deepEqual(context.locations["servizi-consulenze"].map(({regione}) => regione), ["Lombardia", "Campania"], "discarding changes never mutates saved context");
		events.get("pageshow")({persisted: true});
		assert.notEqual(wrapper.render().key, element.key, "browser cache restore remounts the whole wizard");
		const restoredKey = wrapper.render().key;
		wrapper.state.slots[1]();
		assert.notEqual(wrapper.render().key, restoredKey, "cached route cleanup resets the next visit");
	} finally {
		globalThis.window = previousWindow;
	}
});

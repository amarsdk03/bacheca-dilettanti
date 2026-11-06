import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {test} from "node:test";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
function sourceLoader(overrides = {}) {
	const cache = new Map();
	function load(file) {
		if (cache.has(file)) return cache.get(file).exports;
		const mod = {exports: {}};
		cache.set(file, mod);
		const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true}});
		new Function("require", "module", "exports", outputText)(name => {
			if (Object.hasOwn(overrides, name)) return overrides[name];
			if (name === "server-only") return {};
			if (!name.startsWith("@/") && !name.startsWith(".")) return require(name);
			const base = name.startsWith("@/") ? path.join(root, "apps/web/src", name.slice(2)) : path.resolve(path.dirname(file), name);
			return load([base, `${base}.ts`, `${base}.tsx`].find(existsSync));
		}, mod, mod.exports);
		return mod.exports;
	}
	return relative => load(path.join(root, relative));
}

test("homepage totals count only public listings and aggregate all four team searches", async () => {
	const teamTypes = ["giocatore", "staff", "partita", "sponsor"].map(type => `annuncio_squadra_cerca_${type}`);
	const visible = type => ({tipologia_annuncio: type, stato_annuncio: "pubblicato", nascosto: false, privato: false, eliminato_il: null});
	const rows = [visible("annuncio_giocatore"), ...teamTypes.map(visible), visible("annuncio_torneo_evento"),
		{...visible("annuncio_giocatore"), nascosto: true}, {...visible("annuncio_giocatore"), privato: true},
		{...visible("annuncio_giocatore"), eliminato_il: "2026-01-01"}, {...visible("annuncio_giocatore"), stato_annuncio: "in_revisione"}];
	let failType;
	const load = sourceLoader({"@/lib/supabase/admin": {createAdminClient: () => ({from(table) {
		assert.equal(table, "annuncio");
		let matches = rows;
		let selectedTypes;
		return {select(columns, options) {assert.equal(columns, "uuid"); assert.deepEqual(options, {count: "exact", head: true}); return this;},
			in(key, values) {selectedTypes = values; matches = matches.filter(row => values.includes(row[key])); return this;},
			eq(key, value) {matches = matches.filter(row => row[key] === value); return this;},
			is(key, value) {matches = matches.filter(row => row[key] === value); return this;},
			then(resolve) {return Promise.resolve(selectedTypes.includes(failType) ? {count: null, error: {message: "synthetic"}} : {count: matches.length, error: null}).then(resolve);}};
	}})}});
	const {loadHomepageAnnouncementCounts} = load("apps/web/src/features/homepage/server/announcement-counts.ts");
	assert.deepEqual(await loadHomepageAnnouncementCounts(), {giocatore: 1, squadra: 4, "staff-sportivo": 0, "torneo-evento": 1});
	failType = "annuncio_giocatore";
	assert.deepEqual(await loadHomepageAnnouncementCounts(), {giocatore: null, squadra: 4, "staff-sportivo": 0, "torneo-evento": 1});
});

test("homepage cards distinguish zero from unavailable and link exactly four types to announcements", () => {
	const load = sourceLoader({"@/lib/supabase/admin": {createAdminClient() {throw Error("not used");}}});
	const {LiveAnnouncementCards} = load("apps/web/src/features/homepage/components/LiveAnnouncementCards.tsx");
	const html = renderToStaticMarkup(React.createElement(LiveAnnouncementCards, {counts: {giocatore: 1234, squadra: 4, "staff-sportivo": 0, "torneo-evento": null}}));
	assert.equal((html.match(/href="\/annunci\?type=/g) ?? []).length, 4);
	for (const type of ["giocatore", "squadra", "staff_sportivo", "torneo_evento"]) assert.match(html, new RegExp(`href="/annunci\\?type=annuncio_${type}"`));
	assert.match(html, /1\.234/);
	assert.match(html, /Conteggio non disponibile/);
	assert.match(html, />0</);
	assert.doesNotMatch(html, /annunci di arbitri|annunci di creators|\/profili\?/);
});

test("counter animates only in view and respects reduced motion", () => {
	for (const [inView, reduced, expected] of [[false, false, 0], [true, false, 1], [true, true, 0]]) {
		const effects = [], animations = [];
		const load = sourceLoader({react: {...React, useRef: () => ({current: null}), useEffect: effect => effects.push(effect)},
			"motion/react": {motion: {span: "span"}, useInView: (_ref, options) => {assert.equal(options.once, true); return inView;}, useReducedMotion: () => reduced,
				useMotionValue: value => ({get: () => value}), useTransform: fn => fn(), animate: (_value, frames) => {animations.push(frames); return {stop() {}};}}});
		const Counter = load("apps/web/src/features/homepage/components/AnnouncementCounter.tsx").default;
		const html = renderToStaticMarkup(React.createElement(Counter, {value: 1500}));
		effects.forEach(effect => effect());
		assert.equal(animations.length, expected);
		if (expected) assert.deepEqual(animations[0], [0, 1500]);
		assert.match(html, /class="sr-only">1\.500/);
		assert.match(html, /aria-hidden="true"/);
	}
});

test("region survives no type or multiple types, URL rebuilding and pagination in both directories", () => {
	const load = sourceLoader();
	for (const [module, parse, build, types] of [
		["annunci/announcement-model", "parseAnnouncementDirectoryQuery", "buildAnnouncementsHref", ["annuncio_giocatore", "annuncio_squadra"]],
		["profili/profile-directory-model", "parseProfileDirectoryQuery", "buildProfilesHref", ["giocatore", "squadra"]],
	]) {
		const api = load(`apps/web/src/features/${module}.ts`);
		for (const type of [undefined, [types[0]], types]) {
			const query = api[parse]({type, regione: "Lazio", q: "test", page: "2"});
			assert.deepEqual(query.filters.regione, ["Lazio"]);
			assert.match(api[build](query, {page: 3}), /regione=Lazio/);
			assert.match(api[build](query, {page: 3}), /page=3/);
		}
		assert.deepEqual(api[parse]({regione: "not a region"}).filters.regione, []);
		const multiple = api[parse]({regione: ["Lazio", "Toscana", "Lazio", "invalid"]});
		assert.deepEqual(multiple.filters.regione, ["Lazio", "Toscana"]);
		assert.deepEqual(new URL(api[build](multiple, {page: 3}), "http://localhost").searchParams.getAll("regione"), ["Lazio", "Toscana"]);
	}
});

function findElement(tree, predicate) {
	if (!tree || typeof tree !== "object") return null;
	if (predicate(tree)) return tree;
	for (const child of React.Children.toArray(tree.props?.children)) {
		const found = findElement(child, predicate);
		if (found) return found;
	}
	return null;
}

test("both directories expose a separate region panel with generic and multiple types", () => {
	const load = sourceLoader();
	for (const [folder, componentName, parseName, modelFile, types] of [
		["annunci", "Annunci", "parseAnnouncementDirectoryQuery", "announcement-model", ["annuncio_giocatore", "annuncio_squadra_cerca_staff"]],
		["profili", "Profili", "parseProfileDirectoryQuery", "profile-directory-model", ["giocatore", "squadra"]],
	]) {
		const Page = load(`apps/web/src/features/${folder}/${componentName}.tsx`).default;
		const parse = load(`apps/web/src/features/${folder}/${modelFile}.ts`)[parseName];
		for (const type of [undefined, types]) {
			const tree = Page({query: parse({type, regione: ["Lazio", "Toscana"]}), result: Promise.resolve({})});
			const search = findElement(tree, node => node.type?.name?.endsWith("Search"));
			const toolbar = search.type(search.props);
			const regions = findElement(toolbar, node => node.type?.name === "DirectoryRegionFilter");
			assert.deepEqual(regions.props.selected, ["Lazio", "Toscana"]);
			const sheet = findElement(toolbar, node => node.type?.name?.endsWith("FiltersSheet"));
			const form = findElement(sheet.type(sheet.props), node => node.type?.name?.endsWith("FiltersForm"));
			assert.equal(form, null, "generic filters no longer contain the region selector");
		}
	}
});

test("changing either directory type keeps region and search while resetting pagination", () => {
	for (const [folder, component, current, next] of [
		["annunci", "AnnouncementTypeSelector", "annuncio_giocatore", ["annuncio_giocatore", "annuncio_squadra_cerca_staff"]],
		["profili", "ProfileTypeSelector", "giocatore", ["giocatore", "squadra"]],
	]) {
		let pushed;
		const load = sourceLoader({react: {...React, useOptimistic: value => [value, () => {}], useTransition: () => [false, callback => callback()]},
			"next/navigation": {usePathname: () => `/${folder}`, useSearchParams: () => new URLSearchParams([["q", "test"], ["regione", "Lazio"], ["regione", "Toscana"], ["page", "3"]]), useRouter: () => ({push: href => {pushed = href;}})}});
		const Selector = load(`apps/web/src/features/${folder}/${component}.tsx`).default;
		const group = findElement(Selector({selectedTypes: [current]}), node => typeof node.props?.onValueChange === "function");
		assert.ok(group);
		group.props.onValueChange(next);
		const url = new URL(pushed, "http://localhost");
		assert.deepEqual(url.searchParams.getAll("regione"), ["Lazio", "Toscana"]);
		assert.equal(url.searchParams.get("q"), "test");
		assert.equal(url.searchParams.get("page"), null);
		assert.deepEqual(url.searchParams.getAll("type"), next);
	}
});

test("announcement contacts offer the existing interest trigger only when contacts are absent", () => {
	const load = sourceLoader({"@/features/interessi/InterestDialog": {InterestDialogTrigger: () => React.createElement("button", null, "Manifesta interesse")}});
	const Contacts = load("apps/web/src/features/annunci/components/details/AnnouncementDetailsContacts.tsx").default;
	const render = props => renderToStaticMarkup(React.createElement(Contacts, {contacts: [], unavailable: false, authenticated: true, returnTo: "/dettagli-annuncio?id=test", ...props}));
	assert.match(render(), /Manifesta interesse/);
	assert.match(render({authenticated: false}), /Manifesta interesse/);
	assert.doesNotMatch(render({unavailable: true}), /Manifesta interesse/);
	assert.match(render({unavailable: true}), /Contatti temporaneamente non disponibili/);
	const contacts = [{kind: "email", label: "Email", value: "test@example.com", href: "mailto:test@example.com"}];
	assert.doesNotMatch(render({contacts}), /Manifesta interesse/);
	assert.match(render({contacts}), /mailto:test@example.com/);
	assert.doesNotMatch(render({contacts, authenticated: false}), /mailto:|Manifesta interesse/);
});

test("announcement header and contacts share one dialog context and respect unavailable or unlisted targets", async () => {
	let lookups = 0, contextStatus = "guest", Trigger;
	const load = sourceLoader({
		"next/navigation": {useRouter: () => ({refresh() {}})},
		"./server/queries": {getInterestContext: async target => {lookups++; assert.deepEqual(target, {kind: "annuncio", id: "test"}); return {status: contextStatus};}},
		"./server/actions": {submitInterest() {throw Error("not used");}},
		"@/features/interazioni/DetailActions": {__esModule: true, default: ({shareOnly, managedInterest}) => {
			if (shareOnly) return null;
			assert.equal(managedInterest, true);
			return React.createElement(Trigger);
		}},
		"./AnnouncementDetailsHeader": {__esModule: true, default: ({actions}) => React.createElement("header", null, actions)},
		"./AnnouncementDetailsTabs": {__esModule: true, default: ({overview}) => overview},
		"./AnnouncementDetailsOverview": {__esModule: true, default: () => null},
		"./AnnouncementDetailsRecap": {__esModule: true, default: () => null},
		"./AnnouncementAuthorCard": {__esModule: true, default: () => null},
		"./AnnouncementSponsorCard": {__esModule: true, default: () => null},
		"./SimilarAnnouncements": {__esModule: true, default: () => null},
	});
	Trigger = load("apps/web/src/features/interessi/InterestDialog.tsx").InterestDialogTrigger;
	const Layout = load("apps/web/src/features/annunci/components/details/AnnouncementDetailsLayout.tsx").default;
	const announcement = {id: "test", profileType: "giocatore", isListed: true, moderationStatus: "pubblicato", contacts: [], contactsUnavailable: false};
	const props = {announcement, authenticated: false, returnTo: "/dettagli-annuncio?id=test"};
	const wrapper = Layout(props);
	const html = renderToStaticMarkup(await wrapper.type(wrapper.props));
	assert.equal(lookups, 1);
	assert.equal((html.match(/Manifesta interesse/g) ?? []).length, 2);
	contextStatus = "unavailable";
	const unavailableWrapper = Layout(props);
	assert.doesNotMatch(renderToStaticMarkup(await unavailableWrapper.type(unavailableWrapper.props)), /Manifesta interesse/);
	const before = lookups;
	const preview = renderToStaticMarkup(Layout({...props, announcement: {...announcement, isListed: false}}));
	assert.equal(lookups, before);
	assert.doesNotMatch(preview, /Manifesta interesse/);
});

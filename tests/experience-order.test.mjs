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



const load = sourceLoader();
const {sortExperiencesNewestFirst: sort} = load("apps/web/src/features/profilo/experience-order.ts");
const history = [
 {id: "undated", titolo: "Senza date"},
 {id: "old", titolo: "Vecchia", periodoDa: "2018", periodoA: "2020"},
 {id: "recent", titolo: "Recente", periodoDa: "2021", periodoA: "2024"},
 {id: "current", titolo: "Attuale", periodoDa: "2022", periodoA: "oggi", stato: "in-corso"},
];

test("experiences sort by ongoing, end, start and original position without mutation", () => {
 const entries = Object.freeze([
  ...history,
  {id: "tie-old", periodoDa: "2020", periodoA: "2024"},
  {id: "tie-new", periodoDa: "2021", periodoA: "2024"},
  {id: "start-only", periodoDa: "2023"},
  {id: "status-only", stato: "in-corso"},
  {id: "invalid", periodoDa: "not a date", periodoA: "unknown"},
 ]);
 assert.deepEqual(sort(entries).map(row => row.id), ["current", "status-only", "recent", "tie-new", "tie-old", "start-only", "old", "undated", "invalid"]);
 assert.equal(entries[0].id, "undated");
 assert.deepEqual(sort([null, "legacy", 42]), [null, "legacy", 42]);
});

test("seasons compare numerically including century rollover and missing ends", () => {
 const rows = [{id: "old", periodoA: "1998/99"}, {id: "new", periodoA: "2000/2001"}, {id: "roll", periodoA: "1999/00"}, {id: "start", periodoDa: "2024/25"}, {id: "invalid", periodoA: "2020/19"}];
 assert.deepEqual(sort(rows).map(row => row.id), ["start", "new", "roll", "old", "invalid"]);
});

test("profile timelines order normalized dates and retain links and badges", () => {
 const experiences = history.map(row => ({id: row.id, title: row.titolo, from: row.periodoDa ?? null, to: row.periodoA ?? null, status: row.stato ?? null, organization: null, description: null}));
 for (const [file, props] of [
  ["components/player/PlayerCareer", {entries: experiences}],
  ["components/ProfileExperienceHistory", {experiences}],
 ]) {
  const Component = load(`apps/web/src/features/dettagli-profilo/${file}.tsx`).default;
  const html = renderToStaticMarkup(React.createElement(Component, props));
  assert.ok(html.indexOf("Attuale") < html.indexOf("Recente"));
  assert.ok(html.indexOf("Recente") < html.indexOf("Vecchia"));
  assert.ok(html.indexOf("Vecchia") < html.indexOf("Senza date"));
  assert.equal(experiences[0].id, "undated");
 }
});

test("announcement histories and player summary projection share the chronology", () => {
 const {buildAnnouncementSectionPresentation} = load("apps/web/src/features/annunci/announcement-section-presentation.ts");
 for (const [id, field] of [["experience", "lista_esperienze"], ["qualifications", "qualifiche_licenze"]]) {
  const result = buildAnnouncementSectionPresentation({id}, {[field]: history});
  assert.deepEqual(result.rows.map(row => row.title), ["Attuale", "Recente", "Vecchia", "Senza date"]);
 }
 const {projectAnnouncementSummaryProfile} = load("apps/web/src/features/annunci/announcement-summary-profile.ts");
 assert.deepEqual(projectAnnouncementSummaryProfile("giocatore", {}, [], history).previousCareer.map(row => row.team), ["Attuale", "Recente", "Vecchia", "Senza date"]);
 assert.equal(history[0].id, "undated");
});

test("latest publication empty state offers the enlarged icon CTA only to the owner", () => {
 const Component = load("apps/web/src/features/dettagli-profilo/components/LatestProfileAnnouncements.tsx").default;
 for (const contentMode of [false, true]) {
  const render = isOwner => renderToStaticMarkup(React.createElement(Component, {announcements: [], announcementsUnavailable: false, isOwner, contentMode}));
  const html = render(true);
  assert.match(html, /href="\/pubblica-annuncio"/);
  assert.match(html, /min-h-11/);
  assert.match(html, /data-icon="inline-start"/);
  assert.doesNotMatch(render(false), /href="\/pubblica-annuncio"/);
 }
});

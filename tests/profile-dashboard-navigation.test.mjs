import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import ts from "typescript";

test("dashboard sections update history immediately and restore on back/forward", () => {
	const previousWindow = globalThis.window;
	const listeners = new Map();
	const entries = [new URL("http://localhost/il-tuo-profilo?sezione=impostazioni&password=aggiornata&extra=1#scheda")];
	let index = 0;
	let state = "impostazioni";
	let cleanup;
	const browser = {
		get location() {return entries[index];},
		addEventListener: (name, listener) => listeners.set(name, listener),
		removeEventListener: (name, listener) => {if (listeners.get(name) === listener) listeners.delete(name);},
		history: {pushState: (_state, _title, href) => {
			entries.splice(index + 1);
			entries.push(new URL(href, entries[index]));
			index++;
		}},
	};
	const mod = {exports: {}};
	const {outputText} = ts.transpileModule(readFileSync(new URL("../apps/web/src/features/profilo/useProfileDashboardSection.ts", import.meta.url), "utf8"), {
		compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
	});
	let mounted = false;
	new Function("require", "module", "exports", outputText)(name => {
		assert.equal(name, "react");
		return {
			useState: () => [state, value => {state = value;}],
			useEffect: effect => {if (!mounted) {cleanup = effect(); mounted = true;}},
		};
	}, mod, mod.exports);
	globalThis.window = browser;
	const render = () => mod.exports.useProfileDashboardSection("impostazioni");
	const move = delta => {index += delta; listeners.get("popstate")();};
	try {
		render()[1]("profilo");
		assert.equal(state, "profilo");
		assert.equal(browser.location.search, "?sezione=profilo&extra=1");
		assert.equal(browser.location.hash, "#scheda");
		render()[1]("salvati");
		assert.equal(state, "salvati");
		assert.equal(browser.location.searchParams.get("sezione"), "salvati");
		const length = entries.length;
		render()[1]("salvati");
		render()[1]("invalid");
		render()[1](null);
		assert.equal(entries.length, length);
		move(-1);
		assert.equal(state, "profilo");
		move(-1);
		assert.equal(state, "impostazioni");
		move(1);
		assert.equal(state, "profilo");
		move(1);
		assert.equal(state, "salvati");
		for (const search of ["?sezione=unknown", ""]) {
			entries[index] = new URL(`http://localhost/il-tuo-profilo${search}`);
			listeners.get("popstate")();
			assert.equal(state, "profilo");
		}
	} finally {
		cleanup?.();
		assert.equal(listeners.size, 0);
		if (previousWindow === undefined) delete globalThis.window;
		else globalThis.window = previousWindow;
	}
});

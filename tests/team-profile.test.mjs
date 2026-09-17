import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "src/features/profilo/team-profile.ts");
const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {
	compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
	fileName: file,
});
const loadedModule = {exports: {}};
new Function("module", "exports", outputText)(loadedModule, loadedModule.exports);

const {
	experienceTeamReferences,
	normalizeTeamSearchQuery,
	teamProfileHref,
} = loadedModule.exports;

const teamId = "123e4567-e89b-42d3-a456-426614174000";

test("legacy free-text experiences remain unlinked", () => {
	assert.deepEqual(experienceTeamReferences([{titolo: "Allenatore", ente: "ASD Storica"}]), []);
	assert.deepEqual(experienceTeamReferences([{titolo: "ASD Storica", ente: "Eccellenza"}], "titolo"), []);
});

test("linked experiences preserve the correct team snapshot for each profile type", () => {
	const experience = {titolo: "ASD Giocatori", ente: "ASD Staff", squadraProfiloId: teamId};
	assert.deepEqual(experienceTeamReferences([experience]), [{profileId: teamId, name: "ASD Staff"}]);
	assert.deepEqual(experienceTeamReferences([experience], "titolo"), [{profileId: teamId, name: "ASD Giocatori"}]);
	assert.equal(teamProfileHref(teamId), `/dettagli-profilo?id=${teamId}&type=squadra`);
});

test("invalid and duplicate links are discarded and search wildcards are neutralized", () => {
	assert.deepEqual(experienceTeamReferences([
		{ente: "Non valida", squadraProfiloId: "invalid"},
		{ente: "ASD Uno", squadraProfiloId: teamId},
		{ente: "Duplicata", squadraProfiloId: teamId},
	]), [{profileId: teamId, name: "ASD Uno"}]);
	assert.equal(normalizeTeamSearchQuery("  ASD_%  Roma  "), "ASD Roma");
});

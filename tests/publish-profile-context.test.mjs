import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function sourceLoader(overrides = {}) {
	const cache = new Map();
	function load(file) {
		if (cache.has(file)) return cache.get(file).exports;
		const loadedModule = {exports: {}};
		cache.set(file, loadedModule);
		const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {
			compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
			fileName: file,
		});
		const localRequire = (specifier) => {
			if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
			if (specifier === "server-only") return {};
			if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
			const base = specifier.startsWith("@/")
				? path.join(root, "src", specifier.slice(2))
				: path.resolve(path.dirname(file), specifier);
			const target = [base, base + ".ts", base + ".tsx"].find((candidate) => existsSync(candidate));
			if (!target) throw new Error("Cannot resolve " + specifier);
			return load(target);
		};
		new Function("require", "module", "exports", outputText)(localRequire, loadedModule, loadedModule.exports);
		return loadedModule.exports;
	}
	return (relative) => load(path.join(root, relative));
}

function createSupabaseMock(rowsByTable) {
	return {
		from(table) {
			const filters = [];
			const query = {
				select() { return query; },
				eq(column, value) { filters.push((row) => row?.[column] === value); return query; },
				in(column, values) { filters.push((row) => values.includes(row?.[column])); return query; },
				order() { return query; },
				limit() { return query; },
				result() {
					const rows = rowsByTable[table] ?? [];
					const data = (Array.isArray(rows) ? rows : [rows]).filter((row) => filters.every((filter) => filter(row)));
					return {data, error: null};
				},
				maybeSingle() { return Promise.resolve(query.result()).then(({data, error}) => ({data: data[0] ?? null, error})); },
				then(resolve, reject) { return Promise.resolve(query.result()).then(resolve, reject); },
			};
			return query;
		},
	};
}

async function getEnabledProfileTypes(rowsByTable) {
	const client = createSupabaseMock({profilo: [{uuid: "profile-1", uuid_utente: "user-1", nascosto: false}], ...rowsByTable});
	const load = sourceLoader({"@/lib/supabase/server": {createClient: async () => client}, "@/lib/supabase/admin": {createAdminClient: () => client}});
	const {getPublishProfileContext} = load("src/features/pubblica-annuncio/server/queries.ts");
	const context = await getPublishProfileContext("user-1");
	return context;
}

test("enabledProfileTypes include active Creators and Servizi e consulenze profiles", async () => {
	const context = await getEnabledProfileTypes({
		profilo_creator: [{id: 1, uuid_profilo: "profile-1", nascosto: false}],
		profilo_servizi_consulenze: [{id: 2, uuid_profilo: "profile-1", nascosto: false}],
		restricted_profile_access: [{profile_id: "profile-1", profile_type: "creators"}, {profile_id: "profile-1", profile_type: "servizi-consulenze"}],
	});

	assert.deepEqual(context.enabledProfileTypes, ["servizi-consulenze", "creators"]);
	assert.deepEqual(context.authorizedRestrictedProfileTypes, ["creators", "servizi-consulenze"]);
});

test("enabledProfileTypes omit absent or hidden profiles and keep existing active types", async () => {
	const context = await getEnabledProfileTypes({
		profilo_giocatore: [{id: 3, uuid_profilo: "profile-1", nascosto: false}],
		profilo_creator: [{id: 4, uuid_profilo: "profile-1", nascosto: true}],
	});

	assert.deepEqual(context.enabledProfileTypes, ["giocatore"]);
	assert.deepEqual(context.authorizedRestrictedProfileTypes, []);
});

test("profile prefill discards residual social, locations and highlights from removed instances", async () => {
	const context = await getEnabledProfileTypes({
		profilo_squadra: [{id: 10, uuid_profilo: "profile-1", nascosto: false}],
		localita_profilo: [
			{uuid_profilo: "profile-1", sottoprofilo: "giocatore", id_sottoprofilo: 99, regione: "Lazio"},
			{uuid_profilo: "profile-1", sottoprofilo: "squadra", id_sottoprofilo: 9, regione: "Lombardia"},
			{uuid_profilo: "profile-1", sottoprofilo: "squadra", id_sottoprofilo: 10, regione: "Veneto"},
		],
		link_social_profilo: [
			{uuid_profilo: "profile-1", sottoprofilo: "giocatore", piattaforma: "website", sublink: "https://old.example"},
			{uuid_profilo: "profile-1", sottoprofilo: "squadra", id_sottoprofilo: 9, piattaforma: "instagram", sublink: "https://old.example"},
			{uuid_profilo: "profile-1", sottoprofilo: "squadra", id_sottoprofilo: 10, piattaforma: "website", sublink: "https://current.example"},
		],
		media_profilo: [{uuid_profilo: "profile-1", formato_media: "video_highlights", link_media: "https://old-video.example"}],
	});
	assert.deepEqual(context.locations.giocatore, []);
	assert.deepEqual(context.locations.squadra.map(row => row.regione), ["Veneto"]);
	assert.equal(context.socialLinks.giocatore.website, "");
	assert.equal(context.socialLinks.squadra.instagram, "");
	assert.equal(context.socialLinks.squadra.website, "https://current.example");
	assert.equal(context.drafts.giocatore.video_highlights, "");
});

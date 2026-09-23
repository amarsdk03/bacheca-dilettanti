import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
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
			const target = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
			if (!target) throw new Error(`Cannot resolve ${specifier}`);
			return load(target);
		};
		new Function("require", "module", "exports", outputText)(localRequire, loadedModule, loadedModule.exports);
		return loadedModule.exports;
	}
	return (relative) => load(path.join(root, relative));
}

test("metadata builder emits contextual canonical, social image and robots", () => {
	const previous = process.env.NEXT_PUBLIC_SITE_URL;
	process.env.NEXT_PUBLIC_SITE_URL = "https://www.bachecadilettanti.it";
	try {
		const {dynamicMetadata} = sourceLoader()("src/server/metadata.ts");
		const metadata = dynamicMetadata({
			title: "Mario Rossi · Giocatore",
			description: "Profilo pubblico di Mario Rossi.",
			canonicalPath: "/profili",
			openGraphPath: "/profili?type=giocatore",
			image: {url: "https://cdn.example/mario.webp", alt: "Foto di Mario", width: 1024, height: 1024},
			twitterCard: "summary",
			index: false,
			follow: true,
		});

		assert.equal(metadata.title, "Mario Rossi · Giocatore - Bacheca Dilettanti");
		assert.equal(metadata.alternates.canonical, "/profili");
		assert.equal(metadata.openGraph.url, "/profili?type=giocatore");
		assert.deepEqual(metadata.openGraph.images[0], {
			url: "https://cdn.example/mario.webp", alt: "Foto di Mario", width: 1024, height: 1024,
		});
		assert.deepEqual(metadata.twitter.images, metadata.openGraph.images);
		assert.equal(metadata.twitter.card, "summary");
		assert.equal(metadata.robots.index, false);
		assert.equal(metadata.robots.googleBot.index, false);
		assert.equal(metadata.robots.googleBot["max-image-preview"], "large");
	} finally {
		if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
		else process.env.NEXT_PUBLIC_SITE_URL = previous;
	}
});

test("metadata descriptions are normalized and shortened on a word boundary", () => {
	const {metadataDescription} = sourceLoader()("src/server/metadata.ts");
	const result = metadataDescription(`  ${"parola ".repeat(40)}  `);
	assert.ok(result.length <= 180);
	assert.ok(result.endsWith("…"));
	assert.doesNotMatch(result, /\s{2,}/);
});

function metadataImageRoute({listed = true} = {}) {
	const admin = {
		from() {
			return {
				select() { return this; },
				eq() { return this; },
				async maybeSingle() {
					return {data: {
						stato_annuncio: listed ? "pubblicato" : "in_revisione",
						nascosto: !listed,
						privato: false,
						media_annuncio: [{formato_media: "image/webp", link_media: "owner/id/image.webp"}],
					}, error: null};
				},
			};
		},
		storage: {
			from() {
				return {async download() { return {data: new Blob(["image-bytes"]), error: null}; }};
			},
		},
	};
	return sourceLoader({
		"@/lib/supabase/admin": {createAdminClient: () => admin},
		"@/features/annunci/announcement-model": {isValidAnnouncementId: (value) => /^[0-9a-f-]{36}$/.test(value)},
		"@/features/annunci/announcement-visibility": {
			isAnnouncementListed: (status, hidden, privateAnnouncement) => status === "pubblicato" && hidden === false && privateAnnouncement === false,
		},
	})("src/app/api/metadata/annuncio-immagine/route.ts");
}

test("announcement metadata image route serves listed media with public caching", async () => {
	const {GET} = metadataImageRoute({listed: true});
	const response = await GET(new Request("https://example.test/api/metadata/annuncio-immagine?id=11111111-1111-4111-8111-111111111111"));
	assert.equal(response.status, 200);
	assert.equal(response.headers.get("content-type"), "image/webp");
	assert.match(response.headers.get("cache-control"), /^public,/);
	assert.equal(await response.text(), "image-bytes");
});

test("announcement metadata image route never persistently caches an unlisted preview", async () => {
	const {GET} = metadataImageRoute({listed: false});
	const response = await GET(new Request("https://example.test/api/metadata/annuncio-immagine?id=11111111-1111-4111-8111-111111111111"));
	assert.equal(response.status, 200);
	assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
});

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
				? path.join(root, "apps/web/src", specifier.slice(2))
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
		const {dynamicMetadata} = sourceLoader()("apps/web/src/server/metadata.ts");
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
	const {metadataDescription} = sourceLoader()("apps/web/src/server/metadata.ts");
	const result = metadataDescription(`  ${"parola ".repeat(40)}  `);
	assert.ok(result.length <= 180);
	assert.ok(result.endsWith("…"));
	assert.doesNotMatch(result, /\s{2,}/);
});

function metadataImageRoute({listed = true, trashed = false, professional = false, regions = ["Lazio"]} = {}) {
	const calls = [];
	const admin = {
		from() {
			return {
				select() { return this; },
				is(column,value) { calls.push([column,value]); return this; },
				eq() { return this; },
				async maybeSingle() {
					if (trashed && calls.some(([k,v]) => k === "eliminato_il" && v === null)) return {data:null,error:null};
					return {data: {
						stato_annuncio: listed ? "pubblicato" : "in_revisione",
						nascosto: !listed,
						privato: false,
						tipologia_annuncio: professional ? "annuncio_servizi_consulenze" : "annuncio_giocatore",
						localita_annuncio: regions.map(regione => ({regione})),
						media_annuncio: [{formato_media: "image/webp", link_media: "owner/id/image.webp"}],
					}, error: null};
				},
			};
		},
		storage: {
			from() {
				return {async download() { if(trashed) throw new Error("Trash must not fetch Storage"); return {data: new Blob(["image-bytes"]), error: null}; }};
			},
		},
	};
	return sourceLoader({
		"@/lib/supabase/admin": {createAdminClient: () => admin},
		"@/features/annunci/announcement-model": {isValidAnnouncementId: (value) => /^[0-9a-f-]{36}$/.test(value)},
		"@/features/annunci/announcement-visibility": {
			isAnnouncementListed: (status, hidden, privateAnnouncement) => status === "pubblicato" && hidden === false && privateAnnouncement === false,
		},
	})("apps/web/src/app/api/metadata/annuncio-immagine/route.ts");
}

test("announcement metadata image route serves listed media without persistent caching", async () => {
	const {GET} = metadataImageRoute({listed: true});
	const response = await GET(new Request("https://example.test/api/metadata/annuncio-immagine?id=11111111-1111-4111-8111-111111111111"));
	assert.equal(response.status, 200);
	assert.equal(response.headers.get("content-type"), "image/webp");
	assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
	assert.equal(await response.text(), "image-bytes");
});

test("announcement metadata image route never persistently caches an unlisted preview", async () => {
	const {GET} = metadataImageRoute({listed: false});
	const response = await GET(new Request("https://example.test/api/metadata/annuncio-immagine?id=11111111-1111-4111-8111-111111111111"));
	assert.equal(response.status, 200);
	assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
});

test("announcement metadata image is unavailable for suspended professional content", async () => {
	for (const regions of [[], ["Lombardia"]]) {
		const {GET} = metadataImageRoute({professional: true, regions});
		const response = await GET(new Request("https://example.test/api/metadata/annuncio-immagine?id=11111111-1111-4111-8111-111111111111"));
		assert.equal(response.status, regions.length === 0 ? 404 : 200);
	}
});

test("trash image and malformed IDs return a non-cacheable 404 before touching Storage", async () => {
  const {GET}=metadataImageRoute({trashed:true});
  for(const id of ["11111111-1111-4111-8111-111111111111","invalid"]) {
    const response=await GET(new Request("https://example.test/api/metadata/annuncio-immagine?id="+id));
    assert.equal(response.status,404); assert.equal(response.headers.get("cache-control"),"private, no-store, max-age=0");
    assert.equal(await response.text(),"");
  }
});

test("sitemap omits trash and its route is rendered dynamically", async () => {
  let excluded=false;
  const query={ select(){return this;},is(k,v){excluded=k==="eliminato_il"&&v===null;return this;},or(){return this;},eq(){return this;},order(){return this;},range(){return this;},
    then(resolve){return Promise.resolve({data:excluded?[]:[{uuid:"trashed-id",creato_il:null}],error:null}).then(resolve);} };
  const load=sourceLoader({"@/lib/supabase/admin":{createAdminClient:()=>({from:()=>query})},"@/lib/articles":{},"@/server/metadata":{}});
  assert.deepEqual(await load("apps/web/src/server/sitemap-data.ts").loadSitemapAnnouncements(),[]);
  assert.equal(load("apps/web/src/app/sitemap.ts").dynamic,"force-dynamic");
});

test("privileged Web reads bypass the persistent fetch cache", async () => {
  const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL,oldKey=process.env.SUPABASE_SECRET_KEY,oldFetch=globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPABASE_URL="https://synthetic.example.test";process.env.SUPABASE_SECRET_KEY="synthetic-test-key";
  let options;
  try {
    globalThis.fetch=async(_input,init)=>{assert.equal(init.cache,"no-store");return new Response("{}",{status:200});};
    const load=sourceLoader({"@supabase/supabase-js":{createClient(_url,_key,opts){options=opts;return{};}}});
    load("apps/web/src/lib/supabase/admin.ts").createAdminClient();
    await options.global.fetch("https://synthetic.example.test/rest/v1/annuncio",{cache:"force-cache"});
  } finally {
    globalThis.fetch=oldFetch;
    if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;
    if(oldKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=oldKey;
  }
});

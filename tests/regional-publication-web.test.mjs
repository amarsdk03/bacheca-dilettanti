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
		const loaded = {exports: {}}; cache.set(file,loaded);
		const {outputText} = ts.transpileModule(readFileSync(file,"utf8"),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}});
		new Function("require","module","exports",outputText)(specifier => {
			if (Object.hasOwn(overrides,specifier)) return overrides[specifier];
			if (specifier === "server-only") return {};
			if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
			const base = specifier.startsWith("@/") ? path.join(root,"apps/web/src",specifier.slice(2)) : path.resolve(path.dirname(file),specifier);
			return load([base,base+".ts",base+".tsx"].find(candidate => existsSync(candidate)));
		},loaded,loaded.exports);
		return loaded.exports;
	}
	return relative => load(path.join(root,relative));
}
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", group = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const receipt = {status:"success",publicationId:group,announcementId:id,announcements:[{id,region:"Lazio",status:"in_revisione"},{id:other,region:"Toscana",status:"pubblicato"}],idempotent:false};

test("legacy Storage cleanup defaults to inventory and rechecks shared images before removal", async () => {
	const {cleanupRegionalLegacyImages: cleanup}=await import("../scripts/regional-publication/cleanup-images.mjs");
	const removed=[], printed=[];
	const client={rpc:async()=>({data:[{path:"owned/paid.png"},{path:"shared.png"},{path:"https://example.test/external.png"}]}),
		from:()=>({select:()=>({eq:(_key,path)=>({limit:async()=>({data:path==="shared.png"?[{id:1}]:[]})})})}),
		storage:{from:()=>({remove:async paths=>{removed.push(...paths);return {};}})}};
	assert.deepEqual(await cleanup(client,{log:line=>printed.push(line)}),{candidates:3,removed:0,shared:1,skipped:1});
	assert.deepEqual(removed,[]); assert.equal(printed.length,1);
	assert.deepEqual(await cleanup(client,{apply:true}),{candidates:3,removed:1,shared:1,skipped:1});
	assert.deepEqual(removed,["owned/paid.png"]);
	client.from=()=>({select:()=>({eq:()=>({limit:async()=>({error:{code:"FIXTURE_ERROR"}})})})});
	await assert.rejects(cleanup(client,{apply:true}),/Reference check failed/);
	assert.deepEqual(removed,["owned/paid.png"]);
});

test("regional receipt validates every ID, distinct region and first navigation target", () => {
	const {parseRegionalPublication: parse} = sourceLoader()("apps/web/src/features/pubblica-annuncio/regional-publication.ts");
	assert.equal(parse(receipt).announcements.length,2);
	for (const invalid of [{...receipt,publicationId:"bad"},{...receipt,announcementId:group},{...receipt,announcements:[]},{...receipt,announcements:[receipt.announcements[0],receipt.announcements[0]]},{...receipt,announcements:[{id,region:"Unknown"}]}]) assert.equal(parse(invalid),null);
});

test("wizard previews group cities by region and leave sponsors as a single publication", () => {
	const load=sourceLoader(), drafts=load("apps/web/src/features/profilo/profile-model.ts").createProfileDrafts();
	const {buildRegionalPublishPreviews: build}=load("apps/web/src/features/pubblica-annuncio/announcement-preview.ts");
	const payload={profileType:"giocatore",announcement:{type:"annuncio_giocatore",title:"Ricerca",detail:{categorie_ricercate:["Qualsiasi"]},locations:[{regione:"Toscana",citta:null},{regione:"Lazio",citta:"Roma"},{regione:"Lazio",citta:"Viterbo"}],contacts:{email:"",phone:""},extras:{genericLink:""}}};
	const previews=build(payload,drafts,null,null,[]);
	assert.deepEqual(previews.map(item=>item.region),["Lazio","Toscana"]);
	assert.deepEqual(previews[0].preview.locations.map(item=>item.city),["Roma","Viterbo"]);
	assert.equal(previews[1].preview.locations.length,1);
	assert.equal(payload.announcement.locations.length,3);
	assert.equal(build({...payload,profileType:"squadra",announcement:{...payload.announcement,type:"annuncio_squadra_cerca_sponsor",locations:[]}},drafts,null,null,[]).length,1);
});

test("directory region badge is explicit and leaves the existing search-area row intact", () => {
	const load=sourceLoader(), Card=load("apps/web/src/features/annunci/components/cards/AnnouncementCard.tsx").default;
	const announcement={id,type:"annuncio_staff_sportivo",profileType:"staff-sportivo",typeLabel:"Staff sportivo",title:"Opportunità",region:"Friuli-Venezia Giulia",level:"gratuito",isPriority:false,createdAt:"2026-11-01",facts:[],cardRows:[{key:"area",label:"Zona/e di ricerca",value:"Udine, Friuli-Venezia Giulia"}],author:{kind:"anonymous",profileType:"staff-sportivo",label:"Staff sportivo anonimo"}};
	const html=renderToStaticMarkup(React.createElement(Card,{announcement,showRegionBadge:true}));
	assert.match(html,/aria-label="Regione: Friuli-Venezia Giulia"/);
	assert.match(html,/Zona\/e di ricerca/); assert.match(html,/Udine/); assert.match(html,/>ST</);
	assert.doesNotMatch(renderToStaticMarkup(React.createElement(Card,{announcement})),/aria-label="Regione:/);
});

test("staff residence and initials only change the intended labels, category suffixes never change stored keys", () => {
	const load=sourceLoader();
	const {profileInitials}=load("apps/web/src/features/profilo/public-profile-display.ts");
	assert.equal(profileInitials("Staff sportivo"),"ST"); assert.equal(profileInitials("Staff sportivo anonimo"),"ST"); assert.equal(profileInitials("Sergio Serra"),"SS");
	const {NON_PLAYER_PRESENTATIONS:p}=load("apps/web/src/features/dettagli-profilo/components/non-player-presentations.ts");
	assert.equal(p["staff-sportivo"].sections[0].title,"Vive a"); assert.equal(p.arbitro.sections[0].title,"Località");
	const StaffCard=load("apps/web/src/features/profili/components/cards/StaffSportivoCard.tsx").default;
	const staffHtml=renderToStaticMarkup(React.createElement(StaffCard,{profile:{id,type:"staff-sportivo",title:"Staff sportivo",facts:[{kind:"location",label:"Località",value:"Roma"}]}}));
	assert.match(staffHtml,/Vive a/); assert.doesNotMatch(staffHtml,/>Località</);
	const catalog=load("apps/web/src/features/pubblica-annuncio/types/category-catalog.ts");
	for (const suffix of ["Nazionale","Regionale","Territoriale"]) {
		const key=`Calcio a 11 maschile::FIGC-LND — Eccellenza — ${suffix}`;
		assert.doesNotMatch(catalog.categoryLabel(key),new RegExp(`— ${suffix}$`));
	}
	const key="Calcio a 11 maschile::FIGC-LND — Eccellenza — Regionale";
	assert.equal(catalog.normalizeCategory(key),key);
	const staffCatalog=load("apps/web/src/features/pubblica-annuncio/types/staff-category-catalog.ts");
	assert.doesNotMatch(staffCatalog.staffCategoryLabel(key),/— Regionale$/);
	assert.equal(catalog.categoryDisplayLabel("Juniores Regionali"),"Juniores Regionali");
	assert.equal(catalog.categoryDisplayLabel("Under 15 regionale"),"Under 15 regionale");
});

test("image cleanup never deletes a file still referenced by a sibling and fails closed on lookup errors", async () => {
	let references=true, fail=false; const removed=[], calls=[];
	const client={from(table){assert.equal(table,"media_annuncio"); const query={select(){return query;},eq(key,value){calls.push([key,value]);return query;},limit:async()=>({data:references?[{id:7}]:[],error:fail?{code:"fixture"}:null})}; return query;},storage:{from(bucket){assert.equal(bucket,"immagini_annunci");return {remove:async paths=>{removed.push(...paths);return {error:null};}};}}};
	const load=sourceLoader({"@/lib/supabase/admin":{createAdminClient:()=>client}});
	const {removeUnreferencedAnnouncementImages:clean}=load("apps/web/src/features/pubblica-annuncio/server/image-cleanup.ts");
	await clean(["local/shared.png"]); assert.deepEqual(removed,[]);
	references=false; fail=true; await clean(["local/shared.png"]); assert.deepEqual(removed,[]);
	fail=false; await clean(["local/shared.png","local/shared.png"]); assert.deepEqual(removed,["local/shared.png"]);
	assert.ok(calls.every(([key])=>key==="link_media"));
});

test("publication action uses the atomic regional RPC and returns the complete validated receipt", async () => {
	const calls=[];
	const client={auth:{getUser:async()=>({data:{user:{id}},error:null})},rpc:async(name,args)=>{calls.push([name,args]);return {data:receipt,error:null};}};
	const load=sourceLoader({"next/cache":{revalidatePath(){}},"@/features/auth/server/queries":{getAuthenticatedViewer:async()=>({registeredAt:"2026-01-01",utenteId:other})},"@/lib/supabase/server":{createClient:async()=>client},"@/features/pubblica-annuncio/server/validation":{parsePublishPayload:()=>({profileType:"torneo-evento",submissionId:group,announcementType:"annuncio_torneo_evento",profileUpdate:null,announcementLocations:[{regione:"Lazio",citta:null},{regione:"Toscana",citta:null}],contacts:{},extras:{genericLink:""}}),PublishPayloadError:class extends Error{}}});
	const form=new FormData(); form.set("payload","{}");
	const result=await load("apps/web/src/features/pubblica-annuncio/server/actions.ts").publishAnnouncement(form);
	assert.equal(result.status,"success"); assert.equal(result.publicationId,group); assert.equal(result.announcements.length,2);
	assert.equal(calls[0][0],"publish_announcement_v3"); assert.equal(calls[0][1].p_submission_id,group);
});

test("group confirmation rejects non-member IDs before loading any announcement", async () => {
	let reads=0;
	const client={rpc:async()=>({data:receipt,error:null}),from(){reads++;throw Error("Must not read an unrelated announcement");}};
	const load=sourceLoader({"@/lib/supabase/server":{createClient:async()=>client},"@/lib/supabase/admin":{createAdminClient:()=>client}});
	const {loadRegionalPublishConfirmation:confirm}=load("apps/web/src/features/pubblica-annuncio/server/confirmation.ts");
	assert.deepEqual(await confirm(group,group),{status:"not-found"}); assert.equal(reads,0);
});

import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {test} from "node:test";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
function loader(stubs = {}) {
	const cache = new Map();
	function load(relativePath) {
		const file = path.resolve(root, relativePath);
		if (cache.has(file)) return cache.get(file).exports;
		const loaded = {exports: {}};
		cache.set(file, loaded);
		const {outputText} = ts.transpileModule(readFileSync(file, "utf8"), {
			fileName: file, compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
		});
		new Function("require", "module", "exports", outputText)((name) => {
			if (name in stubs) return stubs[name];
			if (name === "server-only") return {};
			if (name.startsWith("@/") || name.startsWith(".")) {
				const base = name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : path.resolve(path.dirname(file), name);
				return load([base, `${base}.ts`, `${base}.tsx`].find((candidate) => existsSync(candidate)));
			}
			return require(name);
		}, loaded, loaded.exports);
		return loaded.exports;
	}
	return load;
}
const model = loader()("src/features/notifiche/notification-model.ts");
const userId = "00000000-0000-4000-8000-000000000001";
const account = {utenteId: userId, registeredAt: "2026-10-01"};
test("notification cursors keep bigint IDs and microseconds without accepting query fragments", () => {
	assert.equal(model.isNotificationCursor({id:"9007199254740993",date:"2026-10-05T10:00:00.123456+00:00"}),true);
	for(const cursor of [null,{id:1,date:"2026-10-05"},{id:"1),destinatario.eq.other",date:"2026-10-05T10:00:00Z"},{id:"0",date:"bad"}]) assert.equal(model.isNotificationCursor(cursor),false);
	assert.equal(model.notificationBadge(99),"99"); assert.equal(model.notificationBadge(100),"99+");
});
test("expanding notifications retains the previous order and excludes duplicates", () => {
	assert.deepEqual(model.appendNotifications([{id:"3"},{id:"2"}],[{id:"2"},{id:"1"}]),[{id:"3"},{id:"2"},{id:"1"}]);
});
test("server reads derive the recipient from the authenticated account", async () => {
	let args;
	const page = {items:[],nextCursor:null,unreadCount:7};
	const load=loader({
		"@/features/auth/server/queries":{getAuthenticatedViewer:async()=>account},
		"@/lib/supabase/admin":{createAdminClient:()=>({rpc:async(name,values)=>{assert.equal(name,"get_notifications_v1");args=values;return {data:page,error:null};}})},
	});
	const queries=load("src/features/notifiche/server/queries.ts");
	assert.deepEqual(await queries.getNotifications(3),page); assert.equal(args.p_user,userId); assert.equal(args.p_limit,3);
	await assert.rejects(()=>queries.getNotifications(20,{id:"injected",date:"invalid"}));
});
test("mark-read rejects unauthenticated access, invalid IDs and oversized batches", async () => {
	let current=account; let calls=0;
	const action=loader({
		"@/features/auth/server/queries":{getAuthenticatedViewer:async()=>current},
		"@/lib/supabase/admin":{createAdminClient:()=>({rpc:async(name,args)=>{calls++;assert.equal(name,"mark_notifications_read_v1");assert.equal(args.p_user,userId);return {data:4,error:null};}})},
	})("src/features/notifiche/server/actions.ts");
	assert.deepEqual(await action.markNotificationsRead(["1","9007199254740993"]),{unreadCount:4});
	for(const ids of [["other"],Array(21).fill("1"),[1],null]) assert.ok("error" in await action.markNotificationsRead(ids));
	current=null; assert.ok("error" in await action.markNotificationsRead(["1"]));
	assert.equal(calls,1);
});
function Element({children,...props}) {return React.createElement("div",props,children);}
const cardStubs = {
	"next/link":{__esModule:true,default: function Link({children,...props}) {return React.createElement("a",props,children);}},
	"@/components/ui/card":{Card:Element,CardContent:Element,CardDescription:Element,CardHeader:Element,CardTitle:Element},
	"@/components/ui/badge":{Badge:function Badge({children}) {return React.createElement("span",null,children);}},
};
const Card = loader(cardStubs)("src/features/notifiche/NotificationCard.tsx").default;
const item={id:"1",type:"interesse",createdAt:"2026-10-05T10:00:00Z",readAt:null,actor:{label:"Mario Rossi",href:"/dettagli-profilo?id=sender&type=giocatore"},target:{label:"ASD Verona",href:"/dettagli-profilo?id=recipient&type=squadra"},targetKind:"profilo",email:"mario@example.it",phone:"+39 (333) 123-4567",state:null,info:null};
test("interest cards render names, links, safe contacts and a readable timestamp", () => {
	const html=renderToStaticMarkup(React.createElement(Card,{item}));
	assert.match(html,/Mario Rossi/); assert.match(html,/ASD Verona/); assert.match(html,/ha manifestato interesse/);
	assert.match(html,/mailto:mario@example.it/); assert.match(html,/tel:\+393331234567/); assert.match(html,/dateTime="2026-10-05T10:00:00Z"/);
	assert.match(html,/Nuova/); assert.match(html,/data-notification-type="interesse"/);
});
test("deleted references lose links, read cards lose the new badge and snapshots escape HTML", () => {
	const html=renderToStaticMarkup(React.createElement(Card,{item:{...item,readAt:"2026-10-05T10:10:00Z",actor:{label:"<script>bad</script>",href:null},target:null,email:null,phone:null}}));
	assert.doesNotMatch(html,/<script>|Nuova|href=/); assert.match(html,/&lt;script&gt;/); assert.match(html,/non più disponibili/);
});
test("each notification type renders its own title and status rejection details", () => {
	for(const type of model.NOTIFICATION_TYPES) {
		const html=renderToStaticMarkup(React.createElement(Card,{item:{...item,type,state:"rifiutato",info:"Completa la descrizione"}}));
		assert.match(html,new RegExp(`data-notification-type="${type}"`));
		if(type==="stato_annuncio") {assert.match(html,/rifiutato/);assert.match(html,/Completa la descrizione/);}
		if(type==="profilo_speciale") assert.match(html,/Completa il profilo/);
	}
});
test("notification GET is authenticated, validates pagination and disables caching", async () => {
	const {NextRequest}=require("next/server");
	let current=account; let calls=0;
	const route=loader({
		"@/features/auth/server/queries":{getAuthenticatedViewer:async()=>current},
		"@/features/notifiche/server/queries":{getNotifications:async(limit)=>{calls++;assert.equal(limit,3);return {items:[],nextCursor:null,unreadCount:1};}},
	})("src/app/api/notifiche/route.ts");
	const result=await route.GET(new NextRequest("https://example.test/api/notifiche?limit=3&user=other"));
	assert.equal(result.status,200);assert.equal(result.headers.get("cache-control"),"private, no-store");
	assert.equal((await route.GET(new NextRequest("https://example.test/api/notifiche?limit=100"))).status,400);
	current=null;assert.equal((await route.GET(new NextRequest("https://example.test/api/notifiche?limit=3"))).status,401);
	assert.equal(calls,1);
});

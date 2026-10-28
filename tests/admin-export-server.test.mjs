import assert from "node:assert/strict";
import { test } from "node:test";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
import { createExportFixture, selection } from "./helpers/admin-export-fixture.mjs";
import { listId as id,listClaims } from "./helpers/admin-announcements-fixture.mjs";
const base="apps/admin/src/features/annunci/",load=adminServerLoader();
const {csvCell,announcementCsv,exportFilename}=load(base+"server/export-csv.ts");
const {createAnnouncementExport}=load(base+"server/export-service.ts");
const row=()=>({id:id(1000),title:'Titolo; "Équipe"\nSeconda riga',type:'annuncio_giocatore',status:'pubblicato',hidden:false,private:false,trashed:false,creatorId:id(101),
  createdAt:'2026-10-24T10:00:00.123456Z',updatedAt:null,rowFingerprint:'a'.repeat(32),
  author:{profileId:id(201),userId:id(101),displayName:'Giocatore pubblico',anonymous:false,available:true}});
const input=()=>({query:{},selection:selection([row()])});
const ok=()=>({status:'ok',items:[row()],eventId:id(2000),correlationId:id(3000)});
function harness(options={}) {
  const calls=[],failures=[],logs=[];
  const client={auth:{async getClaims(){calls.push('claims');if(options.authThrows)throw Error('private auth error');return{data:options.noSession?null:{claims:listClaims(options.claims)},error:null};}},
    async rpc(name,args){calls.push({name,args});if(options.throws)throw Error('private network error');return{data:options.response??ok(),error:options.error??null};}};
  const run=createAnnouncementExport({async getClient(){calls.push('client');return client;},async failure(event){failures.push(event);if(options.auditThrows)throw Error('private audit error');},log(code,correlationId){logs.push({code,correlationId});}});
  return{run,calls,failures,logs,options};
}

test("CSV uses UTF-8 BOM, six quoted semicolon columns, CRLF and exact public presentation",()=>{
  const csv=announcementCsv([row()]);assert.equal(csv.charCodeAt(0),0xfeff);assert(csv.endsWith('\r\n'));
  assert(csv.includes('"Titolo; ""Équipe""\nSeconda riga"'));assert(csv.includes('"Giocatore pubblico";"Giocatore";"Pubblicato";"Non oscurato · Pubblico";"24/10/26, 12:00"'));
  assert.equal(csvCell('one;two"three\r\nfour'),'"one;two""three\r\nfour"');
  assert.equal(exportFilename(new Date('2026-10-24T10:00:00Z')),'annunci-pagina-20261024-100000.csv');
  assert(!csv.includes('rowFingerprint'));assert(!csv.includes(id(101)));
  assert(announcementCsv([{...row(),trashed:true,hidden:true,private:true,title:null,createdAt:null}]).includes('"Nel cestino · Oscurato · Privato";"Non specificata"'));
});
for(const value of ['=1+1','+SUM(A1)','-2+3','@SUM(A1)',' \t=1','\r=1','\n=1','\u0000=1','\uFEFF=1','\u200B\u000b=1','＝1','＋1','－1','＠1'])test(`spreadsheet formula neutralization ${JSON.stringify(value)}`,()=>{
  assert(csvCell(value).startsWith('"\''));
});
test("plain accented text, literal apostrophes and internal newlines remain intact",()=>{
  for(const value of ['Équipe 😀',"'already escaped",'one\ntwo',' www.example.test','hello + world'])assert.equal(csvCell(value),'"'+value+'"');
});
test("one human RPC prepares the CSV; success never uses the technical audit attestation",async()=>{
  const h=harness(),result=await h.run(input());assert.equal(result.status,'ok');assert.equal(result.csv,announcementCsv([row()]));
  assert.deepEqual(h.calls.map(c=>typeof c==='string'?c:c.name),['client','claims','admin_export_announcements_v1']);assert.deepEqual(h.failures,[]);
  assert.equal(h.calls[2].args.p_query.limit,30);assert.equal(h.calls[2].args.p_query.trash,'exclude');assert.deepEqual(h.calls[2].args.p_selection,input().selection);
});
test("invalid inputs never create a session or functional/audit request",async()=>{
  const h=harness();
  for(const value of [null,{}, {...input(),actor:id(1)},{...input(),query:{limit:1}},{...input(),query:{limit:31}},{...input(),selection:[]},{...input(),selection:Array(31).fill(input().selection[0])},
    {...input(),selection:[input().selection[0],input().selection[0]]},{...input(),selection:[{...input().selection[0],rowFingerprint:'bad'}]}, {...input(),query:{trash:null}}])assert.equal((await h.run(value)).status,'invalid');
  assert.deepEqual(h.calls,[]);assert.deepEqual(h.failures,[]);
});
for(const [name,options,status] of [
  ['anonymous',{noSession:true},'denied'],['expired',{claims:{exp:1}},'denied'],['technical',{claims:{role:'service_role'}},'denied'],['Auth outage',{authThrows:true},'unavailable'],
  ['role revoked',{error:{code:'42501',message:'ADMIN_ACCESS_DENIED'}},'denied'],['unreviewed policy',{error:{code:'42501',message:'ADMIN_SESSION_POLICY_UNVERIFIED'}},'unavailable'],
  ['page changed',{response:{status:'conflict',correlationId:id(3000)}},'conflict'],['audit rollback',{response:{status:'unavailable',correlationId:id(3000)}},'unavailable'],
  ['RPC unavailable',{throws:true},'unavailable'],['malformed snapshot',{response:{...ok(),items:[{...row(),hidden:'false'}]}},'unavailable'],
  ['substituted ID',{response:{...ok(),items:[{...row(),id:id(9999)}]}},'unavailable'],['altered author',{response:{...ok(),items:[{...row(),author:{...row().author,displayName:'Changed'}}]}},'unavailable'],
  ['missing event',{response:{...ok(),eventId:null}},'unavailable']
])test(`${name} withholds CSV and records only a bounded failure without retry`,async()=>{
  const h=harness(options),result=await h.run(input());assert.equal(result.status,status);assert(!('csv'in result));assert(h.calls.filter(c=>typeof c==='object').length<=1);
  assert.equal(h.failures.length,1);assert.equal(h.failures[0].action,'announcement.export');assert(!JSON.stringify(h.failures).includes('Giocatore pubblico'));assert(!JSON.stringify(result).includes('private'));
});
test("separate failure audit outage cannot produce CSV or change a conflict into success",async()=>{
  const h=harness({auditThrows:true,response:{status:'conflict',correlationId:id(3000)}});assert.equal((await h.run(input())).status,'conflict');assert(h.logs.length);
});

const httpLoad=adminServerLoader({dependencies:{'@/lib/supabase/server':{},'@/features/audit/server':{}}});
const {createExportHttp}=httpLoad(base+'server/export-http.ts');
const request=(body=JSON.stringify(input()),headers={})=>new Request('https://admin.example.test/api/annunci/export',{method:'POST',headers:{Origin:'https://admin.example.test','Content-Type':'application/json',...headers},body});
test("POST download has a safe filename and private no-store headers; BOM survives as bytes",async()=>{
  const post=createExportHttp(async()=>({status:'ok',csv:announcementCsv([row()]),eventId:id(1),correlationId:id(2)}),()=>new Date('2026-10-24T10:00:00Z'));
  const response=await post(request());assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'text/csv; charset=utf-8');
  assert.equal(response.headers.get('content-disposition'),'attachment; filename="annunci-pagina-20261024-100000.csv"');assert.match(response.headers.get('cache-control'),/private.*no-store/);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.deepEqual([...new Uint8Array(await response.arrayBuffer()).slice(0,3)],[239,187,191]);
});
test("cross-origin, missing Origin, wrong media type, oversized and malformed bodies never call the service",async()=>{
  let calls=0;const post=createExportHttp(async()=>{calls++;throw Error();});
  for(const [req,status] of [[request('{}',{Origin:'https://evil.example.test'}),403],[request('{}',{Origin:'null'}),403],
    [request('{}',{'Content-Type':'text/plain'}),400],[request('not-json'),400],[request('x'.repeat(1048577)),400],
    [request(new Uint8Array([0xff,0xfe])),400]]) {const response=await post(req);assert.equal(response.status,status);assert.match(response.headers.get('cache-control'),/no-store/);}
  const noOrigin=request();noOrigin.headers.delete('origin');assert.equal((await post(noOrigin)).status,403);assert.equal(calls,0);
});

test("export compares the real HTTP Host despite Next's internal localhost URL, without trusting forwarded hosts",async()=>{
  let calls=0;
  const post=createExportHttp(async()=>{calls++;return{status:'ok',csv:'\uFEFF"Titolo"\r\n',eventId:id(1),correlationId:id(2)};});
  for(const [url,host,origin] of [['http://localhost:3000/api/annunci/export','127.0.0.1:3000','http://127.0.0.1:3000'],
    ['https://localhost/api/annunci/export','admin.example.test','https://admin.example.test'],
    ['https://localhost/api/annunci/export','admin.example.test:443','https://admin.example.test'],
    ['http://localhost:3000/api/annunci/export','[::1]:3000','http://[::1]:3000']]) {
    const response=await post(new Request(url,{method:'POST',headers:{Host:host,Origin:origin,'Content-Type':'application/json'},body:'{}'}));assert.equal(response.status,200);
  }
  assert.equal(calls,4);
  for(const [host,origin] of [['admin.example.test','https://evil.example.test'],['admin.example.test:444','https://admin.example.test'],
    ['admin.example.test','http://admin.example.test'],['admin.example.test','null'],['admin.example.test','https://admin.example.test/'],
    ['admin.example.test@evil.example.test','https://evil.example.test'],['admin.example.test/evil','https://admin.example.test'],
    ['admin.example.test,evil.example.test','https://admin.example.test'],['admin.example.test:99999','https://admin.example.test']]) {
    const response=await post(new Request('https://localhost/api/annunci/export',{method:'POST',headers:{Host:host,Origin:origin,'X-Forwarded-Host':'evil.example.test','Content-Type':'application/json'},body:'{}'}));assert.equal(response.status,403);
  }
  assert.equal(calls,4);
});
for(const [status,code] of [['conflict',409],['invalid',400],['denied',403],['unavailable',503]])test(`HTTP ${code} contains no file or snapshot`,async()=>{
  const response=await createExportHttp(async()=>({status,correlationId:id(3000)}))(request());assert.equal(response.status,code);assert.equal(response.headers.get('content-disposition'),null);assert.deepEqual(await response.json(),{status,correlationId:id(3000)});
});
test("actual POST uses the writable human client and no success bridge",async()=>{
  let calls=0;
  const l=adminServerLoader({dependencies:{'@/lib/supabase/server':{async createClient(){return{auth:{getClaims:async()=>({data:{claims:listClaims()},error:null})},async rpc(name){calls++;assert.equal(name,'admin_export_announcements_v1');return{data:ok(),error:null};}};}},
    '@/features/audit/server':{createAdminAuditService(){throw Error('Unexpected success attestation');}}}});
  const {POST}=l('apps/admin/src/app/api/annunci/export/route.ts');assert.equal((await POST(request())).status,200);assert.equal(calls,1);
});
test("real SQL snapshot and success event compose with the server formatter",async t=>{
  const h=await createExportFixture();t.after(()=>h.db.close());await h.reset();await h.insert(1000);const rows=selection((await h.list()).items);
  const run=createAnnouncementExport({getClient:async()=>({auth:{getClaims:async()=>({data:{claims:listClaims()},error:null})},rpc:async(_name,args)=>({data:await h.exportPage(args.p_query,args.p_selection),error:null})}),failure:async()=>{},log(){}});
  const result=await run({query:{},selection:rows});assert.equal(result.status,'ok');assert(result.csv.includes('Titolo 1000'));assert(result.eventId);
});

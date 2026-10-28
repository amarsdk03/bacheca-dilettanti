import assert from "node:assert/strict";
import { test } from "node:test";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";
const base="apps/admin/src/features/annunci/",load=adminServerLoader();
const {createAnnunciController,canExportAnnouncements}=load(base+'client/controller.ts');
const {parseAnnunciUrl}=load(base+'url-state.ts');
const id='eeeeeeee-eeee-4eee-8eee-000000001000',corr='eeeeeeee-eeee-4eee-8eee-000000003000';
const item={id,rowFingerprint:'a'.repeat(32),author:{displayName:'Public author'}};
const page={status:'ok',page:{items:[item],hasMore:false,nextCursor:null}};
const file={status:'ok',blob:new Blob(['csv']),filename:'annunci-pagina-20261024-100000.csv'};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function harness(result=page,url=''){
  const exports=[],downloads=[],lists=[],redirects=[];
  const c=createAnnunciController(parseAnnunciUrl(url),result,{
    list(query,signal){const p=deferred();lists.push({...p,query,signal});return p.promise;},detail:async()=>({status:'not_found'}),navigate(){},denied(){redirects.push(true);},
    export(query,selection,signal){const p=deferred();exports.push({...p,query,selection,signal});return p.promise;},download(value){downloads.push(value);},
  });return{c,exports,downloads,lists,redirects,state:c.getSnapshot};
}
test("exports the exact current URL and selection once, keeping the list and preview intact",async()=>{
  const h=harness(page,'trash=all&status=pubblicato');const pending=h.c.exportPage();await h.c.exportPage();
  assert.equal(h.exports.length,1);assert(h.state().exporting.pending);assert(!canExportAnnouncements(h.state()));
  assert.deepEqual(h.exports[0].selection,[{id,rowFingerprint:'a'.repeat(32),authorName:'Public author'}]);assert.equal(h.exports[0].query.filters.trash,'all');
  h.exports[0].resolve(file);await pending;assert.deepEqual(h.downloads,[file]);assert.equal(h.lists.length,0);assert(canExportAnnouncements(h.state()));h.c.cancel();
});
test("empty/invalid/error/loading pages and an unapplied search cannot export",async()=>{
  for(const [result,url]of [[{...page,page:{...page.page,items:[]}},''],[{status:'invalid'},''],[{status:'unavailable'},''],[page,'bad=x']]){
    const h=harness(result,url);await h.c.exportPage();assert.equal(h.exports.length,0);h.c.cancel();
  }
  const h=harness();h.c.setSearch('changed');assert(!canExportAnnouncements(h.state()));await h.c.exportPage();assert.equal(h.exports.length,0);h.c.refresh();assert(!canExportAnnouncements(h.state()));h.c.cancel();
});
test("an open moderation confirmation prevents export and pending export prevents moderation",async()=>{
  const h=harness();h.c.beginModeration(id,'hide');await h.c.exportPage();assert.equal(h.exports.length,0);h.c.closeModeration();
  const pending=h.c.exportPage();h.c.beginModeration(id,'hide');assert.equal(h.state().moderation,null);h.exports[0].resolve(file);await pending;h.c.cancel();
});
for(const operation of ['navigation','search','unmount'])test(`${operation} suppresses a late export even if its transport ignores abort`,async()=>{
  const h=harness(),pending=h.c.exportPage();
  if(operation==='navigation')h.c.sync('trash=only');if(operation==='search')h.c.setSearch('new');if(operation==='unmount')h.c.cancel();
  assert(h.exports[0].signal.aborted);h.exports[0].resolve(file);await pending;assert.equal(h.downloads.length,0);h.c.cancel();
});
for(const status of ['conflict','unavailable','invalid'])test(`${status} requires an explicit list refresh before another attempt`,async()=>{
  const h=harness(),pending=h.c.exportPage();h.exports[0].resolve({status,correlationId:corr});await pending;await h.c.exportPage();
  assert.equal(h.exports.length,1);assert.equal(h.downloads.length,0);assert.equal(h.state().exporting.result.status,status);
  h.c.refresh();assert(h.state().list.pending);h.lists[0].resolve(page);await Promise.resolve();await Promise.resolve();assert(canExportAnnouncements(h.state()));h.c.cancel();
});
test("lost response is uncertain, never blindly retried",async()=>{
  const h=harness(),pending=h.c.exportPage();h.exports[0].reject(Error('response lost after audit commit'));await pending;await h.c.exportPage();assert.equal(h.exports.length,1);assert.equal(h.state().exporting.result.status,'unavailable');h.c.cancel();
});
test("denied export clears data and pending state before redirecting",async()=>{
  const h=harness(),pending=h.c.exportPage();h.exports[0].resolve({status:'denied',correlationId:corr});await pending;
  assert.equal(h.state().list.result,null);assert(!h.state().exporting.pending);assert.equal(h.state().preview.id,null);assert.equal(h.downloads.length,0);assert.equal(h.redirects.length,1);
});
test("download initiation failure cannot silently permit a duplicate export",async()=>{
  const c=createAnnunciController(parseAnnunciUrl(''),page,{list:async()=>page,detail:async()=>({status:'not_found'}),navigate(){},denied(){},export:async()=>file,download(){throw Error('browser blocked');}});
  await c.exportPage();assert.equal(c.getSnapshot().exporting.result.status,'unavailable');assert(!canExportAnnouncements(c.getSnapshot()));c.cancel();
});
test("transport posts only page selection with no-store and validates CSV filename",async()=>{
  const calls=[];
  const l=adminServerLoader({fetch:async(url,opts)=>{calls.push({url,opts});return new Response('\uFEFFcsv',{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="annunci-pagina-20261024-100000.csv"'}});}});
  const {requestAnnouncementExport}=l(base+'client/export-transport.ts'),signal=new AbortController().signal;
  const result=await requestAnnouncementExport(parseAnnunciUrl('trash=only'),[item],signal);assert.equal(result.status,'ok');assert(result.blob.size>0);
  const {opts,url}=calls[0];assert.equal(url,'/api/annunci/export');assert.equal(opts.method,'POST');assert.equal(opts.cache,'no-store');assert.equal(opts.credentials,'same-origin');assert.equal(opts.redirect,'error');assert.equal(opts.signal,signal);
  const body=JSON.parse(opts.body);assert.equal(body.query.trash,'only');assert.equal(body.query.limit,30);assert.deepEqual(body.selection,[item]);
});
for(const [response,status]of [[()=>new Response('Forbidden',{status:403}),'denied'],[()=>Response.json({status:'conflict',correlationId:corr},{status:409}),'conflict']])test(`transport handles ${status} without a Blob`,async()=>{
  const fn=adminServerLoader({fetch:async()=>response()})(base+'client/export-transport.ts').requestAnnouncementExport;
  const result=await fn(parseAnnunciUrl(''),[item],new AbortController().signal);assert.equal(result.status,status);assert(!('blob'in result));
});
for(const response of [()=>new Response('<html>Login</html>',{headers:{'Content-Type':'text/html'}}),()=>new Response('csv',{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="unsafe.csv"'}}),
  ()=>Response.json({status:'ok',correlationId:corr},{status:503})])test("transport rejects unexpected HTML, names and status envelopes",async()=>{
  const fn=adminServerLoader({fetch:async()=>response()})(base+'client/export-transport.ts').requestAnnouncementExport;
  await assert.rejects(fn(parseAnnunciUrl(''),[item],new AbortController().signal),/EXPORT_UNAVAILABLE/);
});
test("Blob URLs and temporary links are released after starting the download",async()=>{
  const calls=[],link={remove(){calls.push('remove');},click(){calls.push('click');}};
  const l=adminServerLoader({globals:{window:{URL:{createObjectURL(blob){assert.equal(blob,file.blob);calls.push('create');return'blob:synthetic';},revokeObjectURL(url){assert.equal(url,'blob:synthetic');calls.push('revoke');}}},document:{createElement(tag){assert.equal(tag,'a');return link;},body:{appendChild(value){assert.equal(value,link);calls.push('append');}}}}});
  l(base+'client/export-transport.ts').downloadAnnouncementExport(file);assert.equal(link.href,'blob:synthetic');assert.equal(link.download,file.filename);
  await new Promise(resolve=>setTimeout(resolve,5));assert.deepEqual(calls,['create','append','click','remove','revoke']);
});

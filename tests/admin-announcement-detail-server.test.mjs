import assert from "node:assert/strict";
import { test } from "node:test";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const load=adminServerLoader();
const {createAnnouncementQueries}=load("apps/admin/src/features/annunci/server/service.ts");
const {parseDetailResponse,detailUrl}=load("apps/admin/src/features/annunci/server/detail-response.ts");
const {DETAIL_FIELDS}=load("apps/admin/src/features/annunci/detail-fields.ts");
const id="eeeeeeee-eeee-4eee-8eee-000000001000";
const claims=()=>({role:"authenticated",sub:id,session_id:"eeeeeeee-eeee-4eee-8eee-000000000501",exp:Date.now()/1000+3600});
function wire(type="annuncio_giocatore"){
  return {summary:{id,title:"Titolo",type,status:"in_revisione",hidden:false,private:true,creatorId:null,createdAt:"2026-01-01T00:00:00.000001Z",updatedAt:null,rowFingerprint:"a".repeat(32),
    author:{profileId:null,userId:null,displayName:"Profilo non disponibile",anonymous:null,available:false}},
    metadata:{moderationInfo:null,level:null,priorityActive:false,priorityStartsAt:null,priorityEndsAt:null,updatedById:null},
    content:{type,fields:Object.fromEntries(Object.keys(DETAIL_FIELDS[type]??{}).map(key=>[key,null]))},
    contacts:[],links:[],media:[],locations:[],complete:true,issues:[],contentFingerprint:"content-v1:"+"a".repeat(64)};
}
function harness(options={}){
  const calls=[],logs=[];
  const client={auth:{async getClaims(){calls.push("claims");if(options.claimThrows)throw new Error("secret auth");return {data:options.noSession?null:{claims:{...claims(),...options.claims}},error:options.claimError??null};}},
    async rpc(name,args){calls.push({name,args});if(options.rpcThrows)throw new Error("secret transport");return {data:Object.hasOwn(options,"response")?options.response:wire(),error:options.rpcError??null};}};
  const service=createAnnouncementQueries({async getClient(){calls.push("client");if(options.clientThrows)throw new Error("secret env");return client;},log(code,correlationId){logs.push({code,correlationId});if(options.logThrows)throw new Error("secret log");}});
  return {service,calls,logs,options};
}

test("invalid detail IDs never reach client creation, Auth or data",async()=>{
  const h=harness();for(const input of [null,undefined,{},[],1,"","invalid",id+"suffix"])
    assert.deepEqual(await h.service.detail(input),{status:"invalid",code:"INVALID_ANNOUNCEMENT_ID"});
  assert.deepEqual(h.calls,[]);assert.deepEqual(h.logs,[]);
});
test("on-demand detail normalizes ID and makes one functional RPC without context/related requests",async()=>{
  const h=harness();const result=await h.service.detail(" "+id.toUpperCase()+" ");assert.equal(result.status,"ok");
  assert.deepEqual(h.calls,["client","claims",{name:"admin_get_announcement_v1",args:{p_id:id}}]);
  assert.equal(result.detail.summary.createdAt,"2026-01-01T00:00:00.000001Z");assert.deepEqual(h.logs,[]);
});
for(const [label,options,status] of [
  ["no session",{noSession:true},"denied"],["invalid JWT",{claimError:{name:"AuthInvalidJwtError"}},"denied"],
  ["expired claims",{claims:{exp:1}},"denied"],["technical claims",{claims:{role:"service_role"}},"denied"],
  ["missing session identifier",{claims:{session_id:null}},"denied"],["Auth failure",{claimThrows:true},"unavailable"],
  ["configuration failure",{clientThrows:true},"unavailable"],
])test(`${label} blocks detail data RPC`,async()=>{
  const h=harness(options);const result=await h.service.detail(id);assert.equal(result.status,status);
  assert(!h.calls.some(call=>typeof call==="object"));assert(!JSON.stringify(result).includes("secret"));
});
for(const [label,options,status] of [
  ["resource absent",{response:null},"not_found"],["ordinary/revoked role",{rpcError:{code:"42501"}},"denied"],
  ["unreviewed policy",{rpcError:{code:"42501",message:"ADMIN_SESSION_POLICY_UNVERIFIED"}},"unavailable"],
  ["database invalid ID",{rpcError:{code:"22023"}},"invalid"],["database error",{rpcError:{code:"XX000",message:"secret SQL"}},"unavailable"],
  ["transport exception",{rpcThrows:true},"unavailable"],["invalid response",{response:{secret:"raw"}},"unavailable"],
  ["log failure",{rpcThrows:true,logThrows:true},"unavailable"],
])test(`${label} produces a distinct bounded result without retry`,async()=>{
  const h=harness(options);const result=await h.service.detail(id);assert.equal(result.status,status);
  assert.equal(h.calls.filter(call=>typeof call==="object").length,1);assert(!JSON.stringify(result).includes("secret"));assert(!JSON.stringify(h.logs).includes("secret"));
  if(status==="unavailable")assert.deepEqual(h.logs,[{code:"ADMIN_ANNOUNCEMENTS_UNAVAILABLE",correlationId:result.correlationId}]);
});
test("success is not cached across role or session revocation",async()=>{
  const h=harness();assert.equal((await h.service.detail(id)).status,"ok");h.options.rpcError={code:"42501"};
  assert.equal((await h.service.detail(id)).status,"denied");h.options.noSession=true;
  assert.equal((await h.service.detail(id)).status,"denied");assert.equal(h.calls.filter(call=>call==="claims").length,3);
  assert.equal(h.calls.filter(call=>typeof call==="object").length,2);
});
test("DTO strips unknown properties at every projected level",()=>{
  const value=wire("annuncio_staff_sportivo");value.secretAccount="secret";value.metadata.secret="secret";value.summary.secret="secret";
  value.summary.author.secret="secret";value.content.fields.secret="secret";
  value.content.fields.lista_esperienze=[{id:"1",titolo:"Titolo",ente:null,periodoDa:null,periodoA:null,descrizione:null,stato:null,squadraProfiloId:null,squadraIstanzaId:null,secret:"secret"}];
  value.contacts=[{id:"1",kind:"email",value:"public@example.test",referent:"Referente",secret:"secret"}];
  value.links=[{id:"1",platform:"link_annuncio",value:"https://example.test/path",secret:"secret"}];
  value.media=[{id:"9007199254740993",mimeType:"image/png",value:"https://example.test/image.png",secret:"secret"}];
  value.locations=[{id:"1",region:"Lazio",city:null,secret:"secret"}];
  const dto=parseDetailResponse(value,id);assert(!JSON.stringify(dto).includes("secret"));assert.equal(dto.complete,true);
  assert.equal(dto.media[0].id,"9007199254740993");assert.equal(dto.contacts[0].valid,true);
});
test("stored links require absolute HTTP(S), reject credentials and controls, and are never fetched",()=>{
  for(const value of ["javascript:alert(1)","data:text/html,x","//external.test/path","/api/admin","mailto:a@example.test","file:///etc/passwd", "https://user:pass@example.test/","https://example.test/\npath","https://", "x".repeat(2049)])assert.equal(detailUrl(value),null);
  assert.equal(detailUrl(" HTTPS://EXAMPLE.TEST/a "),"https://example.test/a");
  const value=wire();value.links=[{id:"1",platform:"custom",value:"javascript:alert(1)"}];
  value.media=[{id:"1",mimeType:"image/svg+xml",value:"https://example.test/file.svg"},{id:"2",mimeType:null,value:"data:image/png,x"}];
  const dto=parseDetailResponse(value,id);assert.equal(dto.links[0].url,null);assert.equal(dto.media[1].url,null);
  assert.equal(dto.media[0].mimeType,"image/svg+xml");assert.equal(dto.complete,false);assert(dto.issues.includes("UNSAFE_LINK"));
  // A MIME is descriptive only. The DTO contains no embed/html/download behavior.
});
test("contact validation preserves read-only values without inventing account contacts or active URIs",()=>{
  const value=wire();value.contacts=[{id:"1",kind:"telefono",value:"+39 (333) 1234567",referent:null},
    {id:"2",kind:"email",value:"a@example.test?subject=unsafe",referent:null},{id:"3",kind:"unknown",value:"legacy",referent:null}];
  const dto=parseDetailResponse(value,id);assert.equal(dto.contacts[0].kind,"phone");assert.equal(dto.contacts[0].valid,true);
  assert.equal(dto.contacts[1].valid,false);assert.equal(dto.contacts[2].kind,"unknown");assert(dto.issues.includes("INVALID_CONTACT"));
  assert(dto.contacts.every(contact=>!Object.hasOwn(contact,"href")));
});
test("malformed legacy schedule/history is marked incomplete without rendering arbitrary JSON",()=>{
  const value=wire("annuncio_campo_impianto");value.content.fields.orari=[{giorno:"lunedi",attivo:true,dalle:"99:00",alle:null},{giorno:"lunedi",attivo:null,dalle:null,alle:null}];
  const dto=parseDetailResponse(value,id);assert.equal(dto.complete,false);assert(dto.issues.includes("INVALID_FIELD:orari"));
  const staff=wire("annuncio_staff_sportivo");staff.content.fields.lista_esperienze=[{id:null,titolo:null,ente:null,periodoDa:"yesterday",periodoA:null,descrizione:null,stato:"legacy",squadraProfiloId:null,squadraIstanzaId:null}];
  assert(parseDetailResponse(staff,id).issues.includes("INVALID_FIELD:lista_esperienze"));
});
test("malformed envelopes, IDs, content and collection ordering fail closed",()=>{
  const mutations=[v=>{v.summary.id="eeeeeeee-eeee-4eee-8eee-000000009999";},v=>{v.contentFingerprint="row-only";},
    v=>{v.content.fields.ruoli_principali={secret:true};},v=>{v.content.type="annuncio_creators";},v=>{delete v.content.fields.descrizione_aggiuntiva;},
    v=>{v.metadata.updatedById="invalid";},v=>{v.metadata.priorityStartsAt="2026-01-01T00:00:00Z";},v=>{v.issues=["raw SQL error"];},
    v=>{v.complete=false;},v=>{v.contacts=[{id:"1",kind:"email",value:"a@example.test",referent:null},{id:"1",kind:"email",value:"b@example.test",referent:null}];},
    v=>{v.locations=Array(101).fill({id:"1",region:"Lazio",city:null});},v=>{v.media=[{id:9007199254740993,mimeType:null,value:"https://example.test"}];}];
  for(const mutate of mutations){const value=wire();mutate(value);assert.throws(()=>parseDetailResponse(value,id),/RESPONSE_INVALID/);}
});

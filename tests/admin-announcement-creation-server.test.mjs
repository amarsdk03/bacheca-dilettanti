import assert from "node:assert/strict";
import {test} from "node:test";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
import {creationInput,creationDomain} from "./helpers/admin-creation-data.mjs";
const {createAnnouncementCreation,inspectImage,validCreationInput,parseAuthors}=adminServerLoader()("apps/admin/src/features/annunci/create/service.ts");
const {parseWhatsAppMessage}=adminServerLoader()("apps/admin/src/features/annunci/create/whatsapp-parser.ts");
const actorId="11111111-1111-4111-8111-111111111111";
const receipt={status:"success",publicationId:actorId,announcementId:actorId,announcements:[{id:actorId,region:"Lombardia",status:"in_revisione"}],idempotent:false};
test("the Admin form and server share canonical validation for all six anonymous profile types",()=>{
  for(const type of ["giocatore","squadra","staff-sportivo","arbitro","torneo-evento","campi-impianti-sportivi"]){
    const input=creationInput(type);assert.deepEqual(creationDomain.validateCreation(input),[],type);
    const normalized=creationDomain.normalizeCreation(input);assert.ok(normalized.profileDraft);assert.equal(normalized.newsletterSubscribed,false);
  }
  const invalid=creationInput();invalid.profile.birthDate="2026-02-30";
  assert.ok(creationDomain.validateCreation(invalid).some(issue=>issue.path==="profile.birthDate"));
  invalid.announcement.publicPhone="";assert.ok(creationDomain.validateCreation(invalid).some(issue=>issue.path==="announcement.publicEmail"));
});
test("authorization precedes processing; no storage or RPC is reached on a denied session",async()=>{
  const service=createAnnouncementCreation({session:async()=>{throw new Error("ADMIN_ACCESS_DENIED")},upload:async()=>assert.fail("upload")});
  assert.equal((await service.submit(creationInput())).status,"denied");
  assert.equal((await service.search("Mario")).status,"denied");
  assert.equal((await service.receipt(actorId)).status,"denied");
});
test("request validation rejects malformed persisted input, source links and restricted anonymous profiles",()=>{
  assert.equal(validCreationInput({...creationInput(),announcement:{title:{unsafe:true}}}),false);
  assert.equal(validCreationInput({...creationInput(),provenance:{source:"whatsapp",rawText:"message",messageUrl:"https://whatsapp.com.attacker.test/"}}),false);
  for(const type of ["servizi-consulenze","creators"])assert.ok(creationDomain.validateCreation(creationInput(type)).some(i=>i.path==="author.profileId"));
  assert.throws(()=>parseAuthors([{id:actorId,name:"A",email:"a@example.test",profiles:[{id:"invalid"}]}]));
});
test("creation sends normalized details, private provenance and an idempotency identifier",async()=>{
  const calls=[];
  const service=createAnnouncementCreation({session:async()=>({actorId,rpc:async(name,args)=>{calls.push([name,args]);return {data:name.includes("get_")?null:receipt,error:null}}}),upload:async()=>assert.fail("unexpected upload")});
  const input=creationInput();input.provenance={source:"whatsapp",rawText:"Original",messageUrl:""};
  assert.equal((await service.submit(input)).status,"ok");
  assert.equal(calls[0][0],"admin_get_announcement_submission_v1");
  const payload=calls[1][1].p_payload;assert.equal(payload.source,"whatsapp");assert.equal(payload.original_text,"Original");assert.equal(payload.authorized,true);assert.equal(payload.profile_id,null);
  assert.deepEqual(payload.detail.categorie_ricercate,["Qualsiasi"]);
});
test("image bytes are checked, deterministic uploads are reused, and uncertain RPC results are recoverable",async()=>{
  const bytes=Uint8Array.from([137,80,78,71,13,10,26,10,0,0]);const image=inspectImage(bytes);
  assert.throws(()=>inspectImage(Uint8Array.from([60,115,118,103,62])));
  const paths=[];let exists=false;
  const service=createAnnouncementCreation({session:async()=>({actorId,rpc:async(name)=>({data:name.includes("get_")?(exists?receipt:null):receipt,error:null})}),upload:async(path)=>paths.push(path)});
  const input={...creationInput(),image};
  assert.equal((await service.submit(input,bytes)).status,"ok");assert.equal(paths[0],`${actorId}/${input.submissionId}/${image.hash}.png`);
  exists=true;assert.equal((await service.submit(input)).status,"ok");assert.equal(paths.length,1);
  const uncertain=createAnnouncementCreation({session:async()=>({actorId,rpc:async name=>({data:null,error:name.includes("get_")?null:{code:"NETWORK"}})}),upload:async()=>{}});
  assert.equal((await uncertain.submit(creationInput())).status,"unknown");
});
test("WhatsApp recognizes the nine templates and keeps missing dates and conflicting locations as field issues",()=>{
  const headings=["🔵 GIOCATORE CERCA SQUADRA","🟢 SQUADRA CERCA GIOCATORI","🟣 STAFF CERCA OPPORTUNITÀ","🟠 SQUADRA CERCA STAFF","⚪ CERCASI AMICHEVOLE","🤝 SOCIETÀ CERCA SPONSOR","🏟️ CAMPO SPORTIVO DISPONIBILE PER AFFITTO","🏆 TORNEO / EVENTO CALCISTICO","🟠 SOCIETÀ CERCA STAFF"];
  const targets=["player","team-player","staff","team-staff","match","sponsor","facility","event","team-staff"];
  headings.forEach((heading,i)=>assert.equal(parseWhatsAppMessage(`${heading}\n📍 Zona: Milano / Lombardia\n⚽ Calcio: 11\n📲 Contatto: test@example.test`).target?.id,targets[i]));
  const partial=parseWhatsAppMessage(`${headings[0]}\n📍 Zona: Milano / Lombardia\n⚽ Calcio: 11\n📅 Anno: 2004\n#Lazio`);
  assert.ok(partial.issues.some(i=>i.path==="profile.birthDate"));
  assert.ok(partial.issues.some(i=>i.path==="announcement.locations"));
  assert.equal(partial.profile.birthDate,undefined);assert.equal(partial.profile.region,undefined);
  assert.equal(parseWhatsAppMessage("Intestazione non nota").blocked,true);
});

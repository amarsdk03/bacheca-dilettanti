import assert from "node:assert/strict";
import {test} from "node:test";
import {createRequire} from "node:module";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
import {creationInput} from "./helpers/admin-creation-data.mjs";
const load=adminServerLoader(), base="apps/admin/src/features/annunci/";
const {WHATSAPP_TEMPLATES,generateWhatsAppMessage}=load(base+"whatsapp/templates.ts");
const {WHATSAPP_LABELS,whatsappLabel,canPrepareWhatsApp}=load(base+"whatsapp/model.ts");
const {validWhatsAppSave,createWhatsAppService}=load(base+"whatsapp/service.ts");
const {createAnnouncementCreation}=load(base+"create/service.ts");
const id="11111111-1111-4111-8111-111111111111", fingerprint="content-v1:"+"a".repeat(64);
function detail(type,fields={}) {return {summary:{id,type,title:null,displayTitle:"Titolo pubblico",status:"pubblicato",hidden:false,private:false,whatsappAvailable:true,author:{available:true,anonymous:false,displayName:"Società pubblica"}},content:{type,fields},locations:[{region:"Lombardia",city:"Milano"}],contacts:[{kind:"phone",valid:true,value:"+393331234567"},{kind:"unknown",valid:false,value:"PRIVATE_CONTACT"}],origin:{rawText:"PRIVATE_SOURCE"},contentFingerprint:fingerprint};}
test("all eleven types have editable format definitions, temporary formats and a safe fallback",()=>{
  assert.equal(Object.keys(WHATSAPP_TEMPLATES).length,11);
  for(const [type,template] of Object.entries(WHATSAPP_TEMPLATES)) {
    const generated=generateWhatsAppMessage(detail(type,{tipologie_sport:["Calcio 11"],descrizione_aggiuntiva:"Prima riga\nSeconda riga"}),"https://example.test/annuncio");
    assert(generated.text.startsWith(template.heading));assert(generated.text.includes("📍 Zona: Milano, Lombardia"));assert(generated.text.includes("📲 Contatto: +393331234567"));
    assert(generated.text.includes("Prima riga\nSeconda riga"));assert(generated.text.includes("#Lombardia"));assert(!generated.text.includes("PRIVATE_"));
  }
  for(const type of ["annuncio_arbitro","annuncio_creators","annuncio_servizi_consulenze"])assert.equal(WHATSAPP_TEMPLATES[type].temporary,true);
  const fallback=generateWhatsAppMessage(detail("annuncio_futuro"));assert.equal(fallback.temporary,true);assert(fallback.text.includes("Titolo pubblico"));
});
test("templates keep anonymity, zero prices and actual dates without fabricating absent fields",()=>{
  const d=detail("annuncio_campo_impianto",{costo_partenza:0});d.summary.author.anonymous=true;d.summary.author.displayName="PRIVATE_NAME";
  const text=generateWhatsAppMessage(d).text;
  assert(text.includes("💰 Costo: 0"));assert(!text.includes("PRIVATE_NAME"));assert(!text.includes("undefined"));
  const player=generateWhatsAppMessage(detail("annuncio_giocatore",{ruoli_principali:["Portiere"]})).text;
  assert(!player.includes("📅 Anno:"));assert(player.includes("🧍 Ruolo: Portiere"));
  const staff=generateWhatsAppMessage(detail("annuncio_squadra_cerca_staff",{figure_ricercate:["Segretario"]})).text;
  assert(staff.startsWith("🟠 SOCIETÀ CERCA STAFF"));assert(staff.includes("#Segreteria"));
  const pending=detail("annuncio_giocatore");pending.summary.status="in_revisione";
  assert(!generateWhatsAppMessage(pending,"https://example.test/preview").text.includes("https://example.test/preview"));
});
test("classification and export availability fail closed with old, hidden or private DTOs",()=>{
  for(const [status,label] of Object.entries(WHATSAPP_LABELS))assert.equal(whatsappLabel({whatsappStatus:status}),label);
  assert.equal(whatsappLabel({fromWhatsApp:true}),"Da WhatsApp");assert.equal(whatsappLabel({fromWhatsApp:false}),"Solo sito web");assert.equal(whatsappLabel({}),"N/A");
  const row=detail("annuncio_giocatore").summary;
  assert(canPrepareWhatsApp({...row,status:"in_revisione"}));
  for(const patch of [{status:"rifiutato"},{status:"in_attesa_pagamento"},{hidden:true},{private:true},{trashed:true},{hidden:null},{whatsappAvailable:undefined}])assert.equal(canPrepareWhatsApp({...row,...patch}),false);
});
test("save validates links and versions, requires an Admin and handles bounded server failures",async()=>{
  const valid={id,text:"Messaggio",url:"https://whatsapp.com/channel/test/1",templateVersion:"2026-11-v1",version:0,fingerprint};
  assert(validWhatsAppSave(valid));
  for(const patch of [{url:"https://whatsapp.com.attacker.test/"},{url:"javascript:alert(1)"},{text:" "},{text:"x".repeat(50001)},{version:-1},{version:Number.MAX_SAFE_INTEGER},{templateVersion:"private@example.test"}])assert.equal(validWhatsAppSave({...valid,...patch}),false);
  const denied=createWhatsAppService({session:async()=>{throw Error("ADMIN_ACCESS_DENIED");}});
  assert.equal((await denied.read(id)).status,"denied");assert.equal((await denied.save(valid)).status,"denied");
  const calls=[];const service=createWhatsAppService({session:async()=>({rpc:async(name,args)=>{calls.push([name,args]);return{data:{status:"ok"},error:null};}})});
  assert.equal((await service.save(valid)).status,"ok");assert.equal(calls[0][0],"admin_save_announcement_whatsapp_v1");assert.equal(calls[0][1].p_text,valid.text);
  for(const status of ["conflict","not_allowed","not_found","invalid"]) {
    const instance=createWhatsAppService({session:async()=>({rpc:async()=>({data:{status},error:null})})});assert.equal((await instance.save(valid)).status,status);
  }
});
test("direct approval is an explicit versioned creation request; default requests preserve old hashes",async()=>{
  const calls=[],receipt={status:"success",publicationId:id,announcementId:id,idempotent:false,announcements:[{id,region:"Lombardia",status:"pubblicato"}]};
  const service=createAnnouncementCreation({session:async()=>({actorId:id,rpc:async(name,args)=>{calls.push([name,args]);return{data:name.includes("get_")?null:receipt,error:null};}}),upload:()=>assert.fail("upload")});
  assert.equal((await service.submit({...creationInput(),approveImmediately:true})).status,"ok");
  assert.equal(calls.at(-1)[0],"admin_create_announcement_v2");assert.equal(calls.at(-1)[1].p_payload.approve_immediately,true);
  await service.submit(creationInput());assert.equal(calls.at(-1)[0],"admin_create_announcement_v1");assert(!("approve_immediately" in calls.at(-1)[1].p_payload));
});
test("the approval preference persists between creations and reloads, isolates Admins and clears on logout",async()=>{
  const require=createRequire(import.meta.url),deps=Object.fromEntries(["react","react/jsx-runtime","zustand","zustand/middleware"].map(name=>[name,require(name)]));
  const {createAnnouncementDraftStore}=adminServerLoader({dependencies:deps})(base+"create/store.tsx");
  const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  const store=createAnnouncementDraftStore("A",storage);assert.equal(store.getState().approveImmediately,false);
  store.getState().setField("approveImmediately",true);store.getState().clear(true);assert.equal(store.getState().approveImmediately,true);
  const restored=createAnnouncementDraftStore("A",storage);await restored.persist.rehydrate();assert.equal(restored.getState().approveImmediately,true);
  const other=createAnnouncementDraftStore("B",storage);await other.persist.rehydrate();assert.equal(other.getState().approveImmediately,false);
  restored.getState().clear();assert.equal(restored.getState().approveImmediately,false);
});

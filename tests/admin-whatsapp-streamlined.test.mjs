import assert from "node:assert/strict";
import {test} from "node:test";
import {createRequire} from "node:module";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
import {creationInput} from "./helpers/admin-creation-data.mjs";
import {createCreationFixture} from "./helpers/admin-creation-fixture.mjs";
import {listClaims} from "./helpers/admin-announcements-fixture.mjs";

const require=createRequire(import.meta.url);
const load=adminServerLoader({dependencies:Object.fromEntries(["react","react/jsx-runtime","zustand","zustand/middleware"].map(key=>[key,require(key)]))});
const base="apps/admin/src/features/annunci/create/";
const {parseWhatsAppMessage,ageYearSuggestions}=load(base+"whatsapp-parser.ts");
const {migrateCanonicalDraft}=load(base+"canonical-draft.ts");
const {prepareCreationInput}=load(base+"input-defaults.ts");
const {EDITORIAL_CONTACTS,adminContacts,editedContacts}=load(base+"contact-defaults.ts");
const {validateCreation,normalizeCreation}=load(base+"domain.ts");
const {recordReviewCorrections,unresolvedWhatsAppIssues,whatsAppReviewIssues,reviewSeverity}=load(base+"whatsapp-review.ts");
const {createAnnouncementCreation}=load(base+"service.ts");
const {restoredDraft}=load(base+"store.tsx");

const message=`🔵 GIOCATORE CERCA SQUADRA
📍 Zona: Palermo, cerco anche fuori regione
⚽ Calcio: 11
🧍 Ruolo: Centrocampista con caratteristiche da trequartista e anche box to box.
📅 Età: 21 anni
🏆 Categoria cercata: Serie D / Eccellenza
🏟️ Categorie precedenti: Eccellenza / Promozione
📲 Contatto: 3668614371

Posso giocare anche come esterno offensivo o seconda punta.

CV e Video Highlights disponibili, oltre alle partite complete.

#Italia #Calcio11 #Eccellenza #SerieD #Giocatori`;
const context={channelRegion:"Sicilia",analyzedOn:"2026-11-16"};
function imported(text=message){
 const r=parseWhatsAppMessage(text,"","",context);
 const input={...creationInput(),version:2,profile:r.profile,announcement:r.announcement,provenance:r.provenance};
 input.canonical=migrateCanonicalDraft(input);
 return prepareCreationInput(input);
}
function completed(input=imported()){
 const next=structuredClone(input),c=next.canonical;
 Object.assign(c.profiles.giocatore,{nome:"Mario",genere:"Uomo",disponibilita:"svincolato",anno_nascita:"2005",mese_nascita:"Gennaio",giorno_nascita:"1"});
 c.profileLocations.giocatore=[{regione:"Sicilia",citta:"Palermo"}];
 const choice=whatsAppReviewIssues(next,parseWhatsAppMessage(next.provenance.rawText,"","",context)).find(issue=>issue.path==="announcement.categories")?.candidates?.[0];
 if(choice)c.details.giocatore.categorie_ricercate.push(choice);
 return next;
}

test("Palermo import extracts explicit roles and city, preserves narrative, and does not guess age, identity or other regions",()=>{
 const r=parseWhatsAppMessage(message,"","",context);
 assert.deepEqual(r.announcement.locations,[{region:"Sicilia",city:"Palermo"}]);
 assert.equal(r.profile.region,undefined);assert.equal(r.profile.name,undefined);assert.equal(r.profile.birthYear,undefined);
 assert.deepEqual(r.profile.mainRoles,["Centrocampista","Attaccante"]);
 assert(r.profile.specificRoles.includes("Trequartista"));assert(r.profile.specificRoles.includes("Seconda Punta"));
 for(const text of ["cerco anche fuori regione","box to box","Categorie precedenti: Eccellenza / Promozione","Età indicata nel messaggio: 21 anni"])assert(r.announcement.description.includes(text),text);
 assert.equal(r.announcement.publicPhone,"3668614371");
 assert(!r.issues.some(issue=>issue.code==="LOCATION"));
 const category=r.issues.find(issue=>issue.path==="announcement.categories");
 assert(category.candidates.length===2);assert(category.candidates.every(value=>!value.includes("CSI")));
 assert.equal(imported().canonical.contacts.email,"");
});

test("the selected gender narrows category suggestions, with no automatic gender or birth year",()=>{
 const input=imported(),r=parseWhatsAppMessage(message,"","",context);
 assert.equal(input.canonical.profiles.giocatore.genere,"");
 assert.equal(input.canonical.profiles.giocatore.anno_nascita,"");
 assert.deepEqual(ageYearSuggestions("21 anni","2026-11-16"),["2004","2005"]);
 assert.deepEqual(ageYearSuggestions("21 anni","2020-11-16"),["1998","1999"]);
 assert.deepEqual(ageYearSuggestions("13 anni","2026-11-16"),[]);
 input.canonical.profiles.giocatore.genere="Uomo";
 const options=whatsAppReviewIssues(input,r).find(issue=>issue.path==="announcement.categories").candidates;
 assert.equal(options.length,1);assert(options[0].startsWith("Calcio a 11 maschile::FIGC-LND"));
});

test("completed imports with narrative warnings can reach the real creation service without per-line decisions",async()=>{
 const input=completed();
 const issues=validateCreation(input);assert(!issues.some(issue=>issue.severity==="error"),JSON.stringify(issues));
 assert(issues.some(issue=>issue.severity==="warning"));
 const calls=[],id=input.submissionId;
 const service=createAnnouncementCreation({session:async()=>({actorId:id,rpc:async(name,args)=>{calls.push({name,args});return {error:null,data:name==="admin_get_announcement_submission_v1"?null:name==="admin_resolve_whatsapp_import_channel_v1"?id:{status:"success",publicationId:id,announcementId:id,announcements:[{id,region:"Sicilia",status:"in_revisione"}],idempotent:false}};}}),upload:()=>assert.fail("Unexpected upload")});
 assert.equal((await service.submit(input)).status,"ok");
 const payload=calls.at(-1).args.p_payload;
 assert.equal(payload.contacts.phone,"3668614371");assert.equal(payload.contacts.email,"");
 assert(payload.detail.descrizione_aggiuntiva.includes("box to box"));
 assert.equal(payload.profile_draft.anno_nascita,"2005");
});

test("field edits resolve only related warnings and conflicts, while missing mandatory data still block",()=>{
 const before=imported(),after=completed(before);
 after.reviewDecisions=recordReviewCorrections(before,after);
 const pending=unresolvedWhatsAppIssues(after);
 assert(!pending.some(issue=>["PROFILE_LOCATION","AGE"].includes(issue.code)||issue.path==="announcement.categories"));
 assert(pending.some(issue=>issue.path==="profile.experiences"));
 after.canonical.profiles.giocatore.nome="";
 assert(validateCreation(after).some(issue=>issue.path==="profile.name"&&issue.severity==="error"));
 const conflict=completed(imported(message+"\n#Lazio")),r=unresolvedWhatsAppIssues(conflict).find(issue=>issue.code==="REGION_CONFLICT");
 assert(r);assert.equal(reviewSeverity(r),"error");
 const unrelated=structuredClone(conflict);unrelated.canonical.title="Nuovo titolo";
 unrelated.reviewDecisions=recordReviewCorrections(conflict,unrelated);
 assert(unresolvedWhatsAppIssues(unrelated).some(issue=>issue.id===r.id));
 const corrected=structuredClone(conflict);corrected.canonical.locations=[{regione:"Lazio",citta:null}];
 corrected.reviewDecisions=recordReviewCorrections(conflict,corrected);
 assert(!unresolvedWhatsAppIssues(corrected).some(issue=>issue.id===r.id));
 corrected.canonical.locations=[{regione:"Sicilia",citta:null}];
 assert(unresolvedWhatsAppIssues(corrected).some(issue=>issue.id===r.id),"Further relevant changes invalidate the previous decision");
});

test("editorial defaults apply only when both real contacts are absent; malformed or ambiguous contacts are not hidden",()=>{
 const input=creationInput();input.announcement.publicPhone="";
 const saved=normalizeCreation(input);assert.equal(saved.contacts.email,EDITORIAL_CONTACTS.email);assert.equal(saved.contacts.phone,EDITORIAL_CONTACTS.phone);
 for(const contacts of [{email:"real@example.test",phone:""},{email:"",phone:"3331234567"},{email:"invalid@",phone:""}]){
   assert.deepEqual(adminContacts(contacts).contacts,contacts);
 }
 const empty={email:"",phone:""};assert.deepEqual(adminContacts(empty,{},false).contacts,empty);
 for(const contact of ["3331234567 / 3341234567","invalid@","12345"]){
   const input=imported(message.replace("3668614371",contact));
   assert.equal(input.canonical.contacts.email,"");assert(!Object.values(input.canonical.automaticContacts??{}).some(Boolean));
   assert(validateCreation(input).some(issue=>issue.severity==="error"&&["CONTACT_SELECTION","CONTACT_INVALID"].includes(issue.code)));
 }
 const missing=imported(message.replace("📲 Contatto: 3668614371",""));
 assert.equal(missing.canonical.contacts.email,EDITORIAL_CONTACTS.email);assert.equal(missing.canonical.contacts.phone,EDITORIAL_CONTACTS.phone);
 const {getAnnouncementValidationErrors}=load("packages/announcements/src/features/pubblica-annuncio/publish-model.ts");
 const c=completed().canonical;
 assert(getAnnouncementValidationErrors("giocatore",null,c.details,c.locations,{email:"",phone:""},c.extras,c.title,false).contacts,"Public-site validation still requires a real supplied contact");
});

test("replacing generated contacts removes only generated counterparts and preserves manually entered editorial contacts",()=>{
 const generated=adminContacts({email:"",phone:""});
 const changed={...generated.contacts,phone:"3331234567"};
 const normalized=adminContacts(changed,editedContacts(generated.contacts,changed,generated.automaticContacts));
 assert.equal(normalized.contacts.email,"");assert.equal(normalized.contacts.phone,"3331234567");
 assert.deepEqual(adminContacts({email:EDITORIAL_CONTACTS.email,phone:"3331234567"}).contacts,{email:EDITORIAL_CONTACTS.email,phone:"3331234567"});
 const restored=restoredDraft({mode:"whatsapp",activeTab:"profile",drafts:{x:{values:{},image:null,canonical:imported(message.replace("📲 Contatto: 3668614371","")).canonical,provenance:{source:"whatsapp",rawText:message,messageUrl:"",context}}}});
 assert.equal(restored.drafts.x.canonical.automaticContacts.email,true);
 assert.equal(restored.drafts.x.provenance.context.analyzedOn,"2026-11-16");
});

test("duplicate contacts require a decision, source changes invalidate it, and oversized preserved text remains editable and blocking",()=>{
 const input=completed(imported(message+"\nContatto: 3331234567"));
 const issue=unresolvedWhatsAppIssues(input).find(issue=>issue.code==="DUPLICATE");assert(issue);assert.equal(input.canonical.contacts.email,"");
 const next=structuredClone(input);next.canonical.contacts.phone="3331234567";
 next.reviewDecisions=recordReviewCorrections(input,next);
 assert(!unresolvedWhatsAppIssues(next).some(item=>item.id===issue.id));
 next.provenance.rawText+="\nNote: aggiornata";assert(unresolvedWhatsAppIssues(next).some(item=>item.id===issue.id));
 const long=imported(message+"\n\n"+"x".repeat(5100));
 assert(long.canonical.details.giocatore.descrizione_aggiuntiva.length>5000);
 assert(validateCreation(long).some(issue=>issue.severity==="error"&&issue.code==="DESCRIPTION_LIMIT"));
 const invalid=completed();invalid.canonical.profiles.giocatore.anno_nascita="2020";
 assert(validateCreation(invalid).some(issue=>issue.severity==="error"&&issue.path==="profile.birthYear"));
});

test("local database creation persists both editorial contacts through the actual Admin service and RPC",async()=>{
 const h=await createCreationFixture();
 try{
   const input=completed(imported(message.replace("📲 Contatto: 3668614371","")));
   // This fixture isolates contact persistence; linkless origin registration has
   // its own distribution fixture and migration coverage.
   input.provenance.messageUrl="https://www.whatsapp.com/channel/FixtureSource123/local1";
   const service=createAnnouncementCreation({session:async()=>({actorId:listClaims().sub,rpc:async(name,args)=>{
     const params=name==="admin_get_announcement_submission_v1"?[args.p_submission]:[args.p_submission,JSON.stringify(args.p_payload)];
     const sql=name==="admin_get_announcement_submission_v1"?"select public.admin_get_announcement_submission_v1($1) result":"select public.admin_create_announcement_v1($1,$2::jsonb) result";
     const response=await h.callAs("authenticated",listClaims(),sql,params);
     return {error:null,data:response.rows[0].result};
   }}),upload:()=>assert.fail("Unexpected upload")});
   const result=await service.submit(input);assert.equal(result.status,"ok",JSON.stringify(result));
   const rows=(await h.db.query("select tipo,valore from public.contatto_annuncio where uuid_annuncio=$1 order by tipo",[result.receipt.announcementId])).rows;
   assert.deepEqual(rows,[{tipo:"email",valore:EDITORIAL_CONTACTS.email},{tipo:"telefono",valore:EDITORIAL_CONTACTS.phone}]);
   assert.equal((await service.submit(input)).receipt.idempotent,true);
 }finally{await h.db.close();}
});

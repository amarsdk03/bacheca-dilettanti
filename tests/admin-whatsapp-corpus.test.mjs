import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
import {creationInput} from "./helpers/admin-creation-data.mjs";
const load=adminServerLoader(),base="apps/admin/src/features/annunci/create/";
const {parseWhatsAppMessage}=load(base+"whatsapp-parser.ts");
const {migrateCanonicalDraft}=load(base+"canonical-draft.ts");
const {validateCreation,creationPayload}=load(base+"domain.ts");
const {validCreationInput,createAnnouncementCreation}=load(base+"service.ts");
const {reviewBinding,unresolvedWhatsAppIssues,whatsAppReviewIssues}=load(base+"whatsapp-review.ts");
const {restoredDraft}=adminServerLoader({dependencies:{react:await import("react"),"react/jsx-runtime":await import("react/jsx-runtime"),zustand:await import("zustand"),"zustand/middleware":await import("zustand/middleware")}})(base+"store.tsx");
const corpus=JSON.parse(readFileSync(new URL("./fixtures/whatsapp-regional-corpus.json",import.meta.url),"utf8"));
// Independently authored expectations: deliberately partial; never generated from parser output.
const expected={
  1:{profile:{height:"188",foot:"Destro",specificRoles:["Mediano"]}},
  2:{profile:{mainRoles:["Difensore"]},review:"Bronze/Silver"},
  3:{profile:{height:"192",birthYear:"2007"},review:"Reggio Emilia e Modena"},
  4:{profile:{figures:["Allenatore"]},review:"UEFA B"},
  5:{announcement:{season:"26/27",mainRoles:["Portiere"]},review:"instagram"},
  6:{announcement:{figures:["Allenatore"]},review:"Esclusivamente tramite Whatsapp"},
  7:{announcement:{teamGroup:"Amatori UISP"}},
  8:{profile:{mainRoles:["Centrocampista"]},review:"esterno"},
  9:{regions:["Emilia-Romagna","Lombardia","Piemonte","Veneto"],review:"REGION_CONFLICT"},
  10:{profile:{specificRoles:["Mediano"]},review:"Botola 2"},
  11:{profile:{name:"Nomecampione Cognomecampione"},review:"offensivo"},
  12:{profile:{figures:["Allenatore"]},review:"laureato in scienze motorie"},
  13:{announcement:{requirements:"Cerchiamo un profilo alla prima esperienza"}},
  14:{profile:{sports:["Calcio 11","Calcio 7"],mainRoles:["Attaccante"]},announcement:{categories:["Qualsiasi"]}},
  15:{categories:2},
  16:{profile:{figures:["Preparatore atletico"]},review:"massoterapista"},
  17:{profile:{specificRoles:["Esterno destro"]},review:"Terzino"},
  18:{announcement:{teamGroup:"Settore Giovanile (primi calci annate dal 2018 al 2021)"}},
  19:{profile:{name:"Nomecampione"},announcement:{categories:["Qualsiasi"]}},
  20:{announcement:{yearFrom:"2009",yearTo:"2010"}},
  21:{profile:{name:"Zeta Milano U19"},announcement:{opponentCategory:"Juniores o prime squadre"},review:"12/10"},
  22:{profile:{figures:["Allenatore"]},review:"UEFA C"},
  23:{announcement:{sector:"Amatori"},absent:["announcement.publicPhone"],review:"wa.me/"},
  24:{review:"Under 17 / Prima squadra"},
  25:{announcement:{contactRole:"Padre"},absent:["profile.currentCategory"],review:"Juniores Elite Lombardia"},
  26:{profile:{nationality:"IT",name:"Nomecampione Cognomecampione"}},
  27:{announcement:{eventName:"Bomber League 2026",cost:"300",unit:"Per squadra"},review:"Primo posto 700"},
  28:{profile:{mainRoles:["Attaccante"],specificRoles:["Punta centrale"]}},
  29:{profile:{name:"Nomecampione",mainRoles:["Portiere"]},review:"Milano Est"},
  30:{announcement:{yearFrom:"2006",yearTo:"2010",mainRoles:["Difensore","Centrocampista"],contactRole:"Mister"}},
  31:{review:"attaccanti con esperienza"},
  32:{regions:["Emilia-Romagna","Lombardia","Piemonte","Veneto"],review:"REGION_CONFLICT"},
  33:{announcement:{sports:["Calcio 11","Calcio 7","Calcio 5"]},review:"Arbitro UISP"},
  34:{review:"Legnano (MI)"},
  35:{profile:{nationality:"IT",height:"174"},review:"Calcio a 11 esterno"},
  36:{profile:{figures:["Allenatore"]},review:"UEFA B (dal 2016)"},
  37:{announcement:{mainRoles:["Difensore","Attaccante"]}},
  38:{announcement:{season:"26/27"},review:"u21"},
  39:{announcement:{sports:"Calcio 11",services:"spogliatoio, docce, luci"},absent:["announcement.hourlyCost"]},
  40:{announcement:{mainRoles:["Portiere","Difensore","Centrocampista","Attaccante"]},review:"fuori quota"},
  41:{announcement:{figures:["Preparatore portieri"]}},
  42:{profile:{name:"Nomecampione Cognomecampione",specificRoles:["Difensore centrale"]}},
  43:{announcement:{mainRoles:["Portiere","Difensore","Centrocampista","Attaccante"]},review:"u15"},
  44:{profile:{name:"Nomecampione"},announcement:{travel:"Sì"}},
  45:{announcement:{mainRoles:["Portiere"],season:"26/27"},review:"11-17 anni"},
  46:{profile:{name:"SSD Consalvo"},announcement:{yearFrom:"2009",yearTo:"2009",contactRole:"Direttore Agonistica"}},
  47:{profile:{name:"ASD New Team RC5"},announcement:{yearFrom:"2007",yearTo:"2013"},absent:["announcement.publicPhone"],contacts:3},
  48:{absent:["profile.birthYear","profile.birthDate"],review:"classe 83"},
  49:{profile:{sports:"Calcio 8"},announcement:{mainRoles:["Portiere"]}},
};
test("the CSV corpus contains 49 messages and retains the cross-channel duplicate",()=>{
 assert.equal(corpus.length,49);assert.equal(new Set(corpus.map(v=>v.text.trim())).size,48);assert.equal(corpus[8].text,corpus[31].text);
});
for(const row of corpus)test("regional CSV row "+row.id+": "+row.expected.target,()=>{
 const r=parseWhatsAppMessage(row.text,"","",{channelRegion:row.region}),e=expected[row.id];
 assert.equal(r.target?.id,row.expected.target);assert.equal(r.blocked,false);
 for(const scope of ["profile","announcement"])for(const [key,value]of Object.entries(e[scope]??{}))assert.deepEqual(r[scope][key],value,scope+"."+key);
 for(const path of e.absent??[]){const [scope,key]=path.split(".");assert.equal(r[scope][key],undefined,path);}
 if(e.review)assert(JSON.stringify(r.issues).toLowerCase().includes(e.review.toLowerCase()),e.review);
 if(e.categories)assert.equal(r.announcement.categories.length,e.categories);
 if(e.contacts)assert.equal(r.issues.find(v=>v.path==="announcement.publicPhone").candidates.length,e.contacts);
 if(e.regions)assert.deepEqual(r.announcement.locations.map(v=>v.region).sort(),e.regions.sort());
 assert.equal(r.profile.region,undefined,"Search areas are never silently stored as residence");
 assert(r.issues.some(v=>v.code==="PROFILE_LOCATION"));assert.equal(new Set(r.issues.map(v=>v.id)).size,r.issues.length);
});
function canonicalInput(){const input=creationInput();input.version=2;input.canonical=migrateCanonicalDraft(input);return input;}
function approveAll(input){const s=input.provenance,r=parseWhatsAppMessage(s.rawText,s.messageUrl,s.manualTarget,s.context);input.reviewDecisions=Object.fromEntries(whatsAppReviewIssues(input,r).map(issue=>[issue.id,{action:"confirmed",binding:reviewBinding(input,issue)}]));}
test("canonical v2 preserves the same payload and rejects malformed shapes",()=>{
 const legacy=creationInput(),input=canonicalInput();assert.deepEqual(creationPayload(input),creationPayload(legacy));assert.deepEqual(validateCreation(input),[]);assert.equal(validCreationInput(input),true);
 assert.equal(validCreationInput({...input,canonical:{}}),false);assert.equal(validCreationInput({...input,canonical:{...input.canonical,contacts:[]}}),false);
});
test("review cannot authorize a changed source, changed relevant field or malformed decision",()=>{
 const input=canonicalInput();input.provenance={source:"whatsapp",rawText:corpus[1].text,messageUrl:"",context:{channelRegion:corpus[1].region}};
 assert(unresolvedWhatsAppIssues(input).length>0);approveAll(input);assert.equal(unresolvedWhatsAppIssues(input).length,0);
 input.canonical.profileLocations.giocatore=[{regione:"Lazio",citta:"Roma"}];assert(!unresolvedWhatsAppIssues(input).some(i=>i.code==="PROFILE_LOCATION"),"A completed profile location no longer needs a separate confirmation");
 approveAll(input);input.provenance.rawText+="\nAggiornamento";assert(unresolvedWhatsAppIssues(input).length>0);
 approveAll(input);const key=whatsAppReviewIssues(input,parseWhatsAppMessage(input.provenance.rawText,"","",input.provenance.context)).find(issue=>issue.code!=="PROFILE_LOCATION").id;input.reviewDecisions[key].action="bypass";assert(unresolvedWhatsAppIssues(input).some(issue=>issue.id===key));
});
test("confirming or discarding an exception never bypasses mandatory profile validation",()=>{
 const input=canonicalInput();input.provenance={source:"whatsapp",rawText:corpus[0].text,messageUrl:"",context:{channelRegion:corpus[0].region}};
 input.canonical.profiles.giocatore.giorno_nascita="";approveAll(input);assert(validateCreation(input).some(v=>v.path==="profile.birthYear"));
});
test("unreviewed imports cannot reach uploads or creation, including legacy clients",async()=>{
 const input=canonicalInput();input.provenance={source:"whatsapp",rawText:corpus[46].text,messageUrl:"",context:{channelRegion:corpus[46].region}};
 const service=createAnnouncementCreation({session:async()=>({actorId:input.submissionId,rpc(){assert.fail("No RPC before review");}}),upload(){assert.fail("No upload before review");}});
 assert.equal((await service.submit(input)).status,"invalid");assert.equal(validCreationInput({...input,version:1}),false);
});
test("session restoration retains canonical edits, review decisions and protected receipts",()=>{
 const input=canonicalInput();input.canonical.title="Bozza corretta";
 const restored=restoredDraft(JSON.parse(JSON.stringify({mode:"unregistered",activeTab:"review",drafts:{x:{values:{},canonical:input.canonical,image:null,reviewDecisions:{}}},results:{x:{status:"unknown"}}})));
 assert.equal(restored.drafts.x.canonical.title,"Bozza corretta");assert.equal(restored.results.x.status,"unknown");assert.equal(restored.drafts.x.image,null);
});
test("ambiguous and incomplete values are preserved without arbitrary defaults",()=>{
 const text="🔵 GIOCATORE CERCA SQUADRA\nZona: Lazio\nRuolo: terzino\nAnno: classe 83\nCategoria cercata: dalla prima in su\nCampo sconosciuto: dettaglio";
 const r=parseWhatsAppMessage(text,"","",{channelRegion:"Lazio"});assert.equal(r.profile.birthYear,undefined);assert.equal(r.profile.mainRoles,undefined);assert.equal(r.announcement.categories,undefined);
 assert(r.issues.some(v=>v.value.includes("dettaglio")));
});
test("preserving an exception as public text requires review again if that text is removed",()=>{
 const input=canonicalInput();input.provenance={source:"whatsapp",rawText:corpus[1].text,messageUrl:"",context:{channelRegion:corpus[1].region}};
 approveAll(input);const issue=whatsAppReviewIssues(input,parseWhatsAppMessage(input.provenance.rawText,"","",input.provenance.context)).find(i=>i.path === "announcement.categories");
 input.canonical.details.giocatore.descrizione_aggiuntiva=issue.value;
 input.reviewDecisions[issue.id]={action:"text",binding:reviewBinding(input,issue,"text")};
 assert(!unresolvedWhatsAppIssues(input).some(i=>i.id===issue.id));input.canonical.details.giocatore.descrizione_aggiuntiva="";
 assert(unresolvedWhatsAppIssues(input).some(i=>i.id===issue.id));
});
test("registered attribution conflicts are checked against the server profile",()=>{
 const input=canonicalInput();input.authorMode="registered";input.profileId=input.submissionId+":giocatore";
 input.provenance={source:"whatsapp",rawText:"🔵 GIOCATORE CERCA SQUADRA\n👕 Altro Nome\nZona: Lombardia\nCalcio: 7",messageUrl:"",context:{channelRegion:"Lombardia"}};
 const existing={id:input.profileId,type:"giocatore",draft:structuredClone(input.canonical.profiles.giocatore),locations:input.canonical.profileLocations.giocatore};
 approveAll(input);assert.equal(unresolvedWhatsAppIssues(input).length,0);
 // A forged browser snapshot does not replace the authoritative registered profile.
 input.canonical.profiles.giocatore.nome="Altro Nome";input.canonical.profiles.giocatore.cognome="";input.canonical.profiles.giocatore.tipologie_sport=["Calcio 7"];
 approveAll(input);assert(validateCreation(input,existing).some(i=>i.path.startsWith("author.review.")));
});

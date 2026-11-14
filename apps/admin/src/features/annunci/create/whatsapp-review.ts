import type {CreationInput} from "./contracts";
import {parseWhatsAppMessage, normalizeWhatsApp, importFingerprint, WHATSAPP_PARSER_VERSION, type ExtractionIssue, type WhatsAppExtraction} from "./whatsapp-parser";
export interface ReviewDecision {action:"confirmed"|"corrected"|"text"|"discarded"; binding:string}
const profileKeys:Record<string,string>={name:"nome",birthDate:"anno_nascita",birthYear:"anno_nascita",currentCategory:"categoria_attuale",sports:"tipologie_sport",mainRoles:"ruoli_sport",specificRoles:"ruoli_sport",figures:"figure_professionali",qualifications:"qualifiche_licenze",experiences:"lista_esperienze"};
const detailKeys:Record<string,string>={categories:"categorie_ricercate",mainRoles:"ruoli_principali",sports:"tipologie_sport",travel:"disponibilita_spostamento",yearFrom:"annata_da",dateFrom:"periodo_dal",timeFrom:"orario_dalle",prizes:"lista_premi_trofei",cost:"costo_partecipazione",hourlyCost:"costo_partenza",description:"descrizione_aggiuntiva"};
export function reviewBinding(input:CreationInput,issue:ExtractionIssue,action:ReviewDecision["action"]="confirmed"):string {
 const c=input.canonical,key=issue.path?.split(".")[1];
 let value:unknown=c;
 if(c){
   if(issue.code==="PROFILE_LOCATION")value=c.profileLocations[input.profileType];
   else if(key==="locations"||key==="resolvedRegions")value=c.locations;
   else if(issue.scope==="profile"){
     const p=c.profiles[input.profileType] as unknown as Record<string,unknown>;
     value=key==="birthDate"?[p.anno_nascita,p.mese_nascita,p.giorno_nascita]:p[profileKeys[key??""]??key??""]??p;
   }else if(key==="publicPhone"||key==="publicEmail")value=c.contacts;
   else {const all=Object.values(c.details);value=all.map(d=>(d as unknown as Record<string,unknown>)[detailKeys[key??""]??key??""]).filter(v=>v!==undefined);}
 }
 if(c && action === "text")value=[value,Object.values(c.details).map(detail=>{const d=detail as unknown as Record<string,unknown>;return d.descrizione_aggiuntiva ?? d.descrizione_post;})];
 // Full source comparison is deliberate: a decision never authorizes a changed message.
 return importFingerprint(JSON.stringify([WHATSAPP_PARSER_VERSION,input.provenance,input.profileType,input.teamType,input.authorMode,input.profileId,issue.id,value]));
}
export function whatsAppReviewIssues(input:CreationInput,extraction:WhatsAppExtraction):ExtractionIssue[]{
 const issues=[...extraction.issues],type=input.profileType,c=input.canonical;
 if(input.authorMode === "registered" && c){
   const p=c.profiles[type] as unknown as Record<string,unknown>;
   const imported=extraction.profile;
   const compare=(field:string,current:unknown)=>{
     const value=imported[field];if(value === undefined)return;
     const normalize=(v:unknown):unknown=>Array.isArray(v)?v.map(normalize).sort():typeof v === "string"?normalizeWhatsApp(v):v === null?"":v;
     if(JSON.stringify(normalize(value))!==JSON.stringify(normalize(current)))issues.push({id:JSON.stringify(["AUTHOR_CONFLICT",field,value,current]),code:"AUTHOR_CONFLICT",label:"Dati del profilo esistente",value:"Messaggio: "+JSON.stringify(value)+"\nProfilo: "+(current==null||current===""||Array.isArray(current)&&!current.length?"Non specificato":JSON.stringify(current)),reason:"Il messaggio riporta dati diversi dal profilo selezionato: verifica l’attribuzione. Il profilo rimane in sola lettura.",scope:"profile",path:"profile."+field});
   };
   compare("name",[p.nome ?? p.nome_societa ?? p.nome_organizzazione,p.cognome].filter(Boolean).join(" "));
   if(p.tipologie_sport!==undefined)compare("sports",p.tipologie_sport);
   const roles=p.ruoli_sport as {principali?:string[];specifici?:string[]}|undefined;
   compare("mainRoles",roles?.principali);compare("specificRoles",roles?.specifici);
   compare("birthYear",p.anno_nascita);compare("figures",p.figure_professionali);compare("nationality",p.nazionalita);
   compare("height",p.altezza == null ? "" : String(p.altezza));compare("weight",p.peso == null ? "" : String(p.peso));compare("foot",p.piede_principale);
 }
 return issues;
}
export function unresolvedWhatsAppIssues(input:CreationInput,extraction?:WhatsAppExtraction):ExtractionIssue[]{
 if(!input.provenance)return [];
 const s=input.provenance,r=extraction??parseWhatsAppMessage(s.rawText,s.messageUrl,s.manualTarget,s.context);
 return whatsAppReviewIssues(input,r).filter(issue=>{
   // Binding an existing profile must explicitly review conflicts rather than modify it.
   const decision=input.reviewDecisions?.[issue.id];
   return !decision||!["confirmed","corrected","text","discarded"].includes(decision.action)||decision.binding!==reviewBinding(input,issue,decision.action);
 });
}
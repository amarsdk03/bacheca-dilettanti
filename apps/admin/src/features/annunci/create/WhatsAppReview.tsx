"use client";
import {Button} from "@/components/ui/button";
import {Alert, AlertDescription} from "@/components/ui/alert";
import type {CreateTab, CreationInput} from "./contracts";
import type {CanonicalDraft} from "./canonical-draft";
import {reextractSource} from "./whatsapp-draft";
import {reviewBinding, type ReviewDecision, reviewSeverity, unresolvedWhatsAppIssues} from "./whatsapp-review";
import type {ExtractionIssue} from "./whatsapp-parser";

export function WhatsAppReview({input,onChange,onEdit}:{input:CreationInput;onChange:(next:CanonicalDraft,decisions:Record<string,ReviewDecision>)=>void;onEdit:(tab:CreateTab)=>void}) {
 if(!input.provenance||!input.canonical)return null;
 const c=input.canonical,extraction=reextractSource(input.provenance),pending=unresolvedWhatsAppIssues(input,extraction),decisions=input.reviewDecisions??{};
 function decide(issue:ExtractionIssue,action:ReviewDecision["action"],next=c){
   onChange(next,{...decisions,[issue.id]:{action,binding:reviewBinding({...input,canonical:next},issue,action)}});
 }
 function preserve(issue:ExtractionIssue){
   const next=structuredClone(c),key=input.profileType==="squadra"?({"Cerca giocatori":"squadraCercaGiocatore","Cerca staff":"squadraCercaStaff","Cerca partite amichevoli":"squadraCercaPartita","Cerca sponsor":"squadraCercaSponsor"} as const)[input.teamType]:({giocatore:"giocatore","staff-sportivo":"staffSportivo",arbitro:"arbitro","torneo-evento":"torneoEvento","campi-impianti-sportivi":"campoImpianto","servizi-consulenze":"serviziConsulenze",creators:"creator"} as const)[input.profileType];
   const detail=next.details[key] as unknown as Record<string,unknown>,field=input.profileType==="creators"?"descrizione_post":"descrizione_aggiuntiva";
   detail[field]=[detail[field],issue.label+": "+issue.value].filter(Boolean).join("\n\n");decide(issue,"text",next);
 }
 function candidate(issue:ExtractionIssue,value:string){
   const next=structuredClone(c),key=issue.path?.split(".")[1];
   if(issue.code==="PROFILE_LOCATION")next.profileLocations[input.profileType]=[{regione:value,citta:null}];
   else if(key==="locations"||key==="resolvedRegions"){
     const has=next.locations.some(v=>v.regione===value);next.locations=has?next.locations.filter(v=>v.regione!==value):[...next.locations,{regione:value,citta:null}];
     decide(issue,"corrected",next);return;
   }else if(key==="categories"){
     const d=input.profileType==="giocatore"?next.details.giocatore:next.details.staffSportivo;
     d.categorie_ricercate=[...new Set([...d.categorie_ricercate,value])];decide(issue,"corrected",next);return;
   }else if(key==="publicPhone"||key==="publicEmail"){
     if(value.includes("@"))next.contacts.email=value;else next.contacts.phone=value;
     decide(issue,"corrected",next);return;
   }
   decide(issue,"corrected",next);
 }
 const blocking=pending.filter(issue=>reviewSeverity(issue)==="error");
 return <section className="grid gap-4" aria-label="Revisione estrazione WhatsApp">
   <h3 className="text-base font-semibold">Revisione estrazione WhatsApp</h3>
   <Alert variant={blocking.length?"danger":pending.length?"warning":"success"}><AlertDescription>{blocking.length?blocking.length+" conflitti da risolvere prima dell’invio.":pending.length?"Gli avvisi seguenti non bloccano l’invio. Controlla i dati nel riepilogo.":"Nessun conflitto nell’estrazione. Restano valide le verifiche dei campi obbligatori."}</AlertDescription></Alert>
   {pending.map(issue=>{
     const blocking=reviewSeverity(issue)==="error",regions=issue.code==="PROFILE_LOCATION"?[...new Set((extraction.announcement.locations as {region:string}[]|undefined)?.map(v=>v.region)??[String(extraction.announcement.region??"")])].filter(Boolean):issue.candidates??[];
     const preserved=Object.values(c.details).some(detail=>{const d=detail as unknown as Record<string,unknown>;return String(d.descrizione_aggiuntiva??d.descrizione_post??"").includes(issue.value);});
     return <article key={issue.id} className="grid gap-3" data-review-state={blocking?"error":"warning"}>
       <Alert variant={blocking?"danger":"warning"}><AlertDescription><strong>{issue.label}</strong><p className="whitespace-pre-wrap">{issue.value}</p><p>{issue.reason}</p>{preserved&&<p>Informazione conservata nella descrizione.</p>}</AlertDescription></Alert>
       <>
         {regions.length>0&&<div className="flex flex-wrap gap-2">{regions.map(value=><Button key={value} type="button" variant="outline" size="sm" aria-pressed={issue.code==="REGION_CONFLICT"?c.locations.some(v=>v.regione===value):undefined} onClick={()=>candidate(issue,value)}>{issue.code==="PROFILE_LOCATION"?"Usa per il profilo: ":"Seleziona: "}{value.replaceAll("::"," · ")}</Button>)}</div>}
         <div className="flex flex-wrap gap-2">
           <Button type="button" variant="outline" size="sm" onClick={()=>onEdit(issue.code==="AUTHOR_CONFLICT"?"author":issue.scope==="profile"?"profile":/public/.test(issue.path??"")?"contacts":"announcement")}>Modifica campi</Button>
           {blocking&&<Button type="button" variant="outline" size="sm" onClick={()=>decide(issue,"confirmed")}>Conferma i campi attuali</Button>}
           {!blocking&&!preserved&&!['PROFILE_LOCATION','AGE'].includes(issue.code)&&<Button type="button" variant="outline" size="sm" onClick={()=>preserve(issue)}>Conserva nelle informazioni aggiuntive</Button>}
           {!blocking&&<Button type="button" variant="ghost" size="sm" onClick={()=>decide(issue,"discarded")}>Ignora avviso</Button>}
         </div>
       </>
     </article>;
   })}
 </section>;
}

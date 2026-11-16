import {isValidIsoDate} from "@bacheca/announcements/features/pubblica-annuncio/publish-field-validation";
import {REGIONI_ITALIANE} from "@bacheca/announcements/const/defaultConstants";
import {
	PLAYER_PRIMARY_ROLES,
	PLAYER_SPECIFIC_ROLES_BY_PRIMARY
} from "@bacheca/announcements/features/profilo/player-roles";
import {
	ANY_CATEGORY,
	CATEGORY_FILTER_OPTIONS
} from "@bacheca/announcements/features/pubblica-annuncio/types/category-catalog";
import {
	STAFF_CATEGORY_FILTER_OPTIONS
} from "@bacheca/announcements/features/pubblica-annuncio/types/staff-category-catalog";
import {TEAM_CATEGORY_OPTIONS} from "@bacheca/announcements/features/profilo/team-category-catalog";
import {FIGURA_PROFESSIONALE_OPTIONS} from "@bacheca/announcements/features/pubblica-annuncio/types/pubblicaAnnuncio";
import type {MockProfileType, MockTeamType, MockValues} from "./prototype-model";
import {publicationToday} from "./date-defaults";

export interface WhatsAppTarget {id:string; label:string; profileType:MockProfileType; teamType?:MockTeamType}
export const WHATSAPP_TARGETS: readonly WhatsAppTarget[] = [
  {id:"player",label:"Giocatore cerca squadra",profileType:"giocatore"},
  {id:"team-player",label:"Squadra cerca giocatori",profileType:"squadra",teamType:"Cerca giocatori"},
  {id:"staff",label:"Staff cerca opportunità",profileType:"staff-sportivo"},
  {id:"team-staff",label:"Squadra / società cerca staff",profileType:"squadra",teamType:"Cerca staff"},
  {id:"match",label:"Cercasi amichevole",profileType:"squadra",teamType:"Cerca partite amichevoli"},
  {id:"sponsor",label:"Società cerca sponsor",profileType:"squadra",teamType:"Cerca sponsor"},
  {id:"referee",label:"Arbitro disponibile",profileType:"arbitro"},
  {id:"facility",label:"Campo sportivo disponibile per affitto",profileType:"campi-impianti-sportivi"},
  {id:"event",label:"Torneo / evento calcistico",profileType:"torneo-evento"},
];
export interface ExtractionItem {label:string; value:string}
export interface ExtractionIssue extends ExtractionItem {id:string; code:string; scope:"source"|"profile"|"announcement"; reason:string; path?:string; candidates?:string[]}
export interface WhatsAppImportContext {channelRegion:string; resolvedRegion?:string; resolvedRegions?:string[]; analyzedOn?:string}
export interface WhatsAppProvenance {source:"whatsapp"; messageUrl:string; rawText:string; context?:WhatsAppImportContext; manualTarget?:string}
export interface WhatsAppExtraction {
  target:WhatsAppTarget|null; profile:MockValues; announcement:MockValues; recognized:ExtractionItem[];
  issues:ExtractionIssue[]; unmapped:ExtractionItem[]; provenance:WhatsAppProvenance; blocked:boolean; regionConflict?:string[];
}
export const WHATSAPP_CONTENT_LIMIT=50_000;
export const WHATSAPP_PARSER_VERSION=4;
/** Stable change detector, not an authorization token or a signature. */
export function importFingerprint(value:string):string {
 return [0x811c9dc5,0x9e3779b9,0x85ebca6b,0xc2b2ae35].map(seed=>{
   let hash=seed;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),0x01000193);
   return (hash>>>0).toString(16).padStart(8,"0");
 }).join("");
}
const REGIONS=REGIONI_ITALIANE.map(region=>region.nome);
export const normalizeWhatsApp=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const norm=normalizeWhatsApp;
const empty=(v:string)=>!v.trim()||/^(?:-|–|—|non indicat[oaie](?: ancora)?|non specificat[oaie]|nessun[oa]?|nessuna categoria|nessuno al momento|n a)$/i.test(v.trim());
const trim=(v:string)=>v.replace(/^[\s\u200B-\u200F\u2060\uFEFF*_[\]]+|[\s*_[\]]+$/g,"").trim();
const aliases:Record<string,string[]>={
 zone:["zona","zona di ricerca","località","localita"],sport:["calcio","tipologia del campo","tipologia campo"],
 roles:["ruolo","ruoli","ruoli cercati"],birthYear:["anno","anno di nascita"],age:["età","eta"],name:["nome","nome e cognome"],company:["società","nome società"],
 soughtCategory:["categoria cercata","categoria settore cercato"],category:["categoria","categorie","categoria squadra","categoria attuale"],history:["categorie precedenti","esperienze","esperienza"],
 contact:["contatto","contatti","contatti per prenotazioni","candidature"],requirements:["requisiti"],period:["periodo","data periodo"],availability:["disponibilità"],
 years:["annate età","categorie annate"],figure:["figura","figura cercata","ruolo cercato"],qualifications:["qualifiche"],travel:["spostamento","trasferta"],commitment:["impegno","impegno settimanale","disponibilità oraria"],
 time:["orario","orario indicativo"],field:["campo disponibile"],opponent:["avversario cercato"],notes:["note","informazioni aggiuntive"],sector:["categoria settore","settore"],search:["ricerca"],offer:["visibilità offerta"],
 cost:["costo","costo iscrizione"],services:["servizi inclusi"],venue:["campo"],teams:["squadre cercate"],level:["livello indicativo"],prizes:["premi"],deadline:["scadenza iscrizioni"],registration:["iscrizioni","modalità iscrizioni","modalità iscrizione"],eventName:["nome torneo","nome evento","nome torneo evento"],
};
const keys=new Map(Object.entries(aliases).flatMap(([key,labels])=>labels.map(label=>[norm(label),key])));
function heading(value:string):string|undefined {
 const v=norm(value);
 if(/^giocatore cerca squadra$/.test(v))return "player";
 if(/^squadra cerca (?:giocatori?|portier[ei])(?: calcio femminile)?$/.test(v))return "team-player";
 if(v==="staff cerca opportunita")return "staff";
 if(/^(?:squadra|societa)(?: societa)? cerca staff$/.test(v))return "team-staff";
 if(/^(?:cercasi amichevole|squadra cerca amichevole)$/.test(v))return "match";
 if(/^(?:societa|squadra) cerca sponsor$/.test(v))return "sponsor";
 if(v==="arbitro disponibile")return "referee";
 if(v==="campo sportivo disponibile per affitto")return "facility";
 if(v==="torneo evento calcistico")return "event";
}
export function whatsappLinkError(value:string):string|null {
 if(!value.trim())return null;
 try {const u=new URL(value.trim());if(u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&(u.hostname==="wa.me"||u.hostname==="whatsapp.com"||u.hostname.endsWith(".whatsapp.com")))return null;}catch{}
 return "Inserisci un collegamento HTTPS di WhatsApp valido oppure lascia vuoto il campo.";
}
export function ageYearSuggestions(value: string, referenceDate = publicationToday()): string[] {
 const match=/^(\d{1,3})(?:\s*anni)?$/i.exec(value.trim());
 if(!match||!isValidIsoDate(referenceDate))return [];
 const age=Number(match[1]),year=Number(referenceDate.slice(0,4));
 if(age<14||age>125)return [];
 return [year-age-1,year-age].filter(year=>year>=1900).map(String);
}
export const needsContactSelection = (extraction?: WhatsAppExtraction | null) => Boolean(extraction?.issues.some(issue=>["CONTACT_SELECTION","CONTACT_INVALID"].includes(issue.code)||issue.code==="DUPLICATE"&&issue.path==="announcement.publicPhone"));
export function parseWhatsAppMessage(rawText:string,messageUrl="",manualTarget="",context?:WhatsAppImportContext):WhatsAppExtraction {
 const result:WhatsAppExtraction={target:null,profile:{},announcement:{},recognized:[],issues:[],unmapped:[],provenance:{source:"whatsapp",rawText,messageUrl:messageUrl.trim(),...(manualTarget?{manualTarget}:{}),...(context?{context}:{})},blocked:false};
 const issue=(label:string,value:string,reason:string,scope:ExtractionIssue["scope"]="announcement",field?:string,code="EXCEPTION",candidates?:string[])=>{
   const path=field?scope+"."+field:undefined;
   const id=code+":"+importFingerprint(JSON.stringify([code,scope,field??label,value]));
   if(!result.issues.some(item=>item.id===id))result.issues.push({id,code,label,value,reason,scope,path,...(candidates?.length?{candidates}:{})});
 };
 if(!rawText.trim()||rawText.length>WHATSAPP_CONTENT_LIMIT){issue("Contenuto","","Incolla un solo messaggio, entro 50.000 caratteri.","source","rawText");result.blocked=true;return result;}
 if(context&&!REGIONS.includes(context.channelRegion)){issue("Regione del canale","","Seleziona la regione del canale.","source","channelRegion");result.blocked=true;}
 if(whatsappLinkError(messageUrl)){issue("Link messaggio",messageUrl,whatsappLinkError(messageUrl)!,"source","messageUrl");result.blocked=true;}
 const lines=rawText.replace(/\r\n?/g,"\n").split("\n").map(trim),first=lines.findIndex(Boolean);
 const targetId=manualTarget||heading(lines[first]);result.target=WHATSAPP_TARGETS.find(item=>item.id===targetId)??null;
 if(!result.target){issue("Tipologia",lines[first],"Intestazione non riconosciuta: scegli manualmente la tipologia.","source","manualTarget");result.blocked=true;return result;}
 const target=result.target, fields=new Map<string,{label:string;values:string[]}>(),free:string[]=[],hashtags:string[]=[];
 let active="",beforeFields=true;
 const insert=(key:string,label:string,value:string)=>{const entry=fields.get(key)??{label,values:[]};entry.values.push(value);fields.set(key,entry);active=key;};
 for(const line of lines.slice(first+1)){
   if(!line){active="";continue;}
   if(line.startsWith("#")){hashtags.push(line);active="";continue;}
   if(/^bacheca dilettanti raccoglie il contatto|^accordi e valutazioni restano/.test(norm(line)))continue;
   const match=/^([^:]{1,90}):\s*(.*)$/.exec(line),key=match?keys.get(norm(match[1])):undefined;
   // Names inside a contact bullet list are values, not new template fields.
   if(active==="contact"&&/^[-–•]/.test(line)){fields.get(active)!.values[fields.get(active)!.values.length-1]+="\n"+line;continue;}
   if(match&&key){insert(key,match[1].replace(/^[^\p{L}\p{N}]+/u,""),match[2]);beforeFields=false;continue;}
   if(beforeFields&&!match&&(target.id==="event"||/^👕/.test(line))){insert(target.id==="event"?"eventName":target.profileType==="squadra"?"company":"name","Nome",line.replace(/^👕\s*/,""));beforeFields=false;active="";continue;}
   if(match&&!/^https?$/i.test(match[1])&&active!=="contact"){insert("unknown:"+norm(match[1]),match[1],match[2]);beforeFields=false;continue;}
   if(active){const entry=fields.get(active)!;entry.values[entry.values.length-1]+="\n"+line;}else free.push(line);
 }
 const used=new Set<string>();
 const duplicateFields:Record<string,["profile"|"announcement",string]>={zone:["announcement","locations"],contact:["announcement","publicPhone"],birthYear:["profile","birthDate"],age:["profile","birthDate"],name:["profile","name"],soughtCategory:["announcement","categories"],roles:[target.id==="player"?"profile":"announcement","mainRoles"]};
 const read=(key:string):string=>{const entry=fields.get(key);if(!entry)return "";const values=[...new Set(entry.values.map(trim))];if(values.length>1){const [scope,field]=duplicateFields[key]??["announcement",undefined];issue(entry.label,values.join(" | "),"Valori duplicati discordanti: scegli quello corretto.",scope,field,"DUPLICATE");used.add(key);return "";}return empty(values[0])?"":values[0];};
 const put=(key:string,scope:"profile"|"announcement",field:string,value:MockValues[string])=>{result[scope][field]=value;used.add(key);result.recognized.push({label:fields.get(key)?.label??field,value:typeof value==="string"?value:JSON.stringify(value)});};
 const narrativeKeys=new Set(["zone","roles","soughtCategory","history","qualifications","years","prizes","cost","period","time","travel","figure"]);
 const exception=(key:string,reason:string,scope:ExtractionIssue["scope"]="announcement",field?:string,candidates?:string[])=>{const value=read(key);if(value){issue(fields.get(key)?.label??key,value,reason,scope,field,"EXCEPTION",candidates);used.add(key);result.unmapped.push({label:fields.get(key)?.label??key,value});if(narrativeKeys.has(key))free.push((fields.get(key)?.label??key)+": "+value);}};
 const append=(key:string)=>{const value=read(key);if(value){free.push((fields.get(key)?.label??key)+": "+value);used.add(key);}};
 const zone=read("zone"),regionMatches=(s:string)=>REGIONS.filter(region=>(" "+norm(s)+" ").includes(" "+norm(region)+" "));
 const explicitRegions=regionMatches(zone),hashRegions=REGIONS.filter(region=>hashtags.some(line=>[...line.matchAll(/#([^\s#]+)/g)].some(m=>norm(m[1]).replace(/ /g,"")===norm(region).replace(/ /g,""))));
 const selected=context?.resolvedRegions??(context?.resolvedRegion?[context.resolvedRegion]:undefined);
 const candidates=[...new Set([...explicitRegions,...hashRegions,...(context&&REGIONS.includes(context.channelRegion)?[context.channelRegion]:[])])];
 const conflict=Boolean(context&&candidates.some(region=>region!==context.channelRegion))||hashRegions.some(region=>explicitRegions.length&&!explicitRegions.includes(region));
 if(selected&&(!selected.length||selected.some(region=>!candidates.includes(region)))){issue("Regioni da usare",selected.join(", "),"Scegli le regioni individuate nel messaggio o nel canale.","source","resolvedRegions");result.blocked=true;}
 const regions=selected?.length?selected:explicitRegions.length?explicitRegions:hashRegions.length?hashRegions:context&&REGIONS.includes(context.channelRegion)?[context.channelRegion]:[];
 if(regions.length){
   const zoneParts=zone.split(/[,;/]+/).map(trim);
   const narrative=zoneParts.filter(value=>/\b(?:cerco|valuto|disponib|fuori regione|anche fuori|tutta italia)\b/i.test(norm(value)));
   const remainder=zoneParts.filter(value=>value&&!narrative.includes(value)&&!REGIONS.some(region=>norm(region)===norm(value)));
   const simple=regions.length===1&&remainder.length===1&&!/\be\b|\bdintorni\b|\bprovincia\b|\bcentro\b|\bnord\b|\bsud\b|\best\b|\bovest\b|\blimitrof|\bvaluto\b|\(/i.test(remainder[0])&&!/[-–]/.test(remainder[0]);
   const locs=regions.map(region=>({region,city:simple?remainder[0]:""}));
   if(target.id==="facility")Object.assign(result.announcement,locs[0]);else if(target.id!=="sponsor")result.announcement.locations=locs;
   used.add("zone");
   if(narrative.length)free.push("Zona: "+zone);
   if(conflict&&!selected){result.regionConflict=candidates;issue("Zone di ricerca",zone||candidates.join(", "),"Il testo e il canale indicano regioni differenti: conferma tutte le zone corrette.","source","locations","REGION_CONFLICT",candidates);}
   if(zone&&!simple&&!REGIONS.some(region=>norm(region)===norm(zone))){issue("Zona",zone,"Zona composta o territoriale: verifica città/comuni e conserva i dettagli utili.","announcement","locations","LOCATION");}
   issue("Zona del profilo",zone||regions.join(", "),"La zona di ricerca non identifica residenza o sede: completa e conferma separatamente la località del profilo.","profile","locations","PROFILE_LOCATION");
 }else exception("zone","Regione non determinabile: completa le località.","announcement","locations");
 let sportText=read("sport");const sports=[...new Set([...sportText.matchAll(/\b(11|8|7|5)\b/g)].map(m=>"Calcio "+m[1]))];
 const hashSports=[...new Set(hashtags.flatMap(line=>[...line.matchAll(/#?Calcio(11|8|7|5)\b/gi)].map(m=>"Calcio "+m[1])))];
 if(!sportText)sportText=hashSports.join(" / ");const football=sports.length?sports:hashSports;
 if(football.length){
   if(["player","staff","referee","event","facility"].includes(target.id))put("sport","profile","sports",football);
   else if(football.length===1)put("sport","profile","sports",football[0]);
   if(["staff","referee","event","facility"].includes(target.id))put("sport","announcement","sports",target.id==="event"||target.id==="facility"?football[0]:football);
   if((target.profileType==="squadra"||target.id==="event"||target.id==="facility")&&football.length>1)issue("Calcio",sportText,"Questo campo accetta una sola tipologia: scegli quella corretta.","announcement","sports");
   const residue=norm(sportText).replace(/\b(?:calcio|a|11|8|7|5)\b/g,"").trim();
   if(residue)append("sport");
   if(hashSports.some(value=>!football.includes(value)))issue("Calcio / hashtag",sportText,"Tipologie di calcio discordanti tra testo e hashtag.","announcement","sports");
 }
 if(target.id === "team-player" && /femminile/i.test(lines[first]))free.push("Ricerca: calcio femminile");
 const named=read(target.profileType==="squadra"?"company":"name");
 if(named){const flag=named.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u)?.[0];const name=named.replace(/[\u{1F1E6}-\u{1F1FF}]/gu,"").trim();put(target.profileType==="squadra"?"company":"name","profile","name",name);if(flag){put("name","profile","nationality",Array.from(flag).map(c=>String.fromCharCode(c.codePointAt(0)!-0x1F1E6+65)).join(""));}}
 if(target.id==="event"&&read("eventName"))put("eventName","announcement","eventName",read("eventName"));
 if (["player","staff","referee"].includes(target.id) && !result.profile.name) {
   const explicitName=/\bmi chiamo ([\p{L}][\p{L}'’ -]*?)(?=[,.]|$)/iu.exec(free.join("\n"));
   if(explicitName)put("name","profile","name",explicitName[1].trim());
 }
 if(target.id === "player"){
   const prose=free.join("\n");
   const heights=[...prose.matchAll(/\b(?:(1[2-9]\d|2[0-2]\d)\s*cm|(1[.,]\d{2}|2[.,][0-2]\d)\s*m\b)/gi)].map(m=>m[1]??String(Math.round(Number(m[2].replace(",","."))*100)));
   if(new Set(heights).size === 1)put("height","profile","height",heights[0]);
   const feet=[...prose.matchAll(/\bpiede\s+(dx|destro|sx|sinistro|ambidestro)\b/gi)].map(m=>/^(dx|destro)$/i.test(m[1])?"Destro":/^(sx|sinistro)$/i.test(m[1])?"Sinistro":"Ambidestro");
   if(new Set(feet).size === 1)put("foot","profile","foot",feet[0]);
 }
 const birth=read("birthYear");if(birth){if(/^\d{4}$/.test(birth)&&Number(birth)>=1900&&Number(birth)<=new Date().getFullYear()){put("birthYear","profile","birthYear",birth);}else exception("birthYear","Anno di nascita non riconosciuto: completa la data.","profile","birthDate");}
 const age=read("age");if(age){used.add("age");free.push("Età indicata nel messaggio: "+age);if(["player","staff","referee"].includes(target.id))issue("Età",age,"Conferma l’anno di nascita nel profilo: l’età non identifica un anno certo.","profile","birthDate","AGE");}
 const primary=[...PLAYER_PRIMARY_ROLES],specific=Object.values(PLAYER_SPECIFIC_ROLES_BY_PRIMARY).flat();
 const roleAliases:Record<string,string>={"centrocampista difensivo":"Mediano","centrocampista difensivo mediano":"Mediano","centrocampista offensivo":"Trequartista","esterno dx":"Esterno destro","esterno sx":"Esterno sinistro","difensori centrali":"Difensore centrale","difensori":"Difensore","centrocampisti":"Centrocampista","attaccanti":"Attaccante","punta":"Punta centrale"};
 if(target.id==="player"||target.id==="team-player"){
   const raw=read("roles"),main:string[]=[],detail:string[]=[],unknown:string[]=[];
   const chunks=/^(tutti|qualsiasi)$/i.test(raw)?primary:raw.split(/[,;/\n]+|\s+(?:e|o)\s+/i).map(trim).filter(Boolean);
   for(const chunk of chunks){const normalized=roleAliases[norm(chunk)]??chunk;const s=specific.find(v=>norm(v)===norm(normalized)),p=primary.find(v=>norm(v)===norm(normalized));if(s){detail.push(s);const parent=Object.entries(PLAYER_SPECIFIC_ROLES_BY_PRIMARY).find(([,values])=>values.includes(s as never))?.[0];if(parent)main.push(parent);}else if(p)main.push(p);else {const broad=primary.find(v=>norm(chunk).startsWith(norm(v)+" "));if(broad)main.push(broad);unknown.push(chunk);}}
   // Exact role names can also occur in prose; never infer sides or map box-to-box.
   const prose=norm(raw+" "+(target.id==="player"?free.join(" "):""));
   if(target.id==="player"&&!/\b(?:non|mai|tranne|eccetto)\b/.test(prose))for(const role of specific){if((" "+prose+" ").includes(" "+norm(role)+" ")){detail.push(role);const parent=Object.entries(PLAYER_SPECIFIC_ROLES_BY_PRIMARY).find(([,values])=>values.includes(role as never))?.[0];if(parent)main.push(parent);}}
   const scope=target.id==="player"?"profile":"announcement";
   if(main.length){put("roles",scope,"mainRoles",[...new Set(main)]);result[scope].specificRoles=[...new Set(detail)];}
   if(unknown.length)exception("roles","Uno o più ruoli sono descrittivi o ambigui: verifica le selezioni proposte.",scope,"mainRoles");
 }
 const select=(key:string,scope:"profile"|"announcement",field:string,options:readonly string[])=>{
   const raw=read(key);if(!raw)return;
   const synonyms:Record<string,string>={"vice allenatore":"Allenatore in seconda","preparatore dei portieri":"Preparatore portieri","disponibile":"Sì","disponibilita":"Sì","in auto":"Sì"};
   const parts=raw.split(/[,;/\n]+/).map(v=>synonyms[norm(v)]??trim(v));const found=parts.map(v=>options.find(option=>norm(option)===norm(v)));
   if(key === "figure" && !found.some(Boolean)){const prefix=[...options].sort((a,b)=>b.length-a.length).find(v=>norm(raw).startsWith(norm(v)+" "));if(prefix)found[0]=prefix;}
   if(found.some(Boolean))put(key,scope,field,["travel","registration"].includes(field)?found.find(Boolean)!:[...new Set(found.filter((v):v is string=>Boolean(v)))]);
   if(found.some(v=>!v) || key === "figure" && parts.some((v,i)=>norm(v)!==norm(found[i]??"")))exception(key,"Valore non univoco nel catalogo: scegli o completa manualmente.",scope,field);
 };
 if(target.id==="staff"||target.id==="team-staff")select("figure",target.id==="staff"?"profile":"announcement",target.id==="staff"?"figures":"figures",FIGURA_PROFESSIONALE_OPTIONS);
 const categoryRaw=read("soughtCategory"),gender=/\bfemminil/.test(norm(lines[first]+" "+categoryRaw))?"femminile":/\bmaschil/.test(norm(categoryRaw))?"maschile":"";
 if(categoryRaw&&(target.id==="player"||target.id==="staff")){
   if(/^(qualsiasi|indifferente)$/i.test(categoryRaw))put("soughtCategory","announcement","categories",[ANY_CATEGORY]);
   else {
     const catalog=target.id==="player"?CATEGORY_FILTER_OPTIONS:STAFF_CATEGORY_FILTER_OPTIONS;
     const tokens=categoryRaw.split(/[,;/]+|\s+o\s+/i).map(norm).filter(Boolean);const matched:string[]=[],suggestions:string[]=[];
     for(const token of tokens){const eligible=catalog.filter(option=>{const group=norm(option.value.split("::")[0]);return (!football.length||football.some(sport=>group.replace(/\ba\b/g,"").replace(/ +/g," ").includes(norm(sport))))&&(!gender||group.includes(gender));});const exact=eligible.filter(option=>(option.value.split("::").pop()??option.value).split(/\s+[—–]\s+/).some(part=>norm(part)===token));const possible=exact.length?exact:eligible.filter(option=>{const label=norm(option.value.split("::").pop()??option.value);return label===token||label.includes(token)&&token.length>=5;});if(possible.length===1)matched.push(possible[0].value);else suggestions.push(...possible.map(v=>v.value));}
     if(matched.length)put("soughtCategory","announcement","categories",[...new Set(matched)]);
     if(matched.length!==tokens.length)exception("soughtCategory","Categoria composta, incompleta o ambigua: scegli le voci esatte del catalogo.","announcement","categories",[...new Set(suggestions)].slice(0,20));
   }
 }
 if(target.profileType==="squadra"){
   const category=read("category")||read("sector");
   if(category){
     if(target.id==="sponsor")put(fields.has("sector")?"sector":"category","announcement","sector",category);
     else {put(fields.has("category")?"category":"sector","announcement","teamGroup",category);const matches=TEAM_CATEGORY_OPTIONS.filter(v=>norm(v.label)===norm(category));
       if(/prima squadra/i.test(category)&&matches.length===1)put("category","profile","currentCategory",matches[0].value);
       else issue("Categoria della Prima Squadra",category,"La categoria del gruppo ricercato non determina quella della Prima Squadra: selezionala nel profilo.","profile","currentCategory");}
   }
 }
 if(target.id==="team-staff"&&read("requirements"))put("requirements","announcement","requirements",read("requirements"));else append("requirements");
 if(target.id==="match"&&read("opponent"))put("opponent","announcement","opponentCategory",read("opponent"));
 if(target.id==="sponsor"&&read("offer"))put("offer","announcement","offer",read("offer"));
 if(target.id==="facility"&&read("services"))put("services","announcement","services",read("services"));
 if(["staff","referee","match"].includes(target.id))select("travel","announcement","travel",target.id==="staff"?["Sì","No","Da valutare"]:["Sì","No"]);
 const years=read("years");if(years&&["team-player","event"].includes(target.id)){
   const m=/^(?:dal\s+)?(\d{4})(?:\s*(?:-|\/|al|a)\s*(\d{4}))?$/i.exec(years);
   if(m&&Number(m[1])>=1900&&Number(m[2]??m[1])<=new Date().getFullYear()&&m[1]<=(m[2]??m[1])){put("years","announcement","yearFrom",m[1]);result.announcement.yearTo=m[2]??m[1];}
   else if(/^(?:\d{4}\s*[-,;\/]\s*){2,}\d{4}$/.test(years) && (()=>{const a=years.match(/\d{4}/g)!.map(Number);return a.every((v,i)=>v>=1900&&v<=new Date().getFullYear()&&(!i||v===a[i-1]+1));})()){
     const a=years.match(/\d{4}/g)!;put("years","announcement","yearFrom",a[0]);result.announcement.yearTo=a[a.length-1];
   }
   else if(/^(qualsiasi|nessuna richiesta specifica)$/i.test(years)){used.add("years");result.recognized.push({label:"Annate",value:"Qualsiasi"});}
   else exception("years","Età, elenco o condizioni di quota: imposta le annate senza estendere automaticamente l’insieme.","announcement","yearFrom");
 }
 for(const key of ["period","time"]){const value=read(key);if(!value)continue;
   if(target.id==="match"){
     if(key==="period"){
       const dates=value.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}[/.]\d{4}/g)??[];
       const iso=(date:string)=>{if(/^\d{4}-/.test(date))return date;const [d,m,y]=date.split(/[/.]/);return y+"-"+m.padStart(2,"0")+"-"+d.padStart(2,"0");};
       const remainder=value.replace(/\d{4}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}[/.]\d{4}/g,"").replace(/\b(?:dal|al|da|a)\b/gi,"").replace(/[\s–—-]/g,"");
       if(dates.length&&dates.length<=2&&!remainder&&dates.every(d=>{const s=iso(d);return isValidIsoDate(s);})&&iso(dates[0]!)<=iso((dates[1]??dates[0])!)){put(key,"announcement","dateFrom",iso(dates[0]!));result.announcement.dateTo=iso((dates[1]??dates[0])!);continue;}
     }else {const m=/^(\d{1,2}):([0-5]\d)\s*[-–—/]\s*(\d{1,2}):([0-5]\d)$/.exec(value);if(m&&+m[1]<24&&+m[3]<24){const a=m[1].padStart(2,"0")+":"+m[2],b=m[3].padStart(2,"0")+":"+m[4];if(a<b){put(key,"announcement","timeFrom",a);result.announcement.timeTo=b;continue;}}}
     exception(key,"Data o orario incompleti, relativi o non univoci: completa manualmente.","announcement",key==="period"?"dateFrom":"timeFrom");
   }else {if(target.profileType==="squadra"&&/^(?:\d{2}|\d{4})\s*\/\s*(?:\d{2}|\d{4})$/.test(value))put(key,"announcement","season",value);else append(key);}
 }
 const cost=read("cost");if(cost&&["facility","event"].includes(target.id)){
   const m=/^(?:€\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro)?\s*(?:a |per |\/\s*)?(squadra|giocatore|h|1h|ora)?$/i.exec(cost);
   if(/^(gratis|gratuito|gratuita)$/i.test(cost))put("cost","announcement",target.id==="facility"?"hourlyCost":"cost","0");
   else if(m&&Number(m[1].replace(",","."))<=999999.99&&(target.id==="event"?/^(squadra|giocatore)$/.test(m[2]??""):/^(h|1h|ora)$/.test(m[2]??""))){put("cost","announcement",target.id==="facility"?"hourlyCost":"cost",m[1].replace(",","."));if(target.id==="event")result.announcement.unit=m[2]==="squadra"?"Per squadra":"Per giocatore";}
   else exception("cost","Importo o unità non univoci: imposta il costo manualmente.","announcement",target.id==="facility"?"hourlyCost":"cost");
 }
 const contact=read("contact");if(contact){
   const noLinks=contact.replace(/(?:https?:\/\/|(?:www\.)?(?:wa\.me|(?:\w+\.)?whatsapp\.com)\/)\S+/gi,"LINK");
   const emails=[...new Set([...noLinks.matchAll(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map(m=>m[0]))];
   const noEmails=noLinks.replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"");
   const phones=[...new Map([...noEmails.matchAll(/(?:\+\d[\d ().\-\u00a0]{6,}\d|\b\d[\d ().\-\u00a0]{7,}\d\b)/g)].filter(m=>{const n=m[0].replace(/\D/g,"").length;return n>=8&&n<=15;}).map(m=>[m[0].replace(/\D/g,""),m[0].trim()])).values()];
   if(emails.length===1)put("contact","announcement","publicEmail",emails[0]);if(phones.length===1)put("contact","announcement","publicPhone",phones[0].replace(/\s+/g," "));
   const rawReferent=phones.reduce((s,p)=>s.replace(p,""),noEmails).trim();
   let residue=rawReferent.replace(/[\s,;/|–—-]/g,"");
   if(phones.length===1&&/^\(?Padre\)?$|^Mister$|^DirettoreAgonistica$/i.test(residue)){put("contact","announcement","contactRole",rawReferent.replace(/[()]/g,"").trim());residue="";}
   if(emails.length>1||phones.length>1)issue("Contatto",contact,"Scegli i recapiti pubblici tra quelli presenti nel messaggio.","announcement","publicPhone","CONTACT_SELECTION",[...emails,...phones]);
   else if(!emails.length&&!phones.length&&(/@/.test(noLinks)||/\d{4,}/.test(noLinks)))issue("Contatto",contact,"Il recapito indicato non è valido: correggilo oppure scegli un contatto disponibile.","announcement","publicPhone","CONTACT_INVALID");
   else if(residue||!emails.length&&!phones.length)exception("contact","Verifica le istruzioni di contatto e il referente. Non viene identificato automaticamente l’autore.","announcement","publicPhone",[...emails,...phones]);
 }
 if(["staff","referee","player"].includes(target.id)){
   exception("qualifications","Completa titolo, ente e stato della qualifica senza inventare dati.","profile","qualifications");
   exception("history","Esperienza narrativa: completa le voci strutturate oppure conserva il testo.","profile","experiences");
 }
 if(target.id==="referee" && norm(read("figure")) === "arbitro")used.add("figure");
 if(target.id==="event"){
   if(read("teams")&&/^\d+$/.test(read("teams")))put("teams","announcement","teams",read("teams"));
   select("registration","announcement","registration",["Libera","Posti limitati"]);
   exception("prizes","Premi descritti liberamente: completa la lista premi e trofei.","announcement","prizes");
 }
 for(const key of ["commitment","field","search","venue","availability","notes","deadline","level"])append(key);
 for(const [key,entry]of fields){if(used.has(key)||empty(entry.values.join("\n")))continue;exception(key,"Informazione senza una conversione certa: verifica, conserva come testo o scarta esplicitamente.");}
 const description=[...new Set(free.filter(v=>!empty(v)))].join("\n\n");
 if(description.length<=5000&&description)result.announcement.description=description;
 else if(description){result.announcement.description=description;issue("Descrizione",description,"Oltre 5.000 caratteri: riduci il testo prima dell’invio.","announcement","description","DESCRIPTION_LIMIT");result.unmapped.push({label:"Descrizione originale",value:description});}
 if(hashtags.length)result.unmapped.push({label:"Hashtag originali",value:hashtags.join("\n")});
 return result;
}

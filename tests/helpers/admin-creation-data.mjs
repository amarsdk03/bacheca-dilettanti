import {adminServerLoader} from "./admin-server-loader.mjs";
const load=adminServerLoader();
export const creationDomain=load("apps/admin/src/features/annunci/create/domain.ts");
const model=load("apps/admin/src/features/annunci/create/prototype-model.ts");
export function creationInput(type="giocatore",team="Cerca giocatori") {
  const profile={name:"Mario",surname:"Rossi",birthDate:"2000-01-01",gender:"Uomo",nationality:"IT",sports:["Calcio 11"],availability:type==="giocatore"?"Svincolato":type==="staff-sportivo"?"Disponibile subito":"",mainRoles:["Portiere"],figures:["Allenatore"],region:"Lombardia",city:"Milano",address:"Via Campo 1",profileEmail:"office@example.test"};
  if(type==="squadra") profile.currentCategory=model.PROFILE_FIELDS.squadra.find(f=>f.key==="currentCategory").options[0];
  const announcement={sports:["Calcio 11"],categories:["Qualsiasi"],publicPhone:"+393331234567",locations:team==="Cerca sponsor"?[]:[{region:"Lombardia",city:"Milano"}],region:type==="campi-impianti-sportivi"?"Lombardia":"",city:type==="campi-impianti-sportivi"?"Milano":""};
  for(const f of type==="squadra"?model.TEAM_FIELDS[team]:model.ANNOUNCEMENT_FIELDS[type]) if(f.required) announcement[f.key]=f.options?f.kind==="multi"?[f.options[0]]:f.options[0]:"Valore di prova";
  return {version:1,submissionId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",authorMode:"unregistered",profileId:null,profileType:type,teamType:team,profile,announcement,referenceEmail:"",authorized:true};
}

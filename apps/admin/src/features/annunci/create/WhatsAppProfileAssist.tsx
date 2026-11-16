"use client";
import {Button} from "@/components/ui/button";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";
import type {CreationInput} from "./contracts";
import type {CanonicalDraft} from "./canonical-draft";
import {reextractSource} from "./whatsapp-draft";
import {ageYearSuggestions} from "./whatsapp-parser";
import {publicationToday, withBirthYearDefaults} from "./date-defaults";
import {PrototypeSelect} from "./PrototypeFields";

export function WhatsAppProfileAssist({input,onChange}:{input:CreationInput;onChange:(draft:CanonicalDraft)=>void}){
 if(!input.provenance||!input.canonical||input.authorMode !== "unregistered")return null;
 const c=input.canonical,extraction=reextractSource(input.provenance),age=extraction.issues.find(issue=>issue.code === "AGE");
 const reference=input.publicationDate||input.provenance.context?.analyzedOn||publicationToday();
 const years=age?ageYearSuggestions(age.value,reference):[];
 const birth=c.profiles[input.profileType] as unknown as Record<string,string>;
 return <FieldGroup>
   {age&&<Field><FieldLabel htmlFor="whatsapp-age-year">Anno di nascita da confermare</FieldLabel>
     <FieldDescription>Età indicata: {age.value}. Riferimento: {reference.split("-").reverse().join("/")}. Scegli l’anno corretto o compila direttamente la data di nascita. Nessun anno viene selezionato automaticamente.</FieldDescription>
     {years.length>0&&<PrototypeSelect id="whatsapp-age-year" value={years.includes(birth.anno_nascita)?birth.anno_nascita:""} options={years.map(value=>({value,label:value}))} placeholder="Scegli l’anno corretto" onChange={value=>onChange({...c,profiles:{...c.profiles,[input.profileType]:withBirthYearDefaults(c.profiles[input.profileType],"anno_nascita",value)}})}/>}
   </Field>}
   {c.locations.length>0&&<Field><Button type="button" variant="outline" className="self-start" onClick={()=>onChange({...c,profileLocations:{...c.profileLocations,[input.profileType]:c.locations.map(row=>({...row}))}})}>Copia zona di ricerca nel profilo</Button><FieldDescription>Usala solo se corrisponde anche alla località del profilo.</FieldDescription></Field>}
 </FieldGroup>;
}

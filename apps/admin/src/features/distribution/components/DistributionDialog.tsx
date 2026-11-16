"use client";
import {useEffect, useRef, useState} from "react";
import {ArrowLeft, ArrowRight, Copy} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Checkbox} from "@/components/ui/checkbox";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Textarea} from "@/components/ui/textarea";
import {Input} from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {PanelSkeleton} from "@/features/dashboard/components/ContentSkeletons";
import {useUnsavedChanges} from "@/features/navigation/UnsavedChanges";
import {Choice} from "@/features/community/components/CommunityControls";
import {readDistributionChannels, readDistributionDetail, saveDistribution} from "../server/actions";
import {
	type Channel,
	type DetailInput,
	type FailureStatus,
	messageLinkError,
	type Result,
	type SaveInput
} from "../contracts";
import type {DistributionDetail} from "../server/service";

export const FAILURE:Record<FailureStatus,string>={invalid:"Controlla i campi e il link del canale.",denied:"La sessione non è più autorizzata.",not_found:"Pubblicazione non disponibile.",not_allowed:"Canale archiviato o annuncio non pubblico: puoi consultare lo storico.",conflict:"I dati sono cambiati. Conserva il testo e ricarica prima di salvare.",unavailable:"Esito non verificabile. I campi sono conservati: riprova senza modificarli per recuperare la ricevuta.",source_exists:"L’annuncio proviene già da questo canale. Usa Ricondividi per una nuova pubblicazione.",confirmation_required:"Conferma la rimozione della pubblicazione registrata."};

export function useDistributionExit(dirty:boolean){const {setTransientDirty}=useUnsavedChanges();useEffect(()=>{setTransientDirty(dirty);const unload=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue="";}};window.addEventListener("beforeunload",unload);return()=>{setTransientDirty(false);window.removeEventListener("beforeunload",unload);};},[dirty,setTransientDirty]);}

function MessageForm({data,channels,channelId,onChannel,changed,onSave,onClose,busyChanged}: {data:DistributionDetail;channels:Channel[];channelId:string;onChannel:(id:string)=>void;changed:(dirty:boolean)=>void;onSave:()=>void;onClose:()=>void;busyChanged:(v:boolean)=>void}) {
  const stored=data.record,initial={text:stored?.text||data.generated?.text||"",url:stored?.url??"",manual:stored?.manual??false,templateVersion:stored?.templateVersion||data.generated?.templateVersion||""};
  const [draft,setDraft]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState(""),[copyStatus,setCopyStatus]=useState(""),[repost,setRepost]=useState(false),[confirm,setConfirm]=useState<"revoke"|"repost"|null>(null);
  const request=useRef<{key:string;id:string}|null>(null),textarea=useRef<HTMLTextAreaElement>(null),alive=useRef(true),[saved,setSaved]=useState(false);
  const dirty=!saved&&(JSON.stringify(draft)!==JSON.stringify(initial)||repost||!!stored&&!stored.channelId&&!!channelId);
  useEffect(()=>{changed(dirty);return()=>changed(false);},[dirty,changed]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const channel=channels.find(c=>c.id===channelId),readonly=!data.detail||stored?.superseded===true||!!stored?.channelId&&!stored.channelActive;
  const linkError=draft.manual?null:messageLinkError(draft.url,channel);
  const confirmed=draft.manual||!!draft.url.trim();
  const set=(patch:Partial<typeof draft>)=>{setSaved(false);setDraft(v=>({...v,...patch}));setError("");};
  async function save(revoke=false){
    if(busy||readonly||!data.detail||!data.sourceHash||!channelId||!draft.text.trim()||linkError)return;
    if(stored?.confirmed&&!confirmed&&!repost&&!revoke){setConfirm("revoke");return;}
    const payload:Omit<SaveInput,"requestId">={announcementId:data.detail.summary.id,channelId,...(stored?{recordId:stored.id}:{}),...draft,url:draft.manual?"":draft.url.trim(),sourceHash:data.sourceHash,version:stored?.version??0,repost,revoke};
    const key=JSON.stringify(payload);if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};
    setBusy(true);busyChanged(true);setError("");
    try{const result=await saveDistribution({...payload,requestId:request.current.id});if(!alive.current)return;if(result.status==="ok"){changed(false);setSaved(true);onSave();}else setError(FAILURE[result.status]);}catch{if(alive.current)setError(FAILURE.unavailable);}finally{if(alive.current){setBusy(false);busyChanged(false);}}
  }
  return <>
    <FieldGroup>
      {stored&&!stored.channelId&&<p className="admin-note">Esportazione precedente da assegnare al canale corretto.</p>}
      {readonly&&<Alert variant="warning"><AlertDescription>{stored?.superseded?"Versione precedente: lo storico è in sola lettura.":FAILURE.not_allowed}</AlertDescription></Alert>}
      {data.sourceHere&&!stored&&!repost&&<Alert variant="warning"><AlertDescription>Il messaggio originale proviene già da questo canale. <Button variant="outline" size="sm" onClick={()=>setConfirm("repost")}>Ricondividi</Button></AlertDescription></Alert>}
      {stored?.state==="stale"&&<Alert variant="warning"><AlertDescription>L’annuncio è cambiato. Controlla il messaggio prima di aggiornare la pubblicazione.</AlertDescription></Alert>}
      {data.generated?.temporary&&<p className="admin-note">Template provvisorio: controlla il testo prima di condividerlo.</p>}
      <Field><div className="admin-workspace-toolbar"><FieldLabel htmlFor="distribution-message">Messaggio <span className="admin-required">*</span></FieldLabel><Button type="button" variant="outline" size="sm" disabled={!draft.text} onClick={async()=>{try{await navigator.clipboard.writeText(draft.text);setCopyStatus("Messaggio copiato.");}catch{setCopyStatus("Seleziona il testo e usa Ctrl+C.");textarea.current?.focus();textarea.current?.select();}}}><Copy data-icon="inline-start" aria-hidden="true"/>Copia messaggio</Button></div>
        <Textarea ref={textarea} id="distribution-message" rows={12} maxLength={50000} value={draft.text} disabled={busy||readonly} onChange={e=>set({text:e.target.value})} aria-required="true" />{copyStatus&&<p role="status" className="admin-note">{copyStatus}</p>}
      </Field>
      {!readonly&&stored?.confirmed&&!repost&&<div className="admin-action-list"><Button variant="outline" size="sm" disabled={busy} onClick={()=>setConfirm("repost")}>Ricondividi</Button></div>}
      <Choice id="distribution-channel" label="Canale WhatsApp" value={channelId||"none"} disabled={busy||!!stored?.channelId} options={{none:"Seleziona un canale",...(stored?.channelId?{[stored.channelId]:stored.channelName??"Canale archiviato"}:{}),...Object.fromEntries(channels.map(c=>[c.id,c.name+(c.region?` · ${c.region}`:" · Nazionale")]))}} onChange={id=>{if(id!=="none")onChannel(id);}} />
      <Field data-invalid={!!linkError}><FieldLabel htmlFor="distribution-url">Link messaggio WhatsApp</FieldLabel><Input id="distribution-url" type="text" inputMode="url" maxLength={2048} value={draft.url} disabled={draft.manual||busy||readonly} aria-invalid={!!linkError} aria-describedby={linkError?"distribution-url-error":undefined} onChange={e=>set({url:e.target.value})} />{linkError&&<p id="distribution-url-error" className="admin-filter-error">{linkError}</p>}</Field>
      <Field orientation="horizontal"><Checkbox id="distribution-manual" checked={draft.manual} disabled={busy||readonly} onCheckedChange={manual=>set({manual})}/><FieldLabel htmlFor="distribution-manual">Considera pubblicato senza link</FieldLabel></Field>
      {!readonly&&(!confirmed||repost)&&<p className="admin-note">{!confirmed&&"Senza link messaggio o checkbox spuntata, il messaggio non viene considerato pubblicato."}{repost&&" Verrà registrata una nuova condivisione."}</p>}
    </FieldGroup>

    {error&&<Alert variant="warning"><AlertDescription role="alert">{error}</AlertDescription></Alert>}
    <DialogFooter><Button variant="outline" disabled={busy} onClick={onClose}>Annulla</Button><Button disabled={busy||readonly||!channelId||!draft.text.trim()||!!linkError||data.sourceHere&&!stored&&!repost} onClick={()=>{void save();}}>{busy?"Salvataggio…":"Salva modifiche"}</Button></DialogFooter>
    <AlertDialog open={!!confirm} onOpenChange={open=>{if(!open)setConfirm(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirm==="repost"?"Ricondividere l’annuncio?":"Rimuovere la conferma?"}</AlertDialogTitle><AlertDialogDescription>{confirm==="repost"?"La pubblicazione precedente resta nello storico. Copia il messaggio e conferma la nuova condivisione soltanto dopo averla effettuata.":"La registrazione tornerà una bozza. Questa operazione non cancella il messaggio su WhatsApp."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><Button variant="outline" onClick={()=>setConfirm(null)}>Annulla</Button><Button onClick={()=>{const action=confirm;setConfirm(null);if(action==="repost"){setRepost(true);set({url:"",manual:false});}else void save(true);}}>Conferma</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}

function Entry({input,onClose,onSaved,finalFocus,index,total,move}: {input:DetailInput;onClose:()=>void;onSaved:()=>void;finalFocus:()=>HTMLElement|null;index:number;total:number;move:(n:number)=>void}) {
  const [channels,setChannels]=useState<Result<Channel[]>|null>(null),[channel,setChannel]=useState(input.channelId??""),[loaded,setLoaded]=useState<{key:string;result:Result<DistributionDetail>}|null>(null),[dirty,setDirty]=useState(false),[pending,setPending]=useState<(()=>void)|null>(null),[revision,setRevision]=useState(0),[saving,setSaving]=useState(false);
  const key=JSON.stringify({...input,channelId:channel||undefined,revision});
  useDistributionExit(dirty||saving);
  useEffect(()=>{let active=true;void readDistributionChannels(input.announcementId).then(v=>{if(active)setChannels(v);}).catch(()=>{if(active)setChannels({status:"unavailable"});});return()=>{active=false;};},[revision,input.announcementId]);
  useEffect(()=>{let active=true;void readDistributionDetail({...input,channelId:channel||undefined}).then(result=>{if(active)setLoaded({key,result});}).catch(()=>{if(active)setLoaded({key,result:{status:"unavailable"}});});return()=>{active=false;};},[key,input,channel]);
  const result=loaded?.key===key?loaded.result:null;
  const guard=(action:()=>void)=>{if(saving)return;if(dirty)setPending(()=>action);else action();};
  const choices=channels?.status==="ok"?channels.data:[];
  const data=result?.status==="ok"?result.data:null;
  return <><Dialog open onOpenChange={open=>{if(!open)guard(onClose);}}><DialogContent className="admin-distribution-dialog" finalFocus={finalFocus}>
    <DialogHeader><DialogTitle>{data?.record?.title||data?.detail?.summary.displayTitle||data?.detail?.summary.title||"Esporta su WhatsApp"}</DialogTitle><DialogDescription>Prepara il messaggio e registra la pubblicazione manuale.{total>1?` Annuncio ${index+1} di ${total}.`:""}</DialogDescription></DialogHeader>
    {total>1&&<div className="admin-workspace-toolbar"><Button variant="outline" size="sm" disabled={!index} onClick={()=>guard(()=>move(index-1))}><ArrowLeft data-icon="inline-start" aria-hidden="true"/>Indietro</Button><Button variant="outline" size="sm" disabled={index>=total-1} onClick={()=>guard(()=>move(index+1))}>Salta<ArrowRight data-icon="inline-end" aria-hidden="true"/></Button></div>}
    {!result||!channels?<PanelSkeleton/>:channels.status!=="ok"||result.status!=="ok"?<Alert variant="warning"><AlertDescription>{FAILURE[channels.status!=="ok"?channels.status:result.status as FailureStatus]}<Button variant="outline" onClick={()=>setRevision(v=>v+1)}>Ricarica</Button></AlertDescription></Alert>:!choices.length&&!data?.record?<Alert><AlertDescription>Nessun canale attivo compatibile con questo annuncio. Configura una destinazione nella sezione Distribuzione.</AlertDescription></Alert>:data&&<MessageForm key={key} data={data} channels={choices} channelId={channel||data.record?.channelId||""} changed={setDirty} busyChanged={setSaving} onChannel={id=>guard(()=>setChannel(id))} onClose={()=>guard(onClose)} onSave={()=>{setDirty(false);onSaved();if(index+1<total)move(index+1);else onClose();}}/>}
  </DialogContent></Dialog><AlertDialog open={!!pending} onOpenChange={open=>{if(!open)setPending(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Modifiche non salvate!</AlertDialogTitle><AlertDialogDescription>Uscendo perderai le modifiche al messaggio.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><Button variant="outline" onClick={()=>setPending(null)}>Continua a modificare</Button><Button variant="destructive" onClick={()=>{const action=pending;setPending(null);setDirty(false);action?.();}}>Scarta modifiche</Button></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
export function DistributionDialog({input,items,onClose,onSaved,finalFocus}: {input:DetailInput;items?:DetailInput[];onClose:()=>void;onSaved:()=>void;finalFocus:()=>HTMLElement|null}) {const [index,setIndex]=useState(0);const entries=items?.length?items:[input];return <Entry key={index} input={entries[index]} index={index} total={entries.length} move={setIndex} onClose={onClose} onSaved={onSaved} finalFocus={finalFocus}/>;}

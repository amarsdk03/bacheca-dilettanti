"use client";
import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {Eye, RefreshCw, RotateCcw, Search, Send, Settings} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Checkbox} from "@/components/ui/checkbox";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
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
import {EmptyState} from "@/features/dashboard/components/ContentStates";
import {TableSkeleton} from "@/features/dashboard/components/ContentSkeletons";
import {Choice, communityDate, Pagination} from "@/features/community/components/CommunityControls";
import {useFilterDraft} from "@/features/dashboard/useFilterDraft";
import {typeLabel} from "@/features/annunci/presentation";
import {WHATSAPP_LABELS} from "@/features/annunci/whatsapp/model";
import {ADMIN_ANNOUNCEMENT_TYPES} from "@/features/annunci/contracts";
import {
	type Channel,
	channelKey,
	type DetailInput,
	distributionHref,
	type FailureStatus,
	type Page,
	parseChannel,
	parsePage,
	parsePublication,
	parseQuery,
	parseQueueItem,
	type Publication,
	type Query,
	type QueueItem,
	REGIONS,
	type Result,
	STATES,
	type View
} from "../contracts";
import {readDistributionChannels, saveDistributionChannel} from "../server/actions";
import {DistributionDialog, FAILURE, useDistributionExit} from "./DistributionDialog";

const TITLES={queue:"Da condividere",publications:"Pubblicazioni",channels:"Canali"};
function Status({state}:{state:keyof typeof STATES}){return <Badge variant={state==="published"?"success":["stale","unavailable","unassigned"].includes(state)?"warning":"neutral"}>{STATES[state]}</Badge>;}
function ChannelEditor({value,onClose,onSaved}:{value:Channel|null;onClose:()=>void;onSaved:()=>void}) {
  const initial={name:value?.name??"",url:value?.url??"",region:value?.region??"",active:value?.active??true};
  const [draft,setDraft]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState(""),[discard,setDiscard]=useState(false);
  const request=useRef<{key:string;id:string}|null>(null),dirty=JSON.stringify(initial)!==JSON.stringify(draft);
  useDistributionExit(dirty||busy);
  const close=()=>{if(busy)return;if(dirty)setDiscard(true);else onClose();};
  const set=(patch:Partial<typeof draft>)=>{setDraft(v=>({...v,...patch}));setError("");};
  return <><Dialog open onOpenChange={open=>{if(!open)close();}}><DialogContent finalFocus={false}>
    <DialogHeader><DialogTitle>{value?"Modifica canale":"Aggiungi canale WhatsApp"}</DialogTitle><DialogDescription>Registra una destinazione per le condivisioni manuali.</DialogDescription></DialogHeader>
    <form onSubmit={async e=>{e.preventDefault();if(busy||!draft.name.trim()||!channelKey(draft.url))return;const payload={...(value?{id:value.id}:{}),...draft,region:draft.region||null,version:value?.version??0};const key=JSON.stringify(payload);if(request.current?.key!==key)request.current={key,id:crypto.randomUUID()};setBusy(true);try{const result=await saveDistributionChannel({...payload,requestId:request.current.id});if(result.status==="ok"){onSaved();onClose();}else setError(FAILURE[result.status]);}catch{setError(FAILURE.unavailable);}finally{setBusy(false);}}}>
      <FieldGroup><Field><FieldLabel htmlFor="channel-name">Nome <span className="admin-required">*</span></FieldLabel><Input id="channel-name" required maxLength={120} value={draft.name} disabled={busy} onChange={e=>set({name:e.target.value})}/></Field>
      <Field data-invalid={!!draft.url&&!channelKey(draft.url)}><FieldLabel htmlFor="channel-url">URL del canale <span className="admin-required">*</span></FieldLabel><Input id="channel-url" required maxLength={2048} inputMode="url" value={draft.url} disabled={busy} placeholder="https://www.whatsapp.com/channel/…" aria-invalid={!!draft.url&&!channelKey(draft.url)} onChange={e=>set({url:e.target.value})}/><p className="admin-note">Per cambiare la destinazione di un canale già utilizzato, aggiungi un nuovo canale.</p></Field>
      <Choice id="channel-region" label="Ambito" value={draft.region||"national"} options={{national:"Nazionale",...Object.fromEntries(REGIONS.map(r=>[r,r]))}} disabled={busy} onChange={region=>set({region:region==="national"?"":region})}/>
      <Field orientation="horizontal"><Checkbox id="channel-active" checked={draft.active} disabled={busy} onCheckedChange={active=>set({active})}/><FieldLabel htmlFor="channel-active">Canale attivo</FieldLabel></Field>
      </FieldGroup>{error&&<Alert variant="warning"><AlertDescription role="alert">{error}</AlertDescription></Alert>}
      <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={close}>Annulla</Button><Button type="submit" disabled={busy||!draft.name.trim()||!channelKey(draft.url)}>{busy?"Salvataggio…":"Salva modifiche"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog><AlertDialog open={discard} onOpenChange={setDiscard}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Modifiche non salvate!</AlertDialogTitle><AlertDialogDescription>Vuoi scartare le modifiche al canale?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><Button variant="outline" onClick={()=>setDiscard(false)}>Continua a modificare</Button><Button variant="destructive" onClick={onClose}>Scarta modifiche</Button></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

export function DistributionWorkspace({initialUrl}:{initialUrl:{valid:boolean;query:Query}}) {
  const query=initialUrl.query,router=useRouter(),[revision,setRevision]=useState(0),[list,setList]=useState<{key:string;result:Result<Page<Channel|QueueItem|Publication>>}|null>(null),[channels,setChannels]=useState<Result<Channel[]>|null>(null),[selection,setSelection]=useState<string[]>([]),[channelEditor,setChannelEditor]=useState<{value:Channel|null}|null>(null),[editor,setEditor]=useState<DetailInput[]|null>(null);
  const heading=useRef<HTMLHeadingElement>(null),trigger=useRef<HTMLElement|null>(null),href=distributionHref(query),key=href+":"+revision;
  const refresh=()=>setRevision(v=>v+1),filters=useFilterDraft(query,parseQuery,distributionHref,refresh),draft=filters.draft;
  useEffect(()=>{let active=true;void readDistributionChannels().then(r=>{if(active)setChannels(r);}).catch(()=>{if(active)setChannels({status:"unavailable"});});return()=>{active=false;};},[revision]);
  useEffect(()=>{if(!initialUrl.valid)return;const abort=new AbortController();void(async()=>{try{const response=await fetch("/api/distribuzione"+href.slice("/distribuzione".length),{cache:"no-store",credentials:"same-origin",signal:abort.signal});if(response.status===403){router.replace("/accesso");return;}const raw=await response.json();if(raw.status!=="ok"){if(!["invalid","unavailable","denied"].includes(raw.status))throw Error();if(!abort.signal.aborted)setList({key,result:{status:raw.status}});return;}const data=query.view==="channels"?parsePage(raw.data,parseChannel):query.view==="queue"?parsePage(raw.data,parseQueueItem):parsePage(raw.data,parsePublication);if(!abort.signal.aborted)setList({key,result:{status:"ok",data}});}catch{if(!abort.signal.aborted)setList({key,result:{status:"unavailable"}});}})();return()=>abort.abort();},[href,key,initialUrl.valid,query.view,router]);
  useEffect(()=>{const resume=(e:PageTransitionEvent)=>{if(e.persisted)setRevision(v=>v+1);};window.addEventListener("pageshow",resume);return()=>window.removeEventListener("pageshow",resume);},[]);
  const result=list?.key===key?list.result:null,pending=initialUrl.valid&&!result,choices=channels?.status==="ok"?channels.data:[],rows=result?.status==="ok"?result.data.items:[];
  const queue=rows.filter((r):r is QueueItem=>"destinations"in r),selected=queue.filter(r=>selection.includes(r.id)),stateOptions:Record<string,string>=query.view==="channels"?{all:"Tutti",active:"Attivi",archived:"Archiviati"}:query.view==="queue"?{pending:"Da lavorare",all:"Tutti",unprepared:STATES.unprepared,draft:STATES.draft,published:STATES.published,stale:STATES.stale,source:STATES.source}:{all:"Tutti",...STATES};
  const open=(items:DetailInput[],element:HTMLElement)=>{trigger.current=element;setEditor(items);};
  const queueInput=(r:QueueItem):DetailInput=>({announcementId:r.announcementId,channelId:query.channel||r.destinations[0]?.channelId,...(r.destinations.find(d=>d.channelId===(query.channel||r.destinations[0]?.channelId))?.recordId?{recordId:r.destinations.find(d=>d.channelId===(query.channel||r.destinations[0]?.channelId))!.recordId!}:{})});
  return <div className="admin-workspace admin-community-workspace admin-distribution-workspace">
    <Tabs value={query.view} onValueChange={value=>{setSelection([]);router.push(distributionHref(parseQuery({view:value as View})),{scroll:false});}}><div className="admin-workspace-toolbar"><TabsList aria-label="Sezioni distribuzione">{Object.entries(TITLES).map(([value,label])=><TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}</TabsList></div>
    <TabsContent value={query.view}>
      <Card className="admin-filters-card"><CardContent><form className="admin-filter-form" onSubmit={e=>{e.preventDefault();filters.submit();}}><FieldGroup className="admin-standard-filters">
        <div className="admin-filter-search-row"><Field><FieldLabel htmlFor="distribution-search">{query.view==="channels"?"Cerca canale":"Cerca annuncio"}</FieldLabel><Input id="distribution-search" value={draft.search} maxLength={200} placeholder={query.view==="channels"?"Nome canale o UUID":"Titolo annuncio o UUID annuncio"} onChange={e=>filters.search(e.target.value)}/></Field><div className="admin-action-list admin-filter-actions"><Button type="submit"><Search data-icon="inline-start" aria-hidden="true"/>Filtra</Button><Button variant="outline" type="button" onClick={()=>filters.reset(parseQuery({view:query.view}))}><RotateCcw data-icon="inline-start" aria-hidden="true"/>Azzera</Button></div></div>
        {query.view!=="channels"&&<Choice id="distribution-filter-channel" label="Canale" value={draft.channel||"all"} options={{all:"Tutti",...Object.fromEntries(choices.map(c=>[c.id,c.name]))}} onChange={channel=>filters.filter({channel:channel==="all"?"":channel})}/>}
        {query.view!=="publications"&&<Choice id="distribution-filter-region" label="Regione" value={draft.region||"all"} options={{all:"Tutte",...Object.fromEntries(REGIONS.map(r=>[r,r]))}} onChange={region=>filters.filter({region:region==="all"?"":region})}/>}
        {query.view==="queue"&&<Choice id="distribution-filter-type" label="Tipologia" value={draft.type||"all"} options={{all:"Tutte",...Object.fromEntries(ADMIN_ANNOUNCEMENT_TYPES.map(t=>[t,typeLabel(t)]))}} onChange={type=>filters.filter({type:type==="all"?"":type})}/>}
        <Choice id="distribution-filter-state" label="Stato" value={draft.state} options={stateOptions} onChange={state=>filters.filter({state})}/>
        {query.view==="publications"&&<><Field><FieldLabel htmlFor="distribution-from">Dal</FieldLabel><Input id="distribution-from" type="date" value={draft.from} onChange={e=>filters.filter({from:e.target.value})}/></Field><Field><FieldLabel htmlFor="distribution-to">Al</FieldLabel><Input id="distribution-to" type="date" value={draft.to} onChange={e=>filters.filter({to:e.target.value})}/></Field></>}
      </FieldGroup>{filters.error&&<p role="alert" className="admin-filter-error">{filters.error}</p>}</form></CardContent></Card>
      {channels?.status!=="ok"&&channels&&<Alert variant="warning"><AlertDescription>{FAILURE[channels.status]}</AlertDescription></Alert>}
      <Card className="admin-results-card"><CardHeader><div className="admin-workspace-toolbar"><CardTitle><h2 ref={heading} tabIndex={-1}>{TITLES[query.view]}</h2></CardTitle><div className="admin-action-list">{query.view==="queue"&&<Button disabled={!selected.length||pending} onClick={e=>open(selected.map(queueInput),e.currentTarget)}><Send data-icon="inline-start" aria-hidden="true"/>Prepara selezionati{selected.length?` (${selected.length})`:""}</Button>}<Button variant="outline" disabled={pending} onClick={refresh}><RefreshCw data-icon="inline-start" aria-hidden="true"/>Aggiorna</Button></div></div></CardHeader><CardContent className="admin-results-body" aria-busy={pending}>
        {!initialUrl.valid||result&&result.status!=="ok"?<Alert variant="warning"><AlertDescription>{FAILURE[!initialUrl.valid?"invalid":result!.status as FailureStatus]}<Button variant="outline" onClick={refresh}>Ricarica</Button></AlertDescription></Alert>:pending?<TableSkeleton columns={6}/>:!rows.length?<EmptyState title={query.view==="queue"&&!choices.length?"Aggiungi il primo canale":"Nessun risultato"} description={query.view==="queue"&&!choices.length?"Registra i canali WhatsApp per iniziare a preparare le condivisioni.":"Non ci sono elementi corrispondenti ai filtri."}/>:<>
          <Table className="admin-community-table" aria-label={TITLES[query.view]}><TableHeader><TableRow>{(query.view==="queue"?["Seleziona","Annuncio","Regioni","Origine","Destinazioni","Azioni"]:query.view==="channels"?["Canale","Ambito","Stato","Azioni"]:["Annuncio","Canale","Stato","Pubblicato il","Dettagli"]).map(h=><TableHead key={h}>{h==="Seleziona"?<Checkbox aria-label="Seleziona la pagina" checked={!!queue.length&&selected.length===queue.length} onCheckedChange={checked=>setSelection(checked?queue.map(r=>r.id):[])}/>:h}</TableHead>)}</TableRow></TableHeader><TableBody>
          {rows.map(row=><TableRow key={row.id}>{"destinations"in row?<><TableCell><Checkbox aria-label={`Seleziona: ${row.title}`} checked={selection.includes(row.id)} onCheckedChange={checked=>setSelection(v=>checked?[...v,row.id]:v.filter(id=>id!==row.id))}/></TableCell><TableCell><strong>{row.title}</strong><p className="admin-profile-type">{typeLabel(row.type)}</p><p className="admin-note">{communityDate(row.createdAt)}</p></TableCell><TableCell>{row.regions.join(", ")||"—"}</TableCell><TableCell>{WHATSAPP_LABELS[row.origin as keyof typeof WHATSAPP_LABELS]??"N/A"}{row.unassigned&&<p className="admin-note">Esportazione da assegnare</p>}</TableCell><TableCell><div className="admin-distribution-destinations">{row.destinations.map(d=><div key={d.channelId}><span>{d.name}</span><Status state={d.state}/></div>)}</div></TableCell><TableCell><Button size="icon-sm" variant="ghost" aria-label={`Prepara: ${row.title}`} title="Prepara messaggio" onClick={e=>open([queueInput(row)],e.currentTarget)}><Send aria-hidden="true"/></Button></TableCell></>:"active"in row?<><TableCell><strong>{row.name}</strong><p className="admin-technical-text">{row.url}</p></TableCell><TableCell>{row.region??"Nazionale"}</TableCell><TableCell><Badge variant={row.active?"success":"neutral"}>{row.active?"Attivo":"Archiviato"}</Badge></TableCell><TableCell><Button size="icon-sm" variant="ghost" aria-label={`Modifica: ${row.name}`} title="Modifica canale" onClick={e=>{trigger.current=e.currentTarget;setChannelEditor({value:row});}}><Settings aria-hidden="true"/></Button></TableCell></>:<><TableCell><strong>{row.title}</strong>{row.superseded&&<p className="admin-note">Condivisione precedente</p>}</TableCell><TableCell>{row.channelName??"Da assegnare"}</TableCell><TableCell><Status state={row.state}/>{row.confirmed&&<p className="admin-note admin-distribution-status-note">{row.manual?"Confermato senza link":"Confermato con link"}</p>}</TableCell><TableCell>{communityDate(row.postedAt)}</TableCell><TableCell><Button size="icon-sm" variant="ghost" aria-label={`Dettagli: ${row.title}`} title="Dettagli pubblicazione" onClick={e=>open([{recordId:row.id,...(row.announcementId?{announcementId:row.announcementId}:{}),...(row.channelId?{channelId:row.channelId}:{})}],e.currentTarget)}><Eye aria-hidden="true"/></Button></TableCell></>}</TableRow>)}
          </TableBody></Table>
        </>}
        {result?.status==="ok"&&<Pagination offset={query.offset} more={result.data.hasMore} busy={pending} onChange={offset=>{setSelection([]);router.push(distributionHref({...query,offset}),{scroll:false});}}/>}
      </CardContent></Card>
    </TabsContent></Tabs>
    {channelEditor&&<ChannelEditor value={channelEditor.value} onClose={()=>{setChannelEditor(null);trigger.current?.focus();}} onSaved={refresh}/>}
    {editor&&<DistributionDialog input={editor[0]} items={editor} onClose={()=>setEditor(null)} onSaved={()=>{setSelection([]);refresh();}} finalFocus={()=>trigger.current?.isConnected?trigger.current:heading.current}/>}
  </div>;
}

"use client";
import {useEffect, useRef, useState} from "react";
import {Copy, RefreshCw} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Field, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {getWhatsAppExport, saveWhatsAppExport} from "./actions";
import type {WhatsAppReadResult} from "./service";
import {whatsappLinkError} from "../create/whatsapp-parser";

const messages: Record<string,string> = {invalid:"Controlla testo e link WhatsApp.", denied:"Accesso non autorizzato. Accedi nuovamente.",not_found:"Annuncio non disponibile.",not_allowed:"Lo stato o la visibilità dell’annuncio non consentono questa operazione.",conflict:"I dati sono cambiati. Copia le modifiche che vuoi conservare, poi riapri il dialog.",unavailable:"Esito non verificabile. La compilazione è conservata: puoi riprovare con gli stessi dati."};
export function WhatsAppExportDialog({id,onClose,onSaved,finalFocus}: {id:string;onClose():void;onSaved():void;finalFocus():HTMLElement|null}) {
  const [data,setData]=useState<Extract<WhatsAppReadResult,{status:"ok"}>|null>(null);
  const [text,setText]=useState(""),[url,setUrl]=useState(""),[templateVersion,setTemplateVersion]=useState("");
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");
  const [clipboard,setClipboard]=useState(""),[regenerate,setRegenerate]=useState(false);
  const mounted=useRef(true), textarea=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{
    let active=true;
    mounted.current=true;
    void getWhatsAppExport(id).then(result=>{
      if(!active || !mounted.current)return;
      if(result.status==="ok") {setData(result);setText(result.saved.text || result.generated.text);setUrl(result.saved.url);setTemplateVersion(result.saved.templateVersion || result.generated.templateVersion);}
      else setError(messages[result.status]);
    }).catch(()=>{if(active && mounted.current)setError(messages.unavailable);}).finally(()=>{if(active && mounted.current)setLoading(false);});
    return ()=>{active=false;mounted.current=false;};
  },[id]);
  async function copy() {
    setClipboard("");
    try {await navigator.clipboard.writeText(text);if(mounted.current)setClipboard("Messaggio copiato.");}
    catch {if(mounted.current){setClipboard("Copia non disponibile. Seleziona il testo e usa Ctrl+C.");textarea.current?.focus();textarea.current?.select();}}
  }
  function regenerateMessage() {
    if(!data)return;
    setText(data.generated.text);setTemplateVersion(data.generated.templateVersion);setRegenerate(false);setClipboard("");
  }
  async function save() {
    if(!data || saving)return;
    if(!text.trim() || text.length>50000 || whatsappLinkError(url)) {setError(messages.invalid);return;}
    setSaving(true);setError("");
    try {
      const result=await saveWhatsAppExport({id,text,url,templateVersion,version:data.saved.version,fingerprint:data.detail.contentFingerprint});
      if(!mounted.current)return;
      if(result.status==="ok"){onSaved();onClose();}else setError(messages[result.status]);
    }catch{if(mounted.current)setError(messages.unavailable);}
    finally{if(mounted.current)setSaving(false);}
  }
  const linkError=whatsappLinkError(url);
  return <Dialog open onOpenChange={open=>{if(!open&&!saving)onClose();}}>
    <DialogContent finalFocus={finalFocus} className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Esporta su WhatsApp</DialogTitle><DialogDescription>Prepara e copia il messaggio. Aggiungi il link dopo averlo pubblicato sul canale.</DialogDescription></DialogHeader>
      {loading?<p role="status">Caricamento…</p>:data&&<>
        {data.detail.summary.status==="in_revisione"&&<p className="text-sm text-muted-foreground">L’annuncio è ancora in revisione sul sito. Questa operazione non lo approva.</p>}
        {data.saved.contentFingerprint&&data.saved.contentFingerprint!==data.detail.contentFingerprint&&<Alert variant="warning"><AlertDescription>L’annuncio è cambiato dopo la preparazione del messaggio. Verifica il testo o rigeneralo.</AlertDescription></Alert>}
        {data.generated.temporary&&<p className="text-sm text-muted-foreground">Formato temporaneo, modificabile prima della pubblicazione.</p>}
        <Field data-invalid={!text.trim()}><div className="flex flex-wrap items-center justify-between gap-2"><FieldLabel htmlFor="whatsapp-export-text">Messaggio <span className="admin-create-required" aria-hidden="true">*</span></FieldLabel>
          <Button type="button" variant="outline" size="sm" disabled={saving||!text.trim()} onClick={()=>{void copy();}}><Copy data-icon="inline-start"/>Copia messaggio</Button></div>
          <Textarea ref={textarea} id="whatsapp-export-text" rows={14} maxLength={50000} required value={text} disabled={saving} aria-required="true" aria-invalid={!text.trim()} onChange={event=>{setText(event.target.value);setClipboard("");}}/>
          {clipboard&&<p role="status" className="text-sm text-muted-foreground">{clipboard}</p>}
          <Button type="button" variant="ghost" size="sm" className="self-start" disabled={saving} onClick={()=>{if(text!==data.generated.text)setRegenerate(true);else regenerateMessage();}}><RefreshCw data-icon="inline-start"/>Rigenera dal template</Button>
        </Field>
        <Field data-invalid={Boolean(linkError)}><FieldLabel htmlFor="whatsapp-export-url">Link messaggio WhatsApp <span className="text-muted-foreground">Facoltativo</span></FieldLabel>
          <Input id="whatsapp-export-url" type="text" inputMode="url" maxLength={2048} value={url} disabled={saving} aria-invalid={Boolean(linkError)} aria-describedby={linkError?"whatsapp-export-url-error":undefined} onChange={event=>setUrl(event.target.value)}/>
          {linkError&&<p id="whatsapp-export-url-error" className="text-sm text-destructive">{linkError}</p>}
        </Field>
      </>}
      {error&&<Alert variant="danger" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
      <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Annulla</Button><Button type="button" disabled={loading||saving||!data||!text.trim()||Boolean(linkError)} onClick={()=>{void save();}}>{saving?"Salvataggio…":"Salva modifiche"}</Button></DialogFooter>
      <AlertDialog open={regenerate} onOpenChange={setRegenerate}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Rigenerare il messaggio?</AlertDialogTitle><AlertDialogDescription>Il testo modificato sarà sostituito con il template aggiornato. Il link sarà conservato.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annulla</AlertDialogCancel><AlertDialogAction onClick={regenerateMessage}>Rigenera</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </DialogContent>
  </Dialog>;
}

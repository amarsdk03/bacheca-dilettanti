"use client";

import {type ReactNode, useEffect, useRef, useState} from "react";
import {ClipboardPaste} from "lucide-react";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {useDraftField, useOptionalAnnouncementDraft} from "./store";
import {PrototypeSelect} from "./PrototypeFields";
import {PROFILE_OPTIONS, REGIONS} from "./prototype-model";
import {extractStoredMessage} from "./whatsapp-draft";
import {WHATSAPP_CONTENT_LIMIT, WHATSAPP_TARGETS, type WhatsAppExtraction, whatsappLinkError} from "./whatsapp-parser";

export function WhatsAppImport({onChange, onApply, needsConfirmation, children}: {
  onChange: () => void;
  onApply: (result: WhatsAppExtraction) => void;
  needsConfirmation: (result: WhatsAppExtraction) => boolean;
  children: ReactNode;
}) {
  const store = useOptionalAnnouncementDraft()!;
  const [content, setContent] = useDraftField("whatsappContent");
  const [link, setLink] = useDraftField("whatsappLink");
  const [region, setRegion] = useDraftField("whatsappRegion");
  const [resolvedRegion, setResolvedRegion] = useDraftField("whatsappResolvedRegion");
  const [, setManualTarget] = useDraftField("whatsappManualTarget");
  const [result, setResult] = useDraftField("whatsappResult");
  const [analysis] = useDraftField("whatsappAnalysis");
  const [applied, setApplied] = useDraftField("whatsappApplied");
  const [clipboardError, setClipboardError] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pending, setPending] = useState<WhatsAppExtraction | null>(null);
  const revision = useRef(0), mounted = useRef(true);
  const cancelRef = useRef<HTMLButtonElement>(null), analyzeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {mounted.current = true; return () => {mounted.current = false;};}, []);
  const linkError = whatsappLinkError(link);
  function changed(newContent = false) {
    revision.current++;
    setResult(null); setPending(null); setApplied(false); setResolvedRegion("");
    if (newContent) setManualTarget("");
    onChange();
  }
  function analyze() {
    const extraction = extractStoredMessage(store.getState());
    setResult(extraction); onChange();
    if (extraction.blocked) {setApplied(false); return;}
    if (needsConfirmation(extraction)) {setApplied(false); setPending(extraction);}
    else onApply(extraction);
  }
  function chooseType(id: string) {setManualTarget(id); setApplied(false); analyze();}
  async function paste() {
    const version = revision.current;
    setClipboardError(""); setPasting(true);
    try {
      if (!navigator.clipboard?.readText) throw new Error("CLIPBOARD_UNAVAILABLE");
      const value = await navigator.clipboard.readText();
      if (!mounted.current) return;
      if (revision.current !== version) {setClipboardError("Il contenuto è cambiato: incolla di nuovo o usa Ctrl+V."); return;}
      if (!value.trim()) {setClipboardError("Gli appunti non contengono testo."); return;}
      if (value.length > WHATSAPP_CONTENT_LIMIT) {setClipboardError("Incolla un solo annuncio, entro 50.000 caratteri."); return;}
      changed(true); setContent(value);
    } catch {
      if (mounted.current) setClipboardError("Appunti non disponibili. Incolla il messaggio con Ctrl+V.");
    } finally {if (mounted.current) setPasting(false);}
  }
  const target = result?.target;
  const profileOptions = PROFILE_OPTIONS.filter(option => WHATSAPP_TARGETS.some(item => item.profileType === option.value));
  const regionError = result?.issues.find(issue => issue.path === "source.channelRegion");
  const contentError = result?.issues.find(issue => issue.label === "Contenuto");
  return <FieldGroup className="admin-whatsapp-import">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field data-invalid={Boolean(regionError)}><FieldLabel htmlFor="whatsapp-channel-region">Regione del canale <span className="admin-create-required" aria-hidden="true">*</span></FieldLabel>
        <PrototypeSelect id="whatsapp-channel-region" required invalid={Boolean(regionError)} value={region} options={[...REGIONS].sort((a,b) => a.localeCompare(b,"it-IT")).map(value => ({value,label:value}))} onChange={value => {setRegion(value); changed();}} />
        {regionError && <p role="alert" className="admin-create-error">{regionError.reason}</p>}
      </Field>
      <Field data-invalid={Boolean(linkError)}><FieldLabel htmlFor="whatsapp-message-link">Link messaggio <span className="admin-create-optional">Facoltativo</span></FieldLabel>
        <Input id="whatsapp-message-link" type="text" inputMode="url" value={link} maxLength={2048} placeholder="https://www.whatsapp.com/channel/…"
          aria-invalid={Boolean(linkError)} aria-describedby={linkError ? "whatsapp-link-error" : undefined} onChange={event => {setLink(event.target.value); changed();}} />
        {linkError && <p id="whatsapp-link-error" className="admin-create-error">{linkError}</p>}
      </Field>
    </div>
    <Field data-invalid={Boolean(contentError)}>
      <div className="flex items-center justify-between gap-2"><FieldLabel htmlFor="whatsapp-content">Contenuto <span className="admin-create-required" aria-hidden="true">*</span></FieldLabel>
        <Tooltip><TooltipTrigger render={<Button type="button" variant="ghost" size="icon" aria-label="Incolla dagli appunti" disabled={pasting} onClick={() => {void paste();}}><ClipboardPaste aria-hidden="true" /></Button>} /><TooltipContent>Incolla dagli appunti</TooltipContent></Tooltip>
      </div>
      <Textarea id="whatsapp-content" value={content} rows={10} maxLength={WHATSAPP_CONTENT_LIMIT} aria-required="true" aria-invalid={Boolean(contentError)} className="min-h-56 resize-y"
        placeholder="Incolla il messaggio completo, inclusi intestazione e hashtag…" onChange={event => {setContent(event.target.value); setClipboardError(""); changed(true);}} />
      {contentError && <p role="alert" className="admin-create-error">{contentError.reason}</p>}
      {clipboardError && <p role="status" className="admin-create-note">{clipboardError}</p>}
    </Field>
    <Button ref={analyzeRef} type="button" variant="outline" className="self-start" onClick={analyze}>Analizza messaggio</Button>
    {!applied && analysis && !result && <p role="status" className="admin-create-warning">Analisi da aggiornare. Analizza il messaggio prima dell’invio.</p>}
    {result && <>
      <Alert variant={result.blocked ? "danger" : "success"} role="status"><AlertDescription>
        {result.blocked ? "Controlla i campi segnalati e la tipologia." : pending ? "Messaggio riconosciuto. Conferma la sostituzione dei dati modificati." : applied ? "Campi precompilati. Completa le informazioni segnalate." : "I dati precedenti sono conservati. Analizza il messaggio per applicare le modifiche."}
      </AlertDescription></Alert>
      {result.regionConflict && <Field data-invalid><FieldLabel htmlFor="whatsapp-region-resolution">Regione da usare <span className="admin-create-required">*</span></FieldLabel>
        <p className="admin-create-warning">Il canale e il messaggio indicano regioni diverse. Scegli quella corretta.</p>
        <PrototypeSelect id="whatsapp-region-resolution" required invalid value={resolvedRegion} options={result.regionConflict.map(value => ({value,label:value}))} onChange={value => {setResolvedRegion(value); analyze();}} />
      </Field>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!target}><FieldLabel htmlFor="whatsapp-profile-type">Tipologia profilo <span className="admin-create-required">*</span></FieldLabel>
          <PrototypeSelect id="whatsapp-profile-type" required invalid={!target} value={target?.profileType ?? ""} options={profileOptions} onChange={value => {const next=WHATSAPP_TARGETS.find(item => item.profileType===value); if(next) chooseType(next.id);}} />
        </Field>
        <Field data-disabled={target?.profileType !== "squadra"}><FieldLabel htmlFor="whatsapp-announcement-type">Tipologia annuncio {target?.profileType === "squadra" && <span className="admin-create-required" aria-hidden="true">*</span>}</FieldLabel>
          <PrototypeSelect id="whatsapp-announcement-type" required={target?.profileType === "squadra"} disabled={target?.profileType !== "squadra"} value={target?.id ?? ""} options={(target?.profileType === "squadra" ? WHATSAPP_TARGETS.filter(item => item.profileType === "squadra") : target ? [target] : []).map(item => ({value:item.id,label:item.profileType === "squadra" ? item.teamType! : item.label}))} onChange={chooseType} />
        </Field>
      </div>
      {!target && <p className="admin-create-error">Intestazione non riconosciuta. Scegli la tipologia del profilo.</p>}
      {target && !result.blocked && <div className="admin-create-subsection"><h3>Attribuisci l’annuncio</h3>{children}</div>}
    </>}
    <AlertDialog open={Boolean(pending)} onOpenChange={open => {if (!open) setPending(null);}}>
      <AlertDialogContent initialFocus={cancelRef} finalFocus={analyzeRef}><AlertDialogHeader><AlertDialogTitle>Sostituire i dati modificati?</AlertDialogTitle><AlertDialogDescription>La nuova estrazione sostituirà le correzioni di questa compilazione. Le immagini e le altre bozze saranno conservate.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel ref={cancelRef} onClick={() => setResult(null)}>Annulla</AlertDialogCancel><AlertDialogAction onClick={() => {if (pending) onApply(pending); setPending(null);}}>Sostituisci i dati</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </FieldGroup>;
}

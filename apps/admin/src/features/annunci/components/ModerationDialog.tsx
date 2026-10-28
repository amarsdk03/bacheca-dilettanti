"use client";

import { startTransition, useRef } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup, Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { PanelSkeleton } from "@/features/dashboard/components/ContentSkeletons";
import type { AnnunciController, AnnunciState } from "../client/controller";
import { capability, moderationReason, MODERATION_LABELS, needsReason } from "../moderation";

const EFFECTS = {
  trash: "L’annuncio e i suoi contenuti saranno conservati nel cestino, esclusi dal sito e dall’area autore. Stato, privacy e pagamenti rimangono invariati.",
  restore: "L’annuncio uscirà dal cestino ma resterà oscurato dall’amministrazione. Per renderlo visibile servirà una successiva verifica e azione esplicita.",
  approve: "L’annuncio passerà allo stato Pubblicato. Oscuramento e privacy rimangono invariati. Per gli annunci prioritari già pagati iniziano i sette giorni di priorità.",
  reject: "L’annuncio passerà allo stato Rifiutato. La motivazione sarà visibile all’autore. Gli eventuali rimborsi seguiranno il flusso già previsto.",
  hide: "L’annuncio sarà oscurato dall’amministrazione. L’autore non potrà renderlo visibile. Stato, privacy e pagamento rimangono invariati.",
  show: "L’oscuramento sarà rimosso. Stato, privacy e pagamento rimangono invariati: questa operazione non approva l’annuncio.",
};
export function ModerationDialog({ state, controller, finalFocus }: { state: AnnunciState["moderation"]; controller: AnnunciController; finalFocus(): HTMLElement | null }) {
  const cancel = useRef<HTMLButtonElement>(null);
  const pending = state?.phase === "submitting", result = state?.result;
  const cap = state?.detail ? capability(state.detail, state.operation) : null;
  const message = result?.status === "ok" ? "Modifica salvata. Elenco e dettaglio vengono ricaricati; eventuali errori di caricamento non annullano il salvataggio." :
    result?.status === "conflict" ? "L’annuncio è cambiato o è in uso. Ricarica e verifica nuovamente prima di confermare." :
    result?.status === "not_allowed" ? moderationReason(result.reason) :
    result?.status === "not_found" ? "L’annuncio non è più disponibile." :
    result?.status === "invalid" ? "La richiesta non è valida. Ricarica il dettaglio prima di riprovare." :
    result?.status === "unavailable" ? "Esito non verificabile. La modifica potrebbe essere stata salvata: ricarica il dettaglio prima di effettuare un’altra operazione." : state?.error;
  return <AlertDialog open={state !== null} onOpenChange={(open) => { if (!open && !pending) controller.closeModeration(); }}>
    <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto" initialFocus={cancel} finalFocus={finalFocus}>
      <AlertDialogHeader><AlertDialogTitle>{state ? MODERATION_LABELS[state.operation] : "Moderazione annuncio"}</AlertDialogTitle>
        <AlertDialogDescription>{state && EFFECTS[state.operation]}</AlertDialogDescription>
      </AlertDialogHeader>
      {state?.phase === "loading" ? <PanelSkeleton /> : state && <div className="flex min-w-0 flex-col gap-4">
        <p className="break-words font-medium">{state.detail?.summary.title || state.id}</p>
        {state.detail && state.phase === "ready" && !cap?.allowed && <Alert><AlertDescription>{moderationReason(cap?.reason ?? "UNAVAILABLE")}</AlertDescription></Alert>}
        {state.detail && (state.phase === "ready" || pending) && needsReason(state.operation) && <FieldGroup><Field data-invalid={Boolean(state.error)}>
          <FieldLabel htmlFor="moderation-reason">{state.operation === "trash" ? "Motivazione interna" : "Motivazione visibile all’autore"}</FieldLabel>
          <Textarea id="moderation-reason" rows={4} required value={state.reason} disabled={pending} onChange={(event) => controller.setReason(event.target.value)} aria-invalid={Boolean(state.error)} aria-describedby={state.error ? "moderation-reason-description moderation-reason-error" : "moderation-reason-description"} />
          <FieldDescription id="moderation-reason-description">{state.operation === "trash" ? "Da 1 a 1.000 caratteri. Il testo viene conservato esclusivamente nel registro amministrativo." : "Da 1 a 1.000 caratteri. Non inserire informazioni riservate: il testo sarà presente nei dati consultabili dell’annuncio."}</FieldDescription>
          {state.error && <FieldError id="moderation-reason-error">{state.error}</FieldError>}
        </Field></FieldGroup>}
        {message && <Alert variant={result?.status === "ok" ? "default" : "destructive"}><AlertDescription><p>{message}</p>{result && result.correlationId !== "client" && <p>Riferimento: {result.correlationId}</p>}</AlertDescription></Alert>}
      </div>}
      <AlertDialogFooter><AlertDialogCancel ref={cancel} disabled={pending}>{result?.status === "ok" ? "Chiudi" : "Annulla"}</AlertDialogCancel>
        {state?.phase === "ready" && <AlertDialogAction disabled={!cap?.allowed} onClick={() => startTransition(() => { void controller.confirmModeration(); })}>{MODERATION_LABELS[state.operation]}</AlertDialogAction>}
        {pending && <Button disabled><Spinner data-icon="inline-start" />Salvataggio…</Button>}
        {state?.phase === "result" && result?.status !== "ok" && <Button variant="outline" onClick={controller.reloadModeration}>Ricarica dettaglio</Button>}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, CircleAlert, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { TableSkeleton, PanelSkeleton } from "@/features/dashboard/components/ContentSkeletons";
import { EmptyState } from "@/features/dashboard/components/ContentStates";
import { AUDIT_ACTIONS, type AuditFilters, type AuditListResult } from "../read-contracts";
import type { AuditUrl } from "../read-url";
import { createAuditController } from "../client/read-controller";
import { auditTransport } from "../client/read-transport";
import { AUDIT_LABELS } from "../read-presentation";
import { AuditDetailContent } from "./AuditDetailContent";
import { AuditSummaryTable } from "./AuditSummaryTable";
function Selector({ id, label, value, items, onChange }: { id: string; label: string; value: string; items: { value: string; label: string }[]; onChange(v: string): void }) {
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel><Select items={items} value={value} onValueChange={v => { if (v !== null) onChange(v); }}>
    <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{items.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectGroup></SelectContent>
  </Select></Field>;
}
function Failure({ title, retry, correlationId }: { title: string; retry(): void; correlationId?: string }) {
  return <Alert variant="destructive" className="admin-feedback"><CircleAlert aria-hidden="true" /><AlertTitle>{title}</AlertTitle><AlertDescription>
    <p>Riprova oppure aggiorna l’elenco.</p>{correlationId && correlationId !== "client" && <p>Riferimento: {correlationId}</p>}
    <Button variant="outline" onClick={retry}><RefreshCw data-icon="inline-start" aria-hidden="true" />Riprova</Button>
  </AlertDescription></Alert>;
}
export function AuditWorkspace({ initialQuery, initialResult }: { initialQuery: AuditUrl; initialResult: AuditListResult }) {
  const [controller] = useState(() => createAuditController(initialQuery, initialResult, {
    ...auditTransport, navigate(href) { window.history.pushState(null, "", href); }, denied() { window.location.replace("/accesso"); },
  }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  const trigger = useRef<HTMLElement | null>(null), panelTitle = useRef<HTMLHeadingElement | null>(null), resultsTitle = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    const sync = () => controller.sync(window.location.search);
    const resume = (event: PageTransitionEvent) => { if (event.persisted) controller.sync(window.location.search, true); };
    sync(); window.addEventListener("popstate", sync); window.addEventListener("pageshow", resume);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("pageshow", resume); controller.cancel(); };
  }, [controller]);
  const result = state.list.result, detail = state.detail.result;
  const set = (patch: Partial<AuditFilters>) => controller.draft(patch);
  return <div className="admin-workspace">
    <Card className="admin-filters-card"><CardHeader><CardTitle><h2>Filtri del registro</h2></CardTitle><CardDescription>Le date comprendono l’intera giornata in Europe/Rome. L’operatore corrisponde all’email attuale o a un UUID esatto.</CardDescription></CardHeader>
      <CardContent><form onSubmit={event => { event.preventDefault(); controller.apply(); }} className="admin-filter-form">
        <FieldGroup className="admin-audit-filters">
          <Field><FieldLabel htmlFor="audit-from">Dal</FieldLabel><Input id="audit-from" type="date" value={state.draft.from} onChange={e => set({ from: e.target.value })} /></Field>
          <Field><FieldLabel htmlFor="audit-to">Al</FieldLabel><Input id="audit-to" type="date" value={state.draft.to} onChange={e => set({ to: e.target.value })} /></Field>
          <Field className="admin-audit-operator"><FieldLabel htmlFor="audit-operator">Operatore</FieldLabel><Input id="audit-operator" value={state.draft.operator} onChange={e => set({ operator: e.target.value })} placeholder="Email o UUID" aria-describedby="audit-operator-help" />
            <FieldDescription id="audit-operator-help">Vuoto: tutti. Usa “Non identificato” per gli eventi senza identità.</FieldDescription>
            <Button type="button" variant="outline" size="sm" onClick={() => set({ operator: "unknown" })}>Non identificato</Button></Field>
          <Selector id="audit-action" label="Operazione" value={state.draft.action} items={[{ value: "", label: "Tutte" }, ...AUDIT_ACTIONS.map(value => ({ value, label: AUDIT_LABELS[value] }))]} onChange={action => set({ action: action as AuditFilters["action"] })} />
          <Selector id="audit-outcome" label="Esito" value={state.draft.outcome} items={[{ value: "", label: "Tutti" }, { value: "success", label: "Riuscita" }, { value: "failure", label: "Fallita" }]} onChange={outcome => set({ outcome: outcome as AuditFilters["outcome"] })} />
        </FieldGroup>{state.error && <FieldError role="alert">{state.error}</FieldError>}
        <div className="admin-action-list"><Button type="submit"><Filter data-icon="inline-start" aria-hidden="true" />Applica filtri</Button><Button type="button" variant="outline" onClick={controller.reset}>Ripristina filtri</Button></div>
      </form></CardContent>
    </Card>
    <Card className="admin-results-card"><CardHeader><div className="admin-workspace-toolbar"><CardTitle><h2 ref={resultsTitle} tabIndex={-1}>Operazioni registrate</h2></CardTitle>
      <Button variant="outline" size="sm" onClick={controller.refresh} disabled={state.list.pending}><RefreshCw data-icon="inline-start" aria-hidden="true" />Aggiorna</Button></div>
      <CardDescription>Fino a 30 eventi per pagina. Email attuali; gli operatori possono avere un ruolo diverso da quello al momento dell’evento.</CardDescription></CardHeader>
      <CardContent className="admin-results-body" aria-live="polite">
        {state.list.pending ? <TableSkeleton columns={4} /> : result?.status === "ok" ? <>
          {result.page.items.length ? <AuditSummaryTable items={result.page.items} caption={`${result.page.items.length} eventi in questa pagina, dal più recente. Date in Europe/Rome.`}
            onShowDetails={(id, element) => { trigger.current = element; controller.open(id); }} /> : <EmptyState title="Nessun evento disponibile" description="Il registro mostra soltanto gli eventi conservati e corrispondenti ai filtri. Lo storico precedente all’attivazione dell’audit non è disponibile." />}
          <nav aria-label="Paginazione registro attività" className="admin-pagination"><Button variant="outline" disabled={!state.query.cursor} onClick={controller.first}>Prima pagina</Button><div className="admin-action-list">
            <Button variant="outline" disabled={!state.canPrevious} onClick={controller.previous}><ArrowLeft data-icon="inline-start" aria-hidden="true" />Precedente</Button>
            <Button variant="outline" disabled={!result.page.hasMore} onClick={controller.next}>Successiva<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
          </div></nav>
        </> : result?.status === "invalid" ? <Failure title="Filtri o cursore non validi" retry={controller.reset} /> : result?.status === "unavailable" ? <Failure title="Impossibile caricare il registro" retry={controller.refresh} correlationId={result.correlationId} /> : null}
      </CardContent>
    </Card>
    <Sheet open={!!state.detail.id} onOpenChange={open => { if (!open) controller.close(); }}>
      <SheetContent side="right" className="admin-detail-sheet" initialFocus={panelTitle} finalFocus={() => trigger.current?.isConnected ? trigger.current : resultsTitle.current}>
        <SheetHeader><SheetTitle ref={panelTitle} tabIndex={-1}>Dettagli dell’operazione</SheetTitle><SheetDescription>Consultazione in sola lettura dell’evento registrato.</SheetDescription></SheetHeader>
        <div className="admin-detail-body" aria-live="polite">
          {state.detail.pending ? <PanelSkeleton /> : detail?.status === "ok" ? <AuditDetailContent detail={detail.detail} /> : detail?.status === "not_found" ? <EmptyState title="Evento non più disponibile" description="L’evento potrebbe essere stato rimosso dalla conservazione del registro."><Button variant="outline" onClick={controller.refresh}>Aggiorna elenco</Button></EmptyState> : detail && <Failure title="Impossibile caricare il dettaglio" retry={() => { if (state.detail.id) controller.open(state.detail.id); }} correlationId={detail.status === "unavailable" ? detail.correlationId : undefined} />}
        </div>
      </SheetContent>
    </Sheet>
  </div>;
}

"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Download, Ellipsis, Eye, Plus, RefreshCw, Search, X } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import { EmptyState } from "@/features/dashboard/components/ContentStates";
import { PanelSkeleton, TableSkeleton } from "@/features/dashboard/components/ContentSkeletons";
import { ADMIN_ANNOUNCEMENT_TRASH, ADMIN_ANNOUNCEMENT_STATUSES, ADMIN_ANNOUNCEMENT_TYPES, ADMIN_ANNOUNCEMENT_VISIBILITY, type AnnouncementFilters, type AnnouncementListResult } from "../contracts";
import { type AnnunciUrl } from "../url-state";
import { canExportAnnouncements, createAnnunciController } from "../client/controller";
import { announcementTransport } from "../client/transport";
import { downloadAnnouncementExport, requestAnnouncementExport } from "../client/export-transport";
import { displayDate, STATUS_LABELS, TYPE_LABELS, VISIBILITY_LABELS, statusLabel, typeLabel, visibilityLabel } from "../presentation";
import { AnnouncementDetailContent } from "./AnnouncementDetailContent";
import { ModerateActions } from "./ModerateActions";
import { ModerationDialog } from "./ModerationDialog";
import { moderateAnnouncementAction } from "@/features/annunci/server/actions";
import { MODERATION_LABELS, type ModerationOperation } from "../moderation";

function FilterSelect({ id, label, value, items, onChange }: { id: string; label: string; value: string; items: { value: string; label: string }[]; onChange(value: string): void }) {
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel><Select items={items} value={value} onValueChange={(v) => { if (v !== null) onChange(v); }}>
    <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
    <SelectContent><SelectGroup>{items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
  </Select></Field>;
}

function Failure({ title, description, retry, correlationId }: { title: string; description: string; retry(): void; correlationId?: string }) {
  return <Alert variant="destructive"><AlertTitle>{title}</AlertTitle><AlertDescription>
    <p>{description}</p>{correlationId && correlationId !== "client" && <p>Riferimento: {correlationId}</p>}
    <Button variant="outline" size="sm" onClick={retry}><RefreshCw data-icon="inline-start" aria-hidden="true" />Riprova</Button>
  </AlertDescription></Alert>;
}

export function AnnunciWorkspace({ initialQuery, initialResult }: { initialQuery: AnnunciUrl; initialResult: AnnouncementListResult }) {
  const [controller] = useState(() => createAnnunciController(initialQuery, initialResult, {
    ...announcementTransport,
    moderate: moderateAnnouncementAction,
    export: requestAnnouncementExport, download: downloadAnnouncementExport,
    navigate(href, mode) { if (mode === "push") window.history.pushState(null, "", href); else window.history.replaceState(null, "", href); },
    denied() { window.location.replace("/accesso"); },
  }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
  const previewTrigger = useRef<HTMLElement | null>(null), resultsTitle = useRef<HTMLHeadingElement>(null), panelTitle = useRef<HTMLHeadingElement>(null);
  const moderationTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const pop = () => controller.sync(window.location.search, true);
    const show = (event: PageTransitionEvent) => { if (event.persisted) controller.refresh(); };
    window.addEventListener("popstate", pop); window.addEventListener("pageshow", show);
    return () => { window.removeEventListener("popstate", pop); window.removeEventListener("pageshow", show); controller.cancel(); };
  }, [controller]);
  const result = state.list.result, preview = state.preview;
  const mutating = state.moderation?.phase === "submitting" || state.exporting.pending;
  const filtered = Boolean(state.query.filters.search || state.query.filters.status || state.query.filters.type || state.query.filters.visibility !== "all" || state.query.filters.trash !== "exclude");
  return <div className="flex min-w-0 flex-col gap-8">
    <Card><CardHeader><CardTitle><h2>Azioni rapide</h2></CardTitle><CardDescription>Gestisci i contenuti della bacheca.</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-3"><div className="flex flex-wrap gap-3"><Button disabled><Plus data-icon="inline-start" aria-hidden="true" />Crea annuncio · Presto</Button><Button variant="outline" disabled={!canExportAnnouncements(state)} onClick={() => { void controller.exportPage(); }}>{state.exporting.pending ? <Spinner data-icon="inline-start" /> : <Download data-icon="inline-start" aria-hidden="true" />}{state.exporting.pending ? "Esportazione…" : "Esporta pagina CSV"}</Button></div><p className="text-sm text-muted-foreground">Esporta soltanto le righe mostrate, fino a 30 risultati. Date in Europe/Rome.</p><p role="status" className="sr-only">{state.exporting.pending ? "Preparazione del file CSV" : ""}</p></CardContent>
    </Card>
    {state.exporting.result && <Alert variant="destructive"><AlertTitle>Export non completato</AlertTitle><AlertDescription><p>{state.exporting.result.status === "conflict" ? "La pagina è cambiata. Aggiorna l’elenco prima di esportare." : state.exporting.result.status === "invalid" ? "La richiesta non è valida. Aggiorna l’elenco prima di riprovare." : "Il download non è stato completato o il suo esito non è verificabile. Aggiorna l’elenco prima di riprovare."}</p>{state.exporting.result.correlationId !== "client" && <p>Riferimento: {state.exporting.result.correlationId}</p>}<Button variant="outline" size="sm" onClick={controller.refresh}><RefreshCw data-icon="inline-start" aria-hidden="true" />Aggiorna elenco</Button></AlertDescription></Alert>}
    <section aria-labelledby="annunci-results" className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="annunci-results" ref={resultsTitle} tabIndex={-1} className="text-lg font-semibold outline-none">Elenco annunci</h2>
        <Button variant="outline" size="sm" disabled={state.list.pending || mutating} onClick={controller.refresh}><RefreshCw data-icon="inline-start" aria-hidden="true" />Aggiorna elenco</Button>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); controller.submitSearch(); }}>
        <FieldGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field data-invalid={Boolean(state.searchError)}><FieldLabel htmlFor="annunci-search">Cerca per titolo o UUID</FieldLabel>
            <InputGroup><InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon><InputGroupInput id="annunci-search" value={state.draft.search} onChange={(event) => controller.setSearch(event.target.value)} aria-invalid={Boolean(state.searchError)} aria-describedby={state.searchError ? "annunci-search-error" : undefined} placeholder="Titolo o UUID" />
              {state.draft.search && <InputGroupAddon align="inline-end"><InputGroupButton aria-label="Svuota ricerca" onClick={() => { controller.setSearch(""); controller.submitSearch(); }}><X aria-hidden="true" /></InputGroupButton></InputGroupAddon>}
            </InputGroup>{state.searchError && <FieldError id="annunci-search-error">{state.searchError}</FieldError>}
          </Field>
          <FilterSelect id="annunci-status" label="Stato" value={state.draft.status ?? "all"} items={[{ value: "all", label: "Tutti gli stati" }, ...ADMIN_ANNOUNCEMENT_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))]} onChange={(value) => controller.setFilter({ status: value === "all" ? null : value as AnnouncementFilters["status"] })} />
          <FilterSelect id="annunci-type" label="Tipologia" value={state.draft.type ?? "all"} items={[{ value: "all", label: "Tutte le tipologie" }, ...ADMIN_ANNOUNCEMENT_TYPES.map((value) => ({ value, label: TYPE_LABELS[value] }))]} onChange={(value) => controller.setFilter({ type: value === "all" ? null : value as AnnouncementFilters["type"] })} />
          <FilterSelect id="annunci-visibility" label="Oscuramento" value={state.draft.visibility} items={ADMIN_ANNOUNCEMENT_VISIBILITY.map((value) => ({ value, label: VISIBILITY_LABELS[value] }))} onChange={(value) => controller.setFilter({ visibility: value as AnnouncementFilters["visibility"] })} />
          <FilterSelect id="annunci-trash" label="Cestino" value={state.draft.trash} items={ADMIN_ANNOUNCEMENT_TRASH.map((value) => ({ value, label: value === "exclude" ? "Escludi cestino" : value === "only" ? "Solo cestino" : "Tutti gli annunci" }))} onChange={(value) => controller.setFilter({ trash: value as AnnouncementFilters["trash"] })} />
        </FieldGroup>
        <div className="mt-3 flex flex-wrap gap-2"><Button type="submit" size="sm" variant="outline" disabled={Boolean(state.searchError)}>Applica ricerca</Button><Button variant="ghost" size="sm" onClick={controller.reset}>Ripristina filtri</Button></div>
      </form>
      <div aria-live="polite" aria-atomic="true" className="sr-only">{state.list.pending ? "Caricamento annunci" : result?.status === "ok" ? `${result.page.items.length} annunci caricati` : "Elenco annunci non disponibile"}</div>
      {state.list.pending ? <TableSkeleton rows={8} columns={7} /> : result?.status === "invalid" ? <Alert><AlertTitle>Filtri o cursore non validi</AlertTitle><AlertDescription><p>Ripristina i filtri oppure riparti dalla prima pagina.</p><div className="flex flex-wrap gap-2">{state.query.valid && state.query.cursor && <Button variant="outline" size="sm" onClick={controller.first}>Prima pagina</Button>}<Button variant="outline" size="sm" onClick={controller.reset}>Ripristina filtri</Button></div></AlertDescription></Alert> : result?.status === "unavailable" ?
        <Failure title="Impossibile caricare gli annunci" description="Il servizio è temporaneamente non disponibile." retry={controller.refresh} correlationId={result.correlationId} /> : result?.status === "ok" ? <>
          {result.page.items.length === 0 ? <EmptyState title={state.query.cursor ? "Nessun risultato in questa pagina" : filtered ? "Nessun annuncio corrisponde ai filtri" : "Nessun annuncio presente"} description={state.query.cursor ? "L’elenco potrebbe essere cambiato durante la consultazione." : "Gli annunci disponibili compariranno qui."}>
            {state.query.cursor ? <Button variant="outline" onClick={controller.first}>Prima pagina</Button> : filtered && <Button variant="outline" onClick={controller.reset}>Ripristina filtri</Button>}
          </EmptyState> : <Table><TableCaption>{result.page.items.length} {result.page.items.length === 1 ? "annuncio in questa pagina" : "annunci in questa pagina"}. Dal più recente; date in Europe/Rome.</TableCaption>
            <TableHeader><TableRow>{["Titolo", "Autore / Profilo", "Tipologia", "Stato", "Visibilità", "Creazione", "Azioni"].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{result.page.items.map((row) => <TableRow key={row.id}>
              <TableCell className="min-w-48 max-w-80 whitespace-normal"><p className="line-clamp-2 break-words font-medium">{row.title || "Annuncio senza titolo"}</p>{row.trashed && <Badge variant="secondary">Nel cestino</Badge>}<p className="mt-1 text-xs text-muted-foreground">{row.id}</p></TableCell>
              <TableCell className="min-w-40 max-w-60 whitespace-normal break-words">{row.author.displayName}</TableCell>
              <TableCell className="max-w-52 whitespace-normal">{typeLabel(row.type)}</TableCell><TableCell><Badge variant="secondary">{statusLabel(row.status)}</Badge></TableCell>
              <TableCell><div className="flex flex-col items-start gap-1">{visibilityLabel(row).map((label) => <Badge variant="outline" key={label}>{label}</Badge>)}</div></TableCell>
              <TableCell>{displayDate(row.createdAt)}</TableCell><TableCell><div className="flex items-center gap-1">
                <Button size="icon-sm" variant="ghost" disabled={mutating} aria-label={`Anteprima: ${row.title || row.id}`} onClick={(event) => { previewTrigger.current = event.currentTarget; controller.openPreview(row.id); }}><Eye aria-hidden="true" /></Button>
                <DropdownMenu><DropdownMenuTrigger disabled={mutating} render={<Button id={`annunci-menu-${row.id}`} size="icon-sm" variant="ghost" aria-label={`Altre azioni: ${row.title || row.id}`} />}><Ellipsis aria-hidden="true" /></DropdownMenuTrigger>
                  <DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuLabel>Moderazione</DropdownMenuLabel>{(row.trashed ? ["restore"] as ModerationOperation[] : ["approve", "reject", row.hidden === true ? "show" : "hide", "trash"] as ModerationOperation[]).map((operation) => <DropdownMenuItem disabled={mutating || (["approve", "reject"].includes(operation) && row.status !== "in_revisione")} key={operation} onClick={() => { moderationTrigger.current = document.getElementById(`annunci-menu-${row.id}`); controller.beginModeration(row.id, operation); }}>{MODERATION_LABELS[operation]}</DropdownMenuItem>)}</DropdownMenuGroup></DropdownMenuContent>
                </DropdownMenu>
              </div></TableCell>
            </TableRow>)}</TableBody>
          </Table>}
          <nav aria-label="Paginazione annunci" className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" size="sm" disabled={!state.query.cursor} onClick={controller.first}>Prima pagina</Button><div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!state.canPrevious} onClick={controller.previous}><ArrowLeft data-icon="inline-start" aria-hidden="true" />Precedente</Button>
            <Button variant="outline" size="sm" disabled={!result.page.hasMore} onClick={controller.next}>Successiva<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
          </div></nav>
        </> : null}
    </section>
    <Sheet open={preview.id !== null} onOpenChange={(open) => { if (!open) controller.closePreview(); }}>
      <SheetContent side="right" className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl" initialFocus={panelTitle} finalFocus={() => previewTrigger.current?.isConnected ? previewTrigger.current : resultsTitle.current}>
        <SheetHeader className="shrink-0 border-b pr-12"><SheetTitle ref={panelTitle} tabIndex={-1} className="break-words outline-none">{preview.result?.status === "ok" ? preview.result.detail.summary.title || "Annuncio senza titolo" : "Anteprima annuncio"}</SheetTitle><SheetDescription>Contenuto e informazioni amministrative dell’annuncio.</SheetDescription></SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
          {preview.pending ? <PanelSkeleton /> : preview.result?.status === "ok" ? <><div><Button variant="outline" size="sm" disabled={mutating} onClick={controller.retryPreview}><RefreshCw data-icon="inline-start" aria-hidden="true" />Ricarica dettaglio</Button></div><ModerateActions detail={preview.result.detail} disabled={mutating} onChoose={(operation, trigger) => { moderationTrigger.current = trigger; controller.beginModeration(preview.id!, operation); }} /><AnnouncementDetailContent detail={preview.result.detail} /></> : preview.result?.status === "not_found" ?
            <EmptyState title="Annuncio non più disponibile" description="L’annuncio potrebbe essere stato rimosso."><Button variant="outline" onClick={controller.refresh}>Aggiorna elenco</Button></EmptyState> : preview.result?.status === "invalid" ?
              <EmptyState title="Annuncio non valido" description="Chiudi l’anteprima e aggiorna l’elenco." /> : preview.result?.status === "unavailable" ? <Failure title="Impossibile caricare il dettaglio" description="Riprova tra poco." retry={controller.retryPreview} correlationId={preview.result.correlationId} /> : null}
        </div>
      </SheetContent>
    </Sheet>
    <ModerationDialog state={state.moderation} controller={controller} finalFocus={() => moderationTrigger.current?.isConnected ? moderationTrigger.current : state.preview.id ? panelTitle.current : resultsTitle.current} />
  </div>;
}

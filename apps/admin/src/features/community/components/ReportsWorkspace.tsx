"use client";
import {startTransition, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {SettingsIcon, RefreshCw, Search, ExternalLink as ExternalLinkIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {EmptyState} from "@/features/dashboard/components/ContentStates";
import {PanelSkeleton, TableSkeleton} from "@/features/dashboard/components/ContentSkeletons";
import {ExternalLink} from "@/features/navigation/ExternalNavigation";
import {AnnouncementSiteLink} from "@/features/annunci/components/AnnouncementSiteLink";
import {parseCommunityPage, parseReport, REPORT_STATES, type CommunityFailure, type CommunityQuery, type Report} from "../contracts";
import {updateReportAction} from "../server/actions";
import {Choice, communityDate, Failure, Pagination, useCommunityRead} from "./CommunityControls";
import {DEFAULT_REPORT_FILTERS, reportsHref} from "../reports-url";

const parsePage = (v: unknown) => parseCommunityPage(v, parseReport);
const initialFilters = DEFAULT_REPORT_FILTERS;
function ReportBadge({state}: {state: Report["status"]}) {return <Badge variant={state === "open" ? "warning" : state === "working" ? "info" : state === "resolved" ? "success" : "neutral"}>{REPORT_STATES[state]}</Badge>;}
function ReportEditor({report, saved, reload, setSaving}: {report: Report; saved(): void; reload(): void; setSaving(v: boolean): void}) {
  const router = useRouter();
  const [status, setStatus] = useState(report.status), [note, setNote] = useState(report.note), [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<CommunityFailure | null>(null);
  const invalid = [...note].length > 1000;
  return <section className="admin-detail-section"><h3>Gestione segnalazione</h3>
    <form onSubmit={event => {event.preventDefault(); if (busy || invalid || failure) return; setBusy(true); setSaving(true);
      startTransition(() => {void updateReportAction({id: report.id, status, note, version: report.version}).then(result => {
        if (result.status === "ok") saved(); else if (result.status === "denied") router.replace("/accesso"); else setFailure(result);
      }).catch(() => setFailure({status: "unavailable"})).finally(() => {setBusy(false); setSaving(false);});});
    }}><FieldGroup><Choice id="report-status" label="Stato" value={status} options={REPORT_STATES} disabled={busy || !!failure} onChange={v => setStatus(v as Report["status"])} />
      <Field data-invalid={invalid}><FieldLabel htmlFor="report-note">Nota interna</FieldLabel><Textarea id="report-note" value={note} onChange={e => setNote(e.target.value)} rows={5} disabled={busy || !!failure} aria-invalid={invalid} aria-describedby="report-note-help" />
        <FieldDescription id="report-note-help">Solo per gli amministratori · {[...note].length}/1.000</FieldDescription></Field>
      <Button type="submit" disabled={busy || invalid || !!failure || status === report.status && note.trim() === report.note}>{busy ? "Salvataggio…" : "Salva modifiche"}</Button>
    </FieldGroup></form>{failure && <Failure result={failure} retry={reload} />}
    <p className="admin-note">La chiusura della segnalazione non modifica la visibilità del contenuto.</p>
  </section>;
}
export function ReportsWorkspace({initialUrl}: {initialUrl: {valid: boolean; query: CommunityQuery}}) {
  const router = useRouter();
  const query = initialUrl.query;
  const [draft, setDraft] = useState({...initialFilters, ...query});
  const [selected, setSelected] = useState<string | null>(null), [saving, setSaving] = useState(false), [notice, setNotice] = useState("");
  const trigger = useRef<HTMLElement | null>(null), heading = useRef<HTMLHeadingElement>(null);
  const list = useCommunityRead("reports", query, parsePage, initialUrl.valid ? undefined : null), detail = useCommunityRead("reports", {}, parseReport, selected);
  const set = (patch: Partial<typeof initialFilters>) => setDraft(v => ({...v, ...patch}));
  const report = detail.result?.status === "ok" ? detail.result.data : null;
  return <div className="admin-workspace admin-community-workspace">
    <Card className="admin-filters-card"><CardContent><form className="admin-filter-form" onSubmit={e => {e.preventDefault(); const href = reportsHref({...draft, offset: 0}); router.push(href); if (href === window.location.pathname + window.location.search) list.refresh();}}><FieldGroup className="admin-community-filters">
      <Field className="admin-community-search"><FieldLabel htmlFor="reports-search">Cerca</FieldLabel><Input id="reports-search" value={draft.search} maxLength={200} placeholder="ID contenuto, ID segnalazione o email segnalatore" onChange={e => set({search: e.target.value})} /></Field>
      <Choice id="reports-state" label="Stato" value={draft.status} options={{active: "Aperte e in lavorazione", all: "Tutte", ...REPORT_STATES}} onChange={status => set({status})} />
      <Choice id="reports-target" label="Contenuto" value={draft.target} options={{all: "Tutti", annuncio: "Annunci", profilo: "Profili"}} onChange={target => set({target})} />
      <Field><FieldLabel htmlFor="reports-from">Dal</FieldLabel><Input type="date" id="reports-from" value={draft.from} onChange={e => set({from: e.target.value})} /></Field>
      <Field><FieldLabel htmlFor="reports-to">Al</FieldLabel><Input type="date" id="reports-to" value={draft.to} onChange={e => set({to: e.target.value})} /></Field>
    </FieldGroup><div className="admin-action-list"><Button type="submit"><Search data-icon="inline-start" aria-hidden="true" />Filtra</Button><Button type="button" variant="outline" onClick={() => {setDraft(initialFilters); router.push(reportsHref(initialFilters));}}>Azzera</Button></div></form></CardContent></Card>
    {notice && <Alert><AlertDescription role="status">{notice}</AlertDescription></Alert>}
    <Card className="admin-results-card"><CardHeader><div className="admin-workspace-toolbar"><CardTitle><h2 ref={heading} tabIndex={-1}>Segnalazioni</h2></CardTitle><Button variant="outline" disabled={list.pending} onClick={list.refresh}><RefreshCw data-icon="inline-start" aria-hidden="true" />Aggiorna</Button></div></CardHeader>
      <CardContent className="admin-results-body" aria-busy={list.pending}>{!initialUrl.valid ? <Failure result={{status: "invalid"}} retry={() => router.push(reportsHref(initialFilters))} /> : list.pending ? <TableSkeleton columns={6} /> : list.result?.status === "ok" ? <>
        {list.result.data.items.length ? <Table className="admin-community-table" aria-label="Segnalazioni"><TableHeader><TableRow>{["Data", "Contenuto", "Segnalatore", "Motivazione", "Stato", "Azioni"].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>
          {list.result.data.items.map(row => <TableRow key={row.id}><TableCell>{communityDate(row.createdAt)}<p className="admin-note">#{row.number}</p></TableCell><TableCell><strong>{row.title}</strong><p className="admin-note">{row.targetKind === "annuncio" ? "Annuncio" : "Profilo"}</p><p className="admin-technical-text">{row.targetId}</p></TableCell><TableCell>{row.reporterEmail ?? "Non identificato"}</TableCell><TableCell><p className="admin-report-reason">{row.reason || "Nessuna motivazione"}</p></TableCell><TableCell><ReportBadge state={row.status} /></TableCell><TableCell><Button variant="ghost" size="icon-sm" aria-label="Dettagli" title="Dettagli" onClick={e => {trigger.current = e.currentTarget; setNotice(""); setSelected(row.id); detail.refresh();}}><SettingsIcon aria-hidden="true" /></Button></TableCell></TableRow>)}
        </TableBody></Table> : <EmptyState title="Nessuna segnalazione" description="Non ci sono segnalazioni corrispondenti ai filtri." />}
        <Pagination offset={query.offset ?? 0} more={list.result.data.hasMore} onChange={offset => router.push(reportsHref({...query, offset}))} />
      </> : list.result && <Failure result={list.result} retry={list.refresh} />}</CardContent>
    </Card>
    <Sheet open={!!selected} onOpenChange={open => {if (!open && !saving) setSelected(null);}}><SheetContent className="admin-detail-sheet admin-community-sheet" finalFocus={() => trigger.current?.isConnected ? trigger.current : heading.current}>
      <SheetHeader><SheetTitle>Segnalazione {report ? "#" + report.number : ""}</SheetTitle><SheetDescription>Revisione e note interne</SheetDescription></SheetHeader><div className="admin-detail-body">
        {detail.pending ? <PanelSkeleton /> : report ? <>
          <section className="admin-detail-section"><div className="admin-workspace-toolbar"><h3>{report.title}</h3><ReportBadge state={report.status} /></div><dl className="admin-facts-grid">
            <div className="admin-fact"><dt>Ricevuta il</dt><dd>{communityDate(report.createdAt)}</dd></div><div className="admin-fact"><dt>Segnalatore</dt><dd>{report.reporterEmail ?? "Non identificato"}</dd></div>
            <div className="admin-fact"><dt>Motivazione</dt><dd>{report.reason || "Nessuna motivazione"}</dd></div><div className="admin-fact"><dt>Contenuto</dt><dd className="admin-technical-text">{report.targetId}</dd></div>
            <div className="admin-fact"><dt>Ultimo aggiornamento</dt><dd>{communityDate(report.updatedAt)}</dd></div><div className="admin-fact"><dt>Amministratore</dt><dd>{report.updatedBy ?? "—"}</dd></div>
          </dl>{report.targetKind === "annuncio" ? <AnnouncementSiteLink id={report.targetId} /> : <div className="admin-action-list">{report.profileTypes.map(type => <Button key={type} variant="outline" nativeButton={false} render={<ExternalLink href={`https://www.bachecadilettanti.it/dettagli-profilo?${new URLSearchParams({id: report.targetId, type})}`} />}><ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />Apri profilo · {type.replaceAll("-", " ")}</Button>)}{!report.profileTypes.length && <p className="admin-note">Profilo non disponibile sul sito.</p>}</div>}</section>
          <ReportEditor key={`${report.id}:${report.version}`} report={report} setSaving={setSaving} reload={detail.refresh} saved={() => {setNotice("Segnalazione aggiornata."); list.refresh(); detail.refresh();}} />
        </> : detail.result && detail.result.status !== "ok" && <Failure result={detail.result} retry={detail.refresh} />}
      </div></SheetContent></Sheet>
  </div>;
}

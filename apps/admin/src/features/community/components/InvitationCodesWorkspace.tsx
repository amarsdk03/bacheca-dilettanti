"use client";
import {startTransition, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {Check, Eye, RefreshCw, RotateCcw, Search, Undo2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {EmptyState} from "@/features/dashboard/components/ContentStates";
import {PanelSkeleton, TableSkeleton} from "@/features/dashboard/components/ContentSkeletons";
import {
	type CommunityFailure,
	type CommunityQuery,
	type Invitation,
	parseCommunityPage,
	parseCommunityQuery,
	parseInvitationCode,
	parseInvitationDetail
} from "../contracts";
import {considerInvitationAction} from "../server/actions";
import {Choice, communityDate, CopyCode, Failure, Pagination, useCommunityRead} from "./CommunityControls";
import {useFilterDraft} from "@/features/dashboard/useFilterDraft";
import {invitationsHref} from "../reports-url";

const parsePage = (v: unknown) => parseCommunityPage(v, parseInvitationCode);
const initialFilters = {search: "", pending: false};

export function InvitationCodesWorkspace({initialUrl}: {initialUrl: {valid: boolean; query: CommunityQuery}}) {
	const router = useRouter();
	const query = initialUrl.query;
	const [selected, setSelected] = useState<string | null>(null), [offset, setOffset] = useState(0);
	const [confirm, setConfirm] = useState<Invitation | null>(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
	const [failure, setFailure] = useState<CommunityFailure | null>(null);
	const trigger = useRef<HTMLElement | null>(null), confirmTrigger = useRef<HTMLElement | null>(null),
		heading = useRef<HTMLHeadingElement>(null), cancel = useRef<HTMLButtonElement>(null);
	const list = useCommunityRead("invitations", query, parsePage, initialUrl.valid ? undefined : null),
		detail = useCommunityRead("invitations", {offset}, parseInvitationDetail, selected);
	const filters = useFilterDraft(query, value => parseCommunityQuery("invitations", value), invitationsHref, list.refresh);
  const draft = filters.draft;
	const data = detail.result?.status === "ok" ? detail.result.data : null;
	const submit = async () => {
		if (!confirm || busy || failure) return;
		setBusy(true);
		try {
			const result = await considerInvitationAction({
				id: confirm.id,
				considered: !confirm.considered,
				expected: confirm.considered
			});
			if (result.status === "ok") {
				setNotice(confirm.considered ? "Invito ripristinato tra quelli da valutare." : "Invito segnato come considerato.");
				setConfirm(null);
				detail.refresh();
				list.refresh();
			} else if (result.status === "denied") router.replace("/accesso"); else setFailure(result);
		} catch {
			setFailure({status: "unavailable"});
		} finally {
			setBusy(false);
		}
	};
	return <div className="admin-workspace admin-community-workspace">
		<Card className="admin-filters-card"><CardContent>
      <form className="admin-filter-form" onSubmit={e => {e.preventDefault(); filters.submit();}}>
        <FieldGroup className="admin-invitation-filters admin-standard-filters">
          <Field><FieldLabel htmlFor="codes-search">Cerca invitante o codice</FieldLabel><Input id="codes-search" placeholder="Email, UUID o codice invito" maxLength={200} value={draft.search ?? ""} onChange={e => filters.search(e.target.value)} /></Field>
          <Choice id="codes-pending" label="Inviti" value={draft.pending ? "pending" : "all"} options={{all: "Tutti", pending: "Da valutare"}} onChange={v => filters.filter({pending: v === "pending"})} />
          <div className="admin-action-list admin-filter-actions"><Button type="submit"><Search data-icon="inline-start" aria-hidden="true" />Filtra</Button><Button type="button" variant="outline" onClick={() => filters.reset(initialFilters)}><RotateCcw data-icon="inline-start" aria-hidden="true" />Azzera</Button></div>
        </FieldGroup>{filters.error && <p role="alert" className="admin-filter-error">{filters.error}</p>}
      </form>
		</CardContent></Card>
		{notice && <Alert><AlertDescription role="status">{notice}</AlertDescription></Alert>}
		<Card className="admin-results-card"><CardHeader>
			<div className="admin-workspace-toolbar"><CardTitle><h2 ref={heading} tabIndex={-1}>Codici invito</h2>
			</CardTitle><Button variant="outline" disabled={list.pending} onClick={list.refresh}><RefreshCw
				data-icon="inline-start" aria-hidden="true"/>Aggiorna</Button></div>
		</CardHeader><CardContent className="admin-results-body" aria-busy={list.pending}>
			{!initialUrl.valid ? <Failure result={{status: "invalid"}} retry={() => filters.reset(initialFilters)} /> : list.pending ? <TableSkeleton columns={5}/> : list.result?.status === "ok" ? <>
				{list.result.data.items.length ? <Table className="admin-community-table"
				                                        aria-label="Codici invito"><TableHeader><TableRow>{["Invitante", "Codice invito", "Confermati", "Da valutare", "Dettagli"].map(h =>
					<TableHead
						key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{list.result.data.items.map(row =>
					<TableRow key={row.id}>
						<TableCell>{row.email ?? "Email non disponibile"}<p
							className="admin-technical-text">{row.id}</p></TableCell><TableCell><CopyCode
						code={row.code}/></TableCell><TableCell>{row.total}</TableCell><TableCell><Badge
						variant={row.pending ? "warning" : "neutral"}>{row.pending}</Badge></TableCell><TableCell><Button
						variant="ghost" size="icon-sm" aria-label="Dettagli codice invito" title="Dettagli codice invito" onClick={e => {
						trigger.current = e.currentTarget;
						setSelected(row.id);
						setOffset(0);
						setNotice("");
						detail.refresh();
					}}><Eye aria-hidden="true"/></Button></TableCell>
					</TableRow>)}</TableBody></Table> : <EmptyState title="Nessun codice trovato"
				                                                    description="Non ci sono codici personali corrispondenti ai filtri."/>}
				<Pagination offset={query.offset ?? 0} more={list.result.data.hasMore}
				            onChange={offset => router.push(invitationsHref({...query, offset}), {scroll: false})}/>
			</> : list.result && <Failure result={list.result} retry={list.refresh}/>}
		</CardContent></Card>
		<Sheet open={!!selected} onOpenChange={open => {
			if (!open && !busy && !confirm) setSelected(null);
		}}><SheetContent className="admin-detail-sheet admin-community-sheet admin-invitation-sheet"
		                 finalFocus={() => trigger.current?.isConnected ? trigger.current : heading.current}>
			<SheetHeader><SheetTitle>Inviti
				confermati</SheetTitle><SheetDescription>{data?.owner.email ?? "Dettaglio del codice personale"}</SheetDescription></SheetHeader>
			<div className="admin-detail-body">
				{detail.pending ? <PanelSkeleton/> : data ? <>
					<section className="admin-detail-section"><CopyCode code={data.owner.code}/>
						<dl className="admin-facts-grid">
							<div className="admin-fact">
								<dt>Invitati confermati</dt>
								<dd>{data.owner.total}</dd>
							</div>
							<div className="admin-fact">
								<dt>Da valutare</dt>
								<dd>{data.owner.pending}</dd>
							</div>
						</dl>
					</section>
					{notice && <Alert><AlertDescription role="status">{notice}</AlertDescription></Alert>}
					{data.items.length ? <Table className="admin-community-table admin-invitation-detail-table"
					                            aria-label="Invitati confermati"><TableHeader><TableRow>{["Invitato", "Registrazione", "Conferma email", "Stato", "Azioni"].map(h =>
						<TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{data.items.map(row =>
						<TableRow key={row.id}>
							<TableCell>{row.email ?? "Email non disponibile"}</TableCell><TableCell>{communityDate(row.registeredAt)}</TableCell><TableCell>{communityDate(row.confirmedAt)}</TableCell><TableCell><Badge
							variant={row.considered ? "success" : "warning"}>{row.considered ? "Considerato" : "Da valutare"}</Badge></TableCell><TableCell><Button
							variant="outline" size="sm" onClick={e => {
							confirmTrigger.current = e.currentTarget;
							setFailure(null);
							setConfirm(row);
						}}>{row.considered ? <Undo2 data-icon="inline-start" aria-hidden="true"/> :
							<Check data-icon="inline-start"
							       aria-hidden="true"/>}{row.considered ? "Ripristina" : "Considera"}</Button></TableCell>
						</TableRow>)}</TableBody></Table> : <EmptyState title="Nessun invito confermato"
					                                                    description="Questo codice non ha ancora invitati con email confermata."/>}
					<Pagination offset={offset} more={data.hasMore} busy={busy} onChange={setOffset}/>
				</> : detail.result && detail.result.status !== "ok" &&
                    <Failure result={detail.result} retry={detail.refresh}/>}
			</div>
		</SheetContent></Sheet>
		<AlertDialog open={!!confirm} onOpenChange={open => {
			if (!open && !busy) setConfirm(null);
		}}><AlertDialogContent initialFocus={cancel}
		                       finalFocus={() => confirmTrigger.current?.isConnected ? confirmTrigger.current : null}>
			<AlertDialogHeader><AlertDialogTitle>{confirm?.considered ? "Ripristina invito da valutare" : "Segna invito come considerato"}</AlertDialogTitle><AlertDialogDescription>{confirm?.email ?? "Invitato"}.
				La modifica è reversibile e sarà registrata nel registro
				attività.</AlertDialogDescription></AlertDialogHeader>
			{failure && <Failure result={failure} retry={() => {
				setConfirm(null);
				detail.refresh();
				list.refresh();
			}}/>}
			<AlertDialogFooter><Button ref={cancel} variant="outline" disabled={busy}
			                           onClick={() => setConfirm(null)}>Annulla</Button><Button
				disabled={busy || !!failure} onClick={() => startTransition(() => {
				void submit();
			})}>{busy ? "Salvataggio…" : "Conferma"}</Button></AlertDialogFooter>
		</AlertDialogContent></AlertDialog>
	</div>;
}

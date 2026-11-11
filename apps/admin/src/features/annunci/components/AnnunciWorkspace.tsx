"use client";

import {useEffect, useRef, useState, useSyncExternalStore} from "react";
import {ArrowLeft, ArrowRight, CircleAlert, Download, Ellipsis, Eye, Info, RefreshCw, Search, X} from "lucide-react";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {Button} from "@/components/ui/button";
import {Spinner} from "@/components/ui/spinner";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {EmptyState} from "@/features/dashboard/components/ContentStates";
import {PanelSkeleton, TableSkeleton} from "@/features/dashboard/components/ContentSkeletons";
import {
	ADMIN_ANNOUNCEMENT_STATUSES,
	ADMIN_ANNOUNCEMENT_TYPES,
	ADMIN_ANNOUNCEMENT_VISIBILITY,
	type AnnouncementFilters,
	type AnnouncementListResult
} from "../contracts";
import {type AnnunciUrl} from "../url-state";
import {canExportAnnouncements, createAnnunciController} from "../client/controller";
import {announcementTransport} from "../client/transport";
import {downloadAnnouncementExport, requestAnnouncementExport} from "../client/export-transport";
import {
	announcementTitle,
	displayDate,
	STATUS_LABELS,
	TYPE_LABELS,
	typeLabel,
	VISIBILITY_LABELS
} from "../presentation";
import {AnnouncementSiteLink} from "./AnnouncementSiteLink";
import {AnnouncementDetailContent} from "./AnnouncementDetailContent";
import {ModerateActions, moderationIcons} from "./ModerateActions";
import {AnnouncementStatusBadge, AnnouncementTrashBadge, AnnouncementVisibilityBadges} from "./AnnouncementBadges";
import {ModerationDialog} from "./ModerationDialog";
import {moderateAnnouncementAction} from "@/features/annunci/server/actions";
import {WhatsAppExportDialog} from "../whatsapp/WhatsAppExportDialog";
import {whatsappLabel, canPrepareWhatsApp} from "../whatsapp/model";
import {MODERATION_LABELS, type ModerationOperation} from "../moderation";

function FilterSelect({id, label, value, items, onChange}: {
	id: string;
	label: string;
	value: string;
	items: { value: string; label: string }[];
	onChange(value: string): void
}) {
	return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel><Select items={items} value={value}
	                                                                   onValueChange={(v) => {
		                                                                   if (v !== null) onChange(v);
	                                                                   }}>
		<SelectTrigger id={id} className="w-full"><SelectValue/></SelectTrigger>
		<SelectContent><SelectGroup>{items.map((item) => <SelectItem key={item.value}
		                                                             value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
	</Select></Field>;
}

function Failure({title, description, retry, correlationId}: {
	title: string;
	description: string;
	retry(): void;
	correlationId?: string
}) {
	return <Alert variant="destructive" className="admin-feedback"><CircleAlert
		aria-hidden="true"/><AlertTitle>{title}</AlertTitle><AlertDescription>
		<p>{description}</p>{correlationId && correlationId !== "client" && <p>Riferimento: {correlationId}</p>}
		<Button variant="outline" size="sm" onClick={retry}><RefreshCw data-icon="inline-start" aria-hidden="true"/>Riprova</Button>
	</AlertDescription></Alert>;
}

export function AnnunciWorkspace({initialQuery, initialResult}: {
	initialQuery: AnnunciUrl;
	initialResult: AnnouncementListResult
}) {
	const [controller] = useState(() => createAnnunciController(initialQuery, initialResult, {
		...announcementTransport,
		moderate: moderateAnnouncementAction,
		export: requestAnnouncementExport, download: downloadAnnouncementExport,
		navigate(href, mode) {
			if (mode === "push") window.history.pushState(null, "", href); else window.history.replaceState(null, "", href);
		},
		denied() {
			window.location.replace("/accesso");
		},
	}));
	const [whatsappId,setWhatsappId] = useState<string|null>(null);
	const whatsappTrigger = useRef<HTMLElement|null>(null);
	const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getServerSnapshot);
	const previewTrigger = useRef<HTMLElement | null>(null), resultsTitle = useRef<HTMLHeadingElement>(null),
		panelTitle = useRef<HTMLHeadingElement>(null);
	const moderationTrigger = useRef<HTMLElement | null>(null);
	useEffect(() => {
		const pop = () => controller.sync(window.location.search, true);
		const show = (event: PageTransitionEvent) => {
			if (event.persisted) controller.refresh();
		};
		window.addEventListener("popstate", pop);
		window.addEventListener("pageshow", show);
		return () => {
			window.removeEventListener("popstate", pop);
			window.removeEventListener("pageshow", show);
			controller.cancel();
		};
	}, [controller]);
	const result = state.list.result, preview = state.preview;
	const mutating = state.moderation?.phase === "submitting" || state.exporting.pending || whatsappId !== null;
	const filtered = Boolean(state.query.filters.search || state.query.filters.status || state.query.filters.type || state.query.filters.visibility !== "all" || state.query.filters.trash !== "exclude");
	return <div className="admin-workspace admin-annunci-workspace">
		<Card className="admin-filters-card"><CardContent>
			<form onSubmit={(event) => {
				event.preventDefault();
				controller.submitSearch();
			}}>
				<FieldGroup className="admin-annunci-filters">
					<div className="admin-search-row">
						<Field data-invalid={Boolean(state.searchError)}><FieldLabel htmlFor="annunci-search">Cerca per
							titolo personalizzato o UUID</FieldLabel>
							<InputGroup><InputGroupAddon><Search aria-hidden="true"/></InputGroupAddon><InputGroupInput
								id="annunci-search" value={state.draft.search}
								onChange={(event) => controller.setSearch(event.target.value)}
								aria-invalid={Boolean(state.searchError)}
								aria-describedby={state.searchError ? "annunci-search-error" : undefined}
								placeholder="Titolo o UUID"/>
								{state.draft.search &&
                                    <InputGroupAddon align="inline-end"><InputGroupButton aria-label="Svuota ricerca"
                                                                                          onClick={() => {
										                                                      controller.setSearch("");
										                                                      controller.submitSearch();
									                                                      }}><X
                                        aria-hidden="true"/></InputGroupButton></InputGroupAddon>}
							</InputGroup>{state.searchError &&
                                <FieldError id="annunci-search-error">{state.searchError}</FieldError>}
						</Field>
						<div className="admin-action-list"><Button type="submit" size="sm"
						                                           disabled={Boolean(state.searchError)}>Cerca</Button><Button
							variant="outline" size="sm" onClick={controller.reset}>Azzera filtri</Button></div>
					</div>
					<FilterSelect id="annunci-status" label="Stato" value={state.draft.status ?? "all"} items={[{
						value: "all",
						label: "Tutti gli stati"
					}, ...ADMIN_ANNOUNCEMENT_STATUSES.map((value) => ({value, label: STATUS_LABELS[value]}))]}
					              onChange={(value) => controller.setFilter({status: value === "all" ? null : value as AnnouncementFilters["status"]})}/>
					<FilterSelect id="annunci-type" label="Tipologia" value={state.draft.type ?? "all"} items={[{
						value: "all",
						label: "Tutte le tipologie"
					}, ...ADMIN_ANNOUNCEMENT_TYPES.map((value) => ({value, label: TYPE_LABELS[value]}))]}
					              onChange={(value) => controller.setFilter({type: value === "all" ? null : value as AnnouncementFilters["type"]})}/>
					<FilterSelect id="annunci-visibility" label="Oscuramento" value={state.draft.visibility}
					              items={ADMIN_ANNOUNCEMENT_VISIBILITY.map((value) => ({
						              value,
						              label: VISIBILITY_LABELS[value]
					              }))}
					              onChange={(value) => controller.setFilter({visibility: value as AnnouncementFilters["visibility"]})}/>
				</FieldGroup>
			</form>
		</CardContent></Card>
		<Card className="admin-results-card" role="region" aria-labelledby="annunci-results"><CardHeader>
			<div className="admin-workspace-toolbar"><CardTitle><h2 id="annunci-results" ref={resultsTitle}
			                                                        tabIndex={-1}>Annunci{result?.status === "ok" &&
                <span className="admin-result-count">{result.page.items.length}</span>}</h2></CardTitle>
				<div className="admin-action-list">
					<Button variant="outline" size="sm" disabled={state.list.pending || mutating}
					        onClick={controller.refresh}><RefreshCw data-icon="inline-start" aria-hidden="true"/>Aggiorna</Button>
					<Button variant="outline" disabled={!canExportAnnouncements(state)} onClick={() => {
						void controller.exportPage();
					}}>{state.exporting.pending ? <Spinner data-icon="inline-start"/> :
						<Download data-icon="inline-start"
						          aria-hidden="true"/>}{state.exporting.pending ? "Esportazione…" : "Esporta CSV"}</Button>
				</div>
			</div>
			<p role="status" className="sr-only">{state.exporting.pending ? "Preparazione del file CSV" : ""}</p>
		</CardHeader><CardContent className="admin-results-body">
			{state.exporting.result &&
                <Alert variant="destructive" className="admin-feedback"><CircleAlert aria-hidden="true"/><AlertTitle>Export
                    non completato</AlertTitle><AlertDescription>
                    <p>{state.exporting.result.status === "conflict" ? "La pagina è cambiata. Aggiorna l’elenco prima di esportare." : state.exporting.result.status === "invalid" ? "La richiesta non è valida. Aggiorna l’elenco prima di riprovare." : "Il download non è stato completato o il suo esito non è verificabile. Aggiorna l’elenco prima di riprovare."}</p>{state.exporting.result.correlationId !== "client" &&
                    <p>Riferimento: {state.exporting.result.correlationId}</p>}<Button variant="outline" size="sm"
                                                                                       onClick={controller.refresh}><RefreshCw
                    data-icon="inline-start" aria-hidden="true"/>Aggiorna</Button></AlertDescription></Alert>}
			<div aria-live="polite" aria-atomic="true"
			     className="sr-only">{state.list.pending ? "Caricamento annunci" : result?.status === "ok" ? `${result.page.items.length} annunci caricati` : "Elenco annunci non disponibile"}</div>
			{state.list.pending ? <TableSkeleton rows={8} columns={7}/> : result?.status === "invalid" ?
				<Alert variant="warning" className="admin-feedback"><Info aria-hidden="true"/><AlertTitle>Filtri o
					cursore non validi</AlertTitle><AlertDescription><p>Ripristina i filtri oppure riparti dalla prima
					pagina.</p>
					<div className="admin-action-list">{state.query.valid && state.query.cursor &&
                        <Button variant="outline" size="sm" onClick={controller.first}>Prima pagina</Button>}<Button
						variant="outline" size="sm" onClick={controller.reset}>Azzera filtri</Button></div>
				</AlertDescription></Alert> : result?.status === "unavailable" ?
					<Failure title="Impossibile caricare gli annunci"
					         description="Il servizio è temporaneamente non disponibile." retry={controller.refresh}
					         correlationId={result.correlationId}/> : result?.status === "ok" ? <>
						{result.page.items.length === 0 ? <EmptyState
							title={state.query.cursor ? "Nessun risultato in questa pagina" : filtered ? "Nessun annuncio corrisponde ai filtri" : "Nessun annuncio presente"}
							description={state.query.cursor ? "L’elenco potrebbe essere cambiato durante la consultazione." : "Gli annunci disponibili compariranno qui."}>
							{state.query.cursor ?
								<Button variant="outline" onClick={controller.first}>Prima pagina</Button> : filtered &&
                                <Button variant="outline" onClick={controller.reset}>Azzera filtri</Button>}
						</EmptyState> : <Table
							className="admin-annunci-table"><TableCaption>{result.page.items.length} {result.page.items.length === 1 ? "annuncio in questa pagina" : "annunci in questa pagina"}.
							Dal più recente; date in Europe/Rome.</TableCaption>
							<TableHeader><TableRow>{["Titolo", "Autore / Profilo", "Annuncio WhatsApp?", "Stato", "Visibilità", "Creazione", "Azioni"].map((label) =>
								<TableHead scope="col" key={label}>{label}</TableHead>)}</TableRow></TableHeader>
							<TableBody>{result.page.items.map((row) => <TableRow key={row.id}>
								<TableCell><p
									className="admin-announcement-title">{announcementTitle(row)}</p>{row.trashed &&
                                    <AnnouncementTrashBadge/>}<p className="admin-technical-text">{row.id}</p>
								</TableCell>
								<TableCell>{row.author.displayName}<p
									className="admin-announcement-type">{typeLabel(row.type)}</p></TableCell>
                                <TableCell>{whatsappLabel(row)}</TableCell>
                                <TableCell><AnnouncementStatusBadge status={row.status}/></TableCell>
								<TableCell>
									<div className="admin-badge-list"><AnnouncementVisibilityBadges row={row}/></div>
								</TableCell>
								<TableCell>{displayDate(row.createdAt)}</TableCell><TableCell>
								<div className="admin-row-actions">
									<Button size="icon-sm" variant="ghost" disabled={mutating}
									        aria-label={`Anteprima: ${announcementTitle(row)}`} onClick={(event) => {
										previewTrigger.current = event.currentTarget;
										controller.openPreview(row.id);
									}}><Eye aria-hidden="true"/></Button>
									{!row.trashed && <DropdownMenu><DropdownMenuTrigger disabled={mutating}
                                                                                        render={<Button
										                                                    id={`annunci-menu-${row.id}`}
										                                                    size="icon-sm"
										                                                    variant="ghost"
										                                                    aria-label={`Altre azioni: ${announcementTitle(row)}`}/>}><Ellipsis
                                        aria-hidden="true"/></DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"><DropdownMenuGroup><DropdownMenuLabel>Moderazione</DropdownMenuLabel>{(["approve", "reject", row.hidden === true ? "show" : "hide"] as ModerationOperation[]).map((operation) => {
											const Icon = moderationIcons[operation];
											return <DropdownMenuItem
												variant={operation === "reject" ? "destructive" : "default"}
												disabled={mutating || (["approve", "reject"].includes(operation) && row.status !== "in_revisione")}
												key={operation} onClick={() => {
												moderationTrigger.current = document.getElementById(`annunci-menu-${row.id}`);
												controller.beginModeration(row.id, operation);
											}}><Icon aria-hidden="true"/>{MODERATION_LABELS[operation]}
											</DropdownMenuItem>;
										})}</DropdownMenuGroup>
										<DropdownMenuGroup>
											<DropdownMenuLabel>WhatsApp</DropdownMenuLabel>
											<DropdownMenuItem
												disabled={mutating || !canPrepareWhatsApp(row)}
												onClick={() => {
													whatsappTrigger.current = document.getElementById(`annunci-menu-${row.id}`);
													setWhatsappId(row.id);
												}}>
												<svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
													<path d="M12.04 2a9.93 9.93 0 0 0-8.52 15.04L2 22l5.11-1.48A9.94 9.94 0 1 0 12.04 2Zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.03.88.9-2.95-.2-.31a8.22 8.22 0 1 1 6.81 3.7Zm4.51-6.16c-.25-.12-1.49-.74-1.72-.82-.23-.08-.4-.12-.57.12-.17.25-.65.82-.8.99-.15.16-.3.18-.55.06-.25-.12-1.06-.39-2.02-1.24-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.38.11-.5.11-.11.25-.3.37-.44.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.57-1.37-.78-1.87-.2-.49-.41-.42-.57-.43h-.49c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.03 2.59.12.17 1.77 2.71 4.29 3.8.6.26 1.06.42 1.42.54.6.19 1.14.16 1.57.1.48-.07 1.49-.61 1.7-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.16-.48-.29Z"/>
												</svg>
												Esporta su WhatsApp
											</DropdownMenuItem>
										</DropdownMenuGroup>
									</DropdownMenuContent>
                                    </DropdownMenu>}
								</div>
							</TableCell>
							</TableRow>)}</TableBody>
						</Table>}
						<nav aria-label="Paginazione annunci" className="admin-pagination"><Button variant="outline"
						                                                                           size="sm"
						                                                                           disabled={!state.query.cursor}
						                                                                           onClick={controller.first}>Prima
							pagina</Button>
							<div className="admin-action-list">
								<Button variant="outline" size="sm" disabled={!state.canPrevious}
								        onClick={controller.previous}><ArrowLeft data-icon="inline-start"
								                                                 aria-hidden="true"/>Precedente</Button>
								<Button variant="outline" size="sm" disabled={!result.page.hasMore}
								        onClick={controller.next}>Successiva<ArrowRight data-icon="inline-end"
								                                                        aria-hidden="true"/></Button>
							</div>
						</nav>
					</> : null}
		</CardContent></Card>
		<Sheet open={preview.id !== null} onOpenChange={(open) => {
			if (!open) controller.closePreview();
		}}>
			<SheetContent side="right" className="admin-detail-sheet admin-annunci-sheet" initialFocus={panelTitle}
			              finalFocus={() => previewTrigger.current?.isConnected ? previewTrigger.current : resultsTitle.current}>
				<SheetHeader><SheetTitle ref={panelTitle}
				                         tabIndex={-1}>{preview.result?.status === "ok" ? announcementTitle(preview.result.detail.summary) : "Anteprima annuncio"}</SheetTitle><SheetDescription>Contenuto
					e informazioni amministrative dell’annuncio.</SheetDescription></SheetHeader>
				<div className="admin-detail-body">
					{preview.pending ? <PanelSkeleton/> : preview.result?.status === "ok" ? <>
						<div className="admin-preview-toolbar"><AnnouncementSiteLink
							id={preview.result.detail.summary.id}
							trashed={preview.result.detail.summary.trashed}/><Button variant="ghost" size="sm"
						                                                             disabled={mutating}
						                                                             onClick={controller.retryPreview}><RefreshCw
							data-icon="inline-start" aria-hidden="true"/>Ricarica</Button></div>
						<AnnouncementDetailContent detail={preview.result.detail}/><ModerateActions
						detail={preview.result.detail} disabled={mutating} onChoose={(operation, trigger) => {
						moderationTrigger.current = trigger;
						controller.beginModeration(preview.id!, operation);
					}}/></> : preview.result?.status === "not_found" ?
						<EmptyState title="Annuncio non più disponibile"
						            description="L’annuncio potrebbe essere stato rimosso."><Button variant="outline"
						                                                                            onClick={controller.refresh}>Aggiorna</Button></EmptyState> : preview.result?.status === "invalid" ?
							<EmptyState title="Annuncio non valido"
							            description="Chiudi l’anteprima e aggiorna l’elenco."/> : preview.result?.status === "unavailable" ?
								<Failure title="Impossibile caricare il dettaglio" description="Riprova tra poco."
								         retry={controller.retryPreview}
								         correlationId={preview.result.correlationId}/> : null}
				</div>
			</SheetContent>
		</Sheet>
		{whatsappId && <WhatsAppExportDialog key={whatsappId} id={whatsappId} onClose={()=>setWhatsappId(null)} onSaved={()=>{controller.refresh(); if(state.preview.id)controller.retryPreview();}} finalFocus={()=>whatsappTrigger.current?.isConnected ? whatsappTrigger.current : resultsTitle.current}/>}
		<ModerationDialog state={state.moderation} controller={controller}
		                  finalFocus={() => moderationTrigger.current?.isConnected ? moderationTrigger.current : state.preview.id ? panelTitle.current : resultsTitle.current}/>
	</div>;
}

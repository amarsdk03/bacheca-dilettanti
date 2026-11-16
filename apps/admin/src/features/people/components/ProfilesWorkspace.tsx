"use client";
import {useRef, useState} from "react";
import Link from "next/link";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {
	BadgeCheck,
	Ellipsis,
	ExternalLink as ExternalLinkIcon,
	Eye,
	EyeOff,
	ReceiptTextIcon,
	RefreshCw,
	RotateCcw,
	Search,
	ShieldX,
	Undo2,
	Users
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
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
import {AnnouncementLegend} from "@/features/annunci/components/AnnouncementLegends";
import {EmptyState} from "@/features/dashboard/components/ContentStates";
import {PanelSkeleton, TableSkeleton} from "@/features/dashboard/components/ContentSkeletons";
import {ExternalLink} from "@/features/navigation/ExternalNavigation";
import {Choice, communityDate, Failure, Pagination} from "../../community/components/CommunityControls";
import type {CommunityFailure} from "../../community/contracts";
import {
	OPERATIONS,
	parsePeoplePage,
	parsePeopleQuery,
	parseProfile,
	parseProfileDetail,
	peopleHref,
	type PeopleQuery,
	PROFILE_LABELS,
	type ProfileOperation,
	type ProfileRow,
	VISIBILITY
} from "../contracts";
import {moderateProfileAction} from "../server/actions";
import {useFilterDraft} from "@/features/dashboard/useFilterDraft";
import {Fact, usePeopleRead} from "./PeopleControls";
import {profileFieldLabel, profileFieldValue} from "../presentation";
import {REGIONI_ITALIANE} from "@bacheca/announcements/const/defaultConstants";

const ITALIAN_REGIONS = [...REGIONI_ITALIANE.map(r => r.nome), "Estero"].sort((a, b) => a.localeCompare(b, "it"));
const parsePage = (v: unknown) => parsePeoplePage(v, parseProfile);

export function ProfilesWorkspace({initialUrl}: {initialUrl: {valid: boolean; query: PeopleQuery}}) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const query = initialUrl.query, [selected, setSelected] = useState<ProfileRow | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [operation, setOperation] = useState<ProfileOperation | null>(null), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [failure, setFailure] = useState<CommunityFailure | null>(null), [notice, setNotice] = useState("");
  const trigger = useRef<HTMLElement | null>(null), actionTrigger = useRef<HTMLElement | null>(null), heading = useRef<HTMLHeadingElement>(null), cancel = useRef<HTMLButtonElement>(null);
  const list = usePeopleRead("profiles", query, parsePage, initialUrl.valid ? undefined : null), detail = usePeopleRead("profiles", {}, parseProfileDetail, selected ? {id: selected.profileId, type: selected.type} : null);
  const data = detail.result?.status === "ok" ? detail.result.data : null, needsReason = operation === "hide" || operation === "unverify";
  const filters = useFilterDraft(query, value => parsePeopleQuery("profiles", value), value => peopleHref("profiles", value), list.refresh);
  const draft = filters.draft;
  const navigate = (q: PeopleQuery) => {const href = peopleHref("profiles", q); if (href === pathname + (params.size ? "?" + params : "")) list.refresh(); else router.push(href);};
  const closeOperation = () => {
    if (busy) return;
    setOperation(null);
    if (failure) {detail.refresh(); list.refresh(); setFailure(null);}
  };
  const submit = async () => {
    if (!data || detail.pending || !operation || busy || failure) return;
    setBusy(true);
    try {
      const result = await moderateProfileAction({id: data.profileId, type: data.type, operation, version: data.version, reason: needsReason ? reason : null});
      if (result.status === "ok") {setOperation(null); setNotice("Profilo aggiornato."); detail.refresh(); list.refresh();}
      else if (result.status === "denied") router.replace("/accesso"); else setFailure(result);
    } catch {setFailure({status: "unavailable"});} finally {setBusy(false);}
  };
  return <div className="admin-workspace admin-community-workspace">
    <Card className="admin-filters-card"><CardContent><form className="admin-filter-form" onSubmit={e => {e.preventDefault(); filters.submit();}}><FieldGroup className="admin-people-filters admin-profiles-filters admin-standard-filters">
      <div className="admin-filter-search-row"><Field><FieldLabel htmlFor="profiles-search">Cerca profilo</FieldLabel><Input id="profiles-search" placeholder="Nome, email o UUID" maxLength={200} value={draft.search ?? ""} onChange={e => filters.search(e.target.value)} /></Field><div className="admin-action-list admin-filter-actions"><Button type="submit"><Search data-icon="inline-start" aria-hidden="true" />Filtra</Button><Button type="button" variant="outline" onClick={() => filters.reset({})}><RotateCcw data-icon="inline-start" aria-hidden="true" />Azzera</Button></div></div>
      <Choice id="profiles-sort" label="Ordina per" value={draft.sort ?? "newest"} options={{newest: "Data (più recente)", oldest: "Data (meno recente)", announcements: "Più annunci", followers: "Più follower"}} onChange={sort => filters.filter({sort})} />
      <Choice id="profiles-type" label="Tipologia" value={draft.type ?? "all"} options={{all: "Tutte", ...PROFILE_LABELS}} onChange={type => filters.filter({type: type})} />

      <Choice id="profiles-region" label="Regione" value={draft.region || "all"} options={{all: "Tutte", ...Object.fromEntries(ITALIAN_REGIONS.map(r => [r, r]))}} onChange={region => filters.filter({region: region === "all" ? "" : region})} />
      <Choice id="profiles-verification" label="Verifica" value={draft.verification ?? "all"} options={{all: "Tutte", verified: "Verificato", unverified: "Non verificato"}} onChange={verification => filters.filter({verification: verification})} />
      <Choice id="profiles-visibility" label="Visibilità" value={draft.visibility ?? "all"} options={{all: "Tutte", ...VISIBILITY}} onChange={visibility => filters.filter({visibility: visibility})} />
      <Choice id="profiles-ownership" label="Account" value={draft.ownership ?? "all"} options={{all: "Tutti", linked: "Con account", unlinked: "Senza account"}} onChange={ownership => filters.filter({ownership: ownership})} />
    </FieldGroup>
    {filters.error && <p role="alert" className="admin-filter-error">{filters.error}</p>}</form></CardContent></Card>
    <Card className="admin-results-card"><CardHeader><div className="admin-workspace-toolbar"><CardTitle><h2 ref={heading} tabIndex={-1}>Profili</h2></CardTitle><Button variant="outline" disabled={list.pending} onClick={list.refresh}><RefreshCw data-icon="inline-start" aria-hidden="true" />Aggiorna</Button></div></CardHeader><CardContent className="admin-results-body" aria-busy={list.pending}>
      {!initialUrl.valid ? <Failure result={{status: "invalid"}} retry={() => navigate({})} /> : list.pending ? <TableSkeleton columns={6} /> : list.result?.status === "ok" ? <>
        {list.result.data.items.length ? <Table className="admin-community-table" aria-label="Profili"><TableHeader><TableRow>{["Profilo", "Account", "Zona", "Verifica", "Visibilità", "Azioni"].map(h => <TableHead key={h}>{h === "Visibilit\u00e0" ? <span className="admin-heading-legend">{h}<AnnouncementLegend kind="profile-visibility" /></span> : h}</TableHead>)}</TableRow></TableHeader><TableBody>
          {list.result.data.items.map(row => <TableRow key={row.id}><TableCell>{row.name}<p className="admin-profile-type">{PROFILE_LABELS[row.type]}</p></TableCell><TableCell>{row.email ?? (row.userId ? "Email non disponibile" : "Senza account")}</TableCell><TableCell>{row.locations.map(l => [l.city, l.region].filter(Boolean).join(", ")).join("; ") || "—"}</TableCell><TableCell><Badge variant={row.verifiedAt ? "success" : "neutral"}>{row.verifiedAt ? "Verificato" : "Non verificato"}</Badge></TableCell><TableCell><Badge variant={row.adminHidden ? "warning" : "neutral"}>{VISIBILITY[row.visibility]}</Badge></TableCell><TableCell><DropdownMenu><DropdownMenuTrigger disabled={busy} render={<Button id={`profile-actions-${row.id}`} variant="ghost" size="icon-sm" aria-label={`Azioni: ${row.name}`} />}><Ellipsis aria-hidden="true" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="flex flex-col gap-1.5">
            <DropdownMenuGroup><DropdownMenuLabel>Dettagli</DropdownMenuLabel>
              <DropdownMenuItem disabled={row.visibility !== "public"} render={<ExternalLink href={`https://www.bachecadilettanti.it/dettagli-profilo?id=${row.profileId}&type=${row.type}`} />}><ExternalLinkIcon aria-hidden="true" />Apri sul sito</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {trigger.current = document.getElementById(`profile-actions-${row.id}`); setSelected(row); setPanelOpen(true); setNotice(""); detail.refresh();}}><ReceiptTextIcon aria-hidden="true" />Info complete</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuGroup><DropdownMenuLabel>Moderazione</DropdownMenuLabel><div className="admin-menu-moderation">
              {([row.verifiedAt ? "unverify" : "verify", row.adminHidden ? "show" : "hide"] as ProfileOperation[]).map(op => {
                const Icon = op === "verify" ? BadgeCheck : op === "unverify" ? ShieldX : op === "hide" ? EyeOff : Eye;
                return <DropdownMenuItem key={op} data-moderation={op} aria-label={OPERATIONS[op]} title={OPERATIONS[op]} onClick={() => {
                  actionTrigger.current = document.getElementById(`profile-actions-${row.id}`); setSelected(row); setPanelOpen(false); detail.refresh(); setOperation(op); setReason(""); setFailure(null);
                }}><Icon aria-hidden="true" /></DropdownMenuItem>;
              })}
            </div></DropdownMenuGroup>
          </DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}
        </TableBody></Table> : <EmptyState title="Nessun profilo trovato" description="Modifica i filtri per cercare altri profili." />}
        <Pagination offset={query.offset ?? 0} more={list.result.data.hasMore} onChange={offset => navigate({...query, offset})} />
      </> : list.result && <Failure result={list.result} retry={list.refresh} />}
    </CardContent></Card>
    <Sheet open={panelOpen && !!selected} onOpenChange={open => {if (!open && !busy && !operation) {setPanelOpen(false); setSelected(null);}}}><SheetContent className="admin-detail-sheet admin-community-sheet" finalFocus={() => trigger.current?.isConnected ? trigger.current : heading.current}>
      <SheetHeader><SheetTitle>{data?.name ?? "Dettagli profilo"}</SheetTitle><SheetDescription>{selected && PROFILE_LABELS[selected.type]}</SheetDescription></SheetHeader><div className="admin-detail-body">
        {detail.pending ? <PanelSkeleton /> : data ? <>
          {notice && <Alert><AlertDescription role="status">{notice}</AlertDescription></Alert>}
          <section className="admin-detail-section"><h3>Profilo</h3><dl className="admin-facts-grid"><Fact label="UUID profilo">{data.profileId}</Fact><Fact label="Account">{data.email ?? "Senza account"}</Fact><Fact label="Verifica ufficiale">{data.verifiedAt ? communityDate(data.verifiedAt) : "Non verificato"}</Fact><Fact label="Visibilità">{VISIBILITY[data.visibility]}</Fact><Fact label="Annunci pubblicati">{data.publicAnnouncementCount}</Fact><Fact label="Follower">{data.followerCount}</Fact><Fact label="Località">{data.locations.map(l => [l.city, l.region].filter(Boolean).join(", ")).join("; ") || "—"}</Fact></dl>
            {data.adminHidden && <Alert variant="warning"><AlertDescription>Profilo e annunci di questa tipologia sono oscurati. Gli altri profili dell’account restano invariati.</AlertDescription></Alert>}
            {!data.userId && <p className="admin-note">Profilo senza account: non ha una pagina profilo pubblica autonoma.</p>}
            <div className="admin-action-list">{data.visibility === "public" && <Button variant="outline" nativeButton={false} render={<ExternalLink href={`https://www.bachecadilettanti.it/dettagli-profilo?id=${data.profileId}&type=${data.type}`} />}><ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />Apri sul sito</Button>}
              {data.userId && <Button variant="outline" nativeButton={false} render={<Link href={peopleHref("users", {search: data.userId})} prefetch={false} />}><Users data-icon="inline-start" aria-hidden="true" />Apri utente</Button>}</div>
          </section>
          <section className="admin-detail-section"><h3>Moderazione</h3><div className="admin-action-list">{([data.verifiedAt ? "unverify" : "verify", data.adminHidden ? "show" : "hide"] as ProfileOperation[]).map(op => <Button key={op} variant="outline" onClick={e => {actionTrigger.current = e.currentTarget; setOperation(op); setReason(""); setFailure(null);}}>{op === "verify" ? <BadgeCheck data-icon="inline-start" aria-hidden="true" /> : op === "unverify" ? <ShieldX data-icon="inline-start" aria-hidden="true" /> : op === "hide" ? <EyeOff data-icon="inline-start" aria-hidden="true" /> : <Undo2 data-icon="inline-start" aria-hidden="true" />}{OPERATIONS[op]}</Button>)}</div></section>
          <section className="admin-detail-section"><h3>Informazioni</h3><dl className="admin-detail-stack">{Object.entries(data.fields).filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && !v.length)).map(([k, v]) => <Fact key={k} label={profileFieldLabel(k)}><span className="admin-profile-field-value">{profileFieldValue(v)}</span></Fact>)}</dl></section>
        </> : detail.result && detail.result.status !== "ok" && <Failure result={detail.result} retry={detail.refresh} />}
      </div></SheetContent></Sheet>
    <AlertDialog open={!!operation} onOpenChange={open => {if (!open) closeOperation();}}><AlertDialogContent initialFocus={cancel} finalFocus={() => actionTrigger.current?.isConnected ? actionTrigger.current : heading.current}>
      <AlertDialogHeader><AlertDialogTitle>{operation && OPERATIONS[operation]}</AlertDialogTitle><AlertDialogDescription>{operation === "hide" ? "Il profilo e tutti gli annunci collegati a questa tipologia saranno oscurati sulla piattaforma." : operation === "show" ? "Rimuove il blocco del profilo. Gli annunci tornano disponibili solo se gli altri requisiti di pubblicazione sono soddisfatti." : "La modifica riguarda soltanto questo profilo, senza cambiare il badge delle altre tipologie dell’account."}</AlertDialogDescription></AlertDialogHeader>
      {detail.pending && <PanelSkeleton />}{!detail.pending && detail.result && detail.result.status !== "ok" && <Failure result={detail.result} retry={detail.refresh} />}{needsReason && <Field><FieldLabel htmlFor="profile-reason">Motivazione <span className="admin-required">*</span></FieldLabel><Textarea id="profile-reason" required maxLength={1000} value={reason} disabled={busy || !!failure} onChange={e => setReason(e.target.value)} /></Field>}
      {failure && <Failure result={failure} retry={closeOperation} />}
      <AlertDialogFooter><Button ref={cancel} variant="outline" disabled={busy} onClick={closeOperation}>Annulla</Button><Button disabled={detail.pending || !data || busy || !!failure || needsReason && !reason.trim()} onClick={() => {void submit();}}>{busy ? "Salvataggio…" : "Conferma"}</Button></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div>;
}

"use client";
import {useRef, useState} from "react";
import Link from "next/link";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {Contact, Eye, MailExclamationPoint, RefreshCw, RotateCcw, Search} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput} from "@/components/ui/input-group";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle} from "@/components/ui/sheet";
import {EmptyState} from "@/features/dashboard/components/ContentStates";
import {PanelSkeleton, TableSkeleton} from "@/features/dashboard/components/ContentSkeletons";
import {Choice, communityDate, Failure, Pagination} from "../../community/components/CommunityControls";
import {
	DEFAULT_EXCLUDED_DOMAINS,
	parsePeoplePage,
	parsePeopleQuery,
	parseUser,
	parseUserDetail,
	peopleHref,
	type PeopleQuery,
	PROFILE_LABELS,
	VISIBILITY
} from "../contracts";
import {useFilterDraft} from "@/features/dashboard/useFilterDraft";
import {Fact, usePeopleRead} from "./PeopleControls";
import {ExcludedDomainsDialog} from "./ExcludedDomainsDialog";

const parsePage = (v: unknown) => parsePeoplePage(v, parseUser);

export function UsersWorkspace({initialUrl}: {initialUrl: {valid: boolean; query: PeopleQuery}}) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const query = initialUrl.query, [selected, setSelected] = useState<string | null>(null);
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [savedDomains, setSavedDomains] = useState(() => query.excludedDomains ? query.excludedDomains.split(",") : DEFAULT_EXCLUDED_DOMAINS);
  const trigger = useRef<HTMLElement | null>(null), heading = useRef<HTMLHeadingElement>(null);
  const list = usePeopleRead("users", query, parsePage, initialUrl.valid ? undefined : null), detail = usePeopleRead("users", {}, parseUserDetail, selected ? {id: selected} : null);
  const data = detail.result?.status === "ok" ? detail.result.data : null;
  const filters = useFilterDraft(query, value => parsePeopleQuery("users", value), value => peopleHref("users", value), list.refresh);
  const draft = filters.draft;
  const navigate = (q: PeopleQuery) => {const href = peopleHref("users", q); if (href === pathname + (params.size ? "?" + params : "")) list.refresh(); else router.push(href);};
  return <div className="admin-workspace admin-community-workspace">
    <Card className="admin-filters-card"><CardContent><form className="admin-filter-form" onSubmit={e => {e.preventDefault(); filters.submit();}}>
      <FieldGroup className="admin-people-filters admin-standard-filters">
        <div className="admin-filter-search-row"><Field><FieldLabel htmlFor="users-search">Cerca utente</FieldLabel><InputGroup><InputGroupInput id="users-search" placeholder="Email, telefono o UUID" maxLength={200} value={draft.search ?? ""} onChange={e => filters.search(e.target.value)} /><InputGroupAddon className="size-9" align="inline-end"><Tooltip><TooltipTrigger render={<InputGroupButton className="size-9" aria-label="Domini esclusi" aria-pressed={!!query.excludedDomains} onClick={() => {if (query.excludedDomains) setSavedDomains(query.excludedDomains.split(",")); setDomainsOpen(true);}}><MailExclamationPoint className="size-4" /></InputGroupButton>} /><TooltipContent>Domini esclusi</TooltipContent></Tooltip></InputGroupAddon></InputGroup></Field><div className="admin-action-list admin-filter-actions"><Button type="submit"><Search data-icon="inline-start" aria-hidden="true" />Filtra</Button><Button type="button" variant="outline" onClick={() => filters.reset({})}><RotateCcw data-icon="inline-start" aria-hidden="true" />Azzera</Button></div></div>
        <Choice id="users-registration" label="Registrazione" value={draft.registration ?? "all"} options={{all: "Tutte", complete: "Completa", incomplete: "Incompleta"}} onChange={registration => filters.filter({registration: registration})} />
        <Choice id="users-confirmation" label="Conferma email" value={draft.confirmation ?? "all"} options={{all: "Tutte", confirmed: "Confermata", unconfirmed: "Da confermare"}} onChange={confirmation => filters.filter({confirmation: confirmation})} />
        <Field><FieldLabel htmlFor="users-from">Creato dal</FieldLabel><Input id="users-from" type="date" value={draft.from ?? ""} onChange={e => filters.filter({from: e.target.value})} /></Field>
        <Field><FieldLabel htmlFor="users-to">Al</FieldLabel><Input id="users-to" type="date" value={draft.to ?? ""} onChange={e => filters.filter({to: e.target.value})} /></Field>
      </FieldGroup>

    {filters.error && <p role="alert" className="admin-filter-error">{filters.error}</p>}</form></CardContent></Card>
    <ExcludedDomainsDialog key={domainsOpen ? `open:${savedDomains.join(",")}` : "closed"} open={domainsOpen} onOpenChange={setDomainsOpen} domains={savedDomains} onApply={domains => {setSavedDomains(domains); filters.filter({excludedDomains: domains.join(",")});}} />
    <Card className="admin-results-card"><CardHeader><div className="admin-workspace-toolbar"><CardTitle><h2 ref={heading} tabIndex={-1}>Utenti</h2></CardTitle><Button variant="outline" disabled={list.pending} onClick={list.refresh}><RefreshCw data-icon="inline-start" aria-hidden="true" />Aggiorna</Button></div></CardHeader>
      <CardContent className="admin-results-body" aria-busy={list.pending}>
        {!initialUrl.valid ? <Failure result={{status: "invalid"}} retry={() => navigate({})} /> : list.pending ? <TableSkeleton columns={6} /> : list.result?.status === "ok" ? <>
          {list.result.data.items.length ? <Table className="admin-community-table" aria-label="Utenti"><TableHeader><TableRow>{["Utente", "Registrazione", "Email confermata", "Profili", "Creato il", "Dettagli"].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>
            {list.result.data.items.map(row => <TableRow key={row.id}><TableCell>{row.email ?? "Email non disponibile"}<p className="admin-technical-text">{row.id}</p></TableCell>
              <TableCell><Badge variant={row.registeredAt ? "success" : "warning"}>{row.registeredAt ? "Completa" : "Incompleta"}</Badge></TableCell><TableCell>{row.confirmedAt ? "Sì" : "No"}</TableCell><TableCell>{row.profileCount}</TableCell><TableCell>{communityDate(row.createdAt)}</TableCell>
              <TableCell><Button variant="ghost" size="icon-sm" aria-label="Dettagli utente" title="Dettagli utente" onClick={e => {trigger.current = e.currentTarget; setSelected(row.id); detail.refresh();}}><Eye aria-hidden="true" /></Button></TableCell></TableRow>)}
          </TableBody></Table> : <EmptyState title="Nessun utente trovato" description="Modifica i filtri per cercare altri account." />}
          <Pagination offset={query.offset ?? 0} more={list.result.data.hasMore} onChange={offset => navigate({...query, offset})} />
        </> : list.result && <Failure result={list.result} retry={list.refresh} />}
      </CardContent></Card>
    <Sheet open={!!selected} onOpenChange={open => {if (!open) setSelected(null);}}><SheetContent className="admin-detail-sheet admin-community-sheet" finalFocus={() => trigger.current?.isConnected ? trigger.current : heading.current}>
      <SheetHeader><SheetTitle>Dettagli utente</SheetTitle><SheetDescription>{data?.email ?? "Account e profili associati"}</SheetDescription></SheetHeader><div className="admin-detail-body">
        {detail.pending ? <PanelSkeleton /> : data ? <>
          <section className="admin-detail-section"><h3>Account</h3><dl className="admin-facts-grid"><Fact label="UUID utente">{data.id}</Fact><Fact label="UUID Auth">{data.authId}</Fact><Fact label="Email">{data.email}</Fact><Fact label="Telefono">{data.phone}</Fact><Fact label="Creato il">{communityDate(data.createdAt)}</Fact><Fact label="Registrazione completata">{communityDate(data.registeredAt)}</Fact><Fact label="Email confermata">{communityDate(data.confirmedAt)}</Fact></dl></section>
          <section className="admin-detail-section"><h3>Consensi</h3><dl className="admin-facts-grid"><Fact label="Newsletter">{data.newsletter ? "Iscritto" : "Non iscritto"}</Fact><Fact label="Consenso newsletter aggiornato">{communityDate(data.newsletterUpdatedAt)}</Fact><Fact label="Informative accettate">{communityDate(data.legalAcceptedAt)}</Fact><Fact label="Versione termini">{data.termsVersion}</Fact><Fact label="Versione privacy">{data.privacyVersion}</Fact><Fact label="Versione cookie policy">{data.cookieVersion}</Fact></dl></section>
          <section className="admin-detail-section"><h3>Profili associati</h3>{data.profiles.length ? <><ul className="admin-associated-profiles">{data.profiles.map(p => <li key={p.id}><strong>{p.name}</strong><span className="admin-note">{PROFILE_LABELS[p.type]} · {VISIBILITY[p.visibility]} · {p.verifiedAt ? "Verificato" : "Non verificato"}</span></li>)}</ul><Button variant="outline" nativeButton={false} render={<Link href={peopleHref("profiles", {search: data.id})} prefetch={false} />}><Contact data-icon="inline-start" aria-hidden="true" />Apri profili</Button></> : <p className="admin-note">Nessun profilo associato.</p>}</section>
        </> : detail.result && detail.result.status !== "ok" && <Failure result={detail.result} retry={detail.refresh} />}
      </div></SheetContent></Sheet>
  </div>;
}

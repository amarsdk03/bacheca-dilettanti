"use client";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/features/dashboard/components/ContentSkeletons";
import { EmptyState } from "@/features/dashboard/components/ContentStates";
import { AuditSummaryTable } from "@/features/audit/components/AuditSummaryTable";
import type { HomeActivityResult } from "../contracts";
import { homeTransport } from "../client/transport";
import { HomeFailure } from "./HomeFailure";
import { useHomeBlock } from "./useHomeBlock";
const unavailable = (): HomeActivityResult => ({ status: "unavailable", code: "AUDIT_UNAVAILABLE", correlationId: "client" });
export function HomeActivity({ initialResult }: { initialResult: HomeActivityResult }) {
  const state = useHomeBlock(initialResult, homeTransport.activity, unavailable), result = state.result;
  return <Card className="admin-home-activity"><CardHeader>
    <div className="admin-home-toolbar"><CardTitle><h2>Ultime operazioni</h2></CardTitle>
      <div className="admin-home-action-list"><Button variant="outline" size="sm" disabled={state.pending} onClick={state.refresh}><RefreshCw data-icon="inline-start" aria-hidden="true" />Aggiorna attività</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/registro-attivita" prefetch={false} />}>Vedi registro completo<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></div></div>
    <CardDescription>Le cinque operazioni più recenti conservate nel registro. L’email dell’operatore è quella attuale dell’account.</CardDescription></CardHeader>
    <CardContent className="min-w-0" aria-live="polite">{state.pending ? <TableSkeleton rows={5} columns={3} /> : result?.status === "ok" ?
      result.page.items.length ? <AuditSummaryTable items={result.page.items} caption="Ultime cinque operazioni disponibili, dalla più recente. Date in Europe/Rome." /> :
        <EmptyState title="Nessuna operazione registrata" description="Le operazioni conservate compariranno qui. Lo storico precedente all’attivazione dell’audit non è disponibile." /> :
      result && result.status !== "denied" ? <HomeFailure title="Impossibile caricare le ultime operazioni" retry={state.refresh} correlationId={result.status === "unavailable" ? result.correlationId : undefined} /> : null}
    </CardContent>
  </Card>;
}

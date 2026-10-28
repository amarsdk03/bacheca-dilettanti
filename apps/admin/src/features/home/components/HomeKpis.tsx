"use client";
import { useSyncExternalStore } from "react";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { HomeSummaryResult } from "../contracts";
import { HOME_CARDS, homeCount } from "../presentation";
import { homeTransport } from "../client/transport";
import { HomeFailure } from "./HomeFailure";
import { useHomeSession } from "./HomeSessionProvider";
import { useHomeBlock } from "./useHomeBlock";
const unavailable = (): HomeSummaryResult => ({ status: "unavailable", code: "HOME_UNAVAILABLE", correlationId: "client" });
export function HomeKpis({ initialResult }: { initialResult: HomeSummaryResult }) {
  const state = useHomeBlock(initialResult, homeTransport.summary, unavailable);
  const session = useHomeSession(), selected = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot).selected;
  const result = state.result, summary = result?.status === "ok" ? result.summary : null;
  return <section className="admin-home-block" aria-labelledby="home-kpis-title">
    <div className="admin-home-toolbar"><h2 id="home-kpis-title" className="admin-home-block-title">Riepilogo</h2>
      <Button variant="outline" size="sm" disabled={state.pending} onClick={state.refresh}><RefreshCw data-icon="inline-start" aria-hidden="true" />Aggiorna indicatori</Button></div>
    <ToggleGroup value={[selected]} multiple={false} onValueChange={values => { if (values.length === 1) session.select(values[0]); }} aria-label="Metrica dei grafici" className="admin-home-kpi-grid">
      {HOME_CARDS.map(card => <div className="admin-home-kpi" data-selected={selected === card.metric} key={card.metric}>
        <Card className="admin-home-kpi-card"><CardHeader><CardTitle><span id={`home-${card.metric}-label`} className="admin-home-kpi-label"><card.icon aria-hidden="true" />{card.title}</span></CardTitle></CardHeader>
          <CardContent><div id={`home-${card.metric}-value`} className="admin-home-kpi-value" data-unavailable={card.metric === "profits" || (!state.pending && !summary)} aria-live="polite">
            {card.metric === "profits" ? "Non disponibile" : state.pending ? <><span className="sr-only">Caricamento</span><Skeleton className="h-9 w-24" /></> : summary ? homeCount(summary[card.metric]) : "Non disponibile"}
          </div><CardDescription id={`home-${card.metric}-description`}>{card.description}</CardDescription></CardContent>
          <span className="admin-home-kpi-check" aria-hidden="true"><Check /></span></Card>
        <Toggle value={card.metric} aria-labelledby={`home-${card.metric}-label`} aria-describedby={`home-${card.metric}-value home-${card.metric}-description`} aria-controls="home-chart-panel"
          className="admin-home-kpi-toggle" />
      </div>)}
    </ToggleGroup>
    {state.pending && <p className="sr-only" role="status">Aggiornamento indicatori in corso</p>}
    {result && result.status !== "ok" && result.status !== "denied" && <HomeFailure title="Impossibile caricare gli indicatori" retry={state.refresh} correlationId={result.status === "unavailable" ? result.correlationId : undefined} />}
  </section>;
}

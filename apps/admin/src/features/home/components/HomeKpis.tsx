"use client";
import { useSyncExternalStore } from "react";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import { RefreshCw } from "lucide-react";
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
  return <section className="flex flex-col gap-4" aria-labelledby="home-kpis-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="home-kpis-title" className="text-lg font-semibold">Riepilogo</h2>
      <Button variant="outline" size="sm" disabled={state.pending} onClick={state.refresh}><RefreshCw data-icon="inline-start" aria-hidden="true" />Aggiorna indicatori</Button></div>
    <ToggleGroup value={[selected]} multiple={false} onValueChange={values => { if (values.length === 1) session.select(values[0]); }} aria-label="Metrica dei grafici" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {HOME_CARDS.map(card => <div className="relative min-w-0" key={card.metric}>
        <Card className="h-full"><CardHeader><CardTitle><span id={`home-${card.metric}-label`} className="flex items-center justify-between gap-3">{card.title}<card.icon className="size-5 shrink-0" aria-hidden="true" /></span></CardTitle><CardDescription id={`home-${card.metric}-description`}>{card.description}</CardDescription></CardHeader>
          <CardContent><div id={`home-${card.metric}-value`} className="text-2xl font-semibold sm:text-3xl" aria-live="polite">
            {card.metric === "profits" ? "Non disponibile" : state.pending ? <><span className="sr-only">Caricamento</span><Skeleton className="h-9 w-24" /></> : summary ? homeCount(summary[card.metric]) : "Non disponibile"}
          </div></CardContent></Card>
        <Toggle value={card.metric} aria-labelledby={`home-${card.metric}-label`} aria-describedby={`home-${card.metric}-value home-${card.metric}-description`} aria-controls="home-chart-panel"
          className="absolute inset-0 rounded-xl outline-none data-pressed:ring-2 data-pressed:ring-primary focus-visible:ring-4 focus-visible:ring-ring/50" />
      </div>)}
    </ToggleGroup>
    {state.pending && <p className="sr-only" role="status">Aggiornamento indicatori in corso</p>}
    {result && result.status !== "ok" && result.status !== "denied" && <HomeFailure title="Impossibile caricare gli indicatori" retry={state.refresh} correlationId={result.status === "unavailable" ? result.correlationId : undefined} />}
  </section>;
}

"use client";
import { Component, lazy, Suspense, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/features/dashboard/components/ContentStates";
import { ChartSkeleton } from "@/features/dashboard/components/ContentSkeletons";
import { HOME_CARDS } from "../presentation";
import { HomeFailure } from "./HomeFailure";
import { useHomeChart } from "./useHomeChart";

const Charts = lazy(() => import("./HomeCharts"));
class ChartBoundary extends Component<{ children: ReactNode; retry(): void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="flex flex-col gap-3"><HomeFailure title="Impossibile visualizzare i grafici" retry={this.props.retry} />
      <Button variant="outline" onClick={() => window.location.reload()}>Ricarica pagina</Button></div> : this.props.children;
  }
}
export function HomeChartPanel() {
  const { selected, pending, result, refresh } = useHomeChart();
  const card = HOME_CARDS.find(c => c.metric === selected)!;
  return <Card id="home-chart-panel" role="region" aria-labelledby="home-chart-title"><CardHeader>
    <div className="flex flex-wrap items-center justify-between gap-3"><CardTitle><h2 id="home-chart-title" aria-live="polite">Grafici - {card.title}</h2></CardTitle>
      <Button variant="outline" size="sm" disabled={pending} onClick={refresh}><RefreshCw data-icon="inline-start" aria-hidden="true" />Aggiorna grafici</Button></div>
  </CardHeader><CardContent>
    {pending ? <ChartSkeleton /> : result?.status === "ok" ? result.chart.available ?
      <ChartBoundary key={result.chart.metric + result.chart.asOf} retry={refresh}><Suspense fallback={<ChartSkeleton />}><Charts chart={result.chart} /></Suspense></ChartBoundary> :
      <EmptyState title="Non disponibile" description="I dati sui profitti non sono disponibili." /> :
      result && result.status !== "denied" ? <HomeFailure title="Impossibile caricare i grafici" retry={refresh} correlationId={result.status === "unavailable" ? result.correlationId : undefined} /> : null}
  </CardContent></Card>;
}

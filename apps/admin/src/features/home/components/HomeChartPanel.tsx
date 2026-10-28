"use client";
import { Component, lazy, Suspense, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/features/dashboard/components/ContentStates";
import { HomeChartsSkeleton } from "./HomeSkeletons";
import { HOME_CARDS } from "../presentation";
import { HomeFailure } from "./HomeFailure";
import { useHomeChart } from "./useHomeChart";

const Charts = lazy(() => import("./HomeCharts"));
class ChartBoundary extends Component<{ children: ReactNode; retry(): void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <Card><CardContent className="admin-home-block"><HomeFailure title="Impossibile visualizzare i grafici" retry={this.props.retry} />
      <Button variant="outline" onClick={() => window.location.reload()}>Ricarica pagina</Button></CardContent></Card> : this.props.children;
  }
}
export function HomeChartPanel() {
  const { selected, pending, result, refresh } = useHomeChart();
  const card = HOME_CARDS.find(c => c.metric === selected)!;
  return <section id="home-chart-panel" className="admin-home-block" role="region" aria-labelledby="home-chart-title">
    <div className="admin-home-toolbar"><h2 id="home-chart-title" className="admin-home-block-title" aria-live="polite">Grafici - {card.title}</h2>
      <Button variant="outline" size="sm" disabled={pending} onClick={refresh}><RefreshCw data-icon="inline-start" aria-hidden="true" />Aggiorna grafici</Button></div>
    {pending ? <HomeChartsSkeleton /> : result?.status === "ok" ? result.chart.available ?
      <ChartBoundary key={result.chart.metric + result.chart.asOf} retry={refresh}><Suspense fallback={<HomeChartsSkeleton />}><Charts chart={result.chart} /></Suspense></ChartBoundary> :
      <Card><CardContent><EmptyState title="Non disponibile" description="I dati sui profitti non sono disponibili." /></CardContent></Card> :
      result && result.status !== "denied" ? <Card><CardContent><HomeFailure title="Impossibile caricare i grafici" retry={refresh} correlationId={result.status === "unavailable" ? result.correlationId : undefined} /></CardContent></Card> : null}
  </section>;
}

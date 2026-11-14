"use client";
import {Component, lazy, type ReactNode, Suspense, useState} from "react";
import {RefreshCw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {EmptyState} from "@/features/dashboard/components/ContentStates";
import {HomeChartsSkeleton} from "./HomeSkeletons";
import {HOME_CARDS} from "../presentation";
import {HomeFailure} from "./HomeFailure";
import {useHomeChart} from "./useHomeChart";
import {HomePeriodControls} from "./HomePeriodControls";
import type {HomeAggregation, HomeRange} from "../period";

const Charts = lazy(() => import("./HomeCharts"));
class ChartBoundary extends Component<{ children: ReactNode; retry(): void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <Card><CardContent className="admin-home-block"><HomeFailure title="Impossibile visualizzare i grafici" retry={this.props.retry} />
      <Button variant="outline" onClick={() => window.location.reload()}>Ricarica pagina</Button></CardContent></Card> : this.props.children;
  }
}
export function HomeChartPanel({ children }: { children?: ReactNode }) {
  const { selected, pending, result, refresh } = useHomeChart();
  const [range, setRange] = useState<HomeRange | null>(null);
  const [aggregation, setAggregation] = useState<HomeAggregation>("monthly");
  const [split, setSplit] = useState(false);
  const chart = !pending && result?.status === "ok" && result.chart.available && "series" in result.chart ? result.chart : null;
  const card = HOME_CARDS.find(c => c.metric === selected)!;
  const refreshButton = <Button variant="outline" size="sm" disabled={pending} onClick={refresh}><RefreshCw data-icon="inline-start" aria-hidden="true" />Aggiorna grafici</Button>;
  return <>
    <header className="home-heading">
      <div><h1 className="admin-section-heading">Bentornato, Gabriele!</h1><p>Panoramica annunci, utenti e attività Bacheca Dilettanti</p></div>
      {(selected === "users" || selected === "announcements") && <HomePeriodControls chart={chart} range={range} aggregation={aggregation} onRange={setRange} onAggregation={setAggregation} />}
    </header>
    {children}
    <section id="home-chart-panel" className="admin-home-block" role="region" aria-labelledby="home-chart-title">
    <h2 id="home-chart-title" className="sr-only" aria-live="polite">{card.title}</h2>
    {(pending || result?.status !== "ok" || !result.chart.available || (result.chart.metric === "pending" && result.chart.population === 0)) && <div className="home-chart-tools">{refreshButton}</div>}
    {pending ? <HomeChartsSkeleton /> : result?.status === "ok" ? result.chart.available ?
      <ChartBoundary key={result.chart.metric + result.chart.asOf} retry={refresh}><Suspense fallback={<HomeChartsSkeleton />}><Charts chart={result.chart} range={range} aggregation={aggregation} split={split} onSplit={() => setSplit(value => !value)} action={refreshButton} /></Suspense></ChartBoundary> :
      <Card><CardContent><EmptyState title="Non disponibile" description="I dati sui profitti non sono attualmente disponibili." /></CardContent></Card> :
      result && result.status !== "denied" ? <Card><CardContent><HomeFailure title="Impossibile caricare i grafici" retry={refresh} correlationId={result.status === "unavailable" ? result.correlationId : undefined} /></CardContent></Card> : null}
  </section></>;
}

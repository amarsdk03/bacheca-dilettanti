import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {TableSkeleton} from "@/features/dashboard/components/ContentSkeletons";
import {HOME_CARDS} from "../presentation";

export function HomeKpiSkeleton() {
  return <section aria-label="Caricamento indicatori Home" aria-busy="true" className="admin-home-block">
    <div className="admin-home-toolbar home-kpi-toolbar"><h2 className="home-muted">Situazione attuale</h2><Skeleton className="h-7 w-32" /></div>
    <div className="admin-home-kpi-grid">{HOME_CARDS.map(card => <Card key={card.metric} className="admin-home-kpi-card">
      <CardHeader><CardTitle><span className="admin-home-kpi-label"><card.icon aria-hidden="true" />{card.title}</span></CardTitle></CardHeader>
      <CardContent><div className="admin-home-kpi-value" data-unavailable={card.metric === "profits"}>
        {card.metric === "profits" ? "Non disponibile" : <Skeleton className="h-9 w-24" />}
      </div><CardDescription>{card.description}</CardDescription></CardContent>
    </Card>)}</div>
  </section>;
}
export function HomeActivitySkeleton() {
  return <Card aria-label="Caricamento ultime operazioni" aria-busy="true" className="admin-home-activity"><CardHeader>
    <div className="admin-home-toolbar"><CardTitle>Ultime operazioni</CardTitle><div className="admin-home-action-list"><Skeleton className="admin-home-control-skeleton" /><Skeleton className="admin-home-control-skeleton" /></div></div>
    <CardDescription>Le cinque operazioni più recenti conservate nel registro. L’email dell’operatore è quella attuale dell’account.</CardDescription></CardHeader>
    <CardContent><TableSkeleton rows={5} columns={4} /></CardContent>
  </Card>;
}

export function HomeChartsSkeleton() {
  return <div className="admin-home-block" aria-busy="true" aria-label="Caricamento grafici Home">
    <Card className="admin-home-chart-card"><CardHeader><CardTitle><Skeleton className="h-6 w-64 max-w-full" /></CardTitle></CardHeader>
      <CardContent className="admin-home-chart-body"><Skeleton className="admin-home-primary-chart" /><Skeleton className="h-4 w-40" /></CardContent></Card>
    <div className="home-insights" data-temporal="true">
      {[0, 1, 2].map(index => <Card key={index} className={index === 0 ? "home-breakdown" : "home-insight"}>
        <CardHeader><CardTitle><Skeleton className="h-5 w-3/4" /></CardTitle></CardHeader>
        <CardContent className="admin-home-block"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-16 w-full" /></CardContent>
      </Card>)}
    </div>
  </div>;
}

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/features/dashboard/components/ContentSkeletons";
import { HOME_CARDS } from "../presentation";
export function HomeKpiSkeleton() {
  return <section aria-label="Caricamento indicatori Home" aria-busy="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {HOME_CARDS.map(card => <Card key={card.metric}><CardHeader><CardTitle>{card.title}</CardTitle><CardDescription>{card.description}</CardDescription></CardHeader>
      <CardContent>{card.metric === "profits" ? <p>Non disponibile</p> : <Skeleton className="h-9 w-24" />}</CardContent>
    </Card>)}
  </section>;
}
export function HomeActivitySkeleton() {
  return <Card aria-label="Caricamento ultime operazioni" aria-busy="true"><CardHeader><CardTitle>Ultime operazioni</CardTitle><CardDescription>Le cinque operazioni più recenti conservate nel registro.</CardDescription></CardHeader>
    <CardContent><TableSkeleton rows={5} columns={3} /></CardContent>
  </Card>;
}

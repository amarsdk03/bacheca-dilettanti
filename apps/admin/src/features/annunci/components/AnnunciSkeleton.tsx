import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton, TableSkeleton } from "@/features/dashboard/components/ContentSkeletons";

export function AnnunciSkeleton() {
  return <div className="flex min-w-0 flex-col gap-8" aria-busy="true" aria-label="Caricamento annunci"><Skeleton className="h-9 w-48" /><CardSkeleton />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div><TableSkeleton rows={8} columns={7} />
  </div>;
}

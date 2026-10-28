import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";

export function CardSkeleton() {
  return <Card aria-busy="true" aria-label="Caricamento riepilogo">
    <CardHeader><CardTitle><Skeleton className="h-5 w-32" /></CardTitle><CardDescription><Skeleton className="h-4 w-40" /></CardDescription></CardHeader>
    <CardContent><Skeleton className="h-8 w-20" /></CardContent>
  </Card>;
}
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return <div className="admin-table-skeleton" data-columns={columns} aria-busy="true" aria-label="Caricamento tabella">
    <Table><TableBody>{Array.from({ length: Math.min(30, Math.max(1, rows)) }, (_, row) => <TableRow key={row}>
      {Array.from({ length: Math.min(10, Math.max(1, columns)) }, (_, column) => <TableCell key={column}><Skeleton className="h-5 w-28" /></TableCell>)}
    </TableRow>)}</TableBody></Table>
  </div>;
}
export function PanelSkeleton() {
  return <div className="admin-panel-skeleton" aria-busy="true" aria-label="Caricamento dettagli">
    <Skeleton className="h-7 w-48" /><Skeleton className="h-40 w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-5 w-1/2" />
  </div>;
}
export function ChartSkeleton() {
  return <div className="flex flex-col gap-4" aria-busy="true" aria-label="Caricamento grafico">
    <Skeleton className="h-6 w-48" /><Skeleton className="h-64 w-full" />
  </div>;
}
export function SectionSkeleton() {
  return <div className="admin-section-skeleton" aria-busy="true" aria-label="Caricamento sezione">
    <Skeleton className="h-9 w-56" /><Skeleton className="h-64 w-full" />
  </div>;
}

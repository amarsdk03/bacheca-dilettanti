import { Skeleton } from "@/components/ui/skeleton";

export function AccessSkeleton() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12" aria-busy="true" aria-label="Verifica accesso in corso">
      <div className="flex w-full max-w-sm flex-col gap-6" aria-hidden="true">
        <Skeleton className="mx-auto h-24 w-56" />
        <Skeleton className="h-5 w-40" /><Skeleton className="h-9 w-full" />
        <Skeleton className="h-5 w-24" /><Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </main>
  );
}

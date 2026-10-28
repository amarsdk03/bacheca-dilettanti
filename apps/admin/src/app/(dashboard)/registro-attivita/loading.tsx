import { TableSkeleton } from "@/features/dashboard/components/ContentSkeletons";
import { Skeleton } from "@/components/ui/skeleton";
export default function AuditLoading() { return <div className="flex flex-col gap-6"><Skeleton className="h-9 w-56" /><Skeleton className="h-52 w-full" /><TableSkeleton columns={4} /></div>; }

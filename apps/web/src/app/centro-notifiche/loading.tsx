import {Skeleton} from "@/components/ui/skeleton";
export default function Loading() {
	return <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-10" aria-label="Caricamento notifiche" role="status"><Skeleton className="h-10 w-64" />{[1,2,3].map((id) => <Skeleton key={id} className="h-40 w-full" />)}</div>;
}

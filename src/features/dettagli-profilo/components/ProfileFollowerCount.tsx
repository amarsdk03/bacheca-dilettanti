import {UsersIcon} from "lucide-react";

export default function ProfileFollowerCount({count}: {count: number | null}) {
	if (count == null) return null;
	return <p className="flex items-center gap-1.5 ms-1 text-xs text-muted-foreground"><UsersIcon className="size-3.5" aria-hidden="true" /><span>{count.toLocaleString("it-IT")} follower</span></p>;
}

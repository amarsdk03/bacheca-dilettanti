import {BadgeCheckIcon, UserRoundCheckIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {cn} from "@/lib/utils";

export function RegisteredUserBadge({emailConfirmed}: {emailConfirmed: boolean}) {
	if (!emailConfirmed) return null;
	return <Badge variant="secondary"><UserRoundCheckIcon data-icon="inline-start" aria-hidden="true" />Utente registrato</Badge>;
}

export function OfficialVerificationIcon({officialVerified, className}: {officialVerified: boolean; className?: string}) {
	if (!officialVerified) return null;
	return (
		<span
			role="img"
			aria-label="Profilo verificato ufficialmente"
			title="Profilo verificato ufficialmente"
			className={cn("inline-flex size-5 shrink-0", className)}
		>
			<BadgeCheckIcon className="size-full fill-sky-400 stroke-white [&>path:last-child]:fill-none" aria-hidden="true" />
		</span>
	);
}

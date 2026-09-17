import {Badge} from "@/components/ui/badge";
import {cn} from "@/lib/utils";

export default function ComingSoonBadge({className}: {className?: string}) {
	return (
		<Badge
			variant="secondary"
			className={cn("border border-brand-indigo/15 bg-brand-indigo/10 text-brand-indigo", className)}
		>
			Coming soon...
		</Badge>
	);
}

import type {LucideIcon} from "lucide-react";
import {cn} from "@/lib/utils";

export interface ProfileFact {
	label: string;
	icon: LucideIcon;
	value: string | readonly string[] | null;
	wide?: boolean;
}

export default function ProfileFactsGrid({facts}: {facts: ProfileFact[]}) {
	return (
		<dl className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
			{facts.map(({label, icon: Icon, value, wide}) => (
				<div key={label} className={cn("flex min-h-24 min-w-0 flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3 sm:p-4", wide && "col-span-2 sm:col-span-1")}>
					<dt className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4 shrink-0" aria-hidden="true" />{label}</dt>
					<dd className="text-sm leading-6 font-semibold wrap-anywhere sm:text-base">
						{typeof value === "string"
							? value
							: value?.length
								? value.join(", ")
								: <span className="text-sm font-normal text-muted-foreground">Non specificato</span>}
					</dd>
				</div>
			))}
		</dl>
	);
}

import type {ComponentProps, ReactNode} from "react";
import type {LucideIcon} from "lucide-react";
import {cn} from "@/lib/utils";

export default function ProfileSectionHeading({children, className, icon: Icon, ...props}: ComponentProps<"h2"> & {children: ReactNode; icon?: LucideIcon}) {
	return <h2 {...props} className={cn("font-home-display text-center text-2xl uppercase lg:text-3xl", Icon && "flex items-center justify-center gap-2", className)}>
		{Icon && <Icon className="profile-detail-accent size-5 shrink-0 lg:size-6" aria-hidden="true" />}
		<span className="min-w-0 wrap-anywhere">{children}</span>
	</h2>;
}

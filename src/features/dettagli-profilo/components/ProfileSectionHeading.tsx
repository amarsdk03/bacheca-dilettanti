import type {ReactNode} from "react";
import {cn} from "@/lib/utils";

export default function ProfileSectionHeading({children, className}: {children: ReactNode; className?: string}) {
	return <h2 className={cn("font-home-display text-center text-2xl uppercase lg:text-3xl", className)}>{children}</h2>;
}

import type {ComponentPropsWithoutRef} from "react";

import {cn} from "@/lib/utils";

export default function AuthBackground({className, children, ...props}: ComponentPropsWithoutRef<"div">) {
	return (
		<div
			className={cn("relative overflow-hidden bg-linear-to-b from-fuchsia-50 via-white to-neutral-50", className)}
			{...props}
		>
			<div aria-hidden="true" className="absolute -top-24 -left-24 size-72 rounded-full bg-fuchsia-200/45 blur-3xl" />
			<div aria-hidden="true" className="absolute right-0 bottom-0 size-80 translate-x-1/3 translate-y-1/3 rounded-full bg-purple-200/40 blur-3xl" />
			{children}
		</div>
	);
}

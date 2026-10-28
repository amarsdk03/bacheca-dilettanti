"use client";

import {EyeOff} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";

export const PROFILE_ANONYMITY_MESSAGE = "Questo profilo mantiene il proprio nominativo anonimo";

export default function ProfileAnonymityIndicator({anonymousName, className, badge = false, white = false}: {
	anonymousName?: boolean;
	className?: string;
	badge?: boolean;
	white?: boolean;
}) {
	if (!anonymousName) return null;
	if (badge) {
		return <Badge variant="outline" aria-label="Nome nascosto">
			<EyeOff data-icon="inline-start" aria-hidden="true" />
			Nome nascosto
		</Badge>;
	}
	return <Tooltip>
		<TooltipTrigger render={<span />} tabIndex={0}
			aria-label={PROFILE_ANONYMITY_MESSAGE}
			className={cn("inline-flex size-5 shrink-0 align-middle", className)}>
			<EyeOff aria-hidden="true" className={cn("size-full opacity-50", white ? "text-white" : "text-black")} />
		</TooltipTrigger>
		<TooltipContent className="normal-case font-normal">{PROFILE_ANONYMITY_MESSAGE}</TooltipContent>
	</Tooltip>;
}

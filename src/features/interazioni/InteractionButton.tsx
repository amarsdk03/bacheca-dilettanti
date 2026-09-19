"use client";

import {useRef, useState, useTransition} from "react";
import {useRouter} from "next/navigation";
import {HeartIcon, LoaderCircleIcon, RefreshCwIcon, UserCheckIcon, UserPlusIcon} from "lucide-react";
import {Toggle} from "@/components/ui/toggle";
import {Button} from "@/components/ui/button";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {toast} from "@/components/ui/toast";
import {setAnnouncementSaved, setProfileFollow} from "@/features/interazioni/server/actions";
import type {InteractionState, InteractionTarget} from "@/features/interazioni/interaction-model";

interface InteractionButtonProps {
	target: InteractionTarget;
	state: InteractionState;
	href: string;
	showLabel?: boolean;
}

export default function InteractionButton(props: InteractionButtonProps) {
	// A server refresh (including browser back/navigation) resets stale local state.
	const {state, target} = props;
	const version = state.status === "ready" ? `${state.status}:${state.active}` : state.status;
	return <InteractionControl key={`${target.kind}:${target.id}:${version}`} {...props} />;
}

function InteractionControl({target, state, href, showLabel = false}: InteractionButtonProps) {
	const router = useRouter();
	const [active, setActive] = useState(state.status === "ready" && state.active);
	const [pending, startTransition] = useTransition();
	const inFlight = useRef(false);
	const announcement = target.kind === "annuncio";
	const label = announcement
		? (active ? "Rimuovi dai salvati" : "Salva annuncio")
		: (active ? "Non seguire più" : "Segui profilo");
	const Icon = announcement ? HeartIcon : active ? UserCheckIcon : UserPlusIcon;

	if (state.status === "own-profile") return null;
	if (state.status === "error") {
		return (
			<Tooltip>
				<TooltipTrigger render={<Button variant="outline" size={showLabel ? "default" : "icon"} disabled={pending}
					onClick={() => startTransition(() => router.refresh())} aria-label="Stato non disponibile. Riprova" />}>
					<RefreshCwIcon aria-hidden="true" />{showLabel && "Riprova"}
				</TooltipTrigger>
				<TooltipContent>Stato non disponibile. Riprova</TooltipContent>
			</Tooltip>
		);
	}

	function navigateToAuth(status: "guest" | "registration-required") {
		router.push(status === "guest" ? `/accedi?${new URLSearchParams({next: href})}` : "/registrati");
	}

	function change(next: boolean) {
		if (inFlight.current) return;
		if (state.status === "guest" || state.status === "registration-required") {
			navigateToAuth(state.status);
			return;
		}
		inFlight.current = true;
		startTransition(async () => {
			try {
				const result = announcement
					? await setAnnouncementSaved(target.id, next)
					: await setProfileFollow(target.id, next);
				if (result.status === "success") {
					setActive(result.active);
					toast.add({type: "success", title: announcement
						? (result.active ? "Annuncio salvato" : "Annuncio rimosso dai salvati")
						: (result.active ? "Ora segui questo profilo" : "Non segui più questo profilo")});
				} else if (result.status === "error") {
					toast.add({type: "error", title: result.message});
				} else {
					navigateToAuth(result.status);
				}
			} catch {
				toast.add({type: "error", title: "Operazione non riuscita. Riprova."});
			} finally {
				inFlight.current = false;
			}
		});
	}

	return (
		<Tooltip>
			<TooltipTrigger render={<Toggle variant="outline" pressed={active} onPressedChange={change}
				disabled={pending} aria-busy={pending} aria-label={label} className={showLabel ? undefined : "size-8 px-0"} />}>
				{pending ? <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
					: <Icon aria-hidden="true" fill={announcement && active ? "currentColor" : "none"} />}
				{showLabel && label}
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

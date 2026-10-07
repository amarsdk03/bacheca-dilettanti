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
import {cn} from "@/lib/utils";
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";
import {Field, FieldError, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {PROFILE_OPTIONS, type ProfileType} from "@/features/profilo/profile-model";

interface InteractionButtonProps {
	target: InteractionTarget;
	state: InteractionState;
	href: string;
	showLabel?: boolean;
	className?: string;
}

export default function InteractionButton(props: InteractionButtonProps) {
	// A server refresh (including browser back/navigation) resets stale local state.
	const {state, target} = props;
	const version = state.status === "ready" ? `${state.status}:${state.active}:${state.sourceType}:${JSON.stringify(state.profiles)}` : state.status;
	return <InteractionControl key={`${target.kind}:${target.id}:${target.kind === "profilo" ? target.profileType : ""}:${version}`} {...props} />;
}

function InteractionControl({target, state, href, showLabel = false, className}: InteractionButtonProps) {
	const router = useRouter();
	const [active, setActive] = useState(state.status === "ready" && state.active);
	const [pending, startTransition] = useTransition();
	const inFlight = useRef(false);
	const profiles = state.status === "ready" ? state.profiles ?? [] : [];
	const defaultType = profiles.find(profile => profile.isPrimary)?.type ?? profiles[0]?.type;
	const [sourceType, setSourceType] = useState<ProfileType | undefined>(state.status === "ready" ? state.sourceType ?? defaultType : defaultType);
	const [choosing, setChoosing] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const announcement = target.kind === "annuncio";
	const label = announcement
		? (active ? "Rimuovi dai salvati" : "Salva annuncio")
		: (active ? "Non seguire più" : "Segui profilo");
	const Icon = announcement ? HeartIcon : active ? UserCheckIcon : UserPlusIcon;

	if (state.status === "own-profile") return null;
	if (state.status === "error") {
		return (
			<Tooltip>
				<TooltipTrigger render={<Button variant="outline" size={showLabel ? "default" : "icon"} className={className} disabled={pending}
					onClick={() => startTransition(() => router.refresh())} aria-label="Stato non disponibile. Riprova" />}>
					<RefreshCwIcon aria-hidden="true" />{showLabel && "Riprova"}
				</TooltipTrigger>
				<TooltipContent>
					Stato non disponibile. Riprova
				</TooltipContent>
			</Tooltip>
		);
	}

	function navigateToAuth(status: "guest" | "registration-required") {
		router.push(status === "guest" ? `/accedi?${new URLSearchParams({next: href})}` : "/registrati");
	}

	function change(next: boolean, selectedType?: ProfileType) {
		if (inFlight.current) return;
		if (state.status === "guest" || state.status === "registration-required") {
			navigateToAuth(state.status);
			return;
		}
		if (!announcement && next && !selectedType && profiles.length > 1) {
			setSourceType(defaultType);
			setFormError(null);
			setChoosing(true);
			return;
		}
		const sender = selectedType ?? sourceType ?? defaultType;
		if (!announcement && next && !sender) {
			toast.add({type: "error", title: "Nessun sottoprofilo disponibile. Ricarica la pagina."});
			return;
		}
		inFlight.current = true;
		startTransition(async () => {
			try {
				const result = announcement
					? await setAnnouncementSaved(target.id, next)
					: await setProfileFollow(target, next, sender);
				if (result.status === "success") {
					setActive(result.active);
					if (!announcement) setSourceType(result.sourceType ?? undefined);
					setChoosing(false);
					toast.add({type: "success", title: announcement
						? (result.active ? "Annuncio salvato" : "Annuncio rimosso dai salvati")
						: (result.active ? "Ora segui questo profilo" : "Non segui più questo profilo")});
				} else if (result.status === "error") {
					setFormError(result.message);
					toast.add({type: "error", title: result.message});
				} else {
					navigateToAuth(result.status);
				}
			} catch {
				setFormError("Operazione non riuscita. Riprova.");
				toast.add({type: "error", title: "Operazione non riuscita. Riprova."});
			} finally {
				inFlight.current = false;
			}
		});
	}

	return (
		<>
		<Tooltip>
			<TooltipTrigger render={<Toggle variant="outline" pressed={active} onPressedChange={next => change(next)}
				disabled={pending} aria-busy={pending} aria-label={label} className={cn(!showLabel && "size-8 px-0", announcement && "announcement-save-toggle", className)} />}>
				{pending ? <LoaderCircleIcon aria-hidden="true" className="animate-spin" />
					: <Icon aria-hidden="true" fill={announcement && active ? "currentColor" : "none"} />}
				{showLabel && label}
			</TooltipTrigger>
			<TooltipContent>{label}{!announcement && active && sourceType && ` · Segui con ${profiles.find(profile => profile.type === sourceType)?.title ?? PROFILE_OPTIONS.find(profile => profile.value === sourceType)?.label}`}</TooltipContent>
		</Tooltip>
		<AlertDialog open={choosing} onOpenChange={open => {if (!inFlight.current) setChoosing(open);}}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Segui profilo</AlertDialogTitle>
					<AlertDialogDescription>Scegli il sottoprofilo da usare per seguire questo profilo.</AlertDialogDescription>
				</AlertDialogHeader>
				<form className="flex flex-col gap-4" aria-busy={pending} onSubmit={event => {event.preventDefault(); if (sourceType) change(true, sourceType);}}>
					<FieldGroup>
						<Field>
							<FieldLabel>Con quale profilo vuoi seguire?</FieldLabel>
							<Select value={sourceType ?? null} onValueChange={value => {if (value) setSourceType(value as ProfileType);}}
								disabled={pending} items={profiles.map(profile => ({value: profile.type, label: `${profile.title} (${PROFILE_OPTIONS.find(option => option.value === profile.type)?.label})`}))}>
								<SelectTrigger aria-label="Con quale profilo vuoi seguire?" className="w-full"><SelectValue /></SelectTrigger>
								<SelectContent>{profiles.map(profile => <SelectItem key={profile.type} value={profile.type}>
									{profile.title} ({PROFILE_OPTIONS.find(option => option.value === profile.type)?.label})
								</SelectItem>)}</SelectContent>
							</Select>
						</Field>
						{formError && <FieldError role="alert">{formError}</FieldError>}
					</FieldGroup>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={pending}>Annulla</AlertDialogCancel>
						<Button type="submit" disabled={pending || !sourceType}>{pending && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}Segui profilo</Button>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
		</>
	);
}

"use client";

import {type ComponentProps, createContext, type MouseEvent, type ReactNode, useContext, useRef, useState} from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {externalNavigationUrl} from "./external-navigation";

interface NavigationRequest {
	href: string;
	host: string;
	target?: string;
	source: HTMLAnchorElement;
}

const ExternalNavigationContext = createContext<((request: NavigationRequest) => void) | null>(null);

/** Scoped to public detail pages; links elsewhere retain their existing behaviour. */
export function ExternalNavigationProvider({children}: {children: ReactNode}) {
	const [pending, setPending] = useState<NavigationRequest | null>(null);
	const [open, setOpen] = useState(false);
	const cancelRef = useRef<HTMLButtonElement>(null);
	return <ExternalNavigationContext.Provider value={request => {setPending(request); setOpen(true);}}>
		{children}
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogContent initialFocus={cancelRef} finalFocus={() => pending?.source ?? null}>
				<AlertDialogHeader>
					<AlertDialogTitle>Stai aprendo un sito esterno</AlertDialogTitle>
					<AlertDialogDescription>Sarai reindirizzato a <span className="font-medium wrap-anywhere">{pending?.host}</span>, un sito esterno a Bacheca Dilettanti. Vuoi continuare?</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel ref={cancelRef}>Annulla</AlertDialogCancel>
					<AlertDialogAction nativeButton={false} render={<a href={pending?.href} target={pending?.target} rel="noopener noreferrer" />} onClick={() => setOpen(false)}>Continua</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	</ExternalNavigationContext.Provider>;
}

export function ExternalLink({href, target, rel, onClick, onAuxClick, ...props}: ComponentProps<"a"> & {href: string}) {
	const requestNavigation = useContext(ExternalNavigationContext);
	function intercept(event: MouseEvent<HTMLAnchorElement>) {
		if (!requestNavigation || event.defaultPrevented || event.button > 1) return;
		const url = externalNavigationUrl(href, window.location.origin);
		if (!url) return;
		event.preventDefault();
		requestNavigation({href: url.href, host: url.host, source: event.currentTarget,
			target: event.ctrlKey || event.metaKey || event.shiftKey || event.button === 1 ? "_blank" : target});
	}
	return <a {...props} href={href} target={target} rel={target === "_blank" ? [...new Set([...(rel?.split(/\s+/) ?? []), "noopener", "noreferrer"])].join(" ") : rel}
		onClick={event => {onClick?.(event); intercept(event);}}
		onAuxClick={event => {onAuxClick?.(event); if (event.button === 1) intercept(event);}} />;
}

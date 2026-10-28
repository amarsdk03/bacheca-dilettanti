"use client";

import { createContext, useContext, useRef, useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { classifyNavigation, safeNavigationHref } from "./navigation-url";

type RequestNavigation = (href: string, source?: HTMLElement | null) => boolean;
const NavigationContext = createContext<RequestNavigation | null>(null);

export function useExternalNavigation() {
  const request = useContext(NavigationContext);
  if (!request) throw new Error("ADMIN_EXTERNAL_NAVIGATION_PROVIDER_REQUIRED");
  return request;
}

export function ExternalNavigationProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{ href: string; source: HTMLElement | null } | null>(null);
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const request: RequestNavigation = (href, source = null) => {
    const navigation = classifyNavigation(href, window.location.origin);
    if (navigation.kind !== "external") return false;
    setPending({ href: navigation.url.href, source }); setOpen(true); return true;
  };
  return <NavigationContext.Provider value={request}>
    {children}
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent initialFocus={cancelRef} finalFocus={() => pending?.source?.isConnected ? pending.source : null}>
        <AlertDialogHeader>
          <AlertDialogTitle>Stai aprendo un sito esterno</AlertDialogTitle>
          <AlertDialogDescription>
            Stai per aprire questo indirizzo fuori dalla dashboard, in una nuova scheda:
            <span className="mt-2 block break-all">{pending?.href}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef}>Annulla</AlertDialogCancel>
          <AlertDialogAction nativeButton={false} disabled={!pending}
            render={<a href={pending?.href} target="_blank" rel="noopener noreferrer" />} onClick={() => setOpen(false)}>
            <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />Continua
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </NavigationContext.Provider>;
}

/** Native browser context menus are outside the app's interception boundary. */
export function ExternalLink({ href, onClick, onAuxClick, ...props }: Omit<ComponentProps<"a">, "href" | "target" | "rel"> & { href: string }) {
  const request = useExternalNavigation();
  const safe = safeNavigationHref(href);
  const intercept = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button > 1) return;
    const navigation = classifyNavigation(href, window.location.origin);
    if (navigation.kind === "internal") return;
    event.preventDefault();
    if (navigation.kind === "external") request(navigation.url.href, event.currentTarget);
  };
  return <a {...props} href={safe} aria-disabled={!safe || undefined}
    onClick={(event) => { onClick?.(event); intercept(event); }}
    onAuxClick={(event) => { onAuxClick?.(event); if (event.button === 1) intercept(event); }} />;
}

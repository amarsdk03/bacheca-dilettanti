"use client";

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {type ComponentProps, createContext, type ReactNode, useCallback, useContext, useRef, useState} from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {useAnnouncementDraft} from "@/features/annunci/create/store";

type ExitRequest = {action: () => void; source: HTMLElement | null};
type ExitGuard = {
  setDirty: (dirty: boolean) => void;
  confirmExit: (action: () => void, source?: HTMLElement | null) => boolean;
};
const ExitGuardContext = createContext<ExitGuard | null>(null);

/** UI prototype only: app links and explicit logout, not browser history/unload. */
export function UnsavedChangesProvider({children}: {children: ReactNode}) {
  const pathname = usePathname();
  const storageError = useAnnouncementDraft(state => state.storageError);
  const dirtyRef = useRef(false);
  const pendingRef = useRef<ExitRequest | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const setDirty = useCallback((dirty: boolean) => { dirtyRef.current = dirty; }, []);
  const confirmExit = useCallback((action: () => void, source: HTMLElement | null = null) => {
    if (pathname !== "/crea-annuncio" || !dirtyRef.current) return false;
    pendingRef.current = {action, source};
    setOpen(true);
    return true;
  }, [pathname]);

  return <ExitGuardContext.Provider value={{setDirty, confirmExit}}>
    {children}
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="admin-unsaved-dialog" initialFocus={cancelRef}
        finalFocus={() => pendingRef.current?.source?.isConnected ? pendingRef.current.source : null}>
        <AlertDialogHeader>
          <AlertDialogTitle>Lasciare la compilazione?</AlertDialogTitle>
          <AlertDialogDescription>{storageError ? "La bozza resta in memoria, ma il ripristino dopo una ricarica non è disponibile." : "La bozza resta salvata in questa scheda. Uscendo dall’account verrà eliminata."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel ref={cancelRef}>Continua a modificare</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => {
            const pending = pendingRef.current;
            pendingRef.current = null;
            dirtyRef.current = false;
            setOpen(false);
            pending?.action();
          }}>Esci</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </ExitGuardContext.Provider>;
}

export function useUnsavedChanges() {
  const context = useContext(ExitGuardContext);
  if (!context) throw new Error("ADMIN_UNSAVED_CHANGES_PROVIDER_REQUIRED");
  return context;
}

/** Logout is also rendered on the access page, outside the dashboard provider. */
export function useOptionalUnsavedChanges() {
  return useContext(ExitGuardContext);
}

export function GuardedLink({href, onLeave, ref: forwardedRef, ...props}: Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & {
  href: string;
  onLeave?: () => void;
}) {
  const {confirmExit} = useUnsavedChanges();
  const router = useRouter();
  const ref = useRef<HTMLAnchorElement>(null);
  const mergedRef = useCallback((node: HTMLAnchorElement | null) => {
    ref.current = node;
    if (typeof forwardedRef === "function") return forwardedRef(node);
    if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  return <Link {...props} ref={mergedRef} href={href} onNavigate={(event) => {
    if (confirmExit(() => { onLeave?.(); router.push(href); }, ref.current)) event.preventDefault();
    else onLeave?.();
  }} />;
}

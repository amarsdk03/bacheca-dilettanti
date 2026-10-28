"use client";

import { useActionState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { logoutAction } from "../server/actions";
import type { LogoutState } from "../contracts";

const initial: LogoutState = { status: "idle" };

export function LogoutForm({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState(logoutAction, initial);
  const button = <Button type="submit" variant="outline" size={compact ? "icon" : "default"}
    className={compact ? undefined : "w-full"} disabled={pending} aria-label={pending ? "Uscita in corso" : "Logout"}>
    {pending ? <Spinner data-icon="inline-start" /> : <LogOut data-icon="inline-start" aria-hidden="true" />}
    {!compact && (pending ? "Uscita in corso…" : "Logout")}
  </Button>;
  return (
    <form action={action} aria-busy={pending} className="flex flex-col gap-3">
      {compact ? <Tooltip><TooltipTrigger render={button} /><TooltipContent side="right">
        {state.status === "cleanup_failed" ? "Uscita non completata. Riprova a uscire." : "Logout"}
      </TooltipContent></Tooltip> : button}
      {compact && state.status === "cleanup_failed" && <span role="alert" className="sr-only">
        Impossibile rimuovere completamente la sessione locale. Riprova a uscire. {state.correlationId}
      </span>}
      {!compact && state.status === "cleanup_failed" && <Alert variant="destructive"><AlertDescription>
        Impossibile rimuovere completamente la sessione locale. Riprova a uscire.
        {state.correlationId && <p>Riferimento: {state.correlationId}</p>}
      </AlertDescription></Alert>}
    </form>
  );
}

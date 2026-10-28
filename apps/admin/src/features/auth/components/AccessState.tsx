import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LogoutForm } from "./LogoutForm";

export function AccessState({ unavailable }: { unavailable: boolean }) {
  return (
    <section className="flex w-full max-w-md flex-col gap-4">
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>{unavailable ? "Verifica accesso non disponibile" : "Accesso non consentito"}</AlertTitle>
        <AlertDescription>{unavailable ? "Non è stato possibile verificare la sessione. Riprova tra poco." :
          "La sessione non è valida per l’accesso amministrativo. Puoi uscire e accedere nuovamente."}</AlertDescription>
      </Alert>
      {/* Full reload retries verification even when already on /accesso. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <Button nativeButton={false} render={<a href="/accesso" />}>Riprova</Button>
      <LogoutForm />
    </section>
  );
}

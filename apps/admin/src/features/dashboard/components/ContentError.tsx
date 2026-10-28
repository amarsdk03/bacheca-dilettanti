"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ContentError({ retry }: { retry: () => void }) {
  return <div role="region" aria-label="Errore di caricamento" className="flex flex-col items-start gap-4">
    <Alert variant="destructive"><CircleAlert aria-hidden="true" /><AlertTitle>Caricamento non riuscito</AlertTitle>
      <AlertDescription>Non è stato possibile caricare questo contenuto. Riprova tra poco.</AlertDescription>
    </Alert>
    <Button onClick={retry} variant="outline"><RotateCcw data-icon="inline-start" aria-hidden="true" />Riprova</Button>
  </div>;
}

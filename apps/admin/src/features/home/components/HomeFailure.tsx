"use client";
import { RefreshCw } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
export function HomeFailure({ title, correlationId, retry }: { title: string; correlationId?: string; retry(): void }) {
  return <Alert variant="destructive"><AlertTitle>{title}</AlertTitle><AlertDescription>
    <p>I dati non sono disponibili. Puoi riprovare senza ricaricare gli altri contenuti.</p>
    {correlationId && correlationId !== "client" && <p>Riferimento: {correlationId}</p>}
    <Button variant="outline" size="sm" onClick={retry}><RefreshCw data-icon="inline-start" aria-hidden="true" />Riprova</Button>
  </AlertDescription></Alert>;
}

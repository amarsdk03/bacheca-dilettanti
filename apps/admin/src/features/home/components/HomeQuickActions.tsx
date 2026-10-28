import Link from "next/link";
import { ClipboardCheck, Flag, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export function HomeQuickActions() {
  return <Card><CardHeader><CardTitle><h2>Azioni rapide</h2></CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3">
    <Button variant="outline" nativeButton={false} render={<Link href="/annunci?status=in_revisione" prefetch={false} />}><ClipboardCheck data-icon="inline-start" aria-hidden="true" />Annunci da approvare</Button>
    <Button variant="outline" nativeButton={false} render={<Link href="/segnalazioni" prefetch={false} />}><Flag data-icon="inline-start" aria-hidden="true" />Segnalazioni aperte</Button>
    <Button variant="outline" disabled><UserPlus data-icon="inline-start" aria-hidden="true" />Crea profilo limitato<Badge variant="secondary">Presto</Badge></Button>
  </CardContent></Card>;
}

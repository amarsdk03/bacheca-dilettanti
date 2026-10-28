import Link from "next/link";
import { ClipboardCheck, Flag, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
export function HomeQuickActions() {
  return <Card className="admin-home-quick-actions"><CardHeader><CardTitle><h2>Azioni rapide</h2></CardTitle></CardHeader><CardContent className="admin-home-action-list">
    <Button variant="secondary" nativeButton={false} render={<Link href="/annunci?status=in_revisione" prefetch={false} />}><ClipboardCheck data-icon="inline-start" aria-hidden="true" />Annunci da approvare</Button>
    <Button variant="secondary" nativeButton={false} render={<Link href="/segnalazioni" prefetch={false} />}><Flag data-icon="inline-start" aria-hidden="true" />Segnalazioni aperte</Button>
    <Button variant="secondary" disabled><UserPlus data-icon="inline-start" aria-hidden="true" />Crea profilo limitato<Badge variant="neutral">Presto</Badge></Button>
  </CardContent></Card>;
}

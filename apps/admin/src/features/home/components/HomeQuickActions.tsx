import Link from "next/link";
import {ClipboardCheck, Flag, Plus, UserPlus} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

export function HomeQuickActions() {
  return <Card className="admin-home-quick-actions"><CardHeader><CardTitle><h2>Azioni rapide</h2></CardTitle></CardHeader><CardContent className="admin-home-action-list">
    <Button variant="secondary" nativeButton={false} render={<Link href="/annunci/crea-annuncio" prefetch={false} />}><Plus data-icon="inline-start" aria-hidden="true" />Crea nuovo annuncio</Button>
    <Button variant="secondary" nativeButton={false} render={<Link href="/annunci?status=in_revisione" prefetch={false} />}><ClipboardCheck data-icon="inline-start" aria-hidden="true" />Annunci da approvare</Button>
    <Button variant="secondary" nativeButton={false} render={<Link href="/segnalazioni?status=active" prefetch={false} />}><Flag data-icon="inline-start" aria-hidden="true" />Segnalazioni aperte</Button>
    <Button variant="secondary" className="home-disabled-action" disabled><UserPlus data-icon="inline-start" aria-hidden="true" />Crea profilo limitato</Button>
  </CardContent></Card>;
}

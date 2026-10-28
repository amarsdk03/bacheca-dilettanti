"use client";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import type { AuditSummary } from "../read-contracts";
import { AUDIT_LABELS, auditActorLabel, auditDate } from "../read-presentation";

/** Presentation only. Callers own authorization, requests, limits and overlays. */
export function AuditSummaryTable({ items, caption, onShowDetails }: {
  items: readonly AuditSummary[]; caption: string; onShowDetails?(id: string, trigger: HTMLElement): void;
}) {
  return <Table><TableCaption>{caption}</TableCaption>
    <TableHeader><TableRow><TableHead>Data e ora</TableHead><TableHead>Amministratore</TableHead><TableHead>Operazione</TableHead>{onShowDetails && <TableHead>Dettagli</TableHead>}</TableRow></TableHeader>
    <TableBody>{items.map(row => <TableRow key={row.id}>
      <TableCell>{auditDate(row.occurredAt)}</TableCell>
      <TableCell className="max-w-72 whitespace-normal break-words">{auditActorLabel(row.actor)}{row.actor.authId && !row.actor.userId && <p className="text-xs text-muted-foreground">Account verificato, senza identità Admin attestata</p>}</TableCell>
      <TableCell><div className="flex flex-col items-start gap-1">{AUDIT_LABELS[row.action]}<Badge variant={row.outcome === "failure" ? "destructive" : "secondary"}>{row.outcome === "success" ? "Riuscita" : "Fallita"}</Badge></div></TableCell>
      {onShowDetails && <TableCell><Button variant="ghost" size="sm" aria-label={`Mostra dettagli: ${row.id}`} onClick={event => onShowDetails(row.id, event.currentTarget)}><Eye data-icon="inline-start" aria-hidden="true" />Mostra dettagli</Button></TableCell>}
    </TableRow>)}</TableBody>
  </Table>;
}

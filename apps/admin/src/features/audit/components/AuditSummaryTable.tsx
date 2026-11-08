"use client";
import {Eye} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import type {AuditSummary} from "../read-contracts";
import {AUDIT_LABELS, auditActorLabel, auditDate} from "../read-presentation";

/** Presentation only. Callers own authorization, requests, limits and overlays. */
export function AuditSummaryTable({ items, caption, onShowDetails, separateOutcome = false }: {
  items: readonly AuditSummary[]; caption: string; onShowDetails?(id: string, trigger: HTMLElement): void; separateOutcome?: boolean;
}) {
  return <Table className="admin-audit-summary-table" data-separate-outcome={separateOutcome} data-has-details={Boolean(onShowDetails)}><TableCaption>{caption}</TableCaption>
    <TableHeader><TableRow><TableHead scope="col">Data e ora</TableHead><TableHead scope="col">Amministratore</TableHead><TableHead scope="col">Operazione</TableHead>{separateOutcome && <TableHead scope="col">Esito</TableHead>}{onShowDetails && <TableHead scope="col">Dettagli</TableHead>}</TableRow></TableHeader>
    <TableBody>{items.map(row => <TableRow key={row.id}>
      <TableCell>{auditDate(row.occurredAt)}</TableCell>
      <TableCell>{auditActorLabel(row.actor)}{row.actor.authId && !row.actor.userId && <p className="admin-audit-actor-note">Account verificato, senza identità Admin attestata</p>}</TableCell>
      <TableCell><div className="admin-audit-operation">{AUDIT_LABELS[row.action]}{!separateOutcome && <Badge variant={row.outcome === "failure" ? "danger" : "success"}>{row.outcome === "success" ? "Riuscita" : "Fallita"}</Badge>}</div></TableCell>
      {separateOutcome && <TableCell><Badge variant={row.outcome === "failure" ? "danger" : "success"}>{row.outcome === "success" ? "Riuscita" : "Fallita"}</Badge></TableCell>}
      {onShowDetails && <TableCell><Button className="admin-audit-details-button" variant="ghost" size="sm" aria-label={`Mostra dettagli: ${row.id}`} onClick={event => onShowDetails(row.id, event.currentTarget)}><Eye data-icon="inline-start" aria-hidden="true" />Dettagli</Button></TableCell>}
    </TableRow>)}</TableBody>
  </Table>;
}

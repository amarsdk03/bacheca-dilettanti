import type { AuditDetail } from "../read-contracts";
import { AUDIT_LABELS, auditActorLabel, auditDate } from "../read-presentation";
function Fact({ label, value }: { label: string; value: string | null }) {
  return <div className="flex flex-col gap-1"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap break-words">{value ?? "Non disponibile"}</dd></div>;
}
export function AuditDetailContent({ detail: d }: { detail: AuditDetail }) {
  return <div className="flex flex-col gap-6">
    <dl className="flex flex-col gap-4">
      <Fact label="ID evento" value={d.id} /><Fact label="Data e ora (Europe/Rome)" value={auditDate(d.occurredAt)} /><Fact label="Timestamp UTC" value={d.occurredAt} />
      <Fact label="Operazione" value={AUDIT_LABELS[d.action]} /><Fact label="Esito" value={d.outcome === "success" ? "Riuscita" : "Fallita"} />
      <Fact label="Operatore" value={auditActorLabel(d.actor)} /><Fact label="Email attuale dell’account" value={d.actor.email} />
      <Fact label="UUID utente applicativo" value={d.actor.userId} /><Fact label="UUID account Auth" value={d.actor.authId} />
      <Fact label="Tipo risorsa" value={d.resourceType} /><Fact label="UUID risorsa" value={d.resourceId} />
      <Fact label="Correlazione" value={d.correlationId} /><Fact label="Motivazione" value={d.reason} /><Fact label="Codice errore" value={d.failureCode} />
    </dl>
    <p className="text-sm text-muted-foreground">L’email è quella attuale dell’account, non una copia storica. Gli UUID conservano il riferimento anche dopo la cancellazione dell’account. Gli eventi non identificati non attestano l’identità inserita nel login.</p>
    <section className="flex flex-col gap-3"><h3 className="font-semibold">Variazioni</h3>
      {Object.keys(d.changes).length ? <dl className="flex flex-col gap-3">{Object.entries(d.changes).map(([key, change]) => <Fact key={key} label={{ status: "Stato", hidden: "Nascosto", trashed: "Nel cestino" }[key]!}
        value={`${change.before === null ? "Non disponibile" : String(change.before)} → ${String(change.after)}`} />)}</dl> : <p>Nessuna variazione registrata per questo evento.</p>}
    </section>
    {d.export && <section className="flex flex-col gap-3"><h3 className="font-semibold">Esportazione</h3><p>Righe: {d.export.rowCount}</p>
      <p>Colonne: {d.export.columns?.join(", ") ?? "Non disponibili per questo evento storico"}</p>
      {d.export.announcementIds ? <ul className="flex flex-col gap-2">{d.export.announcementIds.map(id => <li className="break-words" key={id}>{id}</li>)}</ul> : <p>ID non disponibili per questo evento storico.</p>}
    </section>}
  </div>;
}

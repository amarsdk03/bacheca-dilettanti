import type { AuditDetail } from "../read-contracts";
import { Badge } from "@/components/ui/badge";
import { AUDIT_LABELS, auditActorLabel, auditDate } from "../read-presentation";
function Fact({ label, value, technical = false }: { label: string; value: string | null; technical?: boolean }) {
  return <div className="admin-fact" data-technical={technical}><dt>{label}</dt><dd>{value ?? "Non disponibile"}</dd></div>;
}
export function AuditDetailContent({ detail: d }: { detail: AuditDetail }) {
  return <div className="admin-detail-stack">
    <section className="admin-detail-section"><h3>Operazione e operatore</h3><dl className="admin-facts-grid">
      <Fact label="Operazione" value={AUDIT_LABELS[d.action]} /><div className="admin-fact"><dt>Esito</dt><dd><Badge variant={d.outcome === "success" ? "success" : "danger"}>{d.outcome === "success" ? "Riuscita" : "Fallita"}</Badge></dd></div>
      <Fact label="Data e ora (Europe/Rome)" value={auditDate(d.occurredAt)} /><Fact label="Timestamp UTC" value={d.occurredAt} technical />
      <Fact label="Operatore" value={auditActorLabel(d.actor)} /><Fact label="Email attuale dell’account" value={d.actor.email} />
    </dl></section>
    <section className="admin-detail-section"><h3>Identificativi</h3><dl className="admin-facts-grid">
      <Fact label="ID evento" value={d.id} technical /><Fact label="UUID utente applicativo" value={d.actor.userId} technical /><Fact label="UUID account Auth" value={d.actor.authId} technical />
      <Fact label="Tipo risorsa" value={d.resourceType} /><Fact label="UUID risorsa" value={d.resourceId} technical />
    </dl></section>
    <section className="admin-detail-section"><h3>Variazioni</h3>
      {Object.keys(d.changes).length ? <dl className="admin-detail-stack">{Object.entries(d.changes).map(([key, change]) => <Fact key={key} label={{ status: "Stato", hidden: "Nascosto", trashed: "Nel cestino" }[key]!}
        value={`${change.before === null ? "Non disponibile" : String(change.before)} → ${String(change.after)}`} technical />)}</dl> : <p>Nessuna variazione registrata per questo evento.</p>}
    </section>
    <section className="admin-detail-section"><h3>Motivazione e correlazione</h3><dl className="admin-detail-stack">
      <Fact label="Motivazione" value={d.reason} /><Fact label="Correlazione" value={d.correlationId} technical /><Fact label="Codice errore" value={d.failureCode} technical />
    </dl></section>
    {d.export && <section className="admin-detail-section"><h3>Esportazione</h3><p>Righe: {d.export.rowCount}</p>
      <p>Colonne: {d.export.columns?.join(", ") ?? "Non disponibili per questo evento storico"}</p>
      {d.export.announcementIds ? <ul className="admin-technical-block admin-detail-stack">{d.export.announcementIds.map(id => <li key={id}>{id}</li>)}</ul> : <p>ID non disponibili per questo evento storico.</p>}
    </section>}
    <p className="admin-note admin-provenance-note">L’email è quella attuale dell’account, non una copia storica. Gli UUID conservano il riferimento anche dopo la cancellazione dell’account. Gli eventi non identificati non attestano l’identità inserita nel login.</p>
  </div>;
}

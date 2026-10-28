import type { AuditActor, AuditAction } from "./read-contracts";
export const AUDIT_LABELS: Record<AuditAction, string> = {
  "auth.login": "Accesso", "auth.logout": "Logout", "auth.access_denied": "Accesso negato",
  "announcement.approve": "Annuncio approvato", "announcement.reject": "Annuncio rifiutato", "announcement.hide": "Annuncio nascosto",
  "announcement.show": "Visibilità ripristinata", "announcement.trash": "Annuncio nel cestino", "announcement.restore": "Annuncio recuperato", "announcement.export": "Esportazione annunci",
};
export function auditActorLabel(actor: AuditActor) {
  if (actor.email) return actor.email;
  const id = actor.userId ?? actor.authId;
  return id ? (actor.userId ? "Utente " : "Account verificato ") + id.slice(0, 8) + "…" : "Non identificato";
}
export function auditDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "medium", timeZone: "Europe/Rome" }).format(new Date(value));
}

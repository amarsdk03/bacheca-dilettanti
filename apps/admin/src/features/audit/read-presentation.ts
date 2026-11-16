import type {AuditAction, AuditActor} from "./read-contracts";

export const AUDIT_LABELS: Record<AuditAction, string> = {
  "distribution.save": "Distribuzione WhatsApp aggiornata", "distribution.channel_save": "Canale di distribuzione aggiornato",
  "profile.verify": "Profilo verificato", "profile.unverify": "Verifica profilo revocata", "profile.hide": "Profilo oscurato", "profile.show": "Visibilità profilo ripristinata",
  "report.update": "Segnalazione aggiornata", "invitation.consider": "Valutazione invito aggiornata",
  "auth.login": "Accesso", "auth.logout": "Logout", "auth.access_denied": "Accesso negato",
  "announcement.approve": "Annuncio approvato", "announcement.reject": "Annuncio rifiutato", "announcement.hide": "Annuncio nascosto",
  "announcement.whatsapp_export": "Esportazione WhatsApp",
  "announcement.create": "Annuncio creato",
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

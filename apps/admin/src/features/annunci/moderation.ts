import type { AnnouncementDetail } from "./contracts";
import { canonicalUuid, exactKeys, record } from "./validation";

export const MODERATION_OPERATIONS = ["approve", "reject", "hide", "show", "trash", "restore"] as const;
export type ModerationOperation = typeof MODERATION_OPERATIONS[number];
export type ModerationCapability = { allowed: boolean; reason: string | null };
export type ModerationInfo = { adminHidden: boolean; capabilities: Record<ModerationOperation, ModerationCapability> };
export type ModerationInput = { id: string; operation: ModerationOperation; fingerprint: string; reason: string | null };
export type ModerationResult = { status: "ok"; id: string; eventId: string; correlationId: string } |
  { status: "invalid" | "denied" | "not_found" | "conflict" | "unavailable"; correlationId: string } |
  { status: "not_allowed"; reason: string; correlationId: string };

export const MODERATION_LABELS: Record<ModerationOperation, string> = { trash: "Sposta nel cestino", restore: "Ripristina dal cestino", approve: "Approva", reject: "Rifiuta", hide: "Nascondi", show: "Ripristina visibilità" };
export const MODERATION_REASONS: Record<string, string> = {
  TRASH_NOT_ENABLED: "Il cestino non è ancora abilitato in questo ambiente.", ALREADY_TRASHED: "L’annuncio è già nel cestino.",
  NOT_TRASHED: "L’annuncio non è nel cestino.", IN_TRASH: "Ripristina prima l’annuncio dal cestino.",
  REGIONS_NOT_ALLOWED: "Le regioni conservate non sono più abilitate per questo profilo professionale.",
  REVIEW_REQUIRED: "L’annuncio deve essere in revisione.", ALREADY_HIDDEN: "L’annuncio è già nascosto.", NOT_HIDDEN: "L’annuncio non è nascosto.",
  PAYMENT_OR_STATE_PENDING: "Il pagamento o lo stato non consentono il ripristino.", INCOMPLETE_CONTENT: "Il dettaglio è incompleto o contiene dati non validi.",
  TITLE_REQUIRED: "Manca il titolo dell’annuncio.", REGIONS_REQUIRED: "Indica almeno una regione per i servizi professionali.",
  PAYMENT_REQUIRED: "Il pagamento della priorità non è disponibile o è in rimborso.", UNAVAILABLE: "Ricarica il dettaglio per verificare questa operazione.",
};
export const moderationReason = (code: string | null) => code ? MODERATION_REASONS[code] ?? MODERATION_REASONS.UNAVAILABLE : "";
export const needsReason = (operation: ModerationOperation) => operation === "reject" || operation === "hide" || operation === "trash";

export function parseModerationInput(value: unknown): ModerationInput {
  if (!record(value) || !exactKeys(value, ["id", "operation", "fingerprint", "reason"]) ||
    !canonicalUuid(value.id) || !MODERATION_OPERATIONS.some((v) => v === value.operation) ||
    typeof value.fingerprint !== "string" || !/^content-v1:[0-9a-f]{64}$/.test(value.fingerprint) ||
    (value.reason !== null && typeof value.reason !== "string")) throw new Error("INVALID_MODERATION");
  const operation = value.operation as ModerationOperation;
  const reason = typeof value.reason === "string" ? value.reason.trim() || null : null;
  if ((needsReason(operation) && !reason) || (reason && [...reason].length > 1000) || (!needsReason(operation) && reason)) throw new Error("INVALID_MODERATION");
  return { id: value.id, operation, fingerprint: value.fingerprint, reason };
}

export function parseModerationInfo(value: unknown): ModerationInfo {
  if (!record(value) || typeof value.adminHidden !== "boolean" || !record(value.capabilities)) throw new Error("INVALID_MODERATION_CAPABILITIES");
  const capabilities = {} as ModerationInfo["capabilities"];
  for (const operation of MODERATION_OPERATIONS) {
    const cap = value.capabilities[operation];
    if (cap === undefined && (operation === "trash" || operation === "restore")) { capabilities[operation] = { allowed: false, reason: "UNAVAILABLE" }; continue; }
    if (!record(cap) || typeof cap.allowed !== "boolean" || (cap.reason !== null && (typeof cap.reason !== "string" || !Object.hasOwn(MODERATION_REASONS, cap.reason))) ||
      cap.allowed !== (cap.reason === null)) throw new Error("INVALID_MODERATION_CAPABILITIES");
    capabilities[operation] = { allowed: cap.allowed, reason: cap.reason as string | null };
  }
  return { adminHidden: value.adminHidden, capabilities };
}

export function capability(detail: AnnouncementDetail, operation: ModerationOperation): ModerationCapability {
  // Also fail closed when rendering a DTO from the previous migration/version.
  if ((operation === "approve" || operation === "show") && !detail.complete) return { allowed: false, reason: "INCOMPLETE_CONTENT" };
  return detail.moderation?.capabilities[operation] ?? { allowed: false, reason: "UNAVAILABLE" };
}

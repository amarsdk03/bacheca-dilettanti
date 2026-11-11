import type {AnnouncementListItem} from "../contracts";
export const WHATSAPP_STATUSES = ["website", "imported", "exported", "unknown"] as const;
export type WhatsAppStatus = typeof WHATSAPP_STATUSES[number];
export const WHATSAPP_LABELS: Record<WhatsAppStatus, string> = {website: "Solo sito web", imported: "Da WhatsApp", exported: "Su WhatsApp", unknown: "N/A"};
export function whatsappLabel(row: Pick<AnnouncementListItem,"whatsappStatus" | "fromWhatsApp">) {
  return WHATSAPP_LABELS[row.whatsappStatus ?? (row.fromWhatsApp === true ? "imported" : row.fromWhatsApp === false ? "website" : "unknown")];
}
export function canPrepareWhatsApp(row: AnnouncementListItem) {
  return row.whatsappAvailable === true && !row.trashed && row.hidden === false && row.private === false && ["pubblicato", "in_revisione"].includes(row.status ?? "");
}
export interface WhatsAppExport {text: string; url: string; templateVersion: string; version: number; contentFingerprint: string | null}
export type WhatsAppFailure = "invalid" | "denied" | "not_found" | "not_allowed" | "conflict" | "unavailable";
export interface WhatsAppSaveInput {id: string; text: string; url: string; templateVersion: string; version: number; fingerprint: string}

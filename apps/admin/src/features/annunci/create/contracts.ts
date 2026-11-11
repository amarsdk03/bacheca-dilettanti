import type {MockProfileType, MockTeamType, MockValues} from "./prototype-model";
import type {WhatsAppProvenance} from "./whatsapp-parser";

export type CreateTab = "author" | "profile" | "announcement" | "contacts" | "review";
export const CREATE_TABS: {value: CreateTab; label: string}[] = [
  {value: "author", label: "Autore"}, {value: "profile", label: "Profilo"}, {value: "announcement", label: "Annuncio"},
  {value: "contacts", label: "Contatti e media"}, {value: "review", label: "Riepilogo"},
];
export interface FieldIssue {path: string; severity: "error" | "warning"; code: string; message: string; tab: CreateTab}
export interface AuthorProfile {id: string; type: MockProfileType; name: string; region: string; city: string; facts: string; sports?: string[]; draft: Record<string, unknown>; locations: {regione: string; citta: string | null}[]; allowedRegions?: string[]}
export interface AnnouncementAuthor {id: string; name: string; email: string; profiles: AuthorProfile[]}
export interface CreationInput {
  version: 1; submissionId: string; authorMode: "registered" | "unregistered"; profileId: string | null;
  profileType: MockProfileType; teamType: MockTeamType; profile: MockValues; announcement: MockValues;
  referenceEmail: string; authorized: boolean; provenance?: WhatsAppProvenance;
  approveImmediately?: boolean;
  image?: {hash: string; mime: string; size: number} | null;
}
export interface CreationReceipt {publicationId: string; announcementId: string; announcements: {id: string; region: string | null; status: string}[]; idempotent: boolean}
export type CreationResult = {status: "ok"; receipt: CreationReceipt} | {status: "invalid"; issues: FieldIssue[]} |
  {status: "denied" | "unavailable" | "conflict" | "consumed" | "unknown"; correlationId?: string};

export const ADMIN_ANNOUNCEMENT_TYPES = [
  "annuncio_giocatore", "annuncio_squadra_cerca_giocatore", "annuncio_squadra_cerca_staff",
  "annuncio_squadra_cerca_partita", "annuncio_squadra_cerca_sponsor", "annuncio_staff_sportivo",
  "annuncio_arbitro", "annuncio_torneo_evento", "annuncio_campo_impianto", "annuncio_servizi_consulenze", "annuncio_creators",
] as const;
export const ADMIN_ANNOUNCEMENT_STATUSES = ["pubblicato", "in_revisione", "rifiutato", "in_attesa_pagamento"] as const;
export const ADMIN_ANNOUNCEMENT_VISIBILITY = ["all", "shown", "hidden", "unknown"] as const;
export const ADMIN_ANNOUNCEMENT_TRASH = ["exclude", "only", "all"] as const;
export type AnnouncementFilters = {
  trash: typeof ADMIN_ANNOUNCEMENT_TRASH[number];
  search: string;
  status: typeof ADMIN_ANNOUNCEMENT_STATUSES[number] | null;
  type: typeof ADMIN_ANNOUNCEMENT_TYPES[number] | null;
  /** shown means nascosto=false, not publicly listed; privacy is independent. */
  visibility: typeof ADMIN_ANNOUNCEMENT_VISIBILITY[number];
};
export type AnnouncementCursor = { v: 2; id: string; createdAt: string | null; filters: AnnouncementFilters };
export type AnnouncementListQuery = { filters: AnnouncementFilters; limit: number; cursor: AnnouncementCursor | null };
export type AnnouncementListItem = {
  id: string; title: string | null; type: string; status: string | null;
  /** Absent only during a deployment from the previous read contract. */
  trashed?: boolean;
  hidden: boolean | null; private: boolean | null; creatorId: string | null;
  createdAt: string | null; updatedAt: string | null;
  /** Base row only; not an authorization token or a version of related content. */
  rowFingerprint: string;
  author: { profileId: string | null; userId: string | null; displayName: string; anonymous: boolean | null; available: boolean };
};
export type AnnouncementListPage = { items: AnnouncementListItem[]; hasMore: boolean; nextCursor: string | null };
export type AnnouncementListResult = { status: "ok"; page: AnnouncementListPage } |
  { status: "invalid"; code: "INVALID_QUERY" } | { status: "denied"; code: "ACCESS_DENIED" } |
  { status: "unavailable"; code: "ANNOUNCEMENTS_UNAVAILABLE"; correlationId: string };

export type AnnouncementDetail = {
  /** Optional only for reads during deployment before migration 09; actions fail closed. */
  moderation?: import("./moderation").ModerationInfo;
  trash?: { deletedAt: string | null; deletedBy: string | null };
  summary: AnnouncementListItem;
  metadata: { moderationInfo: string | null; level: string | null; priorityActive: boolean; priorityStartsAt: string | null; priorityEndsAt: string | null; updatedById: string | null };
  content: import("./detail-fields").DetailContent;
  locations: { id: string; region: string; city: string | null }[];
  contacts: { id: string; kind: "email" | "phone" | "unknown"; value: string; referent: string | null; valid: boolean }[];
  links: { id: string; platform: string | null; value: string; url: string | null }[];
  media: { id: string; mimeType: string | null; value: string; url: string | null }[];
  /** Versioned full source comparison, not an authorization token. */
  contentFingerprint: string;
  complete: boolean;
  issues: string[];
};
export type AnnouncementDetailResult = { status: "ok"; detail: AnnouncementDetail } |
  { status: "invalid"; code: "INVALID_ANNOUNCEMENT_ID" } | { status: "not_found"; code: "ANNOUNCEMENT_NOT_FOUND" } |
  { status: "denied"; code: "ACCESS_DENIED" } | { status: "unavailable"; code: "ANNOUNCEMENTS_UNAVAILABLE"; correlationId: string };

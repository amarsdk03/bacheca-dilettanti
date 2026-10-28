import { ANNOUNCEMENT_AUDIT_ACTIONS } from "./contracts";

export const AUDIT_ACTIONS = ["auth.login", "auth.logout", "auth.access_denied", ...ANNOUNCEMENT_AUDIT_ACTIONS] as const;
export type AuditAction = typeof AUDIT_ACTIONS[number];
export type AuditFilters = { from: string; to: string; operator: string; action: "" | AuditAction; outcome: "" | "success" | "failure" };
export type AuditCursor = { v: 1; filters: AuditFilters; id: string; occurredAt: string };
export type AuditQuery = { filters: AuditFilters; limit: number; cursor: AuditCursor | null };
export type AuditActor = { authId: string | null; userId: string | null; email: string | null };
export type AuditSummary = { id: string; occurredAt: string; actor: AuditActor; action: AuditAction; outcome: "success" | "failure" };
export type AuditPage = { items: AuditSummary[]; hasMore: boolean; nextCursor: string | null };
export type AuditDetail = AuditSummary & {
  resourceType: "session" | "announcement" | "announcement_export"; resourceId: string | null; correlationId: string;
  reason: string | null; failureCode: string | null;
  changes: Partial<Record<"status" | "hidden" | "trashed", { before: string | boolean | null; after: string | boolean }>>;
  export: { rowCount: number; columns: string[] | null; announcementIds: string[] | null } | null;
};
export type AuditFailure = { status: "invalid"; code: "INVALID_QUERY" | "INVALID_EVENT_ID" } |
  { status: "denied"; code: "ACCESS_DENIED" } | { status: "unavailable"; code: "AUDIT_UNAVAILABLE"; correlationId: string };
export type AuditListResult = { status: "ok"; page: AuditPage } | AuditFailure;
export type AuditDetailResult = { status: "ok"; detail: AuditDetail } | { status: "not_found"; code: "EVENT_NOT_FOUND" } | AuditFailure;

export const AUDIT_FAILURE_CODES = [
  "INVALID_CREDENTIALS", "ACCESS_DENIED", "SESSION_INVALID", "AUTH_UNAVAILABLE",
  "VALIDATION_FAILED", "RESOURCE_NOT_FOUND", "STATE_CONFLICT", "OPERATION_FAILED",
  "AUDIT_UNAVAILABLE", "EXPORT_FAILED", "LOGOUT_FAILED",
] as const;
export type AuditFailureCode = typeof AUDIT_FAILURE_CODES[number];
export const ANNOUNCEMENT_AUDIT_ACTIONS = [
  "announcement.approve", "announcement.reject", "announcement.hide", "announcement.show",
  "announcement.trash", "announcement.restore", "announcement.export",
] as const;
export type AnnouncementAuditAction = typeof ANNOUNCEMENT_AUDIT_ACTIONS[number];
export type AuthFailureAction = "auth.login" | "auth.access_denied";

/** Internal transport DTO. Never take this object from a form or request body. */
export type ServerAuditEvent = {
  action: AnnouncementAuditAction | AuthFailureAction | "auth.logout";
  outcome: "success" | "failure";
  correlationId: string;
  actorAuthId: string | null;
  actorUserId: string | null;
  resourceId: string | null;
  failureCode: AuditFailureCode | null;
};
export type AuditWriteResult =
  | { status: "recorded"; correlationId: string; eventId: string }
  | { status: "unavailable"; correlationId: string };
export type SessionCleanupResult = {
  revocation: "succeeded" | "failed" | "unavailable";
  cleanup: "cleared" | "failed";
};
export type LoginAuditResult = Extract<AuditWriteResult, { status: "recorded" }> | ({
  status: "denied" | "unavailable";
  correlationId: string;
} & SessionCleanupResult);
export type LogoutAuditResult = SessionCleanupResult & {
  audit: AuditWriteResult | { status: "skipped"; correlationId: string };
};

export function auditUuid(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase() : null;
}

/** Inspect only a machine code; never propagate error.message to audit/logs. */
export function mapAuthAuditFailure(error: unknown): AuditFailureCode {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
  if (code === "invalid_credentials") return "INVALID_CREDENTIALS";
  if (code === "email_not_confirmed" || code === "user_banned") return "ACCESS_DENIED";
  if (code === "session_not_found" || code === "session_expired" || code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" || code === "bad_jwt") return "SESSION_INVALID";
  return "AUTH_UNAVAILABLE";
}

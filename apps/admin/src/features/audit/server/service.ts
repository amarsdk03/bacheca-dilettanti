import "server-only";

import { randomUUID } from "node:crypto";
import { verifyAdminContext, type AdminContext as Context, type AdminSessionClient as SessionClient } from "../../auth/server/context";
import {
  ANNOUNCEMENT_AUDIT_ACTIONS, AUDIT_FAILURE_CODES, auditUuid,
  type AnnouncementAuditAction, type AuditFailureCode, type AuditWriteResult,
  type AuthFailureAction, type LoginAuditResult, type LogoutAuditResult,
  type ServerAuditEvent, type SessionCleanupResult,
} from "../contracts";

type Notice = "ADMIN_AUDIT_WRITE_UNAVAILABLE" | "ADMIN_AUDIT_INPUT_INVALID" |
  "ADMIN_AUDIT_CONTEXT_UNAVAILABLE" | "ADMIN_SESSION_REVOCATION_FAILED" | "ADMIN_SESSION_CLEANUP_FAILED";
type Dependencies = {
  getSessionClient(): Promise<SessionClient>;
  writeEvent(event: ServerAuditEvent): Promise<string>;
  log(code: Notice, correlationId: string): void;
};
type ClearLocalSession = () => void | Promise<void>;

/** Request-local service, no Server Action exports or authorization caches. */
export function createAuditService(deps: Dependencies) {
  const notice = (code: Notice, correlationId: string) => {
    try { deps.log(code, correlationId); } catch { /* Diagnostics cannot prevent cleanup. */ }
  };
  const context = async (correlationId: string): Promise<Context> => {
    const result = await verifyAdminContext(deps.getSessionClient);
    if (result.status === "unavailable") notice("ADMIN_AUDIT_CONTEXT_UNAVAILABLE", correlationId);
    return result;
  };

  const persist = async (event: ServerAuditEvent): Promise<AuditWriteResult> => {
    try {
      const eventId = auditUuid(await deps.writeEvent(event));
      if (!eventId) throw new Error();
      return { status: "recorded", eventId, correlationId: event.correlationId };
    } catch {
      notice("ADMIN_AUDIT_WRITE_UNAVAILABLE", event.correlationId);
      return { status: "unavailable", correlationId: event.correlationId };
    }
  };

  const revokeAndClear = async (client: SessionClient | null, clear: ClearLocalSession, correlationId: string): Promise<SessionCleanupResult> => {
    let revocation: SessionCleanupResult["revocation"] = "unavailable";
    let cleanup: SessionCleanupResult["cleanup"] = "cleared";
    try {
      if (client) revocation = (await client.auth.signOut({ scope: "local" })).error ? "failed" : "succeeded";
    } catch { revocation = "failed"; }
    finally {
      try { await clear(); }
      catch { cleanup = "failed"; notice("ADMIN_SESSION_CLEANUP_FAILED", correlationId); }
    }
    if (revocation !== "succeeded") notice("ADMIN_SESSION_REVOCATION_FAILED", correlationId);
    return { revocation, cleanup };
  };

  const event = (ctx: Context, action: ServerAuditEvent["action"], outcome: ServerAuditEvent["outcome"],
    correlationId: string, failureCode: AuditFailureCode | null, resourceId: string | null): ServerAuditEvent => ({
    action, outcome, correlationId, failureCode, resourceId,
    actorAuthId: ctx.authId, actorUserId: ctx.status === "admin" ? ctx.userId : null,
  });

  const failure = async (input: {
    action: ServerAuditEvent["action"]; code: AuditFailureCode; resourceId?: string | null; correlationId?: string;
  }, kind: "auth" | "operation"): Promise<AuditWriteResult> => {
    const correlationId = auditUuid(input.correlationId) ?? randomUUID();
    if ((input.correlationId !== undefined && !auditUuid(input.correlationId)) ||
      !AUDIT_FAILURE_CODES.some((code) => code === input.code) ||
      (kind === "auth" ? !["auth.login", "auth.access_denied"].includes(input.action) :
        !ANNOUNCEMENT_AUDIT_ACTIONS.some((action) => action === input.action)) ||
      (input.resourceId != null && !auditUuid(input.resourceId)) ||
      (input.action === "announcement.export" && input.resourceId != null)) {
      notice("ADMIN_AUDIT_INPUT_INVALID", correlationId);
      return { status: "unavailable", correlationId };
    }
    const ctx = await context(correlationId);
    return persist(event(ctx, input.action, "failure", correlationId, input.code,
      kind === "auth" ? ctx.sessionId : auditUuid(input.resourceId)));
  };

  return {
    /** Call only AFTER signInWithPassword succeeds, from trusted server code.
     * The callback must clear all Admin cookie chunks; it is mandatory in 05.
     */
    async recordLoginSuccess(clearLocalSession: ClearLocalSession): Promise<LoginAuditResult> {
      const correlationId = randomUUID();
      const ctx = await context(correlationId);
      if (ctx.status !== "admin") {
        const cleanup = await revokeAndClear(ctx.client, clearLocalSession, correlationId);
        await persist(event(ctx, "auth.access_denied", "failure", correlationId,
          ctx.status === "unavailable" ? "AUTH_UNAVAILABLE" : "ACCESS_DENIED", ctx.sessionId));
        return { status: ctx.status === "unavailable" ? "unavailable" : "denied", correlationId, ...cleanup };
      }
      const result = await persist(event(ctx, "auth.login", "success", correlationId, null, ctx.sessionId));
      if (result.status === "recorded") return result;
      return { ...result, ...await revokeAndClear(ctx.client, clearLocalSession, correlationId) };
    },
    recordAuthFailure(input: { action: AuthFailureAction; code: AuditFailureCode; correlationId?: string }) {
      return failure(input, "auth");
    },
    /** Call only AFTER the functional database request has failed/rolled back. */
    recordOperationFailure(input: { action: AnnouncementAuditAction; code: AuditFailureCode;
      resourceId?: string | null; correlationId?: string }) {
      return failure(input, "operation");
    },
    async logoutWithAudit(clearLocalSession: ClearLocalSession): Promise<LogoutAuditResult> {
      const correlationId = randomUUID();
      // Local snapshot for this logical operation only; logout invalidates its session.
      const ctx = await context(correlationId);
      const cleanup = await revokeAndClear(ctx.client, clearLocalSession, correlationId);
      if (cleanup.revocation !== "succeeded" || cleanup.cleanup !== "cleared") {
        return { ...cleanup, audit: await persist(event(ctx, "auth.logout", "failure", correlationId, "LOGOUT_FAILED", ctx.sessionId)) };
      }
      if (ctx.status !== "admin") return { ...cleanup, audit: { status: "skipped", correlationId } };
      return { ...cleanup, audit: await persist(event(ctx, "auth.logout", "success", correlationId, null, ctx.sessionId)) };
    },
  };
}

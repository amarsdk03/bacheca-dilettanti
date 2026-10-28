import "server-only";
import { randomUUID } from "node:crypto";
import { verifySessionClaims, type ClaimsClient } from "../../auth/server/session-claims";
import type { AnnouncementAuditAction, AuditFailureCode } from "../../audit/contracts";
import { MODERATION_REASONS, parseModerationInput, type ModerationResult, type ModerationInput } from "../moderation";
import { canonicalUuid, record } from "../validation";

type Client = ClaimsClient & { rpc(name: "admin_moderate_announcement_v1", args: { p_id: string; p_operation: string; p_fingerprint: string; p_reason: string | null }): PromiseLike<{ data: unknown; error: unknown }> };
type Failure = { action: AnnouncementAuditAction; code: AuditFailureCode; resourceId: string; correlationId: string };
export function createModerationService(deps: { getClient(): Promise<Client>; failure(input: Failure): Promise<unknown>; log(code: "ADMIN_MODERATION_UNAVAILABLE", correlationId: string): void }) {
  return async (raw: unknown): Promise<ModerationResult> => {
    let input: ModerationInput; const correlationId = randomUUID();
    try { input = parseModerationInput(raw); } catch { return { status: "invalid", correlationId }; }
    const unavailable = (): ModerationResult => { try { deps.log("ADMIN_MODERATION_UNAVAILABLE", correlationId); } catch {} return { status: "unavailable", correlationId }; };
    let result: ModerationResult;
    try {
      const client = await deps.getClient(); const claims = await verifySessionClaims(client);
      if (claims.status !== "verified") result = claims.status === "unavailable" ? unavailable() : { status: "denied", correlationId };
      else {
        const { data, error } = await client.rpc("admin_moderate_announcement_v1", { p_id: input.id, p_operation: input.operation, p_fingerprint: input.fingerprint, p_reason: input.reason });
        if (error) {
          const e = error as { code?: unknown; message?: unknown };
          result = e.code === "42501" && e.message !== "ADMIN_SESSION_POLICY_UNVERIFIED" ? { status: "denied", correlationId } : unavailable();
        } else if (!record(data) || !canonicalUuid(data.correlationId)) result = unavailable();
        else if (data.status === "ok" && data.id === input.id && canonicalUuid(data.eventId)) result = { status: "ok", id: input.id, eventId: data.eventId, correlationId: data.correlationId };
        else if (["invalid", "not_found", "conflict", "unavailable"].includes(data.status as string)) result = { status: data.status as "invalid" | "not_found" | "conflict" | "unavailable", correlationId: data.correlationId };
        else if (data.status === "not_allowed" && typeof data.reason === "string" && Object.hasOwn(MODERATION_REASONS, data.reason)) result = { status: "not_allowed", reason: data.reason, correlationId: data.correlationId };
        else result = unavailable();
      }
    } catch { result = unavailable(); }
    if (result.status !== "ok") {
      const codes: Record<Exclude<ModerationResult["status"], "ok">, AuditFailureCode> = { invalid: "VALIDATION_FAILED", denied: "ACCESS_DENIED", not_found: "RESOURCE_NOT_FOUND", conflict: "STATE_CONFLICT", not_allowed: "VALIDATION_FAILED", unavailable: "OPERATION_FAILED" };
      // The functional request has ended/rolled back. The separate 04B service
      // derives identity again; failure recording can never turn this into success.
      try { await deps.failure({ action: `announcement.${input.operation}`, code: codes[result.status], resourceId: input.id, correlationId: result.correlationId }); }
      catch { try { deps.log("ADMIN_MODERATION_UNAVAILABLE", result.correlationId); } catch {} }
    }
    return result;
  };
}

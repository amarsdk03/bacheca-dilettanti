import "server-only";
import { auditUuid, mapAuthAuditFailure } from "../../audit/contracts";

export type ClaimsClient = {
  auth: { getClaims(): Promise<{ data: { claims: Record<string, unknown> } | null; error: unknown }> };
};
export type VerifiedClaims = { status: "verified"; authId: string; sessionId: string } |
  { status: "anonymous" | "denied" | "unavailable" };

/** Only the SDK's verified claims, never getSession().user or browser metadata.
 * Functional RPCs still authorize the current human session inside the database.
 */
export async function verifySessionClaims(client: ClaimsClient): Promise<VerifiedClaims> {
  try {
    const { data, error } = await client.auth.getClaims();
    if (error) {
      const name = typeof error === "object" && error !== null && "name" in error ? error.name : null;
      return { status: name === "AuthSessionMissingError" ? "anonymous" :
        mapAuthAuditFailure(error) === "SESSION_INVALID" || name === "AuthInvalidJwtError" ? "denied" : "unavailable" };
    }
    if (!data) return { status: "anonymous" };
    const claims = data.claims;
    const authId = auditUuid(claims.sub), sessionId = auditUuid(claims.session_id);
    const now = Date.now() / 1000;
    if (claims.role !== "authenticated" || !authId || !sessionId ||
      typeof claims.exp !== "number" || !Number.isFinite(claims.exp) || claims.exp <= now ||
      (claims.nbf !== undefined && (typeof claims.nbf !== "number" || !Number.isFinite(claims.nbf) || claims.nbf > now))) return { status: "denied" };
    return { status: "verified", authId, sessionId };
  } catch { return { status: "unavailable" }; }
}

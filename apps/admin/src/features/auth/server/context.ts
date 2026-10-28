import "server-only";

import { auditUuid } from "../../audit/contracts";
import { verifySessionClaims } from "./session-claims";

export type AdminSessionClient = {
  auth: {
    getClaims(): Promise<{ data: { claims: Record<string, unknown> } | null; error: unknown }>;
    signOut(options: { scope: "local" }): Promise<{ error: unknown }>;
  };
  rpc(name: "admin_get_context_v1"): PromiseLike<{
    data: { auth_user_uuid: string; utente_uuid: string }[] | null; error: unknown;
  }>;
};
export type AdminContext = {
  status: "admin" | "anonymous" | "denied" | "unavailable";
  client: AdminSessionClient | null;
  authId: string | null;
  userId: string | null;
  sessionId: string | null;
};

/** Verify afresh per operation. The database checks exact Admin, confirmed email,
 * session revocation and configured timeouts. This function never trusts metadata.
 */
export async function verifyAdminContext(getClient: () => Promise<AdminSessionClient>): Promise<AdminContext> {
  const result: AdminContext = { status: "anonymous", client: null, authId: null, userId: null, sessionId: null };
  try {
    result.client = await getClient();
    const claims = await verifySessionClaims(result.client);
    if (claims.status !== "verified") return { ...result, status: claims.status };
    const { authId, sessionId } = claims;
    result.authId = authId; result.sessionId = sessionId;
    const response = await result.client.rpc("admin_get_context_v1");
    if (response.error) {
      const dbError = response.error as { code?: unknown; message?: unknown };
      // A disabled/unreviewed deployment is infrastructure failure, not a wrong password.
      result.status = dbError.code === "42501" && dbError.message !== "ADMIN_SESSION_POLICY_UNVERIFIED" ? "denied" : "unavailable";
    } else if (!Array.isArray(response.data) || response.data.length !== 1 ||
      !response.data[0] || auditUuid(response.data[0].auth_user_uuid) !== authId || !auditUuid(response.data[0].utente_uuid)) {
      result.status = "unavailable";
    } else {
      result.status = "admin"; result.userId = auditUuid(response.data[0].utente_uuid);
    }
  } catch { result.status = "unavailable"; }
  return result;
}

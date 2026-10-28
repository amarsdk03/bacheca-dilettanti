import "server-only";

import { randomUUID } from "node:crypto";
import { mapAuthAuditFailure, type SessionCleanupResult } from "../../audit/contracts";
import type { createAuditService } from "../../audit/server/service";
import { readLoginCredentials, type LoginState } from "../contracts";
import type { AdminSessionClient } from "./context";

type LoginClient = AdminSessionClient & { auth: {
  signInWithPassword(credentials: { email: string; password: string }): Promise<{ error: unknown }>;
} };
type CookieSession = {
  getClient(): Promise<LoginClient>;
  commit(): void;
  clear(): void;
};
type Dependencies = {
  createSession(fresh: boolean): Promise<CookieSession>;
  auditFor(getClient: () => Promise<AdminSessionClient>): ReturnType<typeof createAuditService>;
  clearFallback(): Promise<void>;
  log(code: "ADMIN_LOGIN_UNAVAILABLE" | "ADMIN_SESSION_CLEANUP_FAILED" | "ADMIN_SESSION_REVOCATION_FAILED", correlationId: string): void;
};

/** No redirects here: framework redirects must never be caught as Auth failures. */
export function createAuthService(deps: Dependencies) {
  const log = (code: Parameters<Dependencies["log"]>[0], id: string) => {
    try { deps.log(code, id); } catch { /* Diagnostics cannot prevent cleanup. */ }
  };
  const discard = async (session: CookieSession | undefined, client: LoginClient | undefined,
    id: string): Promise<SessionCleanupResult> => {
    let revocation: SessionCleanupResult["revocation"] = "unavailable";
    let cleanup: SessionCleanupResult["cleanup"] = "cleared";
    try { if (client) revocation = (await client.auth.signOut({ scope: "local" })).error ? "failed" : "succeeded"; }
    catch { revocation = "failed"; }
    finally {
      try { if (session) session.clear(); else await deps.clearFallback(); }
      catch { cleanup = "failed"; log("ADMIN_SESSION_CLEANUP_FAILED", id); }
    }
    if (revocation !== "succeeded") log("ADMIN_SESSION_REVOCATION_FAILED", id);
    return { revocation, cleanup };
  };

  return {
    async login(form: FormData): Promise<LoginState | { status: "authenticated" }> {
      const credentials = readLoginCredentials(form);
      if (!credentials.valid) return { status: "invalid", fieldErrors: credentials.fieldErrors };
      let session: CookieSession | undefined, client: LoginClient | undefined;
      let correlationId: string = randomUUID();
      try {
        session = await deps.createSession(true);
        client = await session.getClient();
        const audit = deps.auditFor(session.getClient);
        const { error } = await client.auth.signInWithPassword({ email: credentials.email, password: credentials.password });
        if (error) {
          const code = mapAuthAuditFailure(error);
          await audit.recordAuthFailure({ action: "auth.login", code, correlationId });
          const cleanup = await discard(session, client, correlationId);
          return { status: code === "AUTH_UNAVAILABLE" ? "unavailable" : "invalid", correlationId, ...cleanup };
        }
        const result = await audit.recordLoginSuccess(session.clear);
        correlationId = result.correlationId;
        if (result.status !== "recorded") return { status: result.status, correlationId, revocation: result.revocation, cleanup: result.cleanup };
        // The browser receives the session only after verification and durable audit.
        session.commit();
        return { status: "authenticated" };
      } catch {
        const cleanup = await discard(session, client, correlationId);
        log("ADMIN_LOGIN_UNAVAILABLE", correlationId);
        // The original failure stays an access denial even if diagnostics fail too.
        try {
          const getClient = async () => {
            if (!client) throw new Error("ADMIN_SESSION_UNAVAILABLE");
            return client;
          };
          await deps.auditFor(getClient).recordAuthFailure({ action: "auth.login", code: "AUTH_UNAVAILABLE", correlationId });
        } catch { /* The audit service normally returns unavailable without throwing. */ }
        return { status: "unavailable", correlationId, ...cleanup };
      }
    },
    async logout() {
      let session: CookieSession | undefined;
      // Configuration is deliberately loaded later by the audit service, after
      // cookie storage exists. Missing key/config must not prevent local expiry.
      try { session = await deps.createSession(false); } catch { /* Use fallback. */ }
      const getClient = async () => {
        if (!session) throw new Error("ADMIN_SESSION_UNAVAILABLE");
        return session.getClient();
      };
      return deps.auditFor(getClient).logoutWithAudit(async () => {
        if (session) session.clear(); else await deps.clearFallback();
      });
    },
  };
}

import "server-only";

import { clearAdminCookies, createCookieSession } from "@/lib/supabase/server";
import { createAdminAuditService } from "../../audit/server";
import { createAuthService } from "./service";

export function createAdminAuthService() {
  return createAuthService({
    createSession: createCookieSession,
    auditFor: createAdminAuditService,
    clearFallback: clearAdminCookies,
    log: (code, correlationId) => console.error("[admin-auth]", { code, correlationId }),
  });
}

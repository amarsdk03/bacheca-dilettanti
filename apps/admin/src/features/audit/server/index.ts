import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AdminSessionClient } from "../../auth/server/context";
import { createAuditService } from "./service";
import { writeServerAudit } from "./transport";

/** Construct per server operation, not at module scope. No browser entrypoint. */
export function createAdminAuditService(getSessionClient: () => Promise<AdminSessionClient> = createClient) {
  return createAuditService({
    getSessionClient,
    writeEvent: writeServerAudit,
    log: (code, correlationId) => console.error("[admin-audit]", { code, correlationId }),
  });
}

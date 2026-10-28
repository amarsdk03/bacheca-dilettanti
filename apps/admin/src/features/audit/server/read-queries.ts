import "server-only";
import { createReadClient } from "@/lib/supabase/server";
import { createAuditQueries } from "./read-service";
export const listAdminAuditEvents = (input: unknown) => createAuditQueries({ getClient: createReadClient,
  log: (code, correlationId) => console.error("[admin-audit-read]", { code, correlationId }) }).list(input);

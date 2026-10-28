import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuditListResult, AuditDetailResult } from "../read-contracts";
import { parseAuditUrl } from "../read-url";
import { createAuditQueries } from "./read-service";
export function createAuditHttp(queries: ReturnType<typeof createAuditQueries>) {
  const response = (result: AuditListResult | AuditDetailResult) => Response.json(result, {
    status: { ok: 200, invalid: 400, denied: 403, not_found: 404, unavailable: 503 }[result.status],
    headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Pragma: "no-cache", Expires: "0", Vary: "Cookie" },
  });
  return {
    async list(request: Request) {
      const q = parseAuditUrl(new URL(request.url).search);
      return response(q.valid ? await queries.list({ ...q.filters, cursor: q.cursor, limit: 30 }) : { status: "invalid", code: "INVALID_QUERY" });
    },
    async detail(id: string) { return response(await queries.detail(id)); },
  };
}
export function auditHttp() {
  return createAuditHttp(createAuditQueries({ getClient: createClient, log: (code, correlationId) => console.error("[admin-audit-read]", { code, correlationId }) }));
}

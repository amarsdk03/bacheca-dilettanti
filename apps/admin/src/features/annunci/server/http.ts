import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AnnouncementDetailResult, AnnouncementListResult } from "../contracts";
import { parseAnnunciUrl } from "../url-state";
import { createAnnouncementQueries } from "./service";

export function createAnnouncementHttp(queries: Pick<ReturnType<typeof createAnnouncementQueries>, "list" | "detail">) {
  const response = (result: AnnouncementListResult | AnnouncementDetailResult) => Response.json(result, {
    status: { ok: 200, invalid: 400, denied: 403, not_found: 404, unavailable: 503 }[result.status],
    headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Pragma: "no-cache", Expires: "0", Vary: "Cookie" },
  });
  return {
    async list(request: Request) {
      const query = parseAnnunciUrl(new URL(request.url).search);
      const result: AnnouncementListResult = query.valid ? await queries.list({ ...query.filters, cursor: query.cursor, limit: 30 }) : { status: "invalid", code: "INVALID_QUERY" };
      return response(result);
    },
    async detail(id: string) { return response(await queries.detail(id)); },
  };
}

export function announcementHttp() {
  // Functional RPCs authorize the current operator themselves; no context RPC.
  return createAnnouncementHttp(createAnnouncementQueries({ getClient: createClient,
    log: (code, correlationId) => console.error("[admin-announcements]", { code, correlationId }) }));
}

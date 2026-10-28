import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { HomeActivityResult, HomeChartResult, HomeFailure, HomeSummaryResult } from "../contracts";
import { createHomeQueries } from "./service";
export function createHomeHttp(queries: ReturnType<typeof createHomeQueries>) {
  const response = (result: HomeActivityResult | HomeChartResult | HomeSummaryResult) => Response.json(result, {
    status: { ok: 200, invalid: 400, denied: 403, unavailable: 503 }[result.status],
    headers: { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Pragma: "no-cache", Expires: "0", Vary: "Cookie" },
  });
  const invalid: HomeFailure = { status: "invalid", code: "INVALID_QUERY" };
  return {
    async summary(request: Request) { return response(new URL(request.url).search ? invalid : await queries.summary()); },
    async activity(request: Request) { return response(new URL(request.url).search ? invalid : await queries.activity()); },
    async chart(request: Request) {
      const params = new URL(request.url).searchParams;
      if (params.size !== 1 || params.getAll("metric").length !== 1) return response(invalid);
      return response(await queries.chart(params.get("metric")));
    },
  };
}
export function homeHttp() {
  return createHomeHttp(createHomeQueries({ getClient: createClient, log: (code, correlationId) => console.error("[admin-home]", { code, correlationId }) }));
}

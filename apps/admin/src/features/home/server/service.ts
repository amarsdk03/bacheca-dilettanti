import "server-only";
import { randomUUID } from "node:crypto";
import type { Json } from "@bacheca/database";
import { verifySessionClaims, type ClaimsClient } from "../../auth/server/session-claims";
import { createAuditQueries } from "../../audit/server/read-service";
import type { HomeActivityResult, HomeChartResult, HomeFailure, HomeSummaryResult } from "../contracts";
import { homeMetric } from "../validation";
import { parseHomeChart, parseHomeSummary } from "./response";
type Client = ClaimsClient & {
  rpc(name: "admin_get_home_summary_v1" | "admin_get_home_chart_v1" | "admin_list_audit_events_v1" | "admin_get_audit_event_v1",
    args: Record<string, never> | { p_metric: string } | { p_query: Json } | { p_id: string }): PromiseLike<{ data: unknown; error: unknown }>;
};
export function createHomeQueries(deps: { getClient(): Promise<Client>; log(code: "ADMIN_HOME_UNAVAILABLE", correlationId: string): void }) {
  const log = (correlationId: string) => { try { deps.log("ADMIN_HOME_UNAVAILABLE", correlationId); } catch { /* Diagnostics cannot affect access. */ } };
  const unavailable = (): HomeFailure => { const correlationId = randomUUID(); log(correlationId); return { status: "unavailable", code: "HOME_UNAVAILABLE", correlationId }; };
  const run = async <T extends HomeSummaryResult | HomeChartResult>(name: "admin_get_home_summary_v1" | "admin_get_home_chart_v1", args: Record<string, never> | { p_metric: string }, parse: (data: unknown) => T): Promise<T | HomeFailure> => {
    try {
      const client = await deps.getClient(), claims = await verifySessionClaims(client);
      if (claims.status !== "verified") return claims.status === "unavailable" ? unavailable() : { status: "denied", code: "ACCESS_DENIED" };
      const { data, error } = await client.rpc(name, args);
      if (error) {
        const e = error as { code?: unknown; message?: unknown };
        if (e.code === "42501" && e.message !== "ADMIN_SESSION_POLICY_UNVERIFIED") return { status: "denied", code: "ACCESS_DENIED" };
        if (e.code === "22023") return { status: "invalid", code: name === "admin_get_home_chart_v1" ? "INVALID_METRIC" : "INVALID_QUERY" };
        return unavailable();
      }
      return parse(data);
    } catch { return unavailable(); }
  };
  return {
    async summary(): Promise<HomeSummaryResult> { return run("admin_get_home_summary_v1", {}, data => ({ status: "ok", summary: parseHomeSummary(data) })); },
    async chart(metric: unknown): Promise<HomeChartResult> {
      if (!homeMetric(metric)) return { status: "invalid", code: "INVALID_METRIC" };
      return run("admin_get_home_chart_v1", { p_metric: metric }, data => ({ status: "ok", chart: parseHomeChart(data, metric) }));
    },
    async activity(): Promise<HomeActivityResult> {
      return createAuditQueries({ getClient: deps.getClient, log: (_code, correlationId) => log(correlationId) }).list({ limit: 5 });
    },
  };
}

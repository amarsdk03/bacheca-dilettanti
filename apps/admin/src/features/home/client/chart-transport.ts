import type { HomeChartResult, HomeMetric } from "../contracts";
import { parseHomeChart } from "../response-validation";
import { record } from "../../annunci/validation";

export async function readHomeChart(metric: HomeMetric, signal: AbortSignal): Promise<HomeChartResult> {
  const response = await fetch(`/api/home/charts?metric=${metric}`, { signal, cache: "no-store", credentials: "same-origin", redirect: "error", headers: { Accept: "application/json" } });
  if (response.status === 403) return { status: "denied", code: "ACCESS_DENIED" };
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("HOME_UNAVAILABLE");
  const value: unknown = await response.json();
  if (!record(value)) throw new Error("HOME_UNAVAILABLE");
  if (response.status === 200 && value.status === "ok") return { status: "ok", chart: parseHomeChart(value.chart, metric) };
  if (response.status === 503 && value.status === "unavailable" && value.code === "HOME_UNAVAILABLE" && typeof value.correlationId === "string")
    return { status: "unavailable", code: "HOME_UNAVAILABLE", correlationId: value.correlationId };
  throw new Error("HOME_UNAVAILABLE");
}

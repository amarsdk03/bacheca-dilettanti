import type { HomeActivityResult, HomeSummaryResult } from "../contracts";
import { databaseTimestamp, record } from "../../annunci/validation";
async function read<T extends HomeActivityResult | HomeSummaryResult>(href: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(href, { signal, cache: "no-store", credentials: "same-origin", redirect: "error", headers: { Accept: "application/json" } });
  if (response.status === 403) return { status: "denied", code: "ACCESS_DENIED" } as T;
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("HOME_UNAVAILABLE");
  const value: unknown = await response.json();
  const expected: Record<string, number> = { ok: 200, invalid: 400, denied: 403, unavailable: 503 };
  if (!value || typeof value !== "object" || !("status" in value) || typeof value.status !== "string" || expected[value.status] !== response.status) throw new Error("HOME_UNAVAILABLE");
  if (value.status === "ok" && href.endsWith("summary")) {
    const summary = "summary" in value ? value.summary : null;
    if (!record(summary) || !databaseTimestamp(summary.asOf) || ![summary.users, summary.announcements, summary.pending].every(n => typeof n === "number" && Number.isSafeInteger(n) && n >= 0) ||
      (summary.pending as number) > (summary.announcements as number) || !record(summary.profits) || summary.profits.available !== false) throw new Error("HOME_UNAVAILABLE");
  }
  // A malformed activity response must never turn Home into a full audit list.
  if (value.status === "ok" && href.endsWith("activity") && (!("page" in value) || !value.page || typeof value.page !== "object" || !("items" in value.page) || !Array.isArray(value.page.items) || value.page.items.length > 5)) throw new Error("HOME_UNAVAILABLE");
  return value as T;
}
export const homeTransport = {
  summary: (signal: AbortSignal) => read<HomeSummaryResult>("/api/home/summary", signal),
  activity: (signal: AbortSignal) => read<HomeActivityResult>("/api/home/activity", signal),
};

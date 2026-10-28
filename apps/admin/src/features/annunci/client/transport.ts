import type { AnnouncementDetailResult, AnnouncementListResult } from "../contracts";
import type { AnnunciUrl } from "../url-state";

type Result = AnnouncementListResult | AnnouncementDetailResult;
async function read<T extends Result>(href: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(href, { signal, cache: "no-store", credentials: "same-origin", headers: { Accept: "application/json" } });
  if (response.status === 403) return { status: "denied", code: "ACCESS_DENIED" } as T;
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("ANNOUNCEMENTS_UNAVAILABLE");
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || !("status" in value)) throw new Error("ANNOUNCEMENTS_UNAVAILABLE");
  const expected: Record<string, number> = { ok: 200, invalid: 400, denied: 403, not_found: 404, unavailable: 503 };
  if (typeof value.status !== "string" || expected[value.status] !== response.status) throw new Error("ANNOUNCEMENTS_UNAVAILABLE");
  return value as T;
}

export const announcementTransport = {
  list: (query: AnnunciUrl, signal: AbortSignal) => read<AnnouncementListResult>("/api" + query.href, signal),
  detail: (id: string, signal: AbortSignal) => read<AnnouncementDetailResult>("/api/annunci/" + encodeURIComponent(id), signal),
};

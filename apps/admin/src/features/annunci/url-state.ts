import type { AnnouncementFilters } from "./contracts";
import { normalizeFilters } from "./validation";

export const DEFAULT_ANNUNCI_FILTERS: AnnouncementFilters = { search: "", status: null, type: null, visibility: "all", trash: "exclude" };
export type AnnunciUrl = { valid: boolean; filters: AnnouncementFilters; cursor: string | null; key: string; href: string };
const keys = ["search", "status", "type", "visibility", "trash", "cursor"];

export function annunciHref(filters: AnnouncementFilters, cursor: string | null = null) {
  const normalized = normalizeFilters(filters);
  const params = new URLSearchParams();
  if (normalized.search) params.set("search", normalized.search);
  if (normalized.status) params.set("status", normalized.status);
  if (normalized.type) params.set("type", normalized.type);
  if (normalized.visibility !== "all") params.set("visibility", normalized.visibility);
  if (normalized.trash !== "exclude") params.set("trash", normalized.trash);
  if (cursor) params.set("cursor", cursor);
  return "/annunci" + (params.size ? "?" + params.toString() : "");
}

/** Shared URL adapter. The server still decodes/binds cursors through 07A. */
export function parseAnnunciUrl(search: string): AnnunciUrl {
  const params = new URLSearchParams(search);
  try {
    if ([...params.keys()].some((key) => !keys.includes(key) || params.getAll(key).length !== 1)) throw new Error("INVALID_QUERY");
    const raw = Object.fromEntries(params);
    const filters = normalizeFilters(raw);
    const cursor = raw.cursor ?? null;
    if (cursor !== null && (!/^[A-Za-z0-9_-]+$/.test(cursor) || cursor.length > 4096)) throw new Error("INVALID_QUERY");
    return { valid: true, filters, cursor, key: JSON.stringify({ ...filters, cursor }), href: annunciHref(filters, cursor) };
  } catch {
    return { valid: false, filters: { ...DEFAULT_ANNUNCI_FILTERS }, cursor: null, key: "invalid:" + params.toString(), href: "/annunci" + (params.size ? "?" + params.toString() : "") };
  }
}

export function annunciSearchParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) for (const item of value) params.append(key, item);
    else if (value !== undefined) params.append(key, value);
  }
  return params.toString();
}

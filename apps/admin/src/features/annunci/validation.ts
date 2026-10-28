import { ADMIN_ANNOUNCEMENT_TRASH, ADMIN_ANNOUNCEMENT_STATUSES, ADMIN_ANNOUNCEMENT_TYPES, ADMIN_ANNOUNCEMENT_VISIBILITY,
  type AnnouncementCursor, type AnnouncementFilters } from "./contracts";

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
export function canonicalUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);
}
export function databaseTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value)) return false;
  // Do not round-trip the cursor through Date: PostgreSQL keeps microseconds.
  const parsed = new Date(value.slice(0, 23) + "Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 23) === value.slice(0, 23);
}
export function normalizeFilters(input: Record<string, unknown>): AnnouncementFilters {
  const searchInput = input.search ?? "";
  if (typeof searchInput !== "string") throw new Error("INVALID_QUERY");
  let search = searchInput.trim();
  if ([...search].length > 200) throw new Error("INVALID_QUERY");
  if (/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(search)) search = search.toLowerCase();
  const trash = input.trash ?? "exclude";
  const status = input.status ?? null, type = input.type ?? null, visibility = input.visibility ?? "all";
  if (!ADMIN_ANNOUNCEMENT_TRASH.some((value) => value === trash) || (status !== null && !ADMIN_ANNOUNCEMENT_STATUSES.some((value) => value === status)) ||
    (type !== null && !ADMIN_ANNOUNCEMENT_TYPES.some((value) => value === type)) ||
    !ADMIN_ANNOUNCEMENT_VISIBILITY.some((value) => value === visibility)) throw new Error("INVALID_QUERY");
  return { search, status, type, visibility, trash } as AnnouncementFilters;
}
export function validCursor(value: unknown, filters: AnnouncementFilters): value is AnnouncementCursor {
  return record(value) && exactKeys(value, ["v", "id", "createdAt", "filters"]) && value.v === 2 && canonicalUuid(value.id) &&
    (value.createdAt === null || databaseTimestamp(value.createdAt)) && record(value.filters) &&
    exactKeys(value.filters, ["search", "status", "type", "visibility", "trash"]) &&
    Object.entries(filters).every(([key, expected]) => (value.filters as Record<string, unknown>)[key] === expected);
}

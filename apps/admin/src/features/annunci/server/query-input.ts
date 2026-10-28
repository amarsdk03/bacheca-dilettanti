import "server-only";
import { Buffer } from "node:buffer";
import type { AnnouncementCursor, AnnouncementListQuery } from "../contracts";
import { normalizeFilters, record, validCursor } from "../validation";

export function parseListQuery(input: unknown): AnnouncementListQuery {
  if (!record(input) || Object.keys(input).some((key) => !["search", "status", "type", "visibility", "trash", "limit", "cursor"].includes(key))) throw new Error("INVALID_QUERY");
  // Null is meaningful only for the nullable selectors/cursor, never search/visibility.
  if (input.search === null || input.visibility === null || input.trash === null) throw new Error("INVALID_QUERY");
  const filters = normalizeFilters(input);
  const limit = input.limit === undefined ? 30 : input.limit;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error("INVALID_QUERY");
  let cursor: AnnouncementCursor | null = null;
  if (input.cursor != null) {
    if (typeof input.cursor !== "string" || input.cursor.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(input.cursor)) throw new Error("INVALID_QUERY");
    const bytes = Buffer.from(input.cursor, "base64url");
    if (bytes.toString("base64url") !== input.cursor) throw new Error("INVALID_QUERY");
    const parsed: unknown = JSON.parse(bytes.toString("utf8"));
    if (!validCursor(parsed, filters)) throw new Error("INVALID_QUERY");
    cursor = parsed;
  }
  return { filters, limit, cursor };
}
export function encodeListCursor(cursor: AnnouncementCursor) {
  const token = Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
  if (token.length > 4096) throw new Error("ADMIN_ANNOUNCEMENT_RESPONSE_INVALID");
  return token;
}

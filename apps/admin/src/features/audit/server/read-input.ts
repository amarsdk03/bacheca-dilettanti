import "server-only";
import { Buffer } from "node:buffer";
import type { AuditCursor, AuditQuery } from "../read-contracts";
import { FILTER_KEYS, normalizeAuditFilters, record, validAuditCursor } from "../read-validation";
export function encodeAuditCursor(cursor: AuditCursor) { return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url"); }
export function parseAuditQuery(input: unknown): AuditQuery {
  if (!record(input) || Object.keys(input).some(k => ![...FILTER_KEYS, "limit", "cursor"].includes(k))) throw new Error("INVALID_QUERY");
  const filters = normalizeAuditFilters(input), limit = input.limit === undefined ? 30 : input.limit;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error("INVALID_QUERY");
  let cursor: AuditCursor | null = null;
  if (input.cursor != null) {
    if (typeof input.cursor !== "string" || input.cursor.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(input.cursor)) throw new Error("INVALID_QUERY");
    const bytes = Buffer.from(input.cursor, "base64url");
    if (bytes.toString("base64url") !== input.cursor) throw new Error("INVALID_QUERY");
    const decoded: unknown = JSON.parse(bytes.toString("utf8"));
    if (!validAuditCursor(decoded, filters)) throw new Error("INVALID_QUERY");
    cursor = decoded;
  }
  return { filters, limit, cursor };
}

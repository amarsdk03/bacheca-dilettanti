import "server-only";
import { AUDIT_FAILURE_CODES } from "../contracts";
import { AUDIT_ACTIONS, type AuditSummary, type AuditDetail, type AuditPage, type AuditQuery } from "../read-contracts";
import { canonicalUuid, databaseTimestamp, record, validAuditCursor } from "../read-validation";
import { encodeAuditCursor } from "./read-input";
function fail(): never { throw new Error("INVALID_AUDIT_RESPONSE"); }
const nullableId = (v: unknown) => v === null || canonicalUuid(v);
export function parseAuditSummary(value: unknown): AuditSummary {
  if (!record(value) || !canonicalUuid(value.id) || !databaseTimestamp(value.occurredAt) ||
    !AUDIT_ACTIONS.includes(value.action as never) || !["success", "failure"].includes(value.outcome as string) || !record(value.actor)) fail();
  const a = value.actor;
  if (!nullableId(a.authId) || !nullableId(a.userId) || !(a.email === null || typeof a.email === "string" && a.email.length <= 320) ||
    a.userId !== null && a.authId === null || a.email !== null && a.authId === null ||
    value.outcome === "success" && (!a.authId || !a.userId)) fail();
  return { id: value.id, occurredAt: value.occurredAt, action: value.action as AuditSummary["action"], outcome: value.outcome as AuditSummary["outcome"],
    actor: { authId: a.authId as string | null, userId: a.userId as string | null, email: a.email as string | null } };
}
export function parseAuditPage(value: unknown, query: AuditQuery): AuditPage {
  if (!record(value) || !Array.isArray(value.items) || value.items.length > query.limit || typeof value.hasMore !== "boolean") fail();
  const items = value.items.map(parseAuditSummary), ids = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const row = items[i], previous = items[i - 1];
    if (ids.has(row.id) || previous && (previous.occurredAt < row.occurredAt || previous.occurredAt === row.occurredAt && previous.id <= row.id)) fail();
    ids.add(row.id);
  }
  let nextCursor: string | null = null;
  if (value.hasMore) {
    const last = items.at(-1);
    if (!last || items.length !== query.limit || !validAuditCursor(value.nextCursor, query.filters) ||
      value.nextCursor.id !== last.id || value.nextCursor.occurredAt !== last.occurredAt) fail();
    nextCursor = encodeAuditCursor(value.nextCursor);
  } else if (value.nextCursor !== null) fail();
  return { items, hasMore: value.hasMore, nextCursor };
}
export function parseAuditDetail(value: unknown, id: string): AuditDetail {
  const summary = parseAuditSummary(value);
  if (!record(value) || summary.id !== id || !canonicalUuid(value.correlationId) || !nullableId(value.resourceId) ||
    !["session", "announcement", "announcement_export"].includes(value.resourceType as string) ||
    !(value.reason === null || typeof value.reason === "string" && [...value.reason].length <= 1000) ||
    !(value.failureCode === null || AUDIT_FAILURE_CODES.includes(value.failureCode as never)) || !record(value.changes)) fail();
  const changes: AuditDetail["changes"] = {};
  for (const key of ["status", "hidden", "trashed"] as const) {
    if (value.changes[key] === undefined) continue;
    const c = value.changes[key];
    const valid = (v: unknown, nullable: boolean) => (nullable && v === null) || (key === "status" ? typeof v === "string" && v.length <= 120 : typeof v === "boolean");
    if (!record(c) || !valid(c.before, true) || !valid(c.after, false)) fail();
    changes[key] = { before: c.before as string | boolean | null, after: c.after as string | boolean };
  }
  let exported: AuditDetail["export"] = null;
  if (value.export !== null) {
    const e = value.export;
    if (summary.action !== "announcement.export" || summary.outcome !== "success" || !record(e) ||
      typeof e.rowCount !== "number" || !Number.isInteger(e.rowCount) || e.rowCount < 0 || e.rowCount > 30 ||
      !(e.columns === null || Array.isArray(e.columns) && e.columns.length > 0 && e.columns.length <= 6 &&
        e.columns.every(c => ["title", "author", "type", "status", "visibility", "created_at"].includes(c))) ||
      !(e.announcementIds === null || Array.isArray(e.announcementIds) && e.announcementIds.length === e.rowCount &&
        e.announcementIds.every(canonicalUuid) && new Set(e.announcementIds).size === e.announcementIds.length)) fail();
    exported = { rowCount: e.rowCount, columns: e.columns as string[] | null, announcementIds: e.announcementIds as string[] | null };
  } else if (summary.action === "announcement.export" && summary.outcome === "success") fail();
  return { ...summary, resourceType: value.resourceType as AuditDetail["resourceType"], resourceId: value.resourceId as string | null,
    correlationId: value.correlationId, reason: value.reason as string | null, failureCode: value.failureCode as string | null, changes, export: exported };
}

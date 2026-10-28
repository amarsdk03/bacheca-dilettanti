import { canonicalUuid, databaseTimestamp, record } from "../annunci/validation";
import { AUDIT_ACTIONS, type AuditCursor, type AuditFilters } from "./read-contracts";
export { canonicalUuid, databaseTimestamp, record };

export const DEFAULT_AUDIT_FILTERS: AuditFilters = { from: "", to: "", operator: "", action: "", outcome: "" };
export const FILTER_KEYS = ["from", "to", "operator", "action", "outcome"];
function date(value: string) {
  return value === "" || (/^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "0001-01-01" &&
    Number.isFinite(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value);
}
export function normalizeAuditFilters(value: unknown): AuditFilters {
  if (!record(value)) throw new Error("INVALID_QUERY");
  const f = { ...DEFAULT_AUDIT_FILTERS };
  for (const key of FILTER_KEYS as (keyof AuditFilters)[]) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== "string") throw new Error("INVALID_QUERY");
      Object.assign(f, { [key]: value[key] });
    }
  }
  f.operator = f.operator.trim().toLowerCase();
  if (!date(f.from) || !date(f.to) || (f.from && f.to && f.from > f.to) ||
    (f.operator && f.operator !== "unknown" && !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(f.operator) &&
      (f.operator.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.operator))) ||
    (f.action !== "" && !AUDIT_ACTIONS.includes(f.action)) || !["", "success", "failure"].includes(f.outcome)) throw new Error("INVALID_QUERY");
  return f;
}
export function validAuditCursor(value: unknown, filters: AuditFilters): value is AuditCursor {
  if (!record(value) || Object.keys(value).length !== 4 || value.v !== 1 || !canonicalUuid(value.id) || !databaseTimestamp(value.occurredAt) || !record(value.filters) ||
    Object.keys(value.filters).length !== FILTER_KEYS.length) return false;
  try { return FILTER_KEYS.every(k => (value.filters as Record<string, unknown>)[k] === filters[k as keyof AuditFilters]); } catch { return false; }
}

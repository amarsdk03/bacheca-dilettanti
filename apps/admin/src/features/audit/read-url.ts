import type { AuditFilters } from "./read-contracts";
import { DEFAULT_AUDIT_FILTERS, FILTER_KEYS, normalizeAuditFilters } from "./read-validation";
export type AuditUrl = { valid: boolean; filters: AuditFilters; cursor: string | null; href: string; key: string };
export function auditHref(filters: AuditFilters, cursor: string | null = null) {
  const normalized = normalizeAuditFilters(filters), params = new URLSearchParams();
  for (const key of FILTER_KEYS as (keyof AuditFilters)[]) if (normalized[key]) params.set(key, normalized[key]);
  if (cursor) params.set("cursor", cursor);
  return "/registro-attivita" + (params.size ? "?" + params.toString() : "");
}
export function parseAuditUrl(search: string): AuditUrl {
  const params = new URLSearchParams(search);
  try {
    if ([...params.keys()].some(k => ![...FILTER_KEYS, "cursor"].includes(k) || params.getAll(k).length !== 1)) throw new Error("INVALID_QUERY");
    const raw = Object.fromEntries(params), filters = normalizeAuditFilters(raw), cursor = raw.cursor ?? null;
    if (cursor !== null && (!/^[A-Za-z0-9_-]+$/.test(cursor) || cursor.length > 4096)) throw new Error("INVALID_QUERY");
    return { valid: true, filters, cursor, href: auditHref(filters, cursor), key: JSON.stringify({ ...filters, cursor }) };
  } catch { return { valid: false, filters: { ...DEFAULT_AUDIT_FILTERS }, cursor: null, href: "/registro-attivita?" + params.toString(), key: "invalid:" + params.toString() }; }
}
export function auditSearchParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) for (const item of value) params.append(key, item);
    else if (value !== undefined) params.append(key, value);
  }
  return params.toString();
}

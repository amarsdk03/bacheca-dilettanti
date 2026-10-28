import type { AuditListResult, AuditDetailResult } from "../read-contracts";
import type { AuditUrl } from "../read-url";
async function read<T extends AuditListResult | AuditDetailResult>(href: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(href, { signal, cache: "no-store", credentials: "same-origin", headers: { Accept: "application/json" } });
  if (response.status === 403) return { status: "denied", code: "ACCESS_DENIED" } as T;
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("AUDIT_UNAVAILABLE");
  const value: unknown = await response.json();
  const expected: Record<string, number> = { ok: 200, invalid: 400, denied: 403, not_found: 404, unavailable: 503 };
  if (!value || typeof value !== "object" || !("status" in value) || typeof value.status !== "string" || expected[value.status] !== response.status) throw new Error("AUDIT_UNAVAILABLE");
  return value as T;
}
export const auditTransport = {
  list: (q: AuditUrl, signal: AbortSignal) => read<AuditListResult>("/api" + q.href, signal),
  detail: (id: string, signal: AbortSignal) => read<AuditDetailResult>("/api/registro-attivita/" + encodeURIComponent(id), signal),
};

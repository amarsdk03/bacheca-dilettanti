import "server-only";
import { randomUUID } from "node:crypto";
import type { Json } from "@bacheca/database";
import { verifySessionClaims, type ClaimsClient } from "../../auth/server/session-claims";
import type { AuditDetailResult, AuditFailure, AuditListResult } from "../read-contracts";
import { canonicalUuid } from "../read-validation";
import { parseAuditQuery } from "./read-input";
import { parseAuditDetail, parseAuditPage } from "./read-response";
type Client = ClaimsClient & { rpc(name: "admin_list_audit_events_v1" | "admin_get_audit_event_v1", args: { p_query: Json } | { p_id: string }): PromiseLike<{ data: unknown; error: unknown }> };
export function createAuditQueries(deps: { getClient(): Promise<Client>; log(code: "ADMIN_AUDIT_READ_UNAVAILABLE", correlationId: string): void }) {
  const unavailable = (): AuditFailure => {
    const correlationId = randomUUID();
    try { deps.log("ADMIN_AUDIT_READ_UNAVAILABLE", correlationId); } catch { /* Diagnostics never grant access. */ }
    return { status: "unavailable", code: "AUDIT_UNAVAILABLE", correlationId };
  };
  const run = async <T extends AuditListResult | AuditDetailResult>(name: Parameters<Client["rpc"]>[0], args: Parameters<Client["rpc"]>[1], parse: (value: unknown) => T): Promise<T | AuditFailure> => {
    try {
      const client = await deps.getClient(), claims = await verifySessionClaims(client);
      if (claims.status !== "verified") return claims.status === "unavailable" ? unavailable() : { status: "denied", code: "ACCESS_DENIED" };
      const { data, error } = await client.rpc(name, args);
      if (error) {
        const e = error as { code?: unknown; message?: unknown };
        if (e.code === "42501" && e.message !== "ADMIN_SESSION_POLICY_UNVERIFIED") return { status: "denied", code: "ACCESS_DENIED" };
        if (e.code === "22023") return { status: "invalid", code: name === "admin_get_audit_event_v1" ? "INVALID_EVENT_ID" : "INVALID_QUERY" };
        return unavailable();
      }
      return parse(data);
    } catch { return unavailable(); }
  };
  return {
    async list(input: unknown = {}): Promise<AuditListResult> {
      let q; try { q = parseAuditQuery(input); } catch { return { status: "invalid", code: "INVALID_QUERY" }; }
      return run("admin_list_audit_events_v1", { p_query: { ...q.filters, limit: q.limit, cursor: q.cursor } }, data => ({ status: "ok", page: parseAuditPage(data, q) }));
    },
    async detail(input: unknown): Promise<AuditDetailResult> {
      const id = typeof input === "string" ? input.trim().toLowerCase() : null;
      if (!canonicalUuid(id)) return { status: "invalid", code: "INVALID_EVENT_ID" };
      return run("admin_get_audit_event_v1", { p_id: id }, data => data === null ? { status: "not_found", code: "EVENT_NOT_FOUND" } : { status: "ok", detail: parseAuditDetail(data, id) });
    },
  };
}

import "server-only";
import { randomUUID } from "node:crypto";
import type { Json } from "@bacheca/database";
import { verifySessionClaims, type ClaimsClient } from "../../auth/server/session-claims";
import type { AuditFailureCode } from "../../audit/contracts";
import { exportSelection, parseExportSelection, type ExportFailure } from "../export-contract";
import { canonicalUuid, exactKeys, record } from "../validation";
import { parseListQuery } from "./query-input";
import { parseListResponse } from "./response";
import { announcementCsv } from "./export-csv";

type Client = ClaimsClient & { rpc(name: "admin_export_announcements_v1", args: { p_query: Json; p_selection: Json }): PromiseLike<{ data: unknown; error: unknown }> };
export type ExportResult = ExportFailure | { status: "ok"; csv: string; eventId: string; correlationId: string };
export function createAnnouncementExport(deps: { getClient(): Promise<Client>;
  failure(event: { action: "announcement.export"; code: AuditFailureCode; correlationId: string }): Promise<unknown>;
  log(code: "ADMIN_EXPORT_UNAVAILABLE", correlationId: string): void }) {
  return async (raw: unknown): Promise<ExportResult> => {
    const correlationId = randomUUID();
    let query, selection;
    try {
      if (!record(raw) || !exactKeys(raw, ["query", "selection"])) throw new Error();
      query = parseListQuery(raw.query); selection = parseExportSelection(raw.selection);
      if (query.limit !== 30) throw new Error();
    } catch { return { status: "invalid", correlationId }; }
    const unavailable = (): ExportFailure => { try { deps.log("ADMIN_EXPORT_UNAVAILABLE", correlationId); } catch {} return { status: "unavailable", correlationId }; };
    let result: ExportResult;
    try {
      const client = await deps.getClient(), claims = await verifySessionClaims(client);
      if (claims.status !== "verified") result = claims.status === "unavailable" ? unavailable() : { status: "denied", correlationId };
      else {
        const { data, error } = await client.rpc("admin_export_announcements_v1", { p_query: { ...query.filters, limit: 30, cursor: query.cursor }, p_selection: selection });
        if (error) {
          const e = error as { code?: unknown; message?: unknown };
          result = e.code === "42501" && e.message !== "ADMIN_SESSION_POLICY_UNVERIFIED" ? { status: "denied", correlationId } : unavailable();
        } else if (!record(data) || !canonicalUuid(data.correlationId)) result = unavailable();
        else if (data.status === "ok" && canonicalUuid(data.eventId)) {
          const page = parseListResponse({ items: data.items, hasMore: false, nextCursor: null }, query);
          if (JSON.stringify(exportSelection(page.items)) !== JSON.stringify(selection)) throw new Error();
          result = { status: "ok", csv: announcementCsv(page.items), eventId: data.eventId, correlationId: data.correlationId };
        } else if (["invalid", "conflict", "unavailable"].includes(data.status as string)) result = { status: data.status as ExportFailure["status"], correlationId: data.correlationId };
        else result = unavailable();
      }
    } catch { result = unavailable(); }
    if (result.status !== "ok") {
      const codes: Record<ExportFailure["status"], AuditFailureCode> = { invalid: "VALIDATION_FAILED", conflict: "STATE_CONFLICT", denied: "ACCESS_DENIED", unavailable: "EXPORT_FAILED" };
      try { await deps.failure({ action: "announcement.export", code: codes[result.status], correlationId: result.correlationId }); }
      catch { try { deps.log("ADMIN_EXPORT_UNAVAILABLE", result.correlationId); } catch {} }
    }
    return result;
  };
}

import "server-only";
import {randomUUID} from "node:crypto";
import type {Json} from "@bacheca/database";
import {type ClaimsClient, verifySessionClaims} from "../../auth/server/session-claims";
import {canonicalUuid} from "../../annunci/validation";
import {type CommunityKind, type CommunityResult, parseCommunityQuery, parseCommunityPage, parseReport, parseInvitationCode, parseInvitationDetail, parseReportUpdate, parseInvitationUpdate, parseCommunityMutation} from "../contracts";

export type CommunityRpc = "admin_list_reports_v1" | "admin_get_report_v1" | "admin_update_report_v1" | "admin_list_invitation_codes_v1" | "admin_get_invitation_code_v1" | "admin_consider_invitation_v1";
type Client = ClaimsClient & {rpc(name: CommunityRpc, args: Record<string, Json>): PromiseLike<{data: unknown; error: unknown}>};
export function createCommunityService(deps: {getClient(): Promise<Client>; log(code: string, correlationId: string): void;
  failure?(input: {action: "report.update" | "invitation.consider"; code: "VALIDATION_FAILED" | "ACCESS_DENIED" | "RESOURCE_NOT_FOUND" | "STATE_CONFLICT" | "OPERATION_FAILED"; resourceId: string; correlationId: string}): Promise<unknown>}) {
  async function call<T>(name: CommunityRpc, args: Record<string, Json>, parse: (data: unknown) => T, nullable = false): Promise<CommunityResult<T>> {
    const correlationId = randomUUID();
    const unavailable = (): CommunityResult<T> => {try {deps.log("ADMIN_COMMUNITY_UNAVAILABLE", correlationId);} catch {} return {status: "unavailable", correlationId};};
    try {
      const client = await deps.getClient(), claims = await verifySessionClaims(client);
      if (claims.status !== "verified") return claims.status === "unavailable" ? unavailable() : {status: "denied", correlationId};
      const {data, error} = await client.rpc(name, args);
      if (error) {
        const e = error as {code?: string; message?: string};
        if (e.code === "42501" && e.message !== "ADMIN_SESSION_POLICY_UNVERIFIED") return {status: "denied", correlationId};
        if (e.code === "22023") return {status: "invalid", correlationId};
        return unavailable();
      }
      if (nullable && data === null) return {status: "not_found", correlationId};
      return {status: "ok", data: parse(data)};
    } catch {return unavailable();}
  }
  return {
    async list(kind: CommunityKind, input: unknown) {
      let query; try {query = parseCommunityQuery(kind, input);} catch {return {status: "invalid"} as const;}
      return kind === "reports"
        ? call("admin_list_reports_v1", {p_query: query as Json}, v => parseCommunityPage(v, parseReport))
        : call("admin_list_invitation_codes_v1", {p_query: query as Json}, v => parseCommunityPage(v, parseInvitationCode));
    },
    async detail(kind: CommunityKind, id: string, input: unknown = {}) {
      if (!canonicalUuid(id)) return {status: "invalid"} as const;
      let query; try {query = parseCommunityQuery(kind, input);} catch {return {status: "invalid"} as const;}
      return kind === "reports"
        ? call("admin_get_report_v1", {p_id: id}, v => {const row = parseReport(v); if (row.id !== id) throw new Error(); return row;}, true)
        : call("admin_get_invitation_code_v1", {p_id: id, p_query: query as Json}, v => {const row = parseInvitationDetail(v); if (row.owner.id !== id) throw new Error(); return row;}, true);
    },
    async update(kind: CommunityKind, raw: unknown) {
      let input; try {input = kind === "reports" ? parseReportUpdate(raw) : parseInvitationUpdate(raw);} catch {return {status: "invalid"} as const;}
      const result = "note" in input
        ? await call("admin_update_report_v1", {p_id: input.id, p_status: input.status, p_note: input.note, p_version: input.version}, v => parseCommunityMutation(v, input.id))
        : await call("admin_consider_invitation_v1", {p_id: input.id, p_considered: input.considered, p_expected: input.expected}, v => parseCommunityMutation(v, input.id));
      const outcome = result.status === "ok" ? result.data : result;
      if (outcome.status !== "ok" && deps.failure) {
        const codes = {invalid: "VALIDATION_FAILED", denied: "ACCESS_DENIED", not_found: "RESOURCE_NOT_FOUND", conflict: "STATE_CONFLICT", unavailable: "OPERATION_FAILED"} as const;
        try {await deps.failure({action: kind === "reports" ? "report.update" : "invitation.consider", code: codes[outcome.status], resourceId: input.id, correlationId: outcome.correlationId ?? randomUUID()});} catch {}
      }
      return outcome;
    },
  };
}

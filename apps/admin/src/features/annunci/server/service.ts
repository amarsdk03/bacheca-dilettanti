import "server-only";
import { randomUUID } from "node:crypto";
import type { Json } from "@bacheca/database";
import { verifySessionClaims, type ClaimsClient } from "../../auth/server/session-claims";
import type { AnnouncementDetailResult, AnnouncementListResult } from "../contracts";
import { canonicalUuid } from "../validation";
import { parseDetailResponse } from "./detail-response";
import { parseListQuery } from "./query-input";
import { parseListResponse } from "./response";

type Client = ClaimsClient & {
  rpc(name: "admin_list_announcements_v1" | "admin_get_announcement_v1", args: { p_query: Json } | { p_id: string }): PromiseLike<{ data: unknown; error: unknown }>;
};

export function createAnnouncementQueries(deps: { getClient(): Promise<Client>; log(code: "ADMIN_ANNOUNCEMENTS_UNAVAILABLE", correlationId: string): void }) {
  return {
    async detail(input: unknown): Promise<AnnouncementDetailResult> {
      const id = typeof input === "string" ? input.trim().toLowerCase() : null;
      if (!canonicalUuid(id)) return { status: "invalid", code: "INVALID_ANNOUNCEMENT_ID" };
      const unavailable = (): AnnouncementDetailResult => {
        const correlationId = randomUUID();
        try { deps.log("ADMIN_ANNOUNCEMENTS_UNAVAILABLE", correlationId); } catch { /* Diagnostics cannot grant access. */ }
        return { status: "unavailable", code: "ANNOUNCEMENTS_UNAVAILABLE", correlationId };
      };
      try {
        const client = await deps.getClient();
        const claims = await verifySessionClaims(client);
        if (claims.status !== "verified") return claims.status === "unavailable" ? unavailable() : { status: "denied", code: "ACCESS_DENIED" };
        const { data, error } = await client.rpc("admin_get_announcement_v1", { p_id: id });
        if (error) {
          const failure = error as { code?: unknown; message?: unknown };
          if (failure.code === "42501" && failure.message !== "ADMIN_SESSION_POLICY_UNVERIFIED") return { status: "denied", code: "ACCESS_DENIED" };
          if (failure.code === "22023") return { status: "invalid", code: "INVALID_ANNOUNCEMENT_ID" };
          return unavailable();
        }
        return data === null ? { status: "not_found", code: "ANNOUNCEMENT_NOT_FOUND" } : { status: "ok", detail: parseDetailResponse(data, id) };
      } catch { return unavailable(); }
    },
    async list(input: unknown = {}): Promise<AnnouncementListResult> {
      let query;
      try { query = parseListQuery(input); } catch { return { status: "invalid", code: "INVALID_QUERY" }; }
      const unavailable = (): AnnouncementListResult => {
        const correlationId = randomUUID();
        try { deps.log("ADMIN_ANNOUNCEMENTS_UNAVAILABLE", correlationId); } catch { /* Diagnostics cannot change authorization. */ }
        return { status: "unavailable", code: "ANNOUNCEMENTS_UNAVAILABLE", correlationId };
      };
      try {
        const client = await deps.getClient();
        const claims = await verifySessionClaims(client);
        if (claims.status !== "verified") return claims.status === "unavailable" ? unavailable() : { status: "denied", code: "ACCESS_DENIED" };
        const { data, error } = await client.rpc("admin_list_announcements_v1", {
          p_query: { ...query.filters, limit: query.limit, cursor: query.cursor },
        });
        if (error) {
          const failure = error as { code?: unknown; message?: unknown };
          if (failure.code === "42501" && failure.message !== "ADMIN_SESSION_POLICY_UNVERIFIED") return { status: "denied", code: "ACCESS_DENIED" };
          if (failure.code === "22023") return { status: "invalid", code: "INVALID_QUERY" };
          return unavailable();
        }
        return { status: "ok", page: parseListResponse(data, query) };
      } catch { return unavailable(); }
    },
  };
}

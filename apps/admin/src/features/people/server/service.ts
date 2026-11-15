import "server-only";
import {randomUUID} from "node:crypto";
import type {Json} from "@bacheca/database";
import {type ClaimsClient, verifySessionClaims} from "../../auth/server/session-claims";
import {canonicalUuid} from "../../annunci/validation";
import type {CommunityResult} from "../../community/contracts";
import {type PeopleKind, parsePeopleQuery, parsePeoplePage, parseUser, parseProfile, parseUserDetail, parseProfileDetail, profileType, parseProfileMutation, parsePeopleMutation} from "../contracts";

export type PeopleRpc = "admin_list_users_v1" | "admin_get_user_v1" | "admin_list_profiles_v1" | "admin_get_profile_v1" | "admin_moderate_profile_v1";
type Client = ClaimsClient & {rpc(name: PeopleRpc, args: Record<string, Json>): PromiseLike<{data: unknown; error: unknown}>};
export function createPeopleService(deps: {getClient(): Promise<Client>; log(code: string, correlationId: string): void; failure?(input: {action: "profile.verify" | "profile.unverify" | "profile.hide" | "profile.show"; code: "VALIDATION_FAILED" | "ACCESS_DENIED" | "RESOURCE_NOT_FOUND" | "STATE_CONFLICT" | "OPERATION_FAILED"; resourceId: string; correlationId: string}): Promise<unknown>}) {
  async function call<T>(name: PeopleRpc, args: Record<string, Json>, parse: (v: unknown) => T, nullable = false): Promise<CommunityResult<T>> {
    const correlationId = randomUUID();
    const unavailable = (): CommunityResult<T> => {try {deps.log("ADMIN_PEOPLE_UNAVAILABLE", correlationId);} catch {} return {status: "unavailable", correlationId};};
    try {
      const client = await deps.getClient(), claims = await verifySessionClaims(client);
      if (claims.status !== "verified") return claims.status === "unavailable" ? unavailable() : {status: "denied", correlationId};
      const {data, error} = await client.rpc(name, args);
      if (error) {
        const e = error as {code?: string; message?: string};
        if (e.code === "42501" && e.message !== "ADMIN_SESSION_POLICY_UNVERIFIED") return {status: "denied", correlationId};
        if (e.code === "22023") return {status: "invalid", correlationId};
        if (["55P03", "40P01", "40001"].includes(e.code ?? "")) return {status: "conflict", correlationId};
        return unavailable();
      }
      if (nullable && data === null) return {status: "not_found", correlationId};
      return {status: "ok", data: parse(data)};
    } catch {return unavailable();}
  }
  return {
    async list(kind: PeopleKind, raw: unknown) {
      let q; try {q = parsePeopleQuery(kind, raw);} catch {return {status: "invalid"} as const;}
      return kind === "users" ? call("admin_list_users_v1", {p_query: q as Json}, v => parsePeoplePage(v, parseUser)) : call("admin_list_profiles_v1", {p_query: q as Json}, v => parsePeoplePage(v, parseProfile));
    },
    async detail(kind: PeopleKind, id: string, type?: string) {
      if (!canonicalUuid(id)) return {status: "invalid"} as const;
      if (kind === "users") return call("admin_get_user_v1", {p_id: id}, v => {const d = parseUserDetail(v); if (d.id !== id) throw Error(); return d;}, true);
      let t; try {t = profileType(type);} catch {return {status: "invalid"} as const;}
      return call("admin_get_profile_v1", {p_id: id, p_type: t}, v => {const d = parseProfileDetail(v); if (d.profileId !== id || d.type !== t) throw Error(); return d;}, true);
    },
    async moderate(raw: unknown) {
      let v; try {v = parseProfileMutation(raw);} catch {return {status: "invalid"} as const;}
      const response = await call("admin_moderate_profile_v1", {p_id: v.id, p_type: v.type, p_operation: v.operation, p_version: v.version, p_reason: v.reason}, d => parsePeopleMutation(d, v.id));
      const result = response.status === "ok" ? response.data : response;
      if (result.status !== "ok" && deps.failure) {
        const codes = {invalid: "VALIDATION_FAILED", denied: "ACCESS_DENIED", not_found: "RESOURCE_NOT_FOUND", conflict: "STATE_CONFLICT", unavailable: "OPERATION_FAILED"} as const;
        try {await deps.failure({action: `profile.${v.operation}`, code: codes[result.status], resourceId: v.id, correlationId: result.correlationId ?? randomUUID()});} catch {}
      }
      return result;
    },
  };
}

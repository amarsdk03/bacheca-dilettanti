import "server-only";
import type {CommunityKind} from "../contracts";
import {communityService} from "./index";

export async function communityHttp(kind: CommunityKind, request: Request, id?: string) {
  const params = new URL(request.url).searchParams;
  const input: Record<string, unknown> = Object.fromEntries(params);
  let invalid = [...params.keys()].some(k => params.getAll(k).length !== 1);
  if (params.has("offset")) {invalid ||= !/^(0|[1-9]\d*)$/.test(params.get("offset")!); input.offset = Number(params.get("offset"));}
  if (params.has("pending")) {invalid ||= !["true", "false"].includes(params.get("pending")!); input.pending = params.get("pending") === "true";}
  const result = invalid ? {status: "invalid" as const} : id ? await communityService().detail(kind, id, input) : await communityService().list(kind, input);
  return Response.json(result, {status: {ok: 200, invalid: 400, denied: 403, not_found: 404, conflict: 409, unavailable: 503}[result.status],
    headers: {"Cache-Control": "private, no-store, max-age=0", Vary: "Cookie"}});
}

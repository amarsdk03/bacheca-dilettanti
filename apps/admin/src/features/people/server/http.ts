import "server-only";
import type {PeopleKind} from "../contracts";
import {parsePeopleUrl} from "../contracts";
import {peopleService} from "./index";
export async function peopleHttp(kind: PeopleKind, request: Request, id?: string) {
  const params = new URL(request.url).searchParams;
  const invalid = [...params.keys()].some(k => params.getAll(k).length !== 1);
  const parsed = id ? null : parsePeopleUrl(kind, params);
  const validDetail = kind === "users" ? params.size === 0 : params.size === 1 && params.has("type");
  const result = invalid || (id ? !validDetail : !parsed?.valid) ? {status: "invalid" as const} : id ? await peopleService(true).detail(kind, id, params.get("type") ?? undefined) : await peopleService(true).list(kind, parsed!.query);
  return Response.json(result, {status: {ok: 200, invalid: 400, denied: 403, not_found: 404, conflict: 409, unavailable: 503}[result.status], headers: {"Cache-Control": "private, no-store, max-age=0", Vary: "Cookie"}});
}

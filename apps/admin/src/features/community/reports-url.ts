import {type CommunityQuery, parseCommunityQuery} from "./contracts";

export const DEFAULT_REPORT_FILTERS = {search: "", status: "all", target: "all", from: "", to: ""};
export function reportsHref(query: CommunityQuery) {
  const params = new URLSearchParams();
  for (const key of ["search", "status", "target", "from", "to", "offset"] as const) {
    const value = query[key];
    if (value !== undefined && value !== "" && value !== 0 && (key !== "target" || value !== "all")) params.set(key, String(value));
  }
  return "/segnalazioni" + (params.size ? `?${params}` : "");
}
export function parseReportsUrl(params: URLSearchParams): {valid: boolean; query: CommunityQuery} {
  try {
    if ([...params.keys()].some(key => !["search", "status", "target", "from", "to", "offset"].includes(key) || params.getAll(key).length !== 1)) throw new Error();
    const raw: Record<string, unknown> = Object.fromEntries(params);
    if (params.has("offset")) {
      const offset = params.get("offset")!;
      if (!/^(0|[1-9]\d*)$/.test(offset) || Number(offset) % 30 !== 0) throw new Error();
      raw.offset = Number(offset);
    }
    return {valid: true, query: parseCommunityQuery("reports", raw)};
  } catch {return {valid: false, query: {...DEFAULT_REPORT_FILTERS, offset: 0}};}
}

export function invitationsHref(query: CommunityQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.pending) params.set("pending", "true");
  if (query.offset) params.set("offset", String(query.offset));
  return "/codici-invito" + (params.size ? `?${params}` : "");
}
export function parseInvitationsUrl(params: URLSearchParams): {valid: boolean; query: CommunityQuery} {
  try {
    if ([...params.keys()].some(k => params.getAll(k).length !== 1)) throw Error();
    const raw: Record<string, unknown> = Object.fromEntries(params);
    if (params.has("pending")) {
      if (!["true", "false"].includes(params.get("pending")!)) throw Error();
      raw.pending = params.get("pending") === "true";
    }
    if (params.has("offset")) {
      if (!/^(0|[1-9]\d*)$/.test(params.get("offset")!) || Number(params.get("offset")) % 30 !== 0) throw Error();
      raw.offset = Number(params.get("offset"));
    }
    return {valid: true, query: parseCommunityQuery("invitations", raw)};
  } catch {return {valid: false, query: parseCommunityQuery("invitations", {})};}
}

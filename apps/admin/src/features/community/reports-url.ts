import {parseCommunityQuery, type CommunityQuery} from "./contracts";

export const DEFAULT_REPORT_FILTERS = {search: "", status: "active", target: "all", from: "", to: ""};
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

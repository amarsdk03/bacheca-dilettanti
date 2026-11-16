import {canonicalUuid, record} from "../annunci/validation";

export const REPORT_STATES = {open: "Aperta", working: "In lavorazione", resolved: "Risolta", archived: "Archiviata"} as const;
export type ReportState = keyof typeof REPORT_STATES;
export type CommunityKind = "reports" | "invitations";
export type CommunityQuery = {search?: string; offset?: number; status?: string; target?: string; from?: string; to?: string; pending?: boolean};
export type Report = {
  id: string; number: string; createdAt: string; targetKind: "annuncio" | "profilo"; targetId: string; title: string;
  reporterEmail: string | null; reason: string | null; status: ReportState; version: number;
  note: string; updatedAt: string | null; updatedBy: string | null; profileTypes: string[];
};
export type InvitationCode = {id: string; email: string | null; code: string; total: number; pending: number};
export type Invitation = {id: string; email: string | null; registeredAt: string; confirmedAt: string; considered: boolean};
export type CommunityPage<T> = {items: T[]; hasMore: boolean};
export type InvitationDetail = CommunityPage<Invitation> & {owner: InvitationCode};
export type CommunityFailure = {status: "invalid" | "denied" | "not_found" | "conflict" | "unavailable"; correlationId?: string};
export type CommunityResult<T> = {status: "ok"; data: T} | CommunityFailure;
export type CommunityMutation = {id: string; changed: boolean; eventId?: string};
export type ReportUpdate = {id: string; status: ReportState; note: string; version: number};
export type InvitationUpdate = {id: string; considered: boolean; expected: boolean};

function invalid(): never {throw new Error("INVALID_COMMUNITY_DATA");}
const text = (v: unknown, max = 1000): string => typeof v === "string" && [...v].length <= max ? v : invalid();
const nullableText = (v: unknown, max = 1000): string | null => v === null ? null : text(v, max);
const id = (v: unknown): string => canonicalUuid(v) ? v : invalid();
const count = (v: unknown): number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : invalid();
const date = (v: unknown): string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)) ? v : invalid();
export function parseCommunityQuery(kind: CommunityKind, value: unknown): CommunityQuery {
  if (!record(value)) invalid();
  const keys = kind === "reports" ? ["search", "offset", "status", "target", "from", "to"] : ["search", "offset", "pending"];
  if (Object.keys(value).some(k => !keys.includes(k) || value[k] === null)) invalid();
  const q: CommunityQuery = {search: text(value.search ?? "", 200).trim(), offset: count(value.offset ?? 0)};
  if (q.offset! > 1000000) invalid();
  if (kind === "reports") {
    q.status = text(value.status ?? "all"); q.target = text(value.target ?? "all");
    if (!["active", "all", ...Object.keys(REPORT_STATES)].includes(q.status) || !["all", "annuncio", "profilo"].includes(q.target)) invalid();
    for (const key of ["from", "to"] as const) {
      const v = text(value[key] ?? "");
      if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v < "0001-01-01" || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v)) invalid();
      q[key] = v;
    }
    if (q.from && q.to && q.from > q.to) invalid();
  } else {if (value.pending !== undefined && typeof value.pending !== "boolean") invalid(); q.pending = value.pending === true;}
  return q;
}
export function parseReport(v: unknown): Report {
  if (!record(v) || !["annuncio", "profilo"].includes(v.targetKind as string) || !Object.hasOwn(REPORT_STATES, v.status as string) || typeof v.number !== "string" || !/^[1-9]\d*$/.test(v.number)) invalid();
  const profileTypes = ["giocatore", "squadra", "staff-sportivo", "arbitro", "torneo-evento", "campi-impianti-sportivi", "servizi-consulenze", "creators"];
  if (!Array.isArray(v.profileTypes) || v.profileTypes.length > 8 || v.profileTypes.some(t => !profileTypes.includes(t))) invalid();
  return {id: id(v.id), number: v.number, createdAt: date(v.createdAt), targetKind: v.targetKind as Report["targetKind"], targetId: id(v.targetId), title: text(v.title, 10000),
    reporterEmail: nullableText(v.reporterEmail, 320), reason: nullableText(v.reason, 300), status: v.status as ReportState, version: count(v.version),
    note: text(v.note), updatedAt: v.updatedAt === null ? null : date(v.updatedAt), updatedBy: nullableText(v.updatedBy, 320), profileTypes: v.profileTypes as string[]};
}
export function parseInvitationCode(v: unknown): InvitationCode {
  if (!record(v) || typeof v.code !== "string" || !/^[A-F0-9]{16}$/.test(v.code)) invalid();
  const result = {id: id(v.id), email: nullableText(v.email, 320), code: v.code, total: count(v.total), pending: count(v.pending)};
  if (result.pending > result.total) invalid(); return result;
}
export function parseInvitation(v: unknown): Invitation {
  if (!record(v) || typeof v.considered !== "boolean") invalid();
  return {id: id(v.id), email: nullableText(v.email, 320), registeredAt: date(v.registeredAt), confirmedAt: date(v.confirmedAt), considered: v.considered};
}
export function parseCommunityPage<T>(v: unknown, parse: (value: unknown) => T): CommunityPage<T> {
  if (!record(v) || !Array.isArray(v.items) || v.items.length > 30 || typeof v.hasMore !== "boolean" || v.hasMore && v.items.length !== 30) invalid();
  const items = v.items.map(parse);
  if (new Set(items.map(row => (row as {id: string}).id)).size !== items.length) invalid();
  return {items, hasMore: v.hasMore};
}
export function parseInvitationDetail(v: unknown): InvitationDetail {
  if (!record(v)) invalid(); return {...parseCommunityPage(v, parseInvitation), owner: parseInvitationCode(v.owner)};
}
export function parseReportUpdate(v: unknown): ReportUpdate {
  if (!record(v) || Object.keys(v).some(k => !["id", "status", "note", "version"].includes(k)) || !Object.hasOwn(REPORT_STATES, v.status as string)) invalid();
  const version = count(v.version); if (version > 2147483646) invalid();
  return {id: id(v.id), status: v.status as ReportState, note: text(v.note), version};
}
export function parseInvitationUpdate(v: unknown): InvitationUpdate {
  if (!record(v) || Object.keys(v).some(k => !["id", "considered", "expected"].includes(k)) || typeof v.considered !== "boolean" || typeof v.expected !== "boolean") invalid();
  return {id: id(v.id), considered: v.considered, expected: v.expected};
}
export function parseCommunityMutation(v: unknown, expected: string): CommunityResult<CommunityMutation> {
  if (!record(v)) invalid();
  if (v.status === "not_found" || v.status === "conflict") return {status: v.status};
  if (v.status !== "ok" || v.id !== expected || typeof v.changed !== "boolean" || v.changed && !canonicalUuid(v.eventId)) invalid();
  return {status: "ok", data: {id: id(v.id), changed: v.changed, ...(v.changed ? {eventId: id(v.eventId)} : {})}};
}

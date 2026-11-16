import {canonicalUuid, record} from "../annunci/validation";
import type {CommunityResult} from "../community/contracts";

export const PROFILE_LABELS = {giocatore: "Giocatore", squadra: "Squadra", "staff-sportivo": "Staff sportivo", arbitro: "Arbitro", "torneo-evento": "Torneo / Evento", "campi-impianti-sportivi": "Campi e impianti", "servizi-consulenze": "Servizi e professionisti", creators: "Creator"} as const;
export type ProfileType = keyof typeof PROFILE_LABELS;
export type PeopleKind = "users" | "profiles";
export const VISIBILITY = {public: "Pubblico", private: "Privato", obscured: "Oscurato"} as const;
export type PeopleQuery = {search?: string; offset?: number; registration?: string; confirmation?: string; from?: string; to?: string; type?: string; region?: string; verification?: string; visibility?: string; ownership?: string; user?: string; sort?: string; excludedDomains?: string};
export const DEFAULT_EXCLUDED_DOMAINS = ["gmail.com", "icloud.com", "yahoo.com", "yahoo.it", "hotmail.com", "outlook.com", "outlook.it", "aol.com", "live.com", "live.it", "msn.com", "libero.it", "tiscali.it", "alice.it", "virgilio.it"];
export function normalizeDomains(values: string[]): string[] {
  if (values.length > 50) fail();
  const domains = values.map(value => value.trim().toLowerCase()).filter(Boolean);
  for (const domain of domains) {
    if (domain.length > 253 || !domain.includes(".") || domain.split(".").some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) fail();
  }
  return [...new Set(domains)];
}
export type UserRow = {id: string; email: string | null; createdAt: string; registeredAt: string | null; confirmedAt: string | null; profileCount: number};
export type ProfileRow = {id: string; profileId: string; type: ProfileType; name: string; userId: string | null; email: string | null; verifiedAt: string | null; adminHidden: boolean; version: number; visibility: keyof typeof VISIBILITY; locations: {region: string; city: string | null}[]};
export type UserDetail = UserRow & {authId: string; phone: string | null; newsletter: boolean; newsletterUpdatedAt: string | null; legalAcceptedAt: string | null; termsVersion: string | null; privacyVersion: string | null; cookieVersion: string | null; profiles: ProfileRow[]};
export type ProfileDetail = ProfileRow & {fields: Record<string, unknown>; announcementCount: number; publicAnnouncementCount: number; followerCount: number};
export const OPERATIONS = {verify: "Verifica profilo", unverify: "Revoca verifica", hide: "Oscura profilo", show: "Ripristina visibilità"} as const;
export type ProfileOperation = keyof typeof OPERATIONS;
export type ProfileMutation = {id: string; type: ProfileType; operation: ProfileOperation; version: number; reason: string | null};
export type PeoplePage<T> = {items: T[]; hasMore: boolean};
function fail(): never {throw Error("INVALID_PEOPLE_DATA");}
const text = (v: unknown, max = 1000): string => typeof v === "string" && [...v].length <= max ? v : fail();
const optional = (v: unknown, max = 1000) => v === null ? null : text(v, max);
const uuid = (v: unknown): string => canonicalUuid(v) ? v : fail();
const count = (v: unknown): number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= 2147483647 ? v : fail();
const timestamp = (v: unknown): string | null => v === null ? null : typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v)) ? v : fail();
export function profileType(v: unknown): ProfileType {return typeof v === "string" && Object.hasOwn(PROFILE_LABELS, v) ? v as ProfileType : fail();}
export function parsePeopleQuery(kind: PeopleKind, v: unknown): PeopleQuery {
  if (!record(v)) fail();
  const keys = kind === "users" ? ["search", "offset", "registration", "confirmation", "from", "to", "excludedDomains"] : ["search", "offset", "type", "region", "verification", "visibility", "ownership", "user", "sort"];
  if (Object.keys(v).some(k => !keys.includes(k) || v[k] === null)) fail();
  const q: PeopleQuery = {search: text(v.search ?? "", 200).trim(), offset: count(v.offset ?? 0)};
  if (q.offset! > 999990 || q.offset! % 30 !== 0) fail();
  const options: Partial<Record<keyof PeopleQuery, string[]>> = kind === "users" ? {registration: ["all", "complete", "incomplete"], confirmation: ["all", "confirmed", "unconfirmed"]} : {type: ["all", ...Object.keys(PROFILE_LABELS)], verification: ["all", "verified", "unverified"], visibility: ["all", ...Object.keys(VISIBILITY)], ownership: ["all", "linked", "unlinked"]};
  for (const [key, values] of Object.entries(options)) {
    const value = text(v[key] ?? "all"); if (!values.includes(value)) fail(); Object.assign(q, {[key]: value});
  }
  if (kind === "users") {
    const domains = text(v.excludedDomains ?? "", 12700);
    q.excludedDomains = domains ? normalizeDomains(domains.split(",")).join(",") : "";
    for (const key of ["from", "to"] as const) {
      const d = text(v[key] ?? "");
      if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < "0001-01-01" || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d)) fail();
      q[key] = d;
    }
    if (q.from && q.to && q.from > q.to) fail();
  } else {q.region = text(v.region ?? "", 100); q.user = text(v.user ?? "", 36); if (q.user && !canonicalUuid(q.user)) fail();}
  if (kind === "profiles") {
    q.sort = text(v.sort ?? "newest");
    if (!["newest", "oldest", "announcements", "followers"].includes(q.sort)) fail();
    if (q.user) {
      if (q.search && q.search !== q.user) fail();
      q.search = q.user; delete q.user;
    }
  }
  return q;
}
export function parsePeopleUrl(kind: PeopleKind, params: URLSearchParams) {
  try {
    if ([...params.keys()].some(k => params.getAll(k).length !== 1)) fail();
    const raw: Record<string, unknown> = Object.fromEntries(params);
    if (params.has("offset")) {if (!/^(0|[1-9]\d*)$/.test(params.get("offset")!)) fail(); raw.offset = Number(raw.offset);}
    return {valid: true, query: parsePeopleQuery(kind, raw)};
  } catch {return {valid: false, query: parsePeopleQuery(kind, {})};}
}
export function peopleHref(kind: PeopleKind, query: PeopleQuery) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== "" && v !== "all" && v !== 0 && v !== undefined && !(k === "sort" && v === "newest")) params.set(k, String(v));
  return (kind === "users" ? "/utenti" : "/profili") + (params.size ? `?${params}` : "");
}
export function parseUser(v: unknown): UserRow {
  if (!record(v)) fail();
  return {id: uuid(v.id), email: optional(v.email, 320), createdAt: timestamp(v.createdAt) ?? fail(), registeredAt: timestamp(v.registeredAt), confirmedAt: timestamp(v.confirmedAt), profileCount: count(v.profileCount)};
}
export function parseProfile(v: unknown): ProfileRow {
  if (!record(v) || typeof v.adminHidden !== "boolean" || !Object.hasOwn(VISIBILITY, v.visibility as string) || !Array.isArray(v.locations) || v.locations.length > 100) fail();
  const result: ProfileRow = {id: text(v.id, 100), profileId: uuid(v.profileId), type: profileType(v.type), name: text(v.name, 1000), userId: v.userId === null ? null : uuid(v.userId), email: optional(v.email, 320),
    verifiedAt: timestamp(v.verifiedAt), adminHidden: v.adminHidden, version: count(v.version), visibility: v.visibility as ProfileRow["visibility"], locations: v.locations.map(l => {if (!record(l)) fail(); return {region: text(l.region, 100), city: optional(l.city, 200)};})};
  if (result.id !== `${result.profileId}:${result.type}` || result.adminHidden !== (result.visibility === "obscured")) fail();
  return result;
}
export function parsePeoplePage<T extends {id: string}>(v: unknown, parse: (v: unknown) => T): PeoplePage<T> {
  if (!record(v) || !Array.isArray(v.items) || v.items.length > 30 || typeof v.hasMore !== "boolean" || v.hasMore && v.items.length !== 30) fail();
  const items = v.items.map(parse); if (new Set(items.map(r => r.id)).size !== items.length) fail(); return {items, hasMore: v.hasMore};
}
export function parseUserDetail(v: unknown): UserDetail {
  if (!record(v) || typeof v.newsletter !== "boolean" || !Array.isArray(v.profiles) || v.profiles.length > 8) fail();
  const profiles = v.profiles.map(parseProfile), user = parseUser(v);
  if (profiles.length !== user.profileCount || profiles.some(p => p.userId !== user.id) || new Set(profiles.map(p => p.id)).size !== profiles.length) fail();
  return {...user, authId: uuid(v.authId), phone: optional(v.phone, 100), newsletter: v.newsletter, newsletterUpdatedAt: timestamp(v.newsletterUpdatedAt), legalAcceptedAt: timestamp(v.legalAcceptedAt), termsVersion: optional(v.termsVersion, 200), privacyVersion: optional(v.privacyVersion, 200), cookieVersion: optional(v.cookieVersion, 200), profiles};
}
export function parseProfileDetail(v: unknown): ProfileDetail {
  if (!record(v) || !record(v.fields) || JSON.stringify(v.fields).length > 200000) fail();
  return {...parseProfile(v), fields: v.fields, announcementCount: count(v.announcementCount), publicAnnouncementCount: count(v.publicAnnouncementCount), followerCount: count(v.followerCount)};
}
export function parseProfileMutation(v: unknown): ProfileMutation {
  if (!record(v) || Object.keys(v).some(k => !["id", "type", "operation", "version", "reason"].includes(k)) || !Object.hasOwn(OPERATIONS, v.operation as string)) fail();
  const operation = v.operation as ProfileOperation, reason = v.reason === null ? null : text(v.reason, 1000).trim() || null;
  if (["hide", "unverify"].includes(operation) ? !reason : reason !== null) fail();
  const version = count(v.version); if (version === 2147483647) fail();
  return {id: uuid(v.id), type: profileType(v.type), operation, version, reason};
}
export function parsePeopleMutation(v: unknown, id: string): CommunityResult<{changed: boolean}> {
  if (!record(v)) fail();
  if (v.status === "conflict" || v.status === "not_found") return {status: v.status};
  if (v.status !== "ok" || v.id !== id || typeof v.changed !== "boolean" || v.changed && !canonicalUuid(v.eventId)) fail();
  return {status: "ok", data: {changed: v.changed}};
}

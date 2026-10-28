import "server-only";
import type { AnnouncementDetail } from "../contracts";
import { DETAIL_FIELDS, type DetailContent, type DetailFieldKind, type DetailFieldValue, type DetailType } from "../detail-fields";
import { canonicalUuid, databaseTimestamp, record } from "../validation";
import { parseListQuery } from "./query-input";
import { parseListResponse } from "./response";
import { parseModerationInfo } from "../moderation";

const nullableText = (v: unknown): v is string | null => v === null || typeof v === "string";
const nullableId = (v: unknown): v is string | null => v === null || canonicalUuid(v);
const nullableTime = (v: unknown): v is string | null => v === null || databaseTimestamp(v);
const childId = (v: unknown): v is string => typeof v === "string" && /^[0-9]{1,19}$/.test(v);
function invalid(): never { throw new Error("ADMIN_ANNOUNCEMENT_RESPONSE_INVALID"); }

/** Stored destinations are absolute; never resolve them against the Admin origin.
 * Descriptors only: this function performs no remote requests or media decoding.
 */
export function detailUrl(value: string): string | null {
  if (value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value) || !/^https?:\/\//i.test(value.trim())) return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function fieldValue(value: unknown, kind: DetailFieldKind, mark: () => void): DetailFieldValue {
  if (value === null) return null;
  if (kind === "text") { if (typeof value !== "string" || value.length > 5000) invalid(); return value; }
  if (kind === "number") { if (typeof value !== "number" || !Number.isFinite(value)) invalid(); return value; }
  if (kind === "boolean") { if (typeof value !== "boolean") invalid(); return value; }
  if (!Array.isArray(value)) invalid();
  const limit = kind === "strings" ? 32 : kind === "history" ? 60 : kind === "schedule" ? 7 : 20;
  if (value.length > limit) invalid();
  if (kind === "strings") { if (!value.every((v) => typeof v === "string" && v.length <= 160)) invalid(); return [...value]; }
  const allowed = kind === "history" ? ["id", "titolo", "ente", "periodoDa", "periodoA", "descrizione", "stato", "squadraProfiloId", "squadraIstanzaId"] :
    kind === "schedule" ? ["giorno", "attivo", "dalle", "alle"] : ["id", "posto", "titoloPremio"];
  const rows = value.map((v) => {
    if (!record(v)) invalid();
    const out: Record<string, string | boolean | null> = {};
    for (const key of allowed) {
      if (key === "attivo") { if (v[key] !== null && typeof v[key] !== "boolean") invalid(); }
      else if (!nullableText(v[key]) || (typeof v[key] === "string" && v[key].length > 5000)) invalid();
      out[key] = v[key] as string | boolean | null;
    }
    if (kind === "history") {
      if (!nullableId(v.squadraProfiloId) || (v.squadraIstanzaId !== null && !childId(v.squadraIstanzaId))) invalid();
      for (const key of ["periodoDa", "periodoA"]) if (v[key] && !(key === "periodoA" && v[key] === "oggi") && !/^(19|20)\d{2}$/.test(v[key] as string)) mark();
      if (v.stato && !["non-specificare", "in-corso", "conseguito"].includes(v.stato as string)) mark();
    }
    return out;
  });
  if (kind === "schedule") {
    const days = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"], seen = new Set();
    for (const row of rows) {
      if (!days.includes(row.giorno as string) || seen.has(row.giorno)) mark();
      seen.add(row.giorno);
      for (const key of ["dalle", "alle"]) if (row[key] && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row[key] as string)) mark();
      if (row.attivo === null) mark();
    }
  }
  return rows as DetailFieldValue;
}

export function parseDetailResponse(value: unknown, requestedId: string): AnnouncementDetail {
  if (!record(value) || !record(value.metadata) || !record(value.content) || !record(value.content.fields) ||
    typeof value.complete !== "boolean" || !Array.isArray(value.issues) || value.issues.length > 100 ||
    !value.issues.every((v) => typeof v === "string" && /^(UNSUPPORTED_TYPE|DETAIL_MISSING|INVALID_CONTACT|UNSAFE_LINK|UNSAFE_MEDIA|INVALID_FIELD:[a-z_]+|COLLECTION_TRUNCATED:(locations|contacts|links|media))$/.test(v)) ||
    typeof value.contentFingerprint !== "string" || !/^content-v1:[0-9a-f]{64}$/.test(value.contentFingerprint)) invalid();
  if (value.complete !== (value.issues.length === 0)) invalid();
  const summary = parseListResponse({ items: [value.summary], hasMore: false, nextCursor: null }, parseListQuery({ limit: 1 })).items[0];
  if (summary.id !== requestedId) invalid();
  const m = value.metadata;
  if (!nullableText(m.moderationInfo) || !nullableText(m.level) || typeof m.priorityActive !== "boolean" ||
    !nullableTime(m.priorityStartsAt) || !nullableTime(m.priorityEndsAt) || !nullableId(m.updatedById)) invalid();
  const metadata = { moderationInfo: m.moderationInfo, level: m.level, priorityActive: m.priorityActive,
    priorityStartsAt: m.priorityStartsAt, priorityEndsAt: m.priorityEndsAt, updatedById: m.updatedById };
  const issues = new Set<string>(value.issues);
  const spec = Object.hasOwn(DETAIL_FIELDS, summary.type) ? DETAIL_FIELDS[summary.type as DetailType] : null;
  const fields: Record<string, DetailFieldValue> = {};
  if (value.content.type !== (spec ? summary.type : "unsupported")) invalid();
  if (!spec) issues.add("UNSUPPORTED_TYPE");
  else for (const [key, kind] of Object.entries(spec)) fields[key] = fieldValue(value.content.fields[key], kind, () => issues.add(`INVALID_FIELD:${key}`));
  const content = { type: spec ? summary.type : "unsupported", fields } as DetailContent;
  const collection = (key: "locations" | "contacts" | "links" | "media", limit: number) => {
    const rows = value[key];
    if (!Array.isArray(rows) || rows.length > limit) invalid();
    let previous = BigInt(-1);
    return rows.map((row) => {
      if (!record(row) || !childId(row.id) || BigInt(row.id) <= previous) invalid();
      previous = BigInt(row.id); return row;
    });
  };
  const locations = collection("locations", 100).map((row) => {
    if (typeof row.region !== "string" || !nullableText(row.city)) invalid();
    return { id: row.id as string, region: row.region, city: row.city };
  });
  const contacts = collection("contacts", 30).map((row): AnnouncementDetail["contacts"][number] => {
    if (typeof row.kind !== "string" || typeof row.value !== "string" || !nullableText(row.referent)) invalid();
    const text = row.value.trim();
    const kind = row.kind === "email" ? "email" : row.kind === "telefono" ? "phone" : "unknown";
    const valid = kind === "email" ? text.length <= 254 && /^[^@\s?&#]+@[^@\s?&#]+\.[^@\s?&#]+$/.test(text) :
      kind === "phone" && text.length <= 40 && /^[+0-9().\s-]+$/.test(text) && text.replace(/\D/g, "").length >= 6 && text.replace(/\D/g, "").length <= 20;
    if (!valid) issues.add("INVALID_CONTACT");
    return { id: row.id as string, kind, value: row.value, referent: row.referent, valid };
  });
  const links = collection("links", 30).map((row) => {
    if (!nullableText(row.platform) || typeof row.value !== "string") invalid();
    const url = detailUrl(row.value); if (!url) issues.add("UNSAFE_LINK");
    return { id: row.id as string, platform: row.platform, value: row.value, url };
  });
  const media = collection("media", 30).map((row) => {
    if (!nullableText(row.mimeType) || typeof row.value !== "string") invalid();
    const url = detailUrl(row.value); if (!url) issues.add("UNSAFE_MEDIA");
    return { id: row.id as string, mimeType: row.mimeType, value: row.value, url };
  });
  let trash: AnnouncementDetail["trash"];
  if (value.trash !== undefined) {
    if (!record(value.trash) || !nullableTime(value.trash.deletedAt) || !nullableId(value.trash.deletedBy) ||
      (value.trash.deletedAt === null) !== (value.trash.deletedBy === null) || summary.trashed !== (value.trash.deletedAt !== null)) invalid();
    trash = { deletedAt: value.trash.deletedAt, deletedBy: value.trash.deletedBy };
  }
  const moderation = value.moderation === undefined ? undefined : parseModerationInfo(value.moderation);
  if (moderation && issues.size) for (const operation of ["approve", "show"] as const) moderation.capabilities[operation] = { allowed: false, reason: "INCOMPLETE_CONTENT" };
  return { ...(trash ? { trash } : {}), ...(moderation ? { moderation } : {}), summary, metadata, content, locations, contacts, links, media, contentFingerprint: value.contentFingerprint,
    complete: issues.size === 0, issues: [...issues] };
}

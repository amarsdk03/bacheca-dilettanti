import "server-only";
import type { AnnouncementListItem, AnnouncementListPage, AnnouncementListQuery } from "../contracts";
import { canonicalUuid, databaseTimestamp, record, validCursor } from "../validation";
import { encodeListCursor } from "./query-input";

const nullableId = (v: unknown) => v === null || canonicalUuid(v);
const nullableText = (v: unknown) => v === null || typeof v === "string";
const nullableBool = (v: unknown) => v === null || typeof v === "boolean";
const nullableTime = (v: unknown) => v === null || databaseTimestamp(v);
function invalid(): never { throw new Error("ADMIN_ANNOUNCEMENT_RESPONSE_INVALID"); }

export function parseListResponse(value: unknown, query: AnnouncementListQuery): AnnouncementListPage {
  if (!record(value) || !Array.isArray(value.items) || value.items.length > query.limit ||
    typeof value.hasMore !== "boolean" || !("nextCursor" in value)) invalid();
  const items: AnnouncementListItem[] = [];
  const ids = new Set<string>();
  for (const row of value.items) {
    if (!record(row) || !canonicalUuid(row.id) || ids.has(row.id) || !nullableText(row.title) || typeof row.type !== "string" ||
      (row.trashed !== undefined && typeof row.trashed !== "boolean") || !nullableText(row.status) || !nullableBool(row.hidden) || !nullableBool(row.private) || !nullableId(row.creatorId) ||
      !nullableTime(row.createdAt) || !nullableTime(row.updatedAt) || typeof row.rowFingerprint !== "string" ||
      !/^[0-9a-f]{32}$/.test(row.rowFingerprint) || !record(row.author)) invalid();
    const author = row.author;
    if (!nullableId(author.profileId) || !nullableId(author.userId) || typeof author.displayName !== "string" || !author.displayName.trim() ||
      !nullableBool(author.anonymous) || typeof author.available !== "boolean" ||
      (!author.available && author.displayName !== "Profilo non disponibile") || (author.available && !author.profileId)) invalid();
    if (author.available && author.anonymous === true) {
      const name = row.type === "annuncio_giocatore" ? "Giocatore" : row.type.startsWith("annuncio_squadra_cerca_") ? "Squadra" :
        row.type === "annuncio_staff_sportivo" ? "Staff sportivo" : row.type === "annuncio_arbitro" ? "Arbitro" : null;
      if (author.displayName !== name) invalid();
    }
    // Explicit projection: extra backend fields can never leak to client DTOs.
    const item: AnnouncementListItem = {
      id: row.id, title: row.title as string | null, type: row.type, status: row.status as string | null,
      ...(row.trashed === undefined ? {} : { trashed: row.trashed as boolean }),
      hidden: row.hidden as boolean | null, private: row.private as boolean | null, creatorId: row.creatorId as string | null,
      createdAt: row.createdAt as string | null, updatedAt: row.updatedAt as string | null, rowFingerprint: row.rowFingerprint,
      author: { profileId: author.profileId as string | null, userId: author.userId as string | null,
        displayName: author.displayName, anonymous: author.anonymous as boolean | null, available: author.available },
    };
    const previous = items.at(-1);
    if (previous && (previous.createdAt === null && item.createdAt !== null ||
      previous.createdAt !== null && item.createdAt !== null && previous.createdAt < item.createdAt ||
      previous.createdAt === item.createdAt && previous.id <= item.id)) invalid();
    ids.add(item.id); items.push(item);
  }
  let nextCursor: string | null = null;
  if (value.hasMore) {
    if (items.length !== query.limit || !validCursor(value.nextCursor, query.filters)) invalid();
    const last = items.at(-1)!;
    if (value.nextCursor.id !== last.id || value.nextCursor.createdAt !== last.createdAt) invalid();
    nextCursor = encodeListCursor(value.nextCursor);
  } else if (value.nextCursor !== null) invalid();
  return { items, hasMore: value.hasMore, nextCursor };
}

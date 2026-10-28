import type { AnnouncementListItem } from "./contracts";
import { canonicalUuid, exactKeys, record } from "./validation";

export type ExportSelection = { id: string; rowFingerprint: string; authorName: string }[];
export type ExportFailure = { status: "invalid" | "denied" | "conflict" | "unavailable"; correlationId: string };
export type ExportDownload = { status: "ok"; blob: Blob; filename: string };
export function exportSelection(items: AnnouncementListItem[]): ExportSelection {
  return items.map(row => ({ id: row.id, rowFingerprint: row.rowFingerprint, authorName: row.author.displayName }));
}
export function parseExportSelection(value: unknown): ExportSelection {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) throw new Error("INVALID_EXPORT");
  const ids = new Set<string>();
  return value.map(row => {
    if (!record(row) || !exactKeys(row, ["id", "rowFingerprint", "authorName"]) || !canonicalUuid(row.id) || ids.has(row.id) ||
      typeof row.rowFingerprint !== "string" || !/^[0-9a-f]{32}$/.test(row.rowFingerprint) ||
      typeof row.authorName !== "string" || [...row.authorName].length > 5000) throw new Error("INVALID_EXPORT");
    ids.add(row.id);
    return { id: row.id, rowFingerprint: row.rowFingerprint, authorName: row.authorName };
  });
}

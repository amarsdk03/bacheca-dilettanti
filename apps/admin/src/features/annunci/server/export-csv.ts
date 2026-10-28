import "server-only";
import type { AnnouncementListItem } from "../contracts";
import { displayDate, statusLabel, typeLabel, visibilityLabel } from "../presentation";

export function csvCell(value: string): string {
  // Spreadsheet importers can ignore leading controls, BOM and invisible format
  // characters before interpreting a formula. Quote escaping alone is not enough.
  let safe = value.replaceAll("\u0000", "");
  if (/^[\p{White_Space}\p{Cc}\p{Cf}]*[=+\-@＝＋－＠]/u.test(safe) || /^[\t\r\n]/.test(safe)) safe = "'" + safe;
  return '"' + safe.replace(/"/g, '""') + '"';
}
export function announcementCsv(items: AnnouncementListItem[]): string {
  const rows = [["Titolo", "Autore / Profilo", "Tipologia", "Stato", "Visibilità", "Creazione (Europe/Rome)"],
    ...items.map(row => [row.title || "Annuncio senza titolo", row.author.displayName, typeLabel(row.type), statusLabel(row.status),
      [...(row.trashed ? ["Nel cestino"] : []), ...visibilityLabel(row)].join(" · "), displayDate(row.createdAt)])];
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
}
export function exportFilename(now: Date) {
  return "annunci-pagina-" + now.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-") + ".csv";
}

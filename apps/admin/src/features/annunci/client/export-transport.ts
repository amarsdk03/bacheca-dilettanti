import type { ExportDownload, ExportFailure, ExportSelection } from "../export-contract";
import type { AnnunciUrl } from "../url-state";
import { canonicalUuid, record } from "../validation";

export async function requestAnnouncementExport(query: AnnunciUrl, selection: ExportSelection, signal: AbortSignal): Promise<ExportDownload | ExportFailure> {
  const response = await fetch("/api/annunci/export", { method: "POST", signal, cache: "no-store", credentials: "same-origin", redirect: "error",
    headers: { "Content-Type": "application/json", Accept: "text/csv, application/json" },
    body: JSON.stringify({ query: { ...query.filters, cursor: query.cursor, limit: 30 }, selection }),
  });
  if (response.status === 403) return { status: "denied", correlationId: "client" };
  if (response.status === 200 && response.headers.get("content-type")?.startsWith("text/csv;")) {
    const match = /^attachment; filename="(annunci-pagina-\d{8}-\d{6}\.csv)"$/.exec(response.headers.get("content-disposition") ?? "");
    if (!match) throw new Error("EXPORT_UNAVAILABLE");
    return { status: "ok", blob: await response.blob(), filename: match[1] };
  }
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("EXPORT_UNAVAILABLE");
  const value: unknown = await response.json();
  if (!record(value) || !canonicalUuid(value.correlationId) || !["invalid", "conflict", "unavailable"].includes(value.status as string) ||
    ({ invalid: 400, conflict: 409, unavailable: 503 } as Record<string, number>)[value.status as string] !== response.status) throw new Error("EXPORT_UNAVAILABLE");
  return { status: value.status as ExportFailure["status"], correlationId: value.correlationId };
}

export function downloadAnnouncementExport(file: ExportDownload) {
  const url = window.URL.createObjectURL(file.blob);
  let link: HTMLAnchorElement | undefined;
  try {
    link = document.createElement("a"); link.href = url; link.download = file.filename;
    document.body.appendChild(link); link.click();
  } finally {
    link?.remove();
    // Let the browser start consuming the Blob before releasing its URL.
    setTimeout(() => window.URL.revokeObjectURL(url), 0);
  }
}

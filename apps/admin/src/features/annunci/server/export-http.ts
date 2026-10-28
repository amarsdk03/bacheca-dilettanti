import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminAuditService } from "@/features/audit/server";
import type { ExportFailure } from "../export-contract";
import { createAnnouncementExport, type ExportResult } from "./export-service";
import { exportFilename } from "./export-csv";

const headers = { "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0", Pragma: "no-cache", Expires: "0", Vary: "Cookie, Origin", "X-Content-Type-Options": "nosniff" };
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const url = new URL(request.url), host = request.headers.get("host");
    if (!["http:", "https:"].includes(url.protocol)) return false;
    // Next can expose an internal URL authority (localhost) to Route Handlers.
    // Compare the browser origin with the actual HTTP Host, never an arbitrary
    // forwarded-host header. Standard Request callers may omit Host entirely.
    if (host !== null) {
      if (!/^(?:\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::\d{1,5})?$/i.test(host)) return false;
      return origin === new URL(`${url.protocol}//${host}`).origin;
    }
    return origin === url.origin;
  } catch { return false; }
}
async function boundedJson(request: Request): Promise<unknown> {
  const reader = request.body?.getReader(); if (!reader) throw new Error();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 1048576) { await reader.cancel(); throw new Error(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
export function createExportHttp(run: (input: unknown) => Promise<ExportResult>, now = () => new Date()) {
  return async (request: Request) => {
    const failure = (status: ExportFailure["status"], correlationId: string = randomUUID()) => Response.json({ status, correlationId }, {
      status: { invalid: 400, denied: 403, conflict: 409, unavailable: 503 }[status], headers,
    });
    if (!sameOrigin(request)) return failure("denied");
    if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? "")) return failure("invalid");
    let input: unknown;
    try { input = await boundedJson(request); } catch { return failure("invalid"); }
    try {
      const result = await run(input);
      if (result.status !== "ok") return failure(result.status, result.correlationId);
      return new Response(result.csv, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${exportFilename(now())}"` } });
    } catch { return failure("unavailable"); }
  };
}
export function announcementExportHttp() {
  return createExportHttp(createAnnouncementExport({ getClient: createClient,
    failure: event => createAdminAuditService().recordOperationFailure(event),
    log: (code, correlationId) => console.error("[admin-export]", { code, correlationId }),
  }));
}

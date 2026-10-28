import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@bacheca/database";
import { auditUuid, type ServerAuditEvent } from "../contracts";

/** Construct lazily: missing audit credentials must never prevent local logout. */
export async function writeServerAudit(event: ServerAuditEvent): Promise<string> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!url || !secretKey?.trim()) throw new Error();
    const origin = new URL(url);
    if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password ||
      origin.pathname !== "/" || origin.search || origin.hash) throw new Error();
    // This client never inherits the caller's Authorization header or cookie jar.
    // The key's scope is privileged; limit this module to this one audit RPC.
    const writer = createClient<Database>(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => {
        const timeout = AbortSignal.timeout(5000);
        const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
        return fetch(input, { ...init, cache: "no-store", signal });
      } },
    });
    const { data, error } = await writer.rpc("admin_record_server_audit_v1", {
      p_action: event.action,
      p_outcome: event.outcome,
      p_correlation_uuid: event.correlationId,
      p_actor_auth_user_uuid: event.actorAuthId,
      p_actor_utente_uuid: event.actorUserId,
      p_resource_uuid: event.resourceId,
      p_failure_code: event.failureCode,
    });
    const eventId = auditUuid(data);
    if (error || !eventId) throw new Error();
    return eventId;
  } catch {
    // Transport errors may contain URLs, headers or arbitrary server text.
    throw new Error("ADMIN_AUDIT_WRITE_UNAVAILABLE");
  }
}

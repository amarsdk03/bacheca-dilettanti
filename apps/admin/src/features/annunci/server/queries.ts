import "server-only";
import { createReadClient } from "@/lib/supabase/server";
import { createAnnouncementQueries } from "./service";

/** Rendering reads only. Future actions/handlers must supply a writable session
 * client to createAnnouncementQueries so refreshed cookies can be persisted.
 */
export async function listAdminAnnouncements(input: unknown = {}) {
  return createAnnouncementQueries({
    getClient: createReadClient,
    log: (code, correlationId) => console.error("[admin-announcements]", { code, correlationId }),
  }).list(input);
}

/** Called on demand by the future preview; no list/detail prefetch here. */
export async function getAdminAnnouncementDetail(id: unknown) {
  return createAnnouncementQueries({
    getClient: createReadClient,
    log: (code, correlationId) => console.error("[admin-announcements]", { code, correlationId }),
  }).detail(id);
}

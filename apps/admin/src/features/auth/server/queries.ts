import "server-only";

import { cache } from "react";
import { createClient, createReadClient } from "@/lib/supabase/server";
import { verifyAdminContext } from "./context";

/** React cache is scoped to the render request, never a cross-request role cache. */
export const getAdminContext = cache(() => verifyAdminContext(createReadClient));

/** For future actions/endpoints: each invocation verifies anew, independently
 * of layouts/proxy. Functional RPCs must also check inside their transaction.
 */
export async function requireAdminSession() {
  const context = await verifyAdminContext(createClient);
  if (context.status !== "admin") throw new Error(context.status === "unavailable" ? "ADMIN_CONTEXT_UNAVAILABLE" : "ADMIN_ACCESS_DENIED");
  return context;
}

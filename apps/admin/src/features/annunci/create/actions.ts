"use server";

import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {verifyAdminContext} from "@/features/auth/server/context";
import {createAdminAuditService} from "@/features/audit/server";
import {createAnnouncementCreation, type CreationRpc} from "./service";

async function verifiedSession() {
      const client = await createClient();
      const context = await verifyAdminContext(async () => client);
      if (context.status !== "admin" || !context.authId) throw new Error(context.status === "unavailable" ? "ADMIN_CONTEXT_UNAVAILABLE" : "ADMIN_ACCESS_DENIED");
      return {actorId: context.authId, rpc: client.rpc.bind(client) as unknown as CreationRpc};
}
function service() {
  return createAnnouncementCreation({
    session: verifiedSession,
    upload: async (path, bytes, mime) => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
      if (!url || !key) throw new Error("STORAGE_UNAVAILABLE");
      const storage = createSupabaseClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}, global: {fetch: (input, init) => fetch(input, {...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000), cache: "no-store"})}}).storage.from("immagini_annunci");
      const {error} = await storage.upload(path, bytes, {contentType: mime, upsert: false});
      // The path includes the verified bytes' SHA-256; retries cannot replace it.
      if (error && !["409", "Duplicate"].includes(String(error.statusCode))) throw new Error("UPLOAD_UNAVAILABLE");
    },
  });
}
export async function searchAnnouncementAuthors(query: string) {return service().search(query);}
export async function getCreationReceipt(id: string) {return service().receipt(id);}
export async function submitAnnouncement(form: FormData) {
  let input: unknown;
  try {input = JSON.parse(String(form.get("input")));} catch {input = null;}
  const image = form.get("image");
  if (image instanceof File && image.size > 5 * 1024 * 1024) {
    try {await verifiedSession();} catch {return {status: "denied" as const};}
    return {status: "invalid" as const, issues: [{path: "announcement.image", severity: "error" as const, code: "INVALID_IMAGE", tab: "contacts" as const, message: "L’immagine supera 5 MB."}]};
  }
  const result = await service().submit(input, image instanceof File && image.size ? new Uint8Array(await image.arrayBuffer()) : undefined);
  if (result.status === "ok") {revalidatePath("/annunci"); revalidatePath("/registro-attivita");}
  else await createAdminAuditService().recordOperationFailure({action: "announcement.create", code: result.status === "invalid" ? "VALIDATION_FAILED" : result.status === "denied" ? "ACCESS_DENIED" : result.status === "conflict" || result.status === "consumed" ? "STATE_CONFLICT" : "OPERATION_FAILED"});
  return result;
}

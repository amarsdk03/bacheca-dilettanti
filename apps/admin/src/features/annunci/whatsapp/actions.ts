"use server";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";
import {verifyAdminContext} from "@/features/auth/server/context";
import {createAdminAuditService} from "@/features/audit/server";
import type {CreationRpc} from "../create/service";
import {createWhatsAppService, validWhatsAppSave} from "./service";
async function session() {
  const client=await createClient(), context=await verifyAdminContext(async () => client);
  if (context.status !== "admin") throw new Error(context.status === "unavailable" ? "ADMIN_CONTEXT_UNAVAILABLE" : "ADMIN_ACCESS_DENIED");
  return {rpc: client.rpc.bind(client) as unknown as CreationRpc};
}
export async function getWhatsAppExport(id: string) {
  return createWhatsAppService({session,websiteOrigin:process.env.NEXT_PUBLIC_WEB_URL}).read(id);
}
export async function saveWhatsAppExport(input: unknown) {
  const result=await createWhatsAppService({session}).save(input);
  if (result.status === "ok") {revalidatePath("/annunci"); revalidatePath("/registro-attivita");}
  else if (validWhatsAppSave(input)) await createAdminAuditService().recordOperationFailure({action:"announcement.whatsapp_export",resourceId:input.id,code:result.status === "conflict" ? "STATE_CONFLICT" : result.status === "denied" ? "ACCESS_DENIED" : result.status === "invalid" || result.status === "not_allowed" ? "VALIDATION_FAILED" : "OPERATION_FAILED"});
  return result;
}

import "server-only";
import {createClient, createReadClient} from "@/lib/supabase/server";
import {createAdminAuditService} from "@/features/audit/server";
import {createPeopleService} from "./service";

export function peopleService(readOnly = false) {
  return createPeopleService({
    async getClient() {const client = await (readOnly ? createReadClient() : createClient()); return {auth: client.auth, rpc: (name, args) => client.rpc(name, args as never)};},
    failure: event => createAdminAuditService().recordOperationFailure(event),
    log: (code, correlationId) => console.error("[admin-people]", {code, correlationId}),
  });
}

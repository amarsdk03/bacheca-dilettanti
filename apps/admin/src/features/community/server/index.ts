import "server-only";
import {createClient, createReadClient} from "@/lib/supabase/server";
import {createAdminAuditService} from "@/features/audit/server";
import {createCommunityService} from "./service";

export function communityService(readOnly = false) {
  return createCommunityService({
    async getClient() {
      const client = await (readOnly ? createReadClient() : createClient());
      return {auth: client.auth, rpc: (name, args) => client.rpc(name, args as never)};
    },
    failure: event => createAdminAuditService().recordOperationFailure(event),
    log: (code, correlationId) => console.error("[admin-community]", {code, correlationId}),
  });
}

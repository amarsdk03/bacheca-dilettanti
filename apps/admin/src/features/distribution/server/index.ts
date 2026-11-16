import "server-only";
import {createClient, createReadClient} from "@/lib/supabase/server";
import {createAdminAuditService} from "@/features/audit/server";
import {createDistributionService} from "./service";
import type {AuditFailureCode} from "@/features/audit/contracts";

export function distributionService(write=false){return createDistributionService({
  async client(){const client=await(write?createClient():createReadClient());return{auth:client.auth,rpc:(name,args)=>client.rpc(name,args as never)};},
  failure:(action,resourceId,code,correlationId)=>createAdminAuditService().recordOperationFailure({action,resourceId,code:code as AuditFailureCode,correlationId}),
  log:correlationId=>console.error("[admin-distribution]",{code:"DISTRIBUTION_UNAVAILABLE",correlationId}),
});}

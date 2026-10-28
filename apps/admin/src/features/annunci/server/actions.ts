"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminAuditService } from "@/features/audit/server";
import { createModerationService } from "./moderation-service";
import type { ModerationResult } from "../moderation";

export async function moderateAnnouncementAction(input: unknown): Promise<ModerationResult> {
  return createModerationService({ getClient: createClient,
    failure: (event) => createAdminAuditService().recordOperationFailure(event),
    log: (code, correlationId) => console.error("[admin-moderation]", { code, correlationId }),
  })(input);
}

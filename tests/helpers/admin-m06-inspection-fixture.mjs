import { readFileSync } from "node:fs";
import { createModerationFixture } from "./admin-moderation-fixture.mjs";

export async function createM06InspectionFixture() {
  const h = await createModerationFixture({ apply: false });
  try {
    const bridge = readFileSync(new URL("../../supabase/migrations/20261024110910_admin_audit_server_bridge.sql", import.meta.url), "utf8");
    await h.db.exec(bridge);
    // The behavioral fixture loads these real bodies without their surrounding
    // migration ACL statements, plus two presentation stubs. Align only these
    // synthetic grants with the already reviewed target's private PUBLIC denial.
    await h.db.exec(`revoke all on function private.publish_text_is_valid(text,boolean,integer),
      private.manage_priority_announcement_lifecycle_v1(),private.stamp_annuncio_visibility_update(),
      private.notify_announcement_v1(),private.notification_target_ref(uuid,uuid),private.notification_profile_ref(uuid)
      from public,anon,authenticated,service_role,supabase_auth_admin;
      revoke all on function public.record_priority_checkout_event_v1(uuid,uuid,text,text,integer,integer,text,text,text,boolean)
      from public,anon,authenticated,service_role,supabase_auth_admin;
      grant execute on function public.record_priority_checkout_event_v1(uuid,uuid,text,text,integer,integer,text,text,text,boolean) to service_role;`);
    return h;
  } catch (error) { await h.db.close(); throw error; }
}

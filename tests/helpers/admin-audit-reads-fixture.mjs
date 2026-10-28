import { readFileSync } from "node:fs";
import { createExportFixture } from "./admin-export-fixture.mjs";
import { listActor as actor, listId as id, listClaims } from "./admin-announcements-fixture.mjs";
export const auditReadsMigration = readFileSync(new URL("../../supabase/migrations/20261024211431_admin_audit_reads.sql", import.meta.url), "utf8");
export async function createAuditReadsFixture() {
  const h = await createExportFixture();
  try {
    await h.db.exec(auditReadsMigration);
    return { ...h,
      async reset() { await h.reset(); await h.db.exec("truncate private.admin_audit_event_v1"); },
      async event(n, extra = {}) {
        const e = { at: "2026-10-23T12:00:00.123456Z", authId: actor.authId, userId: actor.userId,
          action: "auth.login", outcome: "success", resourceType: "session", resourceId: actor.sessionId,
          reason: null, failureCode: null, changes: {}, details: {}, ...extra };
        await h.db.query(`insert into private.admin_audit_event_v1(event_uuid,occurred_at,correlation_uuid,actor_auth_user_uuid,actor_utente_uuid,action,outcome,resource_type,resource_uuid,reason,failure_code,changes,details)
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb)`,
        [id(n), e.at, id(9999), e.authId, e.userId, e.action, e.outcome, e.resourceType, e.resourceId, e.reason, e.failureCode, JSON.stringify(e.changes), JSON.stringify(e.details)]);
        return id(n);
      },
      async auditList(query = {}, claims = listClaims(), role = "authenticated") {
        return (await h.callAs(role, claims, "select public.admin_list_audit_events_v1($1::jsonb) as result", [JSON.stringify(query)])).rows[0].result;
      },
      async auditDetail(eventId, claims = listClaims(), role = "authenticated") {
        return (await h.callAs(role, claims, "select public.admin_get_audit_event_v1($1::uuid) as result", [eventId])).rows[0].result;
      },
    };
  } catch (error) { await h.db.close(); throw error; }
}

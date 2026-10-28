import { readFileSync } from "node:fs";
import { createTrashFixture } from "./admin-trash-fixture.mjs";
import { listClaims } from "./admin-announcements-fixture.mjs";
export const exportMigration = readFileSync(new URL("../../supabase/migrations/20261024205423_admin_announcement_export.sql",import.meta.url),"utf8");
export const selection = items => items.map(r=>({id:r.id,rowFingerprint:r.rowFingerprint,authorName:r.author.displayName}));
export async function createExportFixture() {
  const h=await createTrashFixture();
  try {
    await h.db.exec(readFileSync(new URL("../../supabase/migrations/20261024110910_admin_audit_server_bridge.sql",import.meta.url),"utf8"));
    await h.db.exec(exportMigration);
    return {...h,exportPage:async(query,rows,claims=listClaims(),role="authenticated")=>(await h.callAs(role,claims,"select public.admin_export_announcements_v1($1::jsonb,$2::jsonb) as result",[JSON.stringify(query),JSON.stringify(rows)])).rows[0].result};
  } catch(error) {await h.db.close();throw error;}
}

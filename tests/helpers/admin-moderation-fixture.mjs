import { readFileSync } from "node:fs";
import { createDetailFixture } from "./admin-announcement-detail-fixture.mjs";
import { listClaims } from "./admin-announcements-fixture.mjs";
const read = (name) => readFileSync(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
export const moderationMigration = read("20261024155838_admin_announcement_moderation");
function fn(source, name) { let start = source.indexOf(`create or replace function ${name}(`); if (start < 0) start = source.indexOf(`create function ${name}(`); if (start < 0) throw new Error(name); return source.slice(start, source.indexOf("$$;", start) + 3); }
export async function createModerationFixture({ apply = true } = {}) {
  const h = await createDetailFixture(); const { db } = h;
  try {
    await db.exec(read("20261024104822_admin_audit_foundation"));
    await db.exec(`create table private.announcement_submission(submission_id uuid primary key,announcement_id uuid,requested_announcement_id uuid,
      utente_id uuid,requested_visibility text default 'gratuito',paid_at timestamptz,refund_required_at timestamptz,refunded_at timestamptz,
      stripe_checkout_session_id text,stripe_price_id text,stripe_amount_subtotal integer,stripe_amount_total integer,
      stripe_checkout_status text,stripe_payment_status text,stripe_payment_intent_id text,anonymous_at_publish boolean,created_at timestamptz);
      alter table private.announcement_submission enable row level security;
      alter table public.utente add column if not exists registrato_il timestamptz;
    `);
    const payment = read("20260914130000_reconcile_priority_checkout_amount_rpc");
    await db.exec(fn(read("20260824195350_publish_announcement_workflow"), "private.publish_text_is_valid"));
    await db.exec(fn(payment, "public.record_priority_checkout_event_v1"));
    await db.exec(fn(payment, "private.manage_priority_announcement_lifecycle_v1"));
    await db.exec(`create trigger manage_priority_announcement_lifecycle_v1 before update or delete on public.annuncio
      for each row execute function private.manage_priority_announcement_lifecycle_v1();`);
    // Exact visibility stamp and real payment lifecycle bodies, not simulated results.
    const identity = read("20260824195359_reconcile_auth_identity_registration");
    await db.exec(fn(identity, "private.stamp_annuncio_visibility_update"));
    await db.exec(`create trigger before_annuncio_visibility_update before update of nascosto on public.annuncio
      for each row execute function private.stamp_annuncio_visibility_update();`);
    // Real notification trigger body. Presentation references are minimal local
    // stubs; full notification labels/ACL remain covered by their own suites.
    await db.exec(`create table private.notifiche(id bigint generated always as identity, destinatario uuid,tipo text,evento text unique,dati jsonb);
      create table private.annunci_notificati(annuncio uuid primary key);
      create table public.profilo_follow(uuid_profilo_seguito uuid,uuid_profilo_follower uuid);
      create function private.notification_target_ref(uuid,uuid) returns jsonb language sql as $$select jsonb_build_object('id',$1)$$;
      create function private.notification_profile_ref(uuid) returns jsonb language sql as $$select jsonb_build_object('id',$1)$$;`);
    await db.exec(fn(read("20261005130030_centro_notifiche"), "private.notify_announcement_v1"));
    await db.exec(`create trigger notification_announcement after insert or update of stato_annuncio,nascosto,privato on public.annuncio
      for each row execute function private.notify_announcement_v1();`);
    if (apply) await db.exec(moderationMigration);
    const moderate = async (id, operation, fingerprint, reason = null, claims = listClaims(), role = "authenticated") =>
      (await h.callAs(role, claims, "select public.admin_moderate_announcement_v1($1::uuid,$2,$3,$4) as result", [id, operation, fingerprint, reason])).rows[0].result;
    return { ...h, moderate };
  } catch (error) { await db.close(); throw error; }
}

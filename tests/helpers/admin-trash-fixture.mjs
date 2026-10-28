import { readFileSync } from "node:fs";
import { createModerationFixture } from "./admin-moderation-fixture.mjs";
export const trashMigration = readFileSync(new URL("../../supabase/migrations/20261024162714_admin_announcement_trash.sql", import.meta.url), "utf8");
const read = name => readFileSync(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), "utf8");
function fn(source, name) {
  const match = new RegExp(`create (?:or replace )?function ${name.replaceAll(".", "\\.")}\\(`).exec(source);
  if (!match) throw new Error(name);
  return source.slice(match.index, source.indexOf("$$;", match.index) + 3);
}
export async function createTrashFixture() {
  const h = await createModerationFixture();
  try {
    // Real consumer function bodies, with only their supporting tables/profile
    // presentation synthesized. No remote Auth, Stripe or Storage is contacted.
    await h.db.exec(`alter table private.announcement_submission add column stripe_checkout_attempt integer default 0,
      add column stripe_refund_id text, add column stripe_refund_status text;
      alter table private.notifiche add column creato_il timestamptz default now(),add column letto_il timestamptz,add column interesse_id bigint;
      create table private.manifestazioni_interesse(id bigint,email text,telefono text,uuid_utente_destinatario uuid);
      alter table public.profilo_follow add column sottoprofilo_seguito text,add column sottoprofilo_follower text;
      drop function private.notification_target_ref(uuid,uuid);
      create function private.notification_profile_ref(uuid,text) returns jsonb language sql as $$select jsonb_build_object('id',$1,'kind','profilo','label','Profilo pubblico')$$;
      create table public.localita_profilo(uuid_profilo uuid,sottoprofilo text,regione text);
      create table public.restricted_profile_access(profile_id uuid,profile_type text,allowed_regions text[]);
      create table public.annuncio_generico(uuid_annuncio uuid references public.annuncio on delete cascade,titolo text);
      alter table public.annuncio_generico enable row level security;`);
    const labels = read("20261016193020_notification_labels_and_filters");
    for (const name of ["private.notification_profile_type_label", "private.notification_target_ref", "private.notification_display_ref", "public.get_notifications_v2"]) await h.db.exec(fn(labels,name));
    const follow = read("20261005140622_profile_follow_identities_and_activity");
    await h.db.exec(fn(follow,"private.announcement_profile_type"));
    await h.db.exec(fn(follow,"private.notify_announcement_v1"));
    await h.db.exec(fn(read("20261005130030_centro_notifiche"),"public.get_notifications_v1"));
    const checkout = read("20260911120000_priority_announcement_checkout");
    await h.db.exec(fn(checkout,"public.get_owned_priority_checkout_v1"));
    await h.db.exec(fn(checkout,"private.expire_priority_announcements_v1"));
    await h.db.exec(fn(read("20260914140000_fix_priority_checkout_greatest"),"public.record_priority_checkout_session_v1"));
    await h.db.exec(fn(read("20260914130000_reconcile_priority_checkout_amount_rpc"),"public.record_priority_refund_v1"));
    await h.db.exec(fn(read("20261007152510_professional_regions_and_service_labels"),"private.prune_revoked_professional_regions_v1"));
    await h.db.exec(`alter table public.profilo_giocatore add column tipologie_sport text[],add column ruoli_sport jsonb`);
    await h.db.exec(fn(read("20260924122000_reconcile_publish_dates_and_profile_snapshots"),"private.sync_published_profile_snapshot_v1"));
    await h.db.exec(`create trigger prune_regions after insert or update on public.restricted_profile_access for each row execute function private.prune_revoked_professional_regions_v1()`);
    const auto = readFileSync(new URL("../../supabase/scripts/auto_approve_announcements_until_2026_10_25.sql",import.meta.url),"utf8");
    // Keep the temporary window open deterministically; preserve its real body.
    await h.db.exec(fn(auto,"private.auto_approve_new_announcement_until_v1").replace("2026-10-26","2999-10-26"));
    await h.db.exec(trashMigration);
    return h;
  }
  catch (error) { await h.db.close(); throw error; }
}

import { readFileSync } from "node:fs";
import { createM06InspectionFixture } from "./admin-m06-inspection-fixture.mjs";
import { moderationMigration } from "./admin-moderation-fixture.mjs";
import { trashMigration } from "./admin-trash-fixture.mjs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
export async function createM07InspectionFixture({ apply = false, crlf = false } = {}) {
  const h = await createM06InspectionFixture();
  try {
    await h.db.exec(`alter table private.announcement_submission add column stripe_checkout_attempt integer default 0,
      add column stripe_refund_id text,add column stripe_refund_status text;
      alter table private.notifiche add column creato_il timestamptz default now(),add column letto_il timestamptz,add column interesse_id bigint;
      create table private.manifestazioni_interesse(id bigint,email text,telefono text,uuid_utente_destinatario uuid);
      alter table public.profilo_follow add column sottoprofilo_seguito text,add column sottoprofilo_follower text;
      drop function private.notification_target_ref(uuid,uuid);
      create function private.notification_profile_ref(uuid,text) returns jsonb language sql as $$select jsonb_build_object('id',$1,'kind','profilo','label','Profilo pubblico')$$;
      create function private.notification_profile_type_label(text) returns text language sql as $$select $1$$;
      create function private.announcement_profile_type(text) returns text language sql as $$select 'giocatore'::text$$;
      revoke all on function private.notification_profile_ref(uuid,text),private.notification_profile_type_label(text),private.announcement_profile_type(text) from public;
      create table public.localita_profilo(uuid_profilo uuid,sottoprofilo text,regione text);
      create table public.restricted_profile_access(profile_id uuid,profile_type text,allowed_regions text[]);
      create table public.annuncio_generico(titolo text not null,contenuto text,uuid_annuncio uuid primary key references public.annuncio on delete cascade);
      alter table public.annuncio_generico enable row level security;
      alter table public.localita_profilo enable row level security;
      alter table public.restricted_profile_access enable row level security;
      alter table public.profilo_follow enable row level security;
      alter table private.notifiche enable row level security;
      alter table private.manifestazioni_interesse enable row level security;
      alter table public.profilo_arbitro enable row level security;
      alter table public.profilo_campi_impianti enable row level security;
      alter table public.profilo_creator enable row level security;
      alter table public.profilo_servizi_consulenze enable row level security;
      alter table public.profilo_squadra enable row level security;
      alter table public.profilo_staff_sportivo enable row level security;
      alter table public.profilo_torneo_evento enable row level security;
      alter table public.utente enable row level security;`);
    const consumers = read("../fixtures/admin-m07-reviewed-consumers.sql");
    await h.db.exec(crlf ? consumers.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n") : consumers);
    await h.db.exec(moderationMigration);
    await h.db.exec(read("../../supabase/migrations/20261026100239_admin_m06_legacy_payment_hold_compatibility.sql"));
    await h.db.exec(`create trigger prune_revoked_professional_regions after insert or update of allowed_regions on public.restricted_profile_access
      for each row execute function private.prune_revoked_professional_regions_v1();
      create constraint trigger auto_approve_new_announcement_until_v1 after insert on public.annuncio
      deferrable initially deferred for each row execute function private.auto_approve_new_announcement_until_v1();`);
    if (apply) await h.db.exec(crlf ? trashMigration.replaceAll("\r\n", "\n").replaceAll("\n", "\r\n") : trashMigration);
    return h;
  } catch (error) { await h.db.close(); throw error; }
}

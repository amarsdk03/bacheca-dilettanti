import { readFileSync } from "node:fs";
import { createAuditReadsFixture } from "./admin-audit-reads-fixture.mjs";
import { listId as id, listClaims } from "./admin-announcements-fixture.mjs";
export const homeMigration = readFileSync(new URL("../../supabase/migrations/20261024212824_admin_home_aggregations.sql", import.meta.url), "utf8");
export async function createHomeFixture() {
  const h = await createAuditReadsFixture();
  try {
    await h.db.exec("alter table public.profilo add column tipologia_principale text");
    await h.db.exec(homeMigration);
    return { ...h,
      async user(n, { registered = "2026-01-01T12:00:00.000000Z", type = "Utente" } = {}) {
        await h.db.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())", [id(n), `user-${n}@example.test`]);
        await h.db.query("insert into public.utente(utente_uuid,auth_user_uuid,tipologia_utente,registrato_il) values($1,$2,$3,$4)", [id(n + 100000), id(n), type, registered]);
        return id(n + 100000);
      },
      async profile(n, owner, { type = "giocatore", hidden = false } = {}) {
        await h.db.query("insert into public.profilo(uuid,uuid_utente,tipologia_principale,nascosto) values($1,$2,$3,$4)", [id(n), owner, type, hidden]);
      },
      async summary(claims = listClaims(), role = "authenticated") {
        return (await h.callAs(role, claims, "select public.admin_get_home_summary_v1() result")).rows[0].result;
      },
      async chart(metric, claims = listClaims(), role = "authenticated") {
        return (await h.callAs(role, claims, "select public.admin_get_home_chart_v1($1) result", [metric])).rows[0].result;
      },
      // Only the two metric clocks are replaced, after installation/testing of
      // the original migration. No production clock parameter or logic mock.
      async withClock(timestamp, fn) {
        const definitions = (await h.db.query("select pg_get_functiondef(oid) definition from pg_proc where oid in ('private.admin_get_home_summary_bridge_v1()'::regprocedure,'private.admin_get_home_chart_bridge_v1(text)'::regprocedure)")).rows.map(r => r.definition);
        await h.db.exec("create function private.home_test_now() returns timestamptz language sql stable as $$ select current_setting('test.home_now')::timestamptz $$");
        await h.db.query("select set_config('test.home_now',$1,false)", [timestamp]);
        try {
          for (const definition of definitions) await h.db.exec(definition.replaceAll("statement_timestamp()", "private.home_test_now()"));
          return await fn();
        } finally {
          for (const definition of definitions) await h.db.exec(definition);
          await h.db.exec("drop function private.home_test_now()");
        }
      },
    };
  } catch (error) { await h.db.close(); throw error; }
}

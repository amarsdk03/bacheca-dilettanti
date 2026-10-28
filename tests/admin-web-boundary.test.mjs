import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

// Execute the actual server module with synthetic Auth/database responses.
// No environment variables, network, cookies or database services are used.
function loadViewer(kind, lookupError = null) {
  let profileReads = 0;
  let selected = "";
  const supabase = {
    auth: {
      getClaims: async () => ({ data: { claims: { sub: "auth-id" } } }),
      getUser: async () => ({ data: { user: {
        id: "auth-id", email: "synthetic@example.test", email_confirmed_at: "2026-01-01T00:00:00Z",
        user_metadata: {}, app_metadata: {},
      } } }),
    },
    from(table) {
      if (table === "profilo") profileReads++;
      return {
        select(columns) {
          if (table === "utente") selected = columns;
          const query = { eq: () => query, maybeSingle: async () => ({
            data: table === "utente" ? {
              utente_uuid: "application-id", registrato_il: null, tipologia_utente: kind,
            } : { link_foto_profilo: null },
            error: table === "utente" ? lookupError : null,
          }) };
          return query;
        },
      };
    },
  };
  const { outputText } = ts.transpileModule(readFileSync(new URL("../apps/web/src/features/auth/server/queries.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  const dependencies = {
    "server-only": {}, react: { cache: (fn) => fn },
    "next/navigation": { redirect: (url) => { throw new Error(`redirect:${url}`); } },
    "@/lib/supabase/server": { createClient: async () => supabase },
  };
  new Function("require", "exports", "console", outputText)((name) => {
    assert(Object.hasOwn(dependencies, name), `Unexpected import ${name}`);
    return dependencies[name];
  }, exports, { error() {} });
  return { ...exports, profileReads: () => profileReads, selected: () => selected };
}

test("dedicated Admin has no Web viewer or personal profile lookup", async () => {
  const viewer = loadViewer("Admin");
  assert.equal(await viewer.getAuthenticatedViewer(), null);
  assert.equal(viewer.profileReads(), 0);
  assert.match(viewer.selected(), /tipologia_utente/);
  await assert.rejects(viewer.requireAuthenticatedViewer(), /redirect:/);
});
test("ordinary Web account keeps its separate Auth/application IDs", async () => {
  const viewer = loadViewer("Utente");
  const account = await viewer.getAuthenticatedViewer();
  assert.equal(account.authUserId, "auth-id");
  assert.equal(account.utenteId, "application-id");
  assert.equal(viewer.profileReads(), 1);
});
test("role lookup errors deny access instead of assuming ordinary account", async () => {
  const viewer = loadViewer("Utente", { code: "synthetic-error" });
  assert.equal(await viewer.getAuthenticatedViewer(), null);
  assert.equal(viewer.profileReads(), 0);
});

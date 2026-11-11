import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

// Execute the actual server module with synthetic Auth/database responses.
// No environment variables, network, cookies or database services are used.
function loadViewer(kind, lookupError = null, {
  claims = { sub: "auth-id" },
  emailConfirmedAt = "2026-01-01T00:00:00Z",
  publicUser = { utente_uuid: "application-id", registrato_il: null, tipologia_utente: kind },
  userMetadata = {},
} = {}) {
  let profileReads = 0;
  let selected = "";
  const supabase = {
    auth: {
      getClaims: async () => ({ data: { claims } }),
      getUser: async () => ({ data: { user: {
        id: "auth-id", email: "synthetic@example.test", email_confirmed_at: emailConfirmedAt,
        user_metadata: userMetadata, app_metadata: {},
      } } }),
    },
    from(table) {
      if (table === "profilo") profileReads++;
      return {
        select(columns) {
          if (table === "utente") selected = columns;
          const query = { eq: () => query, maybeSingle: async () => ({
            data: table === "utente" ? publicUser : { link_foto_profilo: null },
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
  assert.equal(await viewer.getCurrentViewer(), null);
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

test("OTP-only identities stay authenticated for publication without becoming visible site accounts", async () => {
  for (const publicUser of [null, { utente_uuid: "application-id", registrato_il: null, tipologia_utente: "Utente" }]) {
    const viewer = loadViewer("Utente", null, { publicUser });
    assert.equal(await viewer.getCurrentViewer(), null);
    const account = await viewer.getAuthenticatedViewer();
    assert.equal(account.authUserId, "auth-id");
    assert.equal(account.registeredAt, null);
    assert.equal(account.viewer.email, "synthetic@example.test");
    assert.equal((await viewer.requireAuthenticatedViewer()).authUserId, "auth-id");
  }
});

test("a registered Web account remains visible only with its application identity", async () => {
  const registeredAt = "2026-01-02T00:00:00Z";
  const viewer = loadViewer("Utente", null, { publicUser: { utente_uuid: "application-id", registrato_il: registeredAt, tipologia_utente: "Utente" } });
  assert.deepEqual(await viewer.getCurrentViewer(), (await viewer.getAuthenticatedViewer()).viewer);
  assert.equal((await viewer.getCurrentViewer()).email, "synthetic@example.test");
  const withoutIdentity = loadViewer("Utente", null, { publicUser: { utente_uuid: null, registrato_il: registeredAt, tipologia_utente: "Utente" } });
  assert.equal(await withoutIdentity.getCurrentViewer(), null);
});

test("missing sessions and unconfirmed emails cannot produce a visible viewer", async () => {
  for (const overrides of [{ claims: null }, { emailConfirmedAt: null }]) {
    const viewer = loadViewer("Utente", null, overrides);
    assert.equal(await viewer.getCurrentViewer(), null);
    assert.equal(await viewer.getAuthenticatedViewer(), null);
    assert.equal(viewer.profileReads(), 0);
  }
});

test("user-editable metadata cannot complete site registration", async () => {
  const viewer = loadViewer("Utente", null, { userMetadata: { registeredAt: "2026-01-02T00:00:00Z", registrato_il: "2026-01-02T00:00:00Z" } });
  assert.equal(await viewer.getCurrentViewer(), null);
});

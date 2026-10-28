import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const require = createRequire(import.meta.url);
const correlationId = "dddddddd-dddd-4ddd-8ddd-000000000001";
function uiLoader({ state = { status: "idle" }, pending = false, visible = false, context = { status: "anonymous" } } = {}) {
  return adminServerLoader({ dependencies: {
    react: { ...React, useActionState: (_action, initial) => [initial.status === "idle" ? state : initial, () => {}, pending], useState: (initial) => [typeof initial === "function" ? initial() : visible, () => {}] },
    "react/jsx-runtime": require("react/jsx-runtime"),
    "@base-ui/react/button": require("@base-ui/react/button"),
    "@base-ui/react/input": require("@base-ui/react/input"),
    "@base-ui/react/separator": require("@base-ui/react/separator"),
    "@base-ui/react/tooltip": require("@base-ui/react/tooltip"),
    "@base-ui/react/merge-props": require("@base-ui/react/merge-props"),
    "@base-ui/react/use-render": require("@base-ui/react/use-render"),
    "class-variance-authority": require("class-variance-authority"),
    clsx: require("clsx"), "tailwind-merge": require("tailwind-merge"), "lucide-react": require("lucide-react"),
    "next/image": { __esModule: true, default: ({ src, alt, width, height, className }) => React.createElement("img", { src, alt, width, height, className }) },
    "next/navigation": { redirect: (url) => { throw new Error("REDIRECT:" + url); } },
    "@/features/auth/server/queries": { getAdminContext: async () => context },
    "@/features/home/server/queries": { getAdminHomeSummary: async () => ({ status: "unavailable", correlationId: "test" }), getAdminHomeActivity: async () => ({ status: "unavailable", correlationId: "test" }) },
    "@/features/home/server/blocks": { HomeKpiSection: () => null, HomeActivitySection: () => null },
    "next/link": { __esModule: true, default: ({ href, children, ...props }) => { delete props.prefetch; return React.createElement("a", { href, ...props }, children); } },
    "../server/actions": { loginAction() {}, logoutAction() {} },
  } });
}

test("login renders labelled email/password fields, accessible visibility toggle and Key submit", () => {
  const { LoginForm } = uiLoader()("apps/admin/src/features/auth/components/LoginForm.tsx");
  const html = renderToStaticMarkup(React.createElement(LoginForm));
  assert.match(html, /for="admin-email"[^>]*>Indirizzo admin/); assert.match(html, /type="email"/);
  assert.match(html, /autoComplete="username"/); assert.match(html, /autoComplete="current-password"/);
  assert.match(html, /type="password"/); assert.match(html, /aria-label="Mostra password"/);
  assert.match(html, /aria-controls="admin-password"/); assert.match(html, /aria-pressed="false"/);
  assert.match(html, /lucide-key/); assert.match(html, />Accedi</);
});

test("visibility and pending states preserve form semantics and prevent duplicate submissions", () => {
  const { LoginForm } = uiLoader({ visible: true, pending: true })("apps/admin/src/features/auth/components/LoginForm.tsx");
  const html = renderToStaticMarkup(React.createElement(LoginForm));
  assert.match(html, /type="text"/); assert.match(html, /aria-label="Nascondi password"/);
  assert.match(html, /aria-pressed="true"/); assert.match(html, /aria-busy="true"/);
  assert.match(html, /Accesso in corso…/); assert.match(html, /disabled/); assert.match(html, /Caricamento/);
});

test("field errors are associated with invalid controls", () => {
  const { LoginForm } = uiLoader({ state: { status: "invalid", fieldErrors: { email: "Email non valida", password: "Password richiesta" } } })("apps/admin/src/features/auth/components/LoginForm.tsx");
  const html = renderToStaticMarkup(React.createElement(LoginForm));
  assert.match(html, /aria-describedby="admin-email-error"/); assert.match(html, /aria-describedby="admin-password-error"/);
  assert.match(html, /aria-invalid="true"/); assert.match(html, /id="admin-email-error"/); assert.match(html, /role="alert"/);
});

test("cleanup failure provides a separate logout form rather than nesting forms", () => {
  const { LoginForm } = uiLoader({ state: { status: "unavailable", cleanup: "failed", revocation: "failed", correlationId } })("apps/admin/src/features/auth/components/LoginForm.tsx");
  const html = renderToStaticMarkup(React.createElement(LoginForm));
  assert.equal((html.match(/<form /g) ?? []).length, 2);
  assert(html.indexOf("</form>") < html.lastIndexOf("<form ")); assert.match(html, /revoca remota/); assert.match(html, /Logout/);
  assert.match(html, new RegExp(correlationId));
});

test("compact logout announces cleanup failure without overflowing the icon sidebar", () => {
  const load = uiLoader({ state: { status: "cleanup_failed", correlationId } });
  const { LogoutForm } = load("apps/admin/src/features/auth/components/LogoutForm.tsx");
  const { TooltipProvider } = load("apps/admin/src/components/ui/tooltip.tsx");
  const html = renderToStaticMarkup(React.createElement(TooltipProvider, null, React.createElement(LogoutForm, { compact: true })));
  assert.match(html, /role="alert" class="sr-only"/); assert.match(html, new RegExp(correlationId));
  assert(!html.includes('data-slot="alert-description"')); assert.match(html, /aria-label="Logout"/);
});

test("access and loading views provide retry/logout and skeletons without private context", () => {
  const load = uiLoader();
  const { AccessState } = load("apps/admin/src/features/auth/components/AccessState.tsx");
  const html = renderToStaticMarkup(React.createElement(AccessState, { unavailable: true }));
  assert.match(html, /href="\/accesso"/); assert.match(html, /Logout/); assert.match(html, /Verifica accesso non disponibile/);
  const { AccessSkeleton } = load("apps/admin/src/features/auth/components/AccessSkeleton.tsx");
  const skeleton = renderToStaticMarkup(React.createElement(AccessSkeleton));
  assert.match(skeleton, /aria-busy="true"/); assert.match(skeleton, /data-slot="skeleton"/);
});

for (const context of [{ status: "anonymous" }, { status: "denied", authId: null }]) {
  test(`protected root redirects invalid/absent sessions ${JSON.stringify(context)}`, async () => {
    const page = uiLoader({ context })("apps/admin/src/app/(dashboard)/page.tsx").default;
    await assert.rejects(page(), /REDIRECT:\/accesso/);
  });
}
for (const status of ["denied", "unavailable"]) {
  test(`protected root never renders Home for ${status}`, async () => {
    const page = uiLoader({ context: { status, authId: "secret-auth-id" } })("apps/admin/src/app/(dashboard)/page.tsx").default;
    await assert.rejects(page(), /REDIRECT:\/accesso/);
  });
}

test("verified root shows minimal Home while access page redirects existing Admin", async () => {
  const load = uiLoader({ context: { status: "admin", authId: "secret-auth-id", userId: "secret-app-id" } });
  const html = renderToStaticMarkup(await load("apps/admin/src/app/(dashboard)/page.tsx").default());
  assert.match(html, /Bentornato, admin!/); assert(!html.includes("secret-auth-id")); assert(!html.includes("secret-app-id"));
  await assert.rejects(load("apps/admin/src/app/accesso/page.tsx").default({ searchParams: Promise.resolve({}) }), /REDIRECT:\//);
});

test("anonymous access page shows the banner/login, and only bounded logout notices", async () => {
  const page = uiLoader()("apps/admin/src/app/accesso/page.tsx").default;
  const html = renderToStaticMarkup(await page({ searchParams: Promise.resolve({ uscita: "audit" }) }));
  assert.match(html, /banner.png/); assert.match(html, /Indirizzo admin/); assert.match(html, /registrazione dell’uscita/);
  const untrusted = renderToStaticMarkup(await page({ searchParams: Promise.resolve({ uscita: "secret arbitrary message" }) }));
  assert(!untrusted.includes("secret arbitrary message"));
});

function actions({ login = { status: "authenticated" }, cleanup = "cleared", revocation = "succeeded", audit = "recorded" } = {}) {
  return adminServerLoader({ dependencies: {
    "next/navigation": { redirect(url) { throw new Error("REDIRECT:" + url); } },
    "./index": { createAdminAuthService: () => ({ login: async () => login,
      logout: async () => ({ cleanup, revocation, audit: { status: audit, correlationId } }) }) },
  } })("apps/admin/src/features/auth/server/actions.ts");
}
test("login action redirects only to fixed root and never catches framework redirect", async () => {
  const input = new FormData(); input.set("next", "https://evil.example.test");
  await assert.rejects(actions().loginAction({ status: "idle" }, input), /^Error: REDIRECT:\/$/);
  const failure = { status: "denied", correlationId, cleanup: "cleared" };
  assert.deepEqual(await actions({ login: failure }).loginAction({}, input), failure);
});
for (const [options, destination] of [[{}, "/accesso"], [{ revocation: "failed" }, "/accesso?uscita=parziale"], [{ audit: "unavailable" }, "/accesso?uscita=audit"]]) {
  test(`logout action redirects with bounded outcome ${destination}`, async () => {
    await assert.rejects(actions(options).logoutAction(), (error) => error.message === "REDIRECT:" + destination);
  });
}
test("logout action reports failed cookie cleanup without claiming exit or redirecting", async () => {
  assert.deepEqual(await actions({ cleanup: "failed" }).logoutAction(), { status: "cleanup_failed", correlationId });
});

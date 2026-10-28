import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const require = createRequire(import.meta.url);
const dashboardRoot = "apps/admin/src/app/(dashboard)/";
function harness({ pathname = "/", status = "admin" } = {}) {
  let currentStatus = status, verifications = 0;
  const dependencies = {
    react: { ...React, useActionState: () => [{ status: "idle" }, () => {}, false] },
    "react/jsx-runtime": require("react/jsx-runtime"),
    "next/image": { __esModule: true, default: ({ src, alt, width, height, className }) => React.createElement("img", { src, alt, width, height, className }) },
    "next/link": { __esModule: true, default: ({ href, children, className, onClick, ...props }) => {
      delete props.prefetch;
      return React.createElement("a", { href, className, onClick, ...props }, children);
    } },
    "next/navigation": { usePathname: () => pathname, redirect(url) { throw new Error("REDIRECT:" + url); }, notFound() { throw new Error("NOT_FOUND"); } },
    "@/features/auth/server/queries": { getAdminContext: async () => { verifications++; return { status: currentStatus, authId: "never-serialize-auth-id" }; } },
    "@/features/auth/server/actions": { logoutAction() {} },
    "@/features/home/server/queries": { getAdminHomeSummary: async () => ({ status: "unavailable", correlationId: "test" }), getAdminHomeActivity: async () => ({ status: "unavailable", correlationId: "test" }) },
    // Streaming data blocks have dedicated coverage in admin-home-interface.
    "@/features/home/server/blocks": { HomeKpiSection: () => null, HomeActivitySection: () => null },
    "../server/actions": { logoutAction() {} },
  };
  for (const name of ["@base-ui/react/button", "@base-ui/react/input", "@base-ui/react/separator", "@base-ui/react/tooltip",
    "@base-ui/react/dialog", "@base-ui/react/alert-dialog", "@base-ui/react/merge-props", "@base-ui/react/use-render",
    "class-variance-authority", "clsx", "tailwind-merge", "lucide-react"]) dependencies[name] = require(name);
  return { load: adminServerLoader({ dependencies }), setStatus(value) { currentStatus = value; }, count: () => verifications };
}

test("catalog contains exactly the approved order/groups and unique routes", () => {
  const { DASHBOARD_SECTIONS: sections, DASHBOARD_GROUPS: groups, findDashboardSection, isSectionActive } = harness().load("apps/admin/src/features/dashboard/sections.ts");
  assert.deepEqual(sections.map(({ title }) => title), ["Home", "Annunci", "Segnalazioni", "Utenti", "Profili", "Codici invito", "Pagamenti", "Promo e crediti", "Distribuzione", "Statistiche", "Registro attività", "Integrazioni", "Versioni sito web"]);
  assert.deepEqual(groups, [null, "Contenuti", "Community", "Gestione", "Analitiche"]);
  assert.equal(new Set(sections.map(({ href }) => href)).size, 13);
  assert.equal(findDashboardSection("impostazioni"), undefined); assert.equal(findDashboardSection("__proto__"), undefined);
  assert(isSectionActive("/annunci/123", "/annunci")); assert(!isSectionActive("/annunci-vecchi", "/annunci")); assert(!isSectionActive("/annunci", "/"));
});

for (const status of ["anonymous", "denied", "unavailable"]) {
  test(`layout, Home and direct section entry all deny ${status}`, async () => {
    const h = harness({ status });
    await assert.rejects(h.load(dashboardRoot + "layout.tsx").default({ children: "private child" }), /REDIRECT:\/accesso/);
    await assert.rejects(h.load(dashboardRoot + "page.tsx").default(), /REDIRECT:\/accesso/);
    await assert.rejects(h.load(dashboardRoot + "[section]/page.tsx").default({ params: Promise.resolve({ section: "annunci" }) }), /REDIRECT:\/accesso/);
    assert.equal(h.count(), 3);
  });
}

test("page guard rechecks after role revocation even when layout was already accepted", async () => {
  const h = harness();
  await h.load(dashboardRoot + "layout.tsx").default({ children: "content" });
  h.setStatus("denied");
  await assert.rejects(h.load(dashboardRoot + "[section]/page.tsx").default({ params: Promise.resolve({ section: "registro-attivita" }) }), /REDIRECT:\/accesso/);
});

test("every provisional section has its exact title/icon and approved message", async () => {
  const h = harness();
  const { DASHBOARD_SECTIONS: sections } = h.load("apps/admin/src/features/dashboard/sections.ts");
  const page = h.load(dashboardRoot + "[section]/page.tsx").default;
  for (const section of sections.slice(1).filter((section) => section.slug !== "annunci")) {
    const html = renderToStaticMarkup(await page({ params: Promise.resolve({ section: section.slug }) }));
    assert.match(html, new RegExp(section.title)); assert.match(html, /<h1[^>]*>.*<svg/);
    assert.match(html, /Presto in arrivo…/); assert.match(html, /Tranquillo Gabbo, ti prometto che questa sezione arriverà molto presto/);
    assert(!html.includes("never-serialize-auth-id")); assert(!html.includes("<table"));
  }
  await assert.rejects(page({ params: Promise.resolve({ section: "not-a-section" }) }), /NOT_FOUND/);
  await assert.rejects(page({ params: Promise.resolve({ section: "" }) }), /NOT_FOUND/);
});

test("Home keeps one welcome heading without an icon or duplicate logout", async () => {
  const html = renderToStaticMarkup(await harness().load(dashboardRoot + "page.tsx").default());
  assert.match(html, /Bentornato, admin!/); assert(!html.match(/<h1[^>]*>[\s\S]*?<\/h1>/)?.[0].includes("<svg")); assert(!html.includes("<form"));
});

test("desktop shell shows navigation, active section, skip link, main landmark and footer logout", async () => {
  const h = harness({ pathname: "/annunci" });
  const tree = await h.load(dashboardRoot + "layout.tsx").default({ children: React.createElement("p", null, "Synthetic content") });
  const html = renderToStaticMarkup(tree);
  assert.match(html, /data-state="expanded"/); assert.match(html, /Salta al contenuto/); assert.match(html, /<main/);
  assert.match(html, /id="dashboard-content"/); assert.match(html, /aria-label="Sezioni della dashboard"/);
  assert.match(html, /aria-current="page"[^>]*href="\/annunci"|href="\/annunci"[^>]*aria-current="page"/);
  assert.match(html, /banner.png/); assert.match(html, /Synthetic content/);
  assert.equal((html.match(/<form /g) ?? []).length, 1);
  assert(html.indexOf("Versioni sito web") < html.indexOf("data-slot=\"sidebar-footer\""));
  assert(!html.includes("never-serialize-auth-id"));
});

test("collapsed sidebar keeps accessible links, compact logo and logout without writing cookies", () => {
  const h = harness({ pathname: "/utenti" });
  const { SidebarProvider } = h.load("apps/admin/src/components/ui/sidebar.tsx");
  const { TooltipProvider } = h.load("apps/admin/src/components/ui/tooltip.tsx");
  const { DashboardSidebar } = h.load("apps/admin/src/features/dashboard/components/DashboardSidebar.tsx");
  const html = renderToStaticMarkup(React.createElement(TooltipProvider, null,
    React.createElement(SidebarProvider, { defaultOpen: false }, React.createElement(DashboardSidebar))));
  assert.match(html, /data-state="collapsed"/); assert.match(html, /data-collapsible="icon"/);
  assert.match(html, /logo.png/); assert.match(html, /aria-label="Logout"/); assert.match(html, /aria-label="Utenti"/);
  assert.match(html, /<button[^>]*type="submit"[^>]*aria-label="Logout"|<button[^>]*aria-label="Logout"[^>]*type="submit"/);
  assert(!readFileSync(new URL("../apps/admin/src/components/ui/sidebar.tsx", import.meta.url), "utf8").includes("document.cookie"));
});

test("mobile menu selections/close control dismiss the drawer and keep the banner even after desktop collapse", () => {
  const h = harness({ pathname: "/profili" });
  const sidebar = h.load("apps/admin/src/components/ui/sidebar.tsx");
  const dismissed = [];
  sidebar.useSidebar = () => ({ state: "collapsed", isMobile: true, setOpenMobile: (open) => dismissed.push(open) });
  const { DashboardSidebar } = h.load("apps/admin/src/features/dashboard/components/DashboardSidebar.tsx");
  const tree = DashboardSidebar();
  const elements = [];
  const visit = (node) => {
    if (!React.isValidElement(node)) return;
    elements.push(node); React.Children.forEach(node.props.children, visit);
  };
  visit(tree);
  const image = elements.find((node) => node.props.src === "/banner.png"); assert(image);
  const close = elements.find((node) => node.props["aria-label"] === "Chiudi menu"); assert(close);
  close.props.onClick();
  const links = elements.filter((node) => node.props.tooltip && node.props.render?.props.href);
  assert.equal(links.length, 13); links[4].props.onClick();
  assert.deepEqual(dismissed, [false, false]);
});

test("mobile drawer has a dialog title and restores focus to the visible menu trigger", () => {
  const trigger = {};
  const context = { isMobile: true, state: "expanded", openMobile: true, setOpenMobile() {} };
  const deps = { react: { ...React, useContext: () => context }, "react/jsx-runtime": require("react/jsx-runtime") };
  for (const name of ["@base-ui/react/button", "@base-ui/react/input", "@base-ui/react/separator", "@base-ui/react/tooltip", "@base-ui/react/dialog",
    "@base-ui/react/merge-props", "@base-ui/react/use-render", "class-variance-authority", "clsx", "tailwind-merge", "lucide-react"]) deps[name] = require(name);
  const loader = adminServerLoader({ dependencies: deps, globals: { document: { querySelector: () => trigger } } });
  const drawer = loader("apps/admin/src/components/ui/sidebar.tsx").Sidebar({ children: "content" });
  assert.equal(drawer.props.open, true);
  const popup = drawer.props.children;
  assert.equal(popup.props["data-mobile"], "true"); assert.equal(popup.props.finalFocus(), trigger);
  const header = React.Children.toArray(popup.props.children)[0];
  assert.equal(React.Children.toArray(header.props.children)[0].props.children, "Menu della dashboard");
});

test("common skeletons are bounded and the error state exposes retry without leaking raw errors", () => {
  const h = harness();
  const skeletons = h.load("apps/admin/src/features/dashboard/components/ContentSkeletons.tsx");
  const table = renderToStaticMarkup(React.createElement(skeletons.TableSkeleton, { rows: 99, columns: 3 }));
  assert.equal((table.match(/data-slot="table-row"/g) ?? []).length, 30);
  assert.match(table, /overflow-x-auto/);
  for (const name of ["CardSkeleton", "ChartSkeleton", "PanelSkeleton", "SectionSkeleton"]) {
    assert.match(renderToStaticMarkup(React.createElement(skeletons[name])), /aria-busy="true"/);
  }
  let retries = 0;
  const { ContentError } = h.load("apps/admin/src/features/dashboard/components/ContentError.tsx");
  const tree = ContentError({ retry: () => retries++ });
  const html = renderToStaticMarkup(tree); assert.match(html, /Riprova/);
  React.Children.toArray(tree.props.children)[1].props.onClick(); assert.equal(retries, 1);
  const ErrorPage = h.load(dashboardRoot + "error.tsx").default;
  const errorHtml = renderToStaticMarkup(React.createElement(ErrorPage, { error: new Error("secret raw error"), retry() {} }));
  assert(!errorHtml.includes("secret"));
});

test("login stays outside the dashboard group and copied logo matches the existing asset", () => {
  assert(existsSync(new URL("../apps/admin/src/app/accesso/page.tsx", import.meta.url)));
  assert(!existsSync(new URL("../apps/admin/src/app/page.tsx", import.meta.url)));
  assert.deepEqual(readFileSync(new URL("../apps/admin/public/logo.png", import.meta.url)), readFileSync(new URL("../apps/web/public/logo.png", import.meta.url)));
});

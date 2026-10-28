import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import React from "react";
import { adminServerLoader } from "./helpers/admin-server-loader.mjs";

const require = createRequire(import.meta.url);
const origin = "https://admin.example.test";
const path = "apps/admin/src/features/navigation/ExternalNavigation.tsx";
const pure = adminServerLoader()("apps/admin/src/features/navigation/navigation-url.ts");

for (const href of ["javascript:alert(1)", "data:text/html,test", "vbscript:test", "ftp://example.test", "mailto:test@example.test",
  "https://user:password@example.test", "//user@example.test", "https://", "", "  ", "https://example.test/\nsecret"]) {
  test(`unsafe href is never rendered as a navigable destination: ${JSON.stringify(href)}`, () => {
    assert.equal(pure.safeNavigationHref(href), undefined);
    assert.equal(pure.classifyNavigation(href, origin).kind, "invalid");
  });
}
test("relative/hash and same-origin links are internal; official/public and different ports remain external", () => {
  for (const href of ["/annunci", "?filter=1", "#details", origin + "/utenti"]) assert.equal(pure.classifyNavigation(href, origin).kind, "internal");
  for (const href of ["https://www.bachecadilettanti.it/annunci", "//external.example.test/path", origin + ":8443/path", "http://admin.example.test/path"]) {
    assert.equal(pure.classifyNavigation(href, origin).kind, "external");
  }
});

/** Exercise actual component handlers with request-local hook state. DOM focus
 * trapping/browser tab creation are deliberately left to integration checks.
 */
function harness() {
  const state = [], refs = [], requests = [];
  let stateIndex = 0, refIndex = 0, contextValue;
  const dependencies = {
    react: { ...React,
      useState(initial) { const i = stateIndex++; if (!(i in state)) state[i] = initial; return [state[i], (value) => { state[i] = value; }]; },
      useRef(initial) { const i = refIndex++; if (!(i in refs)) refs[i] = { current: initial }; return refs[i]; },
      useContext: () => contextValue,
    },
    "react/jsx-runtime": require("react/jsx-runtime"),
  };
  for (const name of ["@base-ui/react/alert-dialog", "@base-ui/react/button", "class-variance-authority", "lucide-react", "clsx", "tailwind-merge"]) dependencies[name] = require(name);
  const components = adminServerLoader({ dependencies, globals: { window: { location: { origin } } } })(path);
  const render = () => {
    stateIndex = 0; refIndex = 0;
    const tree = components.ExternalNavigationProvider({ children: "synthetic content" });
    contextValue = (href, source) => { requests.push({ href, source }); return tree.props.value(href, source); };
    const dialog = React.Children.toArray(tree.props.children)[1];
    const popup = dialog.props.children;
    const [header, footer] = React.Children.toArray(popup.props.children);
    const [cancel, confirm] = React.Children.toArray(footer.props.children);
    return { dialog, popup, header, cancel, confirm };
  };
  const source = { isConnected: true };
  const event = (options = {}) => ({ button: 0, currentTarget: source, defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; }, ...options });
  return { ...components, render, event, requests, source, withoutProvider() { contextValue = null; } };
}

for (const options of [{}, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { detail: 0 }]) {
  test(`external activation waits for confirmation, including modifiers/middle/keyboard ${JSON.stringify(options)}`, () => {
    const h = harness(); h.render();
    const anchor = h.ExternalLink({ href: "https://external.example.test/path?a=1" });
    const event = h.event(options);
    if (options.button === 1) anchor.props.onAuxClick(event); else anchor.props.onClick(event);
    assert(event.defaultPrevented); assert.equal(h.requests.length, 1);
    const { dialog, popup, confirm } = h.render(); assert.equal(dialog.props.open, true);
    assert.equal(confirm.props.render.props.href, "https://external.example.test/path?a=1");
    assert.equal(confirm.props.render.props.target, "_blank"); assert.equal(confirm.props.render.props.rel, "noopener noreferrer");
    assert(popup.props.initialFocus); assert.equal(popup.props.finalFocus(), h.source);
    confirm.props.onClick(); assert.equal(h.render().dialog.props.open, false);
  });
}

test("cancellation does not navigate and focus restoration only targets connected sources", () => {
  const h = harness(); h.render();
  h.ExternalLink({ href: "https://www.bachecadilettanti.it/annunci" }).props.onClick(h.event());
  const { dialog, header, cancel } = h.render();
  assert.equal(cancel.props.children, "Annulla");
  const description = React.Children.toArray(header.props.children)[1];
  assert(!JSON.stringify(description.props.children).includes("non è affiliato"));
  assert(JSON.stringify(description.props.children).includes("https://www.bachecadilettanti.it/annunci"));
  dialog.props.onOpenChange(false); assert.equal(h.render().dialog.props.open, false);
  h.source.isConnected = false; assert.equal(h.render().popup.props.finalFocus(), null);
});

test("internal links retain native behavior; invalid links are disabled and prevented", () => {
  const h = harness(); h.render();
  const internal = h.event({ ctrlKey: true }); h.ExternalLink({ href: "/utenti" }).props.onClick(internal);
  assert.equal(internal.defaultPrevented, false); assert.equal(h.requests.length, 0);
  const invalid = h.ExternalLink({ href: "javascript:alert(1)" });
  assert.equal(invalid.props.href, undefined); assert.equal(invalid.props["aria-disabled"], true);
  const event = h.event(); invalid.props.onClick(event); assert(event.defaultPrevented); assert.equal(h.requests.length, 0);
});

test("native context menus and already-cancelled handlers do not trigger app navigation", () => {
  const h = harness(); h.render(); const anchor = h.ExternalLink({ href: "https://external.example.test" });
  anchor.props.onAuxClick(h.event({ button: 2 })); anchor.props.onClick(h.event({ defaultPrevented: true }));
  assert.equal(h.requests.length, 0);
});

test("imperative request uses the same validation and cannot bypass missing provider", () => {
  const h = harness(); h.render(); const request = h.useExternalNavigation();
  assert.equal(request("data:text/html,test"), false); assert.equal(request("/annunci"), false);
  assert.equal(h.render().dialog.props.open, false);
  assert.equal(request("https://external.example.test"), true); assert.equal(h.render().dialog.props.open, true);
  h.withoutProvider(); assert.throws(() => h.ExternalLink({ href: "https://external.example.test" }), /ADMIN_EXTERNAL_NAVIGATION_PROVIDER_REQUIRED/);
});

import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURE_EMAIL, FIXTURE_PASSWORD } from "./session-fixture.mjs";

const SECTIONS = ["Home", "Annunci", "Segnalazioni", "Utenti", "Profili", "Codici invito", "Pagamenti", "Promo e crediti", "Distribuzione", "Statistiche", "Registro attività", "Integrazioni", "Versioni sito web"];
const FUTURE = [["segnalazioni", "Segnalazioni"], ["utenti", "Utenti"], ["profili", "Profili"], ["codici-invito", "Codici invito"],
  ["pagamenti", "Pagamenti"], ["promo-e-crediti", "Promo e crediti"], ["distribuzione", "Distribuzione"], ["statistiche", "Statistiche"],
  ["integrazioni", "Integrazioni"], ["versioni-sito-web", "Versioni sito web"]];
const COOKIE_NAMES = "document.cookie.split(';').map(c=>c.trim().split('=')[0]).filter(n=>n.startsWith('bacheca-admin-auth-token'))";

export async function checkSession({ cli, pageId, evaluate, uid, waitFor, key, fillForm, navigate, fixture, workspace, record, details }) {
  const click = async label => {
    const result = await cli(["click", pageId, await uid(label)]);
    assert(result.includes("Successfully clicked"), "Click non confermato: " + label);
    return result;
  };
  const trigger = () => click('button "Apri o riduci il menu"');
  const keyboardLogout = async () => {
    // Next dev's issues badge can cover the footer; exercise native keyboard
    // submission instead. No programmatic submit, redirect or cookie cleanup.
    assert.equal(await evaluate("() => {const b=document.querySelector('[data-slot=sidebar-footer] button[aria-label=Logout]');b.focus();return document.activeElement===b;}"), true);
    await key("Enter");
  };
  const login = async () => {
    await waitFor("() => !!document.querySelector('#admin-email') && !document.querySelector('#admin-email').disabled");
    await fillForm([['textbox "Indirizzo admin"', FIXTURE_EMAIL], ['textbox "Password"', FIXTURE_PASSWORD]]);
    await click('button "Accedi"');
  };
  const home = () => waitFor("() => location.pathname==='/' && document.querySelector('h1')?.textContent==='Bentornato, admin!' && !!document.querySelector('nav[aria-label=\"Sezioni della dashboard\"]')");
  const noCookies = async () => assert.equal(await evaluate(`() => (${COOKIE_NAMES}).length`), 0);
  const cookieNames = () => evaluate(`() => ${COOKIE_NAMES}`);
  const waitAudit = async () => {
    for (let i = 0; i < 100 && !fixture.stats.heldAudit; i++) await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(fixture.stats.heldAudit, 1, "Audit sintetico non raggiunto");
  };
  const screenshot = name => cli(["take_screenshot", pageId, "--filePath", join(workspace.evidence, name + ".png")]);
  const checkConsole = async name => {
    const messages = await cli(["list_console_messages", pageId, "--includePreservedMessages", "true"]);
    writeFileSync(join(workspace.evidence, name + ".txt"), messages);
    assert(!/hydration failed|hydration mismatch|did not match|uncaught|recoverable error/i.test(messages), messages);
  };
  try {
  await cli(["emulate", pageId, "--viewport", "1440x900x1"]);

  fixture.setRole("Utente"); await login();
  await waitFor("() => document.body.textContent.includes('Questo account non dispone') && document.querySelector('form').getAttribute('aria-busy')==='false'");
  await noCookies(); assert.equal(fixture.stats.activeSessions, 0); record("ordinary-role-login-denied-with-admin-metadata");

  fixture.setRole("Admin"); fixture.setAuditUnavailable(true); await login();
  await waitFor("() => document.body.textContent.includes('Accesso temporaneamente non disponibile') && document.querySelector('form').getAttribute('aria-busy')==='false'");
  await noCookies(); assert.equal(fixture.stats.activeSessions, 0); record("login-audit-failure-prevents-session-commit");

  fixture.setAuditUnavailable(false); fixture.holdAudit(); await login(); await waitAudit();
  await noCookies(); assert.equal(await evaluate("() => location.pathname"), "/accesso");
  assert.equal(await evaluate("() => document.querySelector('form').getAttribute('aria-busy')"), "true");
  fixture.releaseAudit(); await home();
  const names = await cookieNames(); assert(names.length > 1); assert(fixture.stats.events.some(e => e.action === "auth.login" && e.outcome === "success"));
  record("login-only-after-audit-and-multiple-cookie-chunks", { chunks: names.length });

  await navigate("/accesso"); await home(); await navigate("/utenti");
  await waitFor("() => location.pathname==='/utenti' && document.querySelector('h1')?.textContent==='Utenti'");
  record("authenticated-login-redirect-and-full-navigation");
  const catalog = await evaluate("() => ({links:[...document.querySelectorAll('nav[aria-label=\"Sezioni della dashboard\"] a')].map(a=>({name:a.getAttribute('aria-label'),href:a.getAttribute('href'),current:a.getAttribute('aria-current')})),groups:[...document.querySelectorAll('[data-slot=sidebar-group-label]')].map(e=>e.textContent),logo:!!document.querySelector('[data-slot=sidebar-header] img')?.naturalWidth,overflow:document.documentElement.scrollWidth>innerWidth})");
  assert.deepEqual(catalog.links.map(l => l.name), SECTIONS);
  assert.deepEqual(catalog.links.map(l => l.href), ["/", "/annunci", "/segnalazioni", "/utenti", "/profili", "/codici-invito", "/pagamenti", "/promo-e-crediti", "/distribuzione", "/statistiche", "/registro-attivita", "/integrazioni", "/versioni-sito-web"]);
  assert.deepEqual(catalog.groups, ["Contenuti", "Community", "Gestione", "Analitiche"]);
  assert.deepEqual(catalog.links.filter(l => l.current === "page").map(l => l.name), ["Utenti"]); assert(catalog.logo); assert(!catalog.overflow);
  await screenshot("shell-desktop"); record("desktop-sidebar-catalog-active-order-and-logo", catalog);
  await checkConsole("console-accesso");

  await evaluate("() => {document.activeElement.blur();document.body.tabIndex=-1;document.body.focus();document.body.removeAttribute('tabindex');return true;}");
  await key("Tab"); assert.equal(await evaluate("() => document.activeElement.textContent"), "Salta al contenuto");
  assert.equal(await evaluate("() => document.activeElement.matches(':focus-visible')"), true);
  await key("Enter"); await waitFor("() => document.activeElement.id==='dashboard-content'"); record("keyboard-skip-link-focus");

  await trigger(); await waitFor("() => document.querySelector('[data-slot=sidebar][data-state]')?.getAttribute('data-state')==='collapsed'");
  await cli(["hover", pageId, await uid('link "Profili"')]); await waitFor("() => [...document.querySelectorAll('[data-slot=tooltip-content][data-open]')].some(e=>e.textContent==='Profili' && e.getBoundingClientRect().width>0)");
  await click('link "Profili"'); await waitFor("() => location.pathname==='/profili' && document.querySelector('h1')?.textContent==='Profili'");
  assert.equal(await evaluate("() => document.querySelector('[data-slot=sidebar][data-state]').getAttribute('data-state')"), "collapsed");
  assert.equal(await evaluate("() => !!document.querySelector('[data-slot=sidebar-footer] button[aria-label=Logout]')"), true);
  await screenshot("shell-desktop-compact"); record("sidebar-collapse-tooltip-and-navigation-state");

  for (const [slug, title] of FUTURE) {
    assert.equal(await evaluate(`() => {const a=[...document.querySelectorAll('nav a')].find(a=>a.getAttribute('href')===${JSON.stringify("/" + slug)});const r=a.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('a')===a;}`), true, "Icona intercettata da un altro elemento: " + title);
    await click(`link "${title}"`);
    await waitFor(`() => location.pathname===${JSON.stringify("/" + slug)} && document.querySelector('h1')?.textContent===${JSON.stringify(title)} && document.body.textContent.includes('Tranquillo Gabbo, ti prometto che questa sezione arriverà molto presto')`);
    assert.equal(await evaluate("() => !!document.querySelector('h1 svg') && document.body.textContent.includes('Presto in arrivo…') && document.querySelectorAll('nav a[aria-current=page]').length===1"), true);
  }
  record("all-10-coming-soon-pages-title-icon-description");

  await cli(["emulate", pageId, "--viewport", "390x844x1,mobile,touch"]);
  await trigger(); await waitFor("() => !!document.querySelector('[role=dialog] nav')");
  const mobile = await evaluate("() => {const d=document.querySelector('[role=dialog]'),r=d.querySelector('[data-slot=sidebar-footer] button').getBoundingClientRect();return {links:d.querySelectorAll('nav a').length,footerVisible:r.top>=0&&r.bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,scrollable:d.querySelector('[data-slot=sidebar-content]').scrollHeight>d.querySelector('[data-slot=sidebar-content]').clientHeight};}");
  assert.equal(mobile.links, 13); assert(mobile.footerVisible); assert(!mobile.overflow);
  await screenshot("shell-mobile-menu");
  await key("Escape"); await waitFor("() => !document.querySelector('[role=dialog]') && document.activeElement.matches('[data-slot=sidebar-trigger]')");
  await trigger(); await click('button "Chiudi menu"'); await waitFor("() => !document.querySelector('[role=dialog]') && document.activeElement.matches('[data-slot=sidebar-trigger]')");
  await trigger(); await click('link "Utenti"');
  await waitFor("() => location.pathname==='/utenti' && !document.querySelector('[role=dialog]') && document.activeElement.matches('[data-slot=sidebar-trigger]')");
  await screenshot("shell-mobile-content"); record("mobile-menu-escape-close-navigation-focus-and-footer", mobile);
  await checkConsole("console-shell");

  await evaluate("() => {document.cookie='sb-web-auth-token.0=synthetic-web;path=/';document.cookie='bacheca-admin-auth-token.99=stale;path=/';return true;}");
  fixture.holdAudit(); await trigger(); await click('button "Logout"'); await waitAudit();
  assert.equal(await evaluate("() => document.querySelector('button[aria-label=\"Uscita in corso\"]')?.disabled"), true);
  fixture.releaseAudit(); await waitFor("() => location.pathname==='/accesso' && !!document.querySelector('#admin-email')");
  await noCookies(); assert.equal(await evaluate("() => document.cookie.includes('sb-web-auth-token.0=synthetic-web')"), true);
  assert.equal(fixture.stats.activeSessions, 0); record("mobile-logout-pending-clears-all-admin-chunks-keeps-web-cookie");

  // Use desktop for the remaining denial/logout scenarios.
  await cli(["emulate", pageId, "--viewport", "1440x900x1"]);
  await login(); await home(); fixture.setRole("Utente"); await navigate("/utenti");
  await waitFor("() => location.pathname==='/accesso' && document.body.textContent.includes('Accesso non consentito')");
  assert.equal(await evaluate("() => !!document.querySelector('nav[aria-label=\"Sezioni della dashboard\"]')"), false);
  const denial = await evaluate("async () => {const r=await fetch('/api/home/summary',{cache:'no-store'});const b=await r.json();return {status:r.status,denied:b.status==='denied',data:'summary' in b};}");
  assert.deepEqual(denial, { status: 403, denied: true, data: false });
  await click('button "Logout"'); await waitFor("() => !!document.querySelector('#admin-email')"); await noCookies();
  record("role-revocation-denies-next-page-and-api");

  fixture.setRole("Admin"); await login(); await home(); fixture.revoke(); await navigate("/profili");
  await waitFor("() => location.pathname==='/accesso' && document.body.textContent.includes('Accesso non consentito')");
  await click('button "Logout"'); await waitFor("() => !!document.querySelector('#admin-email')"); await noCookies();
  record("session-revocation-denies-next-page");

  await login(); await home(); fixture.setAuditUnavailable(true); await keyboardLogout();
  await waitFor("() => location.pathname==='/accesso' && location.search==='?uscita=audit' && !!document.querySelector('#admin-email')");
  await noCookies(); assert.equal(await evaluate("() => document.body.textContent.includes('Non è stato possibile confermare la registrazione')"), true);
  record("logout-audit-unavailable-still-clears-session");

  fixture.setAuditUnavailable(false); await login(); await home(); fixture.setLogoutUnavailable(true); await keyboardLogout();
  await waitFor("() => location.pathname==='/accesso' && location.search==='?uscita=parziale' && !!document.querySelector('#admin-email')");
  await noCookies(); assert.equal(await evaluate("() => document.body.textContent.includes('Non è stato possibile confermare la revoca remota')"), true);
  assert.equal(await evaluate("() => document.cookie.includes('sb-web-auth-token.0=synthetic-web')"), true);
  fixture.revoke(); // Dispose the deliberately unrevoked synthetic remote session.
  record("logout-revocation-unavailable-clears-local-cookie-and-keeps-web");
  await checkConsole("console");
  assert.equal(fixture.stats.unexpected, 0); details.fixture = fixture.stats;
  record("no-hydration-errors-or-unexpected-fixture-endpoints");
  } catch (error) {
    details.fixture = fixture.stats;
    try {
      details.sessionFailure = await evaluate(`() => ({path:location.pathname,search:location.search,text:document.body.innerText.slice(0,4000),cookieNames:document.cookie.split(';').map(c=>c.trim().split('=')[0])})`);
      await screenshot("session-failure");
      writeFileSync(join(workspace.evidence, "console.txt"), await cli(["list_console_messages", pageId, "--includePreservedMessages", "true"]));
    } catch { /* The browser itself may already be unavailable. */ }
    throw error;
  }
}

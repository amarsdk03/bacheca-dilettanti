import assert from "node:assert/strict";
import {join} from "node:path";
import {FIXTURE_EMAIL, FIXTURE_PASSWORD} from "./session-fixture.mjs";

/** Local fixture only; shares the runner's isolated sources, env and browser. */
export async function checkHomeRedesign({cli, pageId, evaluate, uid, waitFor, key, fillForm, navigate, fixture, workspace, record}) {
  const click = async label => cli(["click", pageId, await uid(label)]);
  const focusActivate = async selector => {
    assert(await evaluate(`() => { const e=document.querySelector(${JSON.stringify(selector)}); e?.focus(); return !!e && document.activeElement===e; }`), "Cannot focus " + selector);
    await key("Enter");
  };
  const settled = () => waitFor("() => !!document.querySelector('.home-main-chart svg.recharts-surface') && !document.querySelector('#home-chart-panel [aria-busy=true]')");
  const screenshot = name => cli(["take_screenshot", pageId, "--filePath", join(workspace.evidence, name + ".png")]);
  await cli(["emulate", pageId, "--viewport", "1667x1000x1"]);
  await fillForm([['textbox "Indirizzo admin"', FIXTURE_EMAIL], ['textbox "Password"', FIXTURE_PASSWORD]]);
  await click('button "Accedi"');
  await settled();
  assert.equal(await evaluate("() => document.querySelector('h1').textContent"), "Bentornato, Gabriele!");
  await waitFor("() => / - \\d{2}:\\d{2}:\\d{2}/.test(document.querySelector('.home-clock').textContent)");
  const clockBefore = await evaluate("() => document.querySelector('.home-clock').textContent");
  await waitFor(`() => document.querySelector('.home-clock').textContent !== ${JSON.stringify(clockBefore)}`);
  assert.equal(await evaluate("() => document.querySelector('.admin-home-activity th:last-child').textContent"), "Esito");
  const navBefore = await evaluate("() => [...document.querySelectorAll('nav[aria-label=\"Sezioni della dashboard\"] a')].map(a=>a.getAttribute('href'))");
  assert.equal(navBefore.length, 13);
  for (const theme of ["light", "dark"]) {
    const current = await evaluate("() => document.querySelector('[data-admin-scope=dashboard]').dataset.adminTheme");
    if (current !== theme) await focusActivate('.admin-header button[aria-label*="tema"]');
    await waitFor(`() => document.querySelector('[data-admin-scope=dashboard]').dataset.adminTheme === '${theme}'`);
    const view = await evaluate("() => ({overflow:document.documentElement.scrollWidth>innerWidth,font:getComputedStyle(document.querySelector('.admin-home')).fontFamily,columns:getComputedStyle(document.querySelector('.admin-home-kpi-grid')).gridTemplateColumns.split(' ').length,scope:document.querySelector('#bd-admin-portal-root').dataset.adminScope})");
    assert.equal(view.overflow, false); assert.equal(view.columns, 4); assert.equal(view.scope, "portal"); assert.match(view.font, /Inter/i);
    await evaluate("() => {window.scrollTo(0,0); return true;}");
    await screenshot(`overview-${theme}-desktop`); record(`overview-${theme}-desktop`, view);
  }
  await focusActivate('button[aria-label="Separa grafico per categoria"]');
  await waitFor("() => document.querySelector('.home-chart-legend')?.textContent.includes('Giocatore') && document.querySelector('.home-chart-legend')?.textContent.includes('Squadra')");
  await screenshot("overview-separated-users");
  await focusActivate('button[aria-label="Separa grafico per categoria"]');
  await focusActivate('.home-aggregation button:nth-child(2)');
  await waitFor("() => !!document.querySelector('.home-aggregation button:nth-child(2)[aria-pressed=true]')");
  assert(await evaluate("() => document.querySelector('.home-main-chart').textContent.includes('T1')"));
  await focusActivate('.home-aggregation button:nth-child(3)');
  await focusActivate('.home-period-trigger');
  await waitFor("() => !!document.querySelector('[data-slot=popover-content]')");
  assert.equal(await evaluate("() => document.querySelector('[data-slot=popover-content]').closest('[data-admin-scope]').dataset.adminScope"), "portal");
  await screenshot("overview-period-popup");
  await focusActivate('.home-period-popover [data-slot=toggle-group] button:first-child');
  await focusActivate('#home-period-from');
  await key("ArrowDown"); await key("Enter");
  await key("Escape");
  await waitFor("() => !document.querySelector('[data-slot=popover-content]')");
  const chosenRange = await evaluate("() => document.querySelector('.home-period-trigger').textContent");
  await focusActivate('button[aria-labelledby="home-announcements-label"]'); await settled();
  await focusActivate('button[aria-label="Separa grafico per categoria"]');
  await waitFor("() => !!document.querySelector('.home-chart-legend')");
  assert.equal(await evaluate("() => document.querySelector('button[aria-label=\"Separa grafico per categoria\"]').textContent"), "Separata");
  assert(await evaluate("() => [...document.querySelectorAll('.home-main-chart tbody tr')].every(row => {const values=[...row.querySelectorAll('td')].slice(1).map(c=>Number(c.textContent)); return values[0]===values.slice(1).reduce((a,b)=>a+b,0);})"));
  assert(await evaluate("() => new Set([...document.querySelectorAll('.home-main-chart .recharts-bar-rectangle path')].map(p=>p.getAttribute('fill'))).size>1"));
  await screenshot("overview-separated-announcements");
  assert.equal(await evaluate("() => document.querySelector('.home-period-trigger').textContent"), chosenRange);
  await focusActivate('button[aria-labelledby="home-pending-label"]'); await settled();
  assert(await evaluate("() => !!document.querySelector('.home-chart-legend')"));
  await screenshot("overview-separated-pending");
  assert.equal(await evaluate("() => document.querySelector('.home-period-controls') === null && !!document.querySelector('.recharts-bar')"), true);
  fixture.home.setDataset("many");
  await focusActivate('.home-main-chart .home-chart-tools button:first-of-type');
  await waitFor("() => document.querySelectorAll('.home-main-chart .home-chart-legend li').length===11");
  await focusActivate('.home-main-chart details summary');
  const wideTable = '.home-main-chart details [data-slot=table-container]';
  for (const viewport of ["1667x1000x1", "390x844x1"]) {
    await cli(["emulate", pageId, "--viewport", viewport]);
    const geometry = await evaluate(`() => {const e=document.querySelector(${JSON.stringify(wideTable)}); e.focus();return {columns:e.querySelectorAll('th').length, scroll:e.scrollWidth>e.clientWidth, focused:document.activeElement===e, overflow:document.documentElement.scrollWidth>innerWidth};}`);
    assert.deepEqual(geometry, {columns:13, scroll:true, focused:true, overflow:false});
    await key("ArrowRight");
    await waitFor(`() => document.querySelector(${JSON.stringify(wideTable)}).scrollLeft>0`);
    await screenshot(`overview-wide-table-${viewport.startsWith("390") ? "mobile" : "desktop"}`);
  }
  await cli(["emulate", pageId, "--viewport", "1667x1000x1"]);
  fixture.home.setDataset("populated");
  record("wide-chart-table-keyboard-scroll-desktop-and-mobile");
  await focusActivate('button[aria-labelledby="home-profits-label"]');
  await waitFor("() => document.querySelector('#home-chart-panel').textContent.includes('I dati sui profitti non sono attualmente disponibili.')");
  assert.equal(await evaluate("() => document.querySelector('#home-chart-panel [data-slot=chart]') === null"), true);
  await focusActivate('button[aria-labelledby="home-users-label"]'); await settled();
  assert.equal(await evaluate("() => document.querySelector('.home-period-trigger').textContent"), chosenRange);
  record("period-aggregation-keyboard-and-metric-switching");

  await cli(["emulate", pageId, "--viewport", "390x844x1,mobile,touch"]);
  await waitFor("() => innerWidth===390");
  for (const theme of ["dark", "light"]) {
    const current = await evaluate("() => document.querySelector('[data-admin-scope=dashboard]').dataset.adminTheme");
    if (current !== theme) await focusActivate('.admin-header button[aria-label*="tema"]');
    await waitFor(`() => document.querySelector('[data-admin-scope=dashboard]').dataset.adminTheme === '${theme}'`);
    assert.equal(await evaluate("() => document.documentElement.scrollWidth > innerWidth"), false);
    await evaluate("() => {window.scrollTo(0,0); return true;}"); await screenshot(`overview-${theme}-mobile`);
  }
  await focusActivate('[data-slot="sidebar-trigger"]');
  await waitFor("() => !!document.querySelector('[data-slot=sidebar][data-mobile=true]')");
  assert.equal(await evaluate("() => document.querySelector('[data-slot=sidebar][data-mobile=true]').closest('[data-admin-scope]').dataset.adminScope"), "portal");
  await screenshot("overview-mobile-menu"); await key("Escape");
  record("mobile-layout-themes-and-navigation");

  await cli(["emulate", pageId, "--viewport", "1667x1000x1"]);
  assert(await evaluate("() => getComputedStyle(document.querySelector('[data-slot=sidebar-container]')).transitionDuration === '0s'"));
  await focusActivate('[data-slot="sidebar-trigger"]');
  await waitFor("() => Math.abs(document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width-72)<1");
  await screenshot("overview-compact-sidebar");
  await focusActivate('[data-slot="sidebar-trigger"]');
  await waitFor("() => Math.abs(document.querySelector('[data-slot=sidebar-container]').getBoundingClientRect().width-248)<1");
  await focusActivate('a[href="/utenti"]');
  await waitFor("() => location.pathname==='/utenti' && !document.querySelector('[data-admin-variant=home]')");
  assert(await evaluate("() => / - \\d{2}:\\d{2}:\\d{2}/.test(document.querySelector('.home-clock').textContent)"));
  const navAfter = await evaluate("() => [...document.querySelectorAll('nav[aria-label=\"Sezioni della dashboard\"] a')].map(a=>a.getAttribute('href'))");
  assert.deepEqual(navAfter, navBefore);
  assert.match(await evaluate("() => getComputedStyle(document.querySelector('.admin-content')).fontFamily"), /Inter/i);
  await screenshot("overview-other-section-preserved");
  await focusActivate('a[href="/"][data-slot="sidebar-menu-button"]'); await settled();
  assert.equal(await evaluate("() => document.querySelector('[data-admin-scope=dashboard]').dataset.adminScope"), "dashboard");
  record("client-navigation-preserves-shared-style-and-menu");
  fixture.home.setDataset("empty"); await navigate("/"); await settled();
  assert(await evaluate("() => document.querySelector('#home-chart-panel').textContent.includes('Non confrontabile') && document.querySelector('#home-chart-panel').textContent.includes('Nessun evento nel periodo')"));
  record("empty-data-without-fabricated-trends");
  const consoleOutput = await cli(["list_console_messages", pageId]);
  assert(!/hydration failed|hydration mismatch|uncaught|nativeButton|unique.*key/i.test(consoleOutput), consoleOutput);
  record("no-client-render-errors");
}

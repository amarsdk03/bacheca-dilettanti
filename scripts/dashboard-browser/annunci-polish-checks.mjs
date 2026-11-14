import assert from "node:assert/strict";
import {join} from "node:path";
import {FIXTURE_EMAIL, FIXTURE_PASSWORD} from "./session-fixture.mjs";
import {annunciId} from "./annunci-fixture.mjs";

export async function checkAnnunciPolish({cli, pageId, evaluate, uid, waitFor, key, fillForm, navigate, workspace, record}) {
  const click = async label => cli(["click", pageId, await uid(label)]);
  const activate = async selector => {
    assert(await evaluate(`() => { const e=document.querySelector(${JSON.stringify(selector)}); e?.focus(); return !!e && document.activeElement===e; }`), selector);
    await key("Enter");
  };
  const screenshot = name => cli(["take_screenshot", pageId, "--filePath", join(workspace.evidence, name + ".png")]);
  await cli(["emulate", pageId, "--viewport", "1440x900x1"]);
  await fillForm([['textbox "Indirizzo admin"', FIXTURE_EMAIL], ['textbox "Password"', FIXTURE_PASSWORD]]);
  await click('button "Accedi"'); await waitFor("() => location.pathname==='/'");
  await navigate("/annunci"); await waitFor("() => location.pathname==='/annunci' && document.querySelectorAll('main tbody tr').length>0");
  assert(await evaluate("() => !!document.querySelector('.home-clock') && [...document.querySelectorAll('main thead th')].some(e=>e.textContent.includes('Distribuzione'))"));
  assert(await evaluate("() => [...document.querySelectorAll('main tbody tr')].every(r=>r.cells[4].querySelectorAll('[data-slot=badge]').length===1)"));
  for (const kind of ["visibilità", "distribuzione"]) {
    await activate(`button[aria-label="Legenda ${kind}"]`);
    await waitFor("() => !!document.querySelector('[data-slot=dialog-content]')");
    assert.equal(await evaluate("() => document.querySelector('[data-slot=dialog-content]').closest('[data-admin-scope]').dataset.adminScope"), "portal");
    await screenshot(`annunci-legenda-${kind}`);
    await activate('[data-slot=dialog-dismiss]'); await waitFor("() => !document.querySelector('[data-slot=dialog-content]')");
  }
  const id = annunciId(1), menu = `#annunci-menu-${id}`;
  for (const theme of ["light", "dark"]) {
    const current = await evaluate("() => document.querySelector('[data-admin-scope=dashboard]').dataset.adminTheme");
    if (current !== theme) await activate('.admin-header button[aria-label*="tema"]');
    await activate(menu); await click('menuitem "Info complete"');
    await waitFor("() => !!document.querySelector('[data-slot=sheet-content]')");
    await key("Escape"); await waitFor("() => !document.querySelector('[data-slot=sheet-content]')");
    assert.equal(await evaluate("() => document.activeElement.id"), `annunci-menu-${id}`);
    await activate(menu); await click('menuitem "Esporta su WhatsApp"');
    await waitFor("() => !!document.querySelector('[data-slot=dialog-content] textarea')");
    const modal = await evaluate("() => {const d=document.querySelector('[data-slot=dialog-content]');return {theme:d.closest('[data-admin-scope]').dataset.adminTheme,font:getComputedStyle(d).fontFamily,bg:getComputedStyle(d).backgroundColor};}");
    assert.equal(modal.theme, theme); assert.match(modal.font, /Inter/i); await screenshot(`annunci-whatsapp-${theme}`);
    await key("Escape"); await waitFor("() => !document.querySelector('[data-slot=dialog-content]')");
  }
  record("legends-preview-focus-and-whatsapp-themes");
  await cli(["emulate", pageId, "--viewport", "390x844x1"]);
  await waitFor("() => innerWidth===390");
  assert.equal(await evaluate("() => document.documentElement.scrollWidth>innerWidth"), false);
  assert(await evaluate("() => !!document.querySelector('.home-clock')")); await screenshot("annunci-mobile");
  await activate('button[aria-label="Legenda distribuzione"]');
  await waitFor("() => document.querySelectorAll('[data-slot=dialog-content] .admin-legend-list dt').length===4");
  assert(await evaluate("() => !document.querySelector('[data-slot=dialog-content] table')"));
  await screenshot("annunci-legenda-mobile"); await key("Escape");
  record("annunci-mobile-clock-and-layout");
}

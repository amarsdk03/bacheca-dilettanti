import assert from "node:assert/strict";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURE_EMAIL, FIXTURE_PASSWORD } from "./session-fixture.mjs";
import { auditId } from "./audit-fixture.mjs";

// Find the renderer in THIS build, never depend on a previously observed hash.
export function productionChartAsset(staticDir) {
  const matches = [];
  function scan(directory, prefix = "") {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      assert(!entry.isSymbolicLink(), "BROWSER_CHART_ASSET_REDIRECTED");
      const name = prefix + entry.name, path = join(directory, entry.name);
      if (entry.isDirectory()) scan(path, name + "/");
      else if (entry.name.endsWith(".js")) {
        const text = readFileSync(path, "utf8");
        if (text.includes("Periodo / Categoria") && text.includes("Mostra dati:")) matches.push("/_next/static/" + name);
      }
    }
  }
  scan(staticDir); assert.equal(matches.length, 1, "BROWSER_CHART_ASSET_AMBIGUOUS"); return matches[0];
}

export async function checkRegistro({ cli, pageId, evaluate, uid, waitFor, key, fillForm, fill, navigate, fixture, workspace, record, details, origin, extraBrowser }) {
  const data = fixture.registro, sheet = "document.querySelector('[data-slot=sheet-content]')";
  const focus = async expression => assert.equal(await evaluate(`() => {const e=${expression};e?.focus();return !!e && document.activeElement===e;}`), true, "Focus: " + expression);
  const press = async expression => { await focus(expression); await key("Enter"); };
  const button = label => press(`[...document.querySelectorAll('main button')].find(e=>e.textContent.trim()===${JSON.stringify(label)})`);
  const click = async label => assert((await cli(["click", pageId, await uid(label)])).includes("Successfully clicked"));
  const screenshot = name => cli(["take_screenshot", pageId, "--filePath", join(workspace.evidence, name + ".png")]);
  const ready = () => waitFor("() => location.pathname==='/registro-attivita' && !!document.querySelector('main table caption') && !document.querySelector('main [aria-label=\"Caricamento tabella\"]')");
  const ids = () => evaluate("() => [...document.querySelectorAll('main table tbody button')].map(b=>b.getAttribute('aria-label').replace('Mostra dettagli: ',''))");
  const filters = { from: "", to: "", operator: "", action: "", outcome: "" };
  const expected = patch => data.page({ ...filters, limit: 30, cursor: null, ...patch }).items.map(row => row.id);
  const open = async id => {
    await press(`document.querySelector('button[aria-label="Mostra dettagli: ${id}"]')`);
    await waitFor(`() => !!${sheet} && ${sheet}.textContent.includes(${JSON.stringify(id)}) && !${sheet}.querySelector('[aria-busy=true]')`);
  };
  const close = async () => { await key("Escape"); await waitFor(`() => !${sheet}`); };
  const select = async (id, label) => {
    await focus(`document.querySelector('#${id}')`); await key("Space");
    await waitFor("() => !!document.querySelector('[data-slot=select-content][data-open]')");
    writeFileSync(join(workspace.evidence, `${id}-options.txt`), await cli(["take_snapshot", pageId]));
    await press(`[...document.querySelectorAll('[data-slot=select-content] [role=option]')].find(e=>e.textContent.trim()===${JSON.stringify(label)})`);
    await waitFor("() => !document.querySelector('[data-slot=select-content][data-open]')");
  };
  const consoleCheck = async name => {
    const output = await cli(["list_console_messages", pageId, "--includePreservedMessages", "true"]);
    writeFileSync(join(workspace.evidence, name + ".txt"), output);
    assert(!/hydration failed|hydration mismatch|did not match|nativeButton|expected.*native.*button/i.test(output), output);
    return output;
  };
  let assetFailure, bfcache;
  try {
    await cli(["emulate", pageId, "--viewport", "1440x900x1"]);
    // Keep lazy renderer unloaded until its deliberate production failure test.
    fixture.home.setFailure("chart:users", true);
    await fillForm([['textbox "Indirizzo admin"', FIXTURE_EMAIL], ['textbox "Password"', FIXTURE_PASSWORD]]);
    await click('button "Accedi"'); await waitFor("() => document.querySelector('#home-users-value')?.textContent==='120'");
    await navigate("/registro-attivita"); await ready();
    assert.deepEqual(await ids(), expected()); assert.equal(data.stats.detail, 0);
    details.authenticatedHeaders = await evaluate("async () => {const result=[];for(const path of ['/', '/registro-attivita', '/api/registro-attivita']){const response=await fetch(path,{cache:'no-store'});await response.text();result.push({path,status:response.status,cache:response.headers.get('cache-control'),robots:response.headers.get('x-robots-tag')});}return result;}");
    for (const response of details.authenticatedHeaders) { assert.equal(response.status, 200); assert.match(response.cache, /private.*no-store/); if (!response.path.startsWith('/api/')) assert.match(response.robots, /noindex/); }
    const initial = await evaluate("() => ({title:document.querySelector('h1').textContent,headers:[...document.querySelectorAll('main table th')].map(e=>e.textContent),rows:document.querySelectorAll('main table tbody tr').length,text:document.querySelector('main table').textContent})");
    assert.equal(initial.title, "Registro attività"); assert.deepEqual(initial.headers, ["Data e ora", "Amministratore", "Operazione", "Dettagli"]); assert.equal(initial.rows, 30);
    assert(initial.text.includes("Non identificato") && initial.text.includes("senza identità Admin attestata") && initial.text.includes("Utente bbbbbbbb"));
    await screenshot("registro-desktop"); record("registro-read-only-thirty-rows-and-no-eager-detail", { ...initial, text: undefined });

    await fill('textbox "Operatore"', "invalido"); const invalidBefore = data.stats.list;
    await button("Applica filtri"); await waitFor("() => document.body.textContent.includes('Controlla le date')"); assert.equal(data.stats.list, invalidBefore);
    await fill('textbox "Operatore"', " ADMIN@EXAMPLE.TEST "); await button("Applica filtri"); await ready();
    assert.deepEqual(await ids(), expected({ operator: "admin@example.test" }));
    assert.equal(await evaluate("() => new URLSearchParams(location.search).get('operator')"), "admin@example.test");
    await fill('textbox "Operatore"', "bbbbbbbb-bbbb-4bbb-8bbb-000000000001"); await button("Applica filtri"); await ready();
    assert.deepEqual(await ids(), expected({ operator: "bbbbbbbb-bbbb-4bbb-8bbb-000000000001" }));
    await button("Non identificato"); await button("Applica filtri"); await ready(); assert.deepEqual(await ids(), [auditId(4)]);
    await button("Ripristina filtri"); await ready();
    await select("audit-action", "Annuncio approvato"); await select("audit-outcome", "Riuscita"); await button("Applica filtri"); await ready();
    assert.deepEqual(await ids(), expected({ action: "announcement.approve", outcome: "success" }));
    await button("Ripristina filtri"); await ready();
    for (const label of ["Dal", "Al"]) {
      await fill(`Date "${label}"`, "2026-10-25");
      // CLI 1.12 fills non-text inputs by assigning .value. React's value
      // tracker needs an actual native edit: change then restore the segment.
      await key("ArrowUp"); await key("ArrowDown"); await key("Tab");
    }
    await button("Applica filtri"); await ready();
    details.dateQuery = await evaluate("() => ({from:new URLSearchParams(location.search).get('from'),to:new URLSearchParams(location.search).get('to')})");
    assert.deepEqual(details.dateQuery, { from: "2026-10-25", to: "2026-10-25" });
    assert.deepEqual(await ids(), expected({ from: "2026-10-25", to: "2026-10-25" }));
    await button("Successiva"); await ready(); const localDayTail = await ids(); assert(localDayTail.includes(auditId(36))); assert(!localDayTail.includes(auditId(37)));
    await button("Ripristina filtri"); await ready(); record("registro-filters-validation-identities-and-rome-dates", { localDayTail });

    const first = await ids(); await button("Successiva"); await ready(); const second = await ids();
    assert.equal(second.length, 7); assert.equal(new Set([...first, ...second]).size, 37);
    const cursorHref = await evaluate("() => location.pathname+location.search"); assert(cursorHref.includes("cursor="));
    await button("Precedente"); await ready(); assert.deepEqual(await ids(), first);
    await cli(["navigate_page", pageId, "--type", "back"]); await ready(); assert.deepEqual(await ids(), second);
    await cli(["navigate_page", pageId, "--type", "forward"]); await ready(); assert.deepEqual(await ids(), first);
    await navigate(cursorHref); await ready(); assert.deepEqual(await ids(), second);
    await cli(["navigate_page", pageId, "--type", "reload"]); await ready(); assert.deepEqual(await ids(), second);
    assert.equal(await evaluate("() => [...document.querySelectorAll('main button')].find(e=>e.textContent.trim()==='Precedente').disabled"), true);
    await button("Prima pagina"); await ready(); assert.deepEqual(await ids(), first);
    const invalidCursor = cursorHref + "&action=auth.login"; await navigate(invalidCursor);
    await waitFor("() => document.body.textContent.includes('Filtri o cursore non validi')"); await button("Riprova"); await ready(); assert.deepEqual(await ids(), first);
    record("registro-cursors-history-reload-and-filter-binding", { first, second });

    for (const n of [1, 2, 3, 4, 5, 6]) {
      const before = data.stats.detail; await open(auditId(n)); assert.equal(data.stats.detail - before, 1);
      const text = await evaluate(`() => ${sheet}.textContent`), event = data.inspect(auditId(n));
      assert(text.includes(event.correlationId) && text.includes(event.occurredAt));
      if (n === 2) assert(text.includes("in_revisione") && text.includes("pubblicato") && text.includes("Seconda riga"));
      if (n === 3) assert(text.includes("Righe: 1") && text.includes("title, author") && text.includes(event.export.announcementIds[0]));
      if (n === 4) assert(text.includes("Non identificato") && text.includes("ACCESS_DENIED"));
      assert.equal(await evaluate(`() => ${sheet}.contains(document.activeElement)`), true);
      if (n === 3) await screenshot("registro-detail");
      await close(); assert.equal(await evaluate("() => document.activeElement.getAttribute('aria-label')"), `Mostra dettagli: ${auditId(n)}`);
    }
    record("registro-six-detail-variants-one-rpc-and-focus");

    data.hold("list"); await button("Aggiorna"); await waitFor("() => !!document.querySelector('main [aria-label=\"Caricamento tabella\"]')");
    data.release("list"); await ready();
    data.setMode("list", "empty"); await button("Aggiorna"); await waitFor("() => document.body.textContent.includes('Nessun evento disponibile')");
    data.setMode("list", "unavailable"); await button("Aggiorna"); await waitFor("() => document.body.textContent.includes('Impossibile caricare il registro')");
    data.setMode("list", "ok"); await button("Riprova"); await ready();
    data.hold("detail"); await press(`document.querySelector('button[aria-label="Mostra dettagli: ${auditId(1)}"]')`);
    await waitFor(`() => !!${sheet}?.querySelector('[aria-label="Caricamento dettagli"]')`); await close(); data.release("detail");
    await open(auditId(2)); assert.equal(await evaluate(`() => ${sheet}.textContent.includes(${JSON.stringify(auditId(1))})`), false); await close();
    data.setMode("detail", "unavailable"); await press(`document.querySelector('button[aria-label="Mostra dettagli: ${auditId(1)}"]')`);
    await waitFor(`() => ${sheet}?.textContent.includes('Impossibile caricare il dettaglio')`);
    data.setMode("detail", "ok"); await press(`${sheet}.querySelector('button:not([aria-label])')`);
    await waitFor(`() => ${sheet}?.textContent.includes(${JSON.stringify(auditId(1))})`); await close();
    data.remove(auditId(1)); await press(`document.querySelector('button[aria-label="Mostra dettagli: ${auditId(1)}"]')`);
    await waitFor(`() => ${sheet}?.textContent.includes('Evento non più disponibile')`);
    await press(`[...${sheet}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Aggiorna elenco')`); await ready(); await waitFor(`() => !${sheet}`);
    assert(!(await ids()).includes(auditId(1)));
    const beforeIdle = data.stats.list; await new Promise(resolve => setTimeout(resolve, 1200)); assert.equal(data.stats.list, beforeIdle);
    record("registro-skeleton-empty-errors-retention-cancellation-and-no-polling");

    await navigate("/"); await waitFor("() => document.body.textContent.includes('Impossibile caricare i grafici') && document.querySelector('#home-users-value')?.textContent==='120'");
    details.chartAsset = productionChartAsset(join(workspace.app, ".next/static"));
    const resources = () => evaluate(`() => performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname===${JSON.stringify(details.chartAsset)}).map(e=>({path:new URL(e.name).pathname,size:e.transferSize}))`);
    assert.deepEqual(await resources(), []);
    const cleanConsole = await consoleCheck("console-registro-before-chunk"); assert(!/uncaught|recoverable error/i.test(cleanConsole));
    assetFailure = await extraBrowser.failAsset(origin, details.chartAsset);
    fixture.home.setFailure("chart:users", false);
    await press("document.querySelector('#home-chart-panel [data-slot=alert] button')");
    await waitFor("() => document.body.textContent.includes('Impossibile visualizzare i grafici')");
    assert(assetFailure.failures.length > 0); assert.equal(await evaluate("() => document.querySelector('#home-users-value')?.textContent"), "120");
    assert.equal(await evaluate("() => document.querySelectorAll('main table tbody tr').length"), 5);
    await screenshot("production-chart-chunk-failure"); details.chunkFailures = [...assetFailure.failures];
    await assetFailure.release(); assetFailure = null;
    await button("Ricarica pagina"); await waitFor("() => document.querySelectorAll('#home-chart-panel [data-slot=chart] svg.recharts-surface').length===2");
    details.chartResources = await resources(); assert(details.chartResources.length > 0);
    await screenshot("production-chart-recovered");
    record("production-lazy-renderer-chunk-failure-and-full-reload-recovery", { asset: details.chartAsset, failures: details.chunkFailures, recovered: details.chartResources });

    // No Fetch interception remains enabled during the native BFcache attempt.
    await navigate("/registro-attivita"); await ready(); bfcache = await extraBrowser.observeBfcache(origin);
    await evaluate("() => {window.__nativePageShows=[];addEventListener('pageshow',e=>window.__nativePageShows.push({persisted:e.persisted}));return true;}");
    const beforeBfcache = data.stats.list;
    await cli(["navigate_page", pageId, "--url", fixture.origin + "/external/announcement"]);
    await cli(["navigate_page", pageId, "--type", "back"]); await ready();
    details.bfcache = await evaluate("() => ({events:window.__nativePageShows??[],navigation:performance.getEntriesByType('navigation').map(e=>({type:e.type,notRestoredReasons:e.notRestoredReasons?.toJSON?.()??null}))})");
    details.bfcache.reasons = [...bfcache.reasons]; details.bfcache.listRequests = data.stats.list - beforeBfcache;
    details.bfcache.restored = details.bfcache.events.some(event => event.persisted);
    assert(details.bfcache.listRequests >= 1, "Ritorno senza verifica dati");
    if (!details.bfcache.restored) assert(details.bfcache.reasons.length > 0 || details.bfcache.navigation.some(item => item.notRestoredReasons), "BFcache non ripristinata senza evidenza del motivo");
    await bfcache.close(); bfcache = null;
    record("native-bfcache-observation-and-return-revalidation", details.bfcache);

    await cli(["emulate", pageId, "--viewport", "390x844x1,mobile,touch"]);
    const mobile = await evaluate("() => ({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,font:getComputedStyle(document.body).fontFamily,tableScroll:document.querySelector('[data-slot=table-container]')?.scrollWidth>document.querySelector('[data-slot=table-container]')?.clientWidth})");
    assert.equal(mobile.width, 390); assert.equal(mobile.overflow, false); assert.match(mobile.font, /Arial/);
    await screenshot("registro-mobile"); const currentId = (await ids())[0]; await open(currentId); await key("Tab");
    assert.equal(await evaluate(`() => ${sheet}.contains(document.activeElement)`), true);
    await screenshot("registro-detail-mobile"); await close();
    fixture.revoke(); await button("Aggiorna"); await waitFor("() => location.pathname==='/accesso' && !document.querySelector('main table')");
    details.denial = await evaluate("async () => {const r=await fetch('/api/registro-attivita',{cache:'no-store'});return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};}");
    assert.equal(details.denial.status, 403); assert.deepEqual(details.denial.body, { status: "denied", code: "ACCESS_DENIED" }); assert.match(details.denial.cache, /private.*no-store/);
    // The denied-session screen retains the explicit cleanup action.
    await click('button "Logout"'); await waitFor("() => !!document.querySelector('#admin-email')");
    assert.equal(await evaluate("() => document.cookie.includes('bacheca-admin-auth-token')"), false);
    await consoleCheck("console"); assert.equal(fixture.stats.unexpected, 0); assert.equal(fixture.stats.activeSessions, 0);
    details.mobile = mobile; details.fixture = fixture.stats; details.registro = data.stats;
    record("registro-keyboard-mobile-and-revoked-session-private-denial", { mobile, denial: details.denial });
  } catch (error) {
    details.fixture = fixture.stats; details.registro = data.stats;
    try {
      details.registroFailure = await evaluate("() => ({path:location.pathname,text:document.body.innerText.slice(0,5000)})");
      await screenshot("registro-failure"); await consoleCheck("console-failure");
    } catch { /* Keep the original failure. */ }
    throw error;
  } finally { await assetFailure?.release(); await bfcache?.close(); }
}

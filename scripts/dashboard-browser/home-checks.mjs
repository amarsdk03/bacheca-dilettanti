import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURE_EMAIL, FIXTURE_PASSWORD } from "./session-fixture.mjs";

const TITLE = { users: "Utenti totali", announcements: "Annunci totali", pending: "Annunci da approvare", profits: "Profitti totali" };
const CHART_RESOURCES = "performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/HomeCharts/i.test(decodeURIComponent(n)))";

export async function checkHome({ cli, pageId, evaluate, uid, waitFor, key, fillForm, fixture, workspace, record, details }) {
  const data = fixture.home;
  const click = async label => {
    const output = await cli(["click", pageId, await uid(label)]);
    assert(output.includes("Successfully clicked"), "Click non confermato: " + label);
  };
  const focus = async expression => assert.equal(await evaluate(`() => {const e=${expression};e?.focus();return !!e && document.activeElement===e;}`), true);
  const metric = async name => {
    await focus(`document.querySelector('button[aria-labelledby="home-${name}-label"]')`);
    await key("Enter");
    await waitFor(`() => document.querySelector('#home-chart-title')?.textContent===${JSON.stringify("Grafici - " + TITLE[name])}`);
  };
  const settled = () => waitFor("() => !document.querySelector('#home-chart-panel [aria-busy=true]') && !!document.querySelector('#home-chart-title')");
  const charts = () => waitFor("() => document.querySelectorAll('#home-chart-panel [data-slot=chart] svg.recharts-surface').length===2");
  const screenshot = name => cli(["take_screenshot", pageId, "--filePath", join(workspace.evidence, name + ".png")]);
  const counts = () => ({ ...data.stats.calls });
  const waitHeld = async block => {
    // A button becomes pending before a cold Next API route reaches the HTTP
    // fixture. Observe that boundary explicitly instead of racing compilation.
    for (let i = 0; i < 400 && data.stats.held[block] !== 1; i++) await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(data.stats.held[block], 1, "Richiesta non trattenuta: " + block);
  };
  const delta = (before, expected) => {
    const after = counts();
    for (const block of Object.keys(after)) assert.equal(after[block] - before[block], expected[block] ?? 0, "Richieste inattese: " + block);
  };
  const retry = async title => {
    await focus(`[...document.querySelectorAll('[data-slot=alert]')].find(e=>e.textContent.includes(${JSON.stringify(title)}))?.querySelector('button')`);
    await key("Enter");
  };
  const consoleCheck = async name => {
    const output = await cli(["list_console_messages", pageId, "--includePreservedMessages", "true"]);
    writeFileSync(join(workspace.evidence, name + ".txt"), output);
    assert(!/hydration failed|hydration mismatch|did not match|uncaught|recoverable error|expected.*native.*button|nativeButton|width\(.*\).*height\(.*\).*greater than 0/i.test(output), output);
  };
  try {
    await cli(["emulate", pageId, "--viewport", "1440x900x1"]);
    // Login redirects stream through a Server Action; don't block that response
    // while a separate CLI process waits. Test initial streaming on a reload.
    data.setFailure("chart:users", true);
    await fillForm([['textbox "Indirizzo admin"', FIXTURE_EMAIL], ['textbox "Password"', FIXTURE_PASSWORD]]);
    await click('button "Accedi"');
    await waitFor("() => document.querySelector('#home-users-value')?.textContent==='120' && document.querySelectorAll('main table tbody tr').length===5 && document.body.textContent.includes('Impossibile caricare i grafici')");
    details.lazyBeforeData = await evaluate(`() => ${CHART_RESOURCES}`);
    assert.deepEqual(details.lazyBeforeData, []);
    data.setFailure("chart:users", false); await retry("Impossibile caricare i grafici"); await settled(); await charts();
    details.lazyAfterData = await evaluate(`() => ${CHART_RESOURCES}`);
    assert(details.lazyAfterData.length > 0, "Renderer HomeCharts non osservato sulla rete");

    const content = await evaluate("() => ({title:document.querySelector('h1')?.textContent,values:['users','announcements','pending','profits'].map(k=>document.querySelector('#home-'+k+'-value')?.textContent),rows:[...document.querySelectorAll('main table tbody tr')].slice(0,5).map(r=>r.cells.length),links:[...document.querySelectorAll('main a')].map(a=>({text:a.textContent,href:a.getAttribute('href')})),disabled:[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('Crea profilo limitato'))?.disabled})");
    assert.equal(content.title, "Bentornato, admin!"); assert.deepEqual(content.values, ["120", "60", "6", "Non disponibile"]);
    assert.deepEqual(content.rows, [3, 3, 3, 3, 3]); assert(content.disabled);
    for (const [label, href] of [["Annunci da approvare", "/annunci?status=in_revisione"], ["Segnalazioni aperte", "/segnalazioni"], ["Vedi registro completo", "/registro-attivita"]])
      assert(content.links.some(link => link.text.includes(label) && link.href === href));
    await evaluate("() => {window.scrollTo(0,0);return true;}");
    await screenshot("home-desktop"); record("home-content-kpis-five-events-and-action-destinations", content);

    const observe = `(() => {
      window.__homeStreaming=[];
      const visible=s=>{const e=document.querySelector(s);return !!e && e.getClientRects().length>0;};
      const sample=()=>{if(!document.querySelector('h1'))return;const state={kpi:visible('[aria-label="Caricamento indicatori Home"]'),activity:visible('[aria-label="Caricamento ultime operazioni"]'),summary:visible('#home-users-value'),rows:document.querySelectorAll('main table caption').length,chart:visible('[aria-label="Caricamento grafico"]')};const last=window.__homeStreaming.at(-1);if(JSON.stringify(last)!==JSON.stringify(state))window.__homeStreaming.push(state);};
      new MutationObserver(sample).observe(document,{childList:true,subtree:true,attributes:true});
      document.addEventListener('DOMContentLoaded',sample);
    })();`;
    data.setDelay("summary", 1000); data.setDelay("activity", 3500); data.setDelay("chart:users", 2000);
    await cli(["navigate_page", pageId, "--type", "reload", "--initScript", observe, "--timeout", "90000"], 100000);
    await waitFor("() => document.querySelector('#home-users-value')?.textContent==='120' && [...document.querySelectorAll('main table caption')].some(c=>c.textContent.includes('Ultime cinque'))");
    await settled(); await charts();
    data.setDelay("summary", 0); data.setDelay("activity", 0); data.setDelay("chart:users", 0);
    details.streaming = await evaluate("() => window.__homeStreaming");
    assert(details.streaming.some(s => s.kpi && s.activity), "Skeleton iniziali non osservati");
    assert(details.streaming.some(s => s.summary && s.activity && !s.kpi), "Blocchi non osservati indipendenti");
    assert(details.streaming.some(s => s.chart), "Skeleton grafico non osservato");
    record("progressive-independent-skeletons-and-lazy-renderer", { streaming: details.streaming, before: details.lazyBeforeData.length, after: details.lazyAfterData.length });

    assert.equal(await evaluate("() => document.querySelector('#home-chart-panel').textContent.includes('Totale profili: 150') && document.querySelector('#home-chart-panel').textContent.includes('Popolazione: 120')"), true);
    await metric("announcements"); await settled(); await charts();
    assert.equal(await evaluate("() => document.querySelector('#home-chart-panel').textContent.includes('Stato attuale degli annunci') && document.querySelector('#home-chart-panel').textContent.includes('Totale annunci: 60')"), true);
    await metric("pending"); await settled(); await charts();
    assert.equal(await evaluate("() => !!document.querySelector('#home-chart-panel .recharts-bar') && document.querySelector('#home-chart-panel').textContent.includes('Tipologie da approvare')"), true);
    await metric("profits"); await settled();
    assert.equal(await evaluate("() => !document.querySelector('#home-chart-panel [data-slot=chart]') && document.querySelector('#home-chart-panel').textContent.includes('I dati sui profitti non sono disponibili.')"), true);
    record("all-four-metrics-and-correct-distributions");

    let before = counts(); await metric("profits"); delta(before, {});
    data.hold("chart:announcements"); await metric("announcements");
    await waitFor("() => !!document.querySelector('#home-chart-panel [aria-label=\"Caricamento grafico\"]')");
    await waitHeld("chart:announcements");
    await metric("pending"); await settled(); await charts();
    data.release("chart:announcements");
    assert.equal(await evaluate("() => document.querySelector('#home-chart-title').textContent"), "Grafici - Annunci da approvare");
    delta(before, { "chart:announcements": 1, "chart:pending": 1 });
    for (const [label, block] of [["Aggiorna indicatori", "summary"], ["Aggiorna attività", "activity"], ["Aggiorna grafici", "chart:pending"]]) {
      before = counts(); data.hold(block); await click(`button "${label}"`);
      await waitFor(`() => [...document.querySelectorAll('main button')].find(b=>b.textContent.includes(${JSON.stringify(label)}))?.disabled===true`);
      await waitHeld(block); data.release(block);
      await waitFor(`() => [...document.querySelectorAll('main button')].find(b=>b.textContent.includes(${JSON.stringify(label)}))?.disabled===false`);
      delta(before, { [block]: 1 });
    }
    before = counts(); await new Promise(resolve => setTimeout(resolve, 1200));
    await evaluate("() => document.querySelector('#home-chart-title').textContent"); delta(before, {});
    record("single-metric-independent-refresh-stale-response-and-no-polling", counts());

    data.setDataset("empty"); await click('button "Aggiorna indicatori"');
    await waitFor("() => document.querySelector('#home-users-value')?.textContent==='0' && document.querySelector('#home-announcements-value')?.textContent==='0' && document.querySelector('#home-pending-value')?.textContent==='0'");
    await click('button "Aggiorna attività"'); await waitFor("() => document.body.textContent.includes('Nessuna operazione registrata')");
    await click('button "Aggiorna grafici"'); await settled();
    assert.equal(await evaluate("() => document.querySelector('#home-chart-panel').textContent.includes('Nessun annuncio da approvare') && !document.querySelector('#home-chart-panel [data-slot=chart]')"), true);
    await metric("users"); await settled();
    assert.equal(await evaluate("() => document.querySelector('#home-chart-panel').textContent.includes('Nessun evento nel periodo rappresentato.') && document.querySelector('#home-chart-panel').textContent.includes('Nessun dato nella distribuzione') && !document.querySelector('#home-chart-panel .recharts-pie')"), true);
    record("zero-kpis-empty-activity-and-no-fictitious-charts");

    data.setDataset("populated");
    for (const [block, label, title, ready] of [
      ["summary", "Aggiorna indicatori", "Impossibile caricare gli indicatori", "document.querySelector('#home-users-value')?.textContent==='120'"],
      ["activity", "Aggiorna attività", "Impossibile caricare le ultime operazioni", "document.querySelectorAll('main > section table tbody tr').length>=5 || [...document.querySelectorAll('main table caption')].some(c=>c.textContent.includes('Ultime cinque'))"],
      ["chart:users", "Aggiorna grafici", "Impossibile caricare i grafici", "document.querySelectorAll('#home-chart-panel [data-slot=chart]').length===2"],
    ]) {
      before = counts(); data.setFailure(block, true); await click(`button "${label}"`);
      await waitFor(`() => [...document.querySelectorAll('[data-slot=alert]')].some(e=>e.textContent.includes(${JSON.stringify(title)}))`);
      delta(before, { [block]: 1 });
      assert.equal(await evaluate("() => document.querySelectorAll('[data-slot=alert]').length"), 1);
      data.setFailure(block, false); await retry(title);
      await waitFor(`() => !document.querySelector('[data-slot=alert]') && (${ready})`);
      delta(before, { [block]: 2 });
    }
    await charts(); record("isolated-errors-and-real-retry-for-all-three-blocks");

    await focus("document.querySelector('#home-chart-panel details summary')"); await key("Enter");
    const table = await evaluate("() => ({open:document.querySelector('#home-chart-panel details').open,rows:[...document.querySelectorAll('#home-chart-panel details table')].map(t=>t.tBodies[0].rows.length),months:[...document.querySelectorAll('#home-chart-panel details:first-of-type tbody tr td:first-child')].map(e=>e.textContent)})");
    assert(table.open); assert.deepEqual(table.rows, [12, 2]);
    assert(table.months.some(label => label.includes("2025")) && table.months.some(label => label.includes("2026")));
    await focus("document.querySelector('#home-chart-panel svg[role=application]')"); await key("ArrowRight");
    await waitFor("() => [...document.querySelectorAll('#home-chart-panel .recharts-tooltip-wrapper')].some(e=>getComputedStyle(e).visibility==='visible')");
    await key("Escape"); await screenshot("home-charts-desktop");
    const layouts = [];
    for (const [width, height] of [[390, 844], [1440, 900]]) {
      await cli(["emulate", pageId, "--viewport", `${width}x${height}x1${width < 500 ? ",mobile,touch" : ""}`]);
      await waitFor(`() => innerWidth===${width} && [...document.querySelectorAll('#home-chart-panel [data-slot=chart]')].every(e=>e.getBoundingClientRect().width>0)`);
      const view = await evaluate("() => ({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,charts:[...document.querySelectorAll('#home-chart-panel [data-slot=chart]')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),font:getComputedStyle(document.body).fontFamily})");
      assert.equal(view.overflow, false); assert.match(view.font, /Arial/); layouts.push(view);
      if (width === 390) {
        await evaluate("() => {window.scrollTo(0,0);return true;}"); await screenshot("home-mobile");
        await evaluate("() => {document.querySelector('#home-chart-panel').scrollIntoView();return true;}"); await screenshot("home-charts-mobile");
      }
    }
    await consoleCheck("console-home");
    details.layouts = layouts; record("keyboard-tables-tooltips-resize-mobile-and-clean-console", { table, layouts });

    fixture.revoke(); await click('button "Aggiorna indicatori"');
    await waitFor("() => location.pathname==='/accesso' && document.body.textContent.includes('Accesso non consentito') && !document.querySelector('#home-users-value') && !document.querySelector('#home-chart-panel')");
    const denial = await evaluate("async () => {const r=await fetch('/api/home/summary',{cache:'no-store'});return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};}");
    assert.equal(denial.status, 403); assert.deepEqual(denial.body, { status: "denied", code: "ACCESS_DENIED" }); assert.match(denial.cache, /private.*no-store/);
    await click('button "Logout"'); await waitFor("() => !!document.querySelector('#admin-email')");
    await consoleCheck("console"); assert.equal(fixture.stats.unexpected, 0);
    details.fixture = fixture.stats; details.home = data.stats;
    record("revoked-session-clears-home-and-denies-data", denial);
  } catch (error) {
    details.fixture = fixture.stats; details.home = data.stats;
    try {
      details.homeFailure = await evaluate("() => ({path:location.pathname,text:document.body.innerText.slice(0,5000)})");
      await screenshot("home-failure");
      writeFileSync(join(workspace.evidence, "console.txt"), await cli(["list_console_messages", pageId, "--includePreservedMessages", "true"]));
    } catch { /* Preserve the original failure if the page is unavailable. */ }
    throw error;
  }
}

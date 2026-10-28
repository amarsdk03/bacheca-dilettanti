import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { annunciId, ANNUNCI_TYPES } from "./annunci-fixture.mjs";
import { FIXTURE_EMAIL, FIXTURE_PASSWORD } from "./session-fixture.mjs";

const LABELS = { approve: "Approva", reject: "Rifiuta", hide: "Nascondi", show: "Ripristina visibilità", trash: "Sposta nel cestino", restore: "Ripristina dal cestino" };
const ALERT = "document.querySelector('[data-slot=alert-dialog-content]')";
const SHEET = "document.querySelector('[data-slot=sheet-content]')";
export function parseDownloadedCsv(bytes) {
  assert.deepEqual([...bytes.subarray(0, 3)], [239, 187, 191]);
  const text = bytes.toString("utf8").slice(1), rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && ch === ";") { row.push(cell); cell = ""; }
    else if (!quoted && ch === "\r" && text[i + 1] === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; i++; }
    else cell += ch;
  }
  assert.equal(quoted, false); assert.equal(cell, ""); assert.equal(row.length, 0); return rows;
}

export async function checkAnnunci({ cli, pageId, evaluate, uid, waitFor, key, fillForm, fill, navigate, fixture, workspace, record, details, origin, extraBrowser }) {
  const data = fixture.annunci;
  const focus = async expression => assert.equal(await evaluate(`() => {const e=${expression};e?.focus();return !!e && document.activeElement===e;}`), true, "Focus: " + expression);
  const press = async expression => { await focus(expression); await key("Enter"); };
  const button = label => press(`[...document.querySelectorAll('main button')].find(e=>e.textContent.trim()===${JSON.stringify(label)})`);
  const dialogButton = label => press(`[...(${ALERT})?.querySelectorAll('button')??[]].find(e=>e.textContent.trim()===${JSON.stringify(label)})`);
  const click = async label => assert((await cli(["click", pageId, await uid(label)])).includes("Successfully clicked"));
  const ready = () => waitFor("() => location.pathname==='/annunci' && !!document.querySelector('#annunci-results') && !document.querySelector('main [aria-label=\"Caricamento tabella\"]')");
  const rowIds = () => evaluate("() => [...document.querySelectorAll('main table tbody tr')].map(r=>r.querySelector('td p.mt-1')?.textContent)");
  const screenshot = async name => {
    await evaluate("() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true))))");
    await cli(["take_screenshot", pageId, "--filePath", join(workspace.evidence, name + ".png")]);
  };
  const waitHeld = async block => {
    for (let i = 0; i < 400 && data.stats.held[block] !== 1; i++) await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(data.stats.held[block], 1, "Attesa fixture: " + block);
  };
  const filter = async (id, option) => { await press(`document.getElementById(${JSON.stringify(id)})`); await click(`option "${option}"`); await ready(); };
  const reset = async () => { await button("Ripristina filtri"); await ready(); assert.equal(await evaluate("() => location.search"), ""); };
  const previewButton = id => `[...document.querySelectorAll('main table tbody tr')].find(r=>r.textContent.includes(${JSON.stringify(id)}))?.querySelector('button[aria-label^="Anteprima:"]')`;
  const open = async (id, expect = "ok") => {
    await press(previewButton(id));
    await waitFor(`() => !!${SHEET} && !(${SHEET}).querySelector('[aria-label="Caricamento dettagli"]')`);
    if (expect === "ok") assert.equal(await evaluate(`() => (${SHEET}).querySelector('[data-slot=sheet-title]').textContent`), data.inspect(id).summary.title);
  };
  const close = async () => { await press(`(${SHEET})?.querySelector('[data-slot=sheet-close]')`); await waitFor(`() => !${SHEET}`); };
  const begin = async (id, operation, inSheet = false) => {
    if (inSheet) await press(`[...(${SHEET}).querySelectorAll('section[aria-label="Moderazione annuncio"] button')].find(e=>e.textContent.trim()===${JSON.stringify(LABELS[operation])})`);
    else {
      await press(`document.getElementById('annunci-menu-${id}')`);
      await click(`menuitem "${LABELS[operation]}"`);
    }
    await waitFor(`() => !!${ALERT} && !(${ALERT}).querySelector('[aria-label="Caricamento dettagli"]')`);
  };
  const confirm = async (operation, reason = null) => {
    if (reason !== null) await fillForm([['textbox "' + (operation === "trash" ? "Motivazione interna" : "Motivazione visibile all’autore") + '"', reason]]);
    await dialogButton(LABELS[operation]);
  };
  const success = () => waitFor(`() => (${ALERT})?.textContent.includes('Modifica salvata.')`);
  const dismiss = async () => { await dialogButton("Chiudi"); await waitFor(`() => !${ALERT}`); await ready(); };
  const consoleCheck = async name => {
    const output = await cli(["list_console_messages", pageId, "--includePreservedMessages", "true"]);
    writeFileSync(join(workspace.evidence, name + ".txt"), output);
    assert(!/hydration failed|hydration mismatch|did not match|uncaught|recoverable error|nativeButton|expected.*native.*button/i.test(output), output);
  };
  const verifyDownload = async () => {
    const expectedIds = await rowIds(), expected = expectedIds.map(id => data.inspect(id).summary.title);
    const before = extraBrowser.downloads.length; await button("Esporta pagina CSV");
    const file = await extraBrowser.downloadAfter(before), rows = parseDownloadedCsv(file.bytes);
    assert.equal(rows.length, expected.length + 1); assert(rows.every(row => row.length === 6)); assert.equal(rows[0][0], "Titolo");
    assert.deepEqual(rows.slice(1).map(row => row[0]), expected.map(title => title.startsWith("=") ? "'" + title : title));
    await waitFor("() => [...document.querySelectorAll('main button')].some(e=>e.textContent.trim()==='Esporta pagina CSV' && !e.disabled)");
    return { filename: file.filename, rows: expected.length, bytes: file.bytes.length, ids: expectedIds };
  };
  try {
    await cli(["emulate", pageId, "--viewport", "1440x900x1"]);
    await fillForm([['textbox "Indirizzo admin"', FIXTURE_EMAIL], ['textbox "Password"', FIXTURE_PASSWORD]]);
    await click('button "Accedi"'); await waitFor("() => document.querySelector('h1')?.textContent==='Bentornato, admin!'");
    await navigate("/annunci"); await ready();
    assert.deepEqual(await rowIds(), Array.from({ length: 30 }, (_, i) => annunciId(i + 1)));
    assert.equal(await evaluate("() => document.querySelectorAll('main table thead th').length"), 7); assert.equal(data.stats.detail, 0);
    data.hold("list"); await button("Aggiorna elenco"); await waitHeld("list");
    assert.equal(await evaluate("() => !!document.querySelector('main [aria-label=\"Caricamento tabella\"]')"), true);
    data.release("list"); await ready();
    await evaluate("() => {window.scrollTo(0,0);return true;}"); await screenshot("annunci-desktop");
    record("list-order-thirty-rows-skeleton-and-no-detail-prefetch");

    // Check the native download early, before the longer moderation coverage.
    details.csv = [await verifyDownload()];
    for (const mode of ["conflict", "unavailable"]) {
      const before = extraBrowser.downloads.length; data.setMode("export", mode); await button("Esporta pagina CSV");
      await waitFor("() => document.body.textContent.includes('Export non completato')"); assert.equal(extraBrowser.downloads.length, before);
      data.setMode("export", "ok"); await button("Aggiorna elenco"); await ready();
    }
    await cli(["emulate", pageId, "--viewport", "390x844x1,mobile,touch"]); await ready();
    details.csv.push(await verifyDownload()); record("desktop-and-mobile-native-csv-download-current-page-and-no-file-on-errors", details.csv);
    await cli(["emulate", pageId, "--viewport", "1440x900x1"]); await ready();

    await fill('textbox "Cerca per titolo o UUID"', "sintetico ");
    await waitFor("() => new URLSearchParams(location.search).get('search')==='sintetico' && document.querySelector('#annunci-search').value==='sintetico '");
    await fill('textbox "Cerca per titolo o UUID"', "sintetico 11");
    await waitFor("() => new URLSearchParams(location.search).get('search')==='sintetico 11' && document.querySelectorAll('main table tbody tr').length===1");
    assert.deepEqual(await rowIds(), [annunciId(11)]); await reset();
    await filter("annunci-status", "In revisione"); assert.equal((await rowIds()).length, 11);
    await filter("annunci-type", "Giocatore"); assert.deepEqual(await rowIds(), [annunciId(1)]); await reset();
    await filter("annunci-visibility", "Oscurati"); assert.equal((await rowIds()).length, 7); await reset();
    await filter("annunci-trash", "Solo cestino"); assert.deepEqual(await rowIds(), [annunciId(36), annunciId(37)]); await reset();
    await fill('textbox "Cerca per titolo o UUID"', "nessun-risultato");
    await waitFor("() => document.body.textContent.includes('Nessun annuncio corrisponde ai filtri')"); await reset();
    await navigate("/annunci?status=inesistente");
    await waitFor("() => document.body.textContent.includes('Filtri o cursore non validi')"); await reset();
    data.setMode("list", "unavailable"); await button("Aggiorna elenco"); await waitFor("() => document.body.textContent.includes('Impossibile caricare gli annunci')");
    data.setMode("list", "ok"); await button("Riprova"); await ready();
    record("filters-search-empty-invalid-and-list-retry");

    await button("Successiva"); await ready(); const second = await rowIds(); assert.deepEqual(second, [31, 32, 33, 34, 35].map(annunciId));
    const cursorSearch = await evaluate("() => location.search");
    await button("Precedente"); await ready(); assert.equal((await rowIds()).length, 30);
    await cli(["navigate_page", pageId, "--type", "back"]); await ready(); assert.deepEqual(await rowIds(), second);
    await cli(["navigate_page", pageId, "--type", "forward"]); await ready(); assert.equal((await rowIds()).length, 30);
    await navigate("/annunci" + cursorSearch); await ready(); assert.deepEqual(await rowIds(), second);
    await button("Prima pagina"); await ready(); assert.equal((await rowIds()).length, 30);
    await navigate("/annunci" + cursorSearch + "&status=in_revisione"); await waitFor("() => document.body.textContent.includes('Filtri o cursore non validi')"); await reset();
    record("cursor-pagination-history-reload-and-filter-binding");

    for (let i = 1; i <= ANNUNCI_TYPES.length; i++) {
      const id = annunciId(i), before = data.stats.detail; await open(id);
      assert.equal(data.stats.detail, before + 1);
      assert.equal(await evaluate(`() => (${SHEET}).textContent.includes('Contenuto sintetico') && (${SHEET}).textContent.includes('9007199254740993')`), false); // Child IDs are internal, not displayed as content.
      assert.equal(await evaluate(`() => (${SHEET}).textContent.includes('Contenuto sintetico') && (${SHEET}).textContent.includes('contatto@example.test')`), true);
      await close(); assert.equal(await evaluate("() => document.activeElement.getAttribute('aria-label')?.startsWith('Anteprima:')"), true);
    }
    data.hold("detail"); await press(previewButton(annunciId(1))); await waitHeld("detail");
    assert.equal(await evaluate(`() => !!(${SHEET}).querySelector('[aria-label="Caricamento dettagli"]')`), true);
    await close(); data.release("detail");
    data.setMode("detail", "not_found"); await open(annunciId(1), "missing"); assert.equal(await evaluate(`() => (${SHEET}).textContent.includes('Annuncio non più disponibile')`), true); await close();
    data.setMode("detail", "unavailable"); await open(annunciId(1), "error");
    assert.equal(await evaluate(`() => (${SHEET}).textContent.includes('Impossibile caricare il dettaglio')`), true);
    data.setMode("detail", "ok"); await press(`[...(${SHEET}).querySelectorAll('button')].find(e=>e.textContent.trim()==='Riprova')`);
    await waitFor(`() => (${SHEET}).textContent.includes('Contenuto sintetico')`);
    await screenshot("annunci-preview"); await close();
    await navigate("/annunci" + cursorSearch); await ready(); await open(annunciId(34));
    assert.equal(await evaluate(`() => (${SHEET}).textContent.includes('Profilo non disponibile')`), true); await close(); await button("Prima pagina"); await ready();
    record("eleven-preview-types-on-demand-cancellation-fallback-and-retry");

    await open(annunciId(1)); const externalSelector = `[data-slot=sheet-content] a[href="${fixture.origin}/external/announcement"]`;
    for (const mode of ["keyboard", "control", "middle"]) {
      const before = fixture.stats.external;
      if (mode === "keyboard") await press(`document.querySelector(${JSON.stringify(externalSelector)})`);
      else await extraBrowser.modifiedClick(origin, externalSelector, mode);
      await waitFor(`() => (${ALERT})?.textContent.includes('Stai aprendo un sito esterno')`);
      assert.equal(fixture.stats.external, before); assert.equal((await extraBrowser.externalPages(fixture.origin)).length, 0);
      assert.equal(await evaluate(`() => document.activeElement.textContent.trim()`), "Annulla");
      await dialogButton("Annulla"); await waitFor(`() => !${ALERT}`);
      assert.equal(await evaluate(`() => document.activeElement.getAttribute('href')`), fixture.origin + "/external/announcement");
    }
    await press(`document.querySelector(${JSON.stringify(externalSelector)})`); await waitFor(`() => !!${ALERT}`);
    await screenshot("annunci-external-confirmation");
    await press(`[...(${ALERT}).querySelectorAll('a')].find(e=>e.textContent.includes('Continua'))`);
    for (let i = 0; i < 100 && !(await extraBrowser.externalPages(fixture.origin)).length; i++) await new Promise(resolve => setTimeout(resolve, 50));
    const pages = await extraBrowser.externalPages(fixture.origin); assert.equal(pages.length, 1);
    assert.equal(await pages[0].evaluate(() => window.opener === null), true); await pages[0].close(); await close();
    record("external-dialog-over-sheet-modifiers-middle-click-focus-and-new-tab");

    await begin(annunciId(1), "approve"); await dialogButton("Annulla"); assert.equal(data.stats.moderate, 0);
    for (const [id, operation, reason] of [[1, "approve", null], [1, "hide", "Motivo visibile sintetico"], [1, "show", null], [2, "reject", "Rifiuto sintetico"]]) {
      await begin(annunciId(id), operation);
      if (reason) { const before = data.stats.moderate; await confirm(operation); assert.equal(data.stats.moderate, before); assert.equal(await evaluate(`() => (${ALERT}).textContent.includes('Inserisci una motivazione')`), true); }
      await confirm(operation, reason); await success(); await dismiss();
    }
    assert.equal(data.inspect(annunciId(1)).summary.status, "pubblicato"); assert.equal(data.inspect(annunciId(1)).summary.hidden, false);
    assert.equal(data.inspect(annunciId(2)).summary.status, "rifiutato"); record("four-moderation-actions-reasons-cancel-and-refresh");

    data.setIncomplete(annunciId(3), true); await begin(annunciId(3), "approve");
    assert.equal(await evaluate(`() => [...(${ALERT}).querySelectorAll('button')].find(e=>e.textContent==='Approva').disabled`), true);
    await dialogButton("Annulla"); data.setIncomplete(annunciId(3), false);
    await begin(annunciId(3), "approve"); data.bump(annunciId(3)); await confirm("approve");
    await waitFor(`() => (${ALERT})?.textContent.includes('L’annuncio è cambiato')`);
    const conflictCalls = data.stats.moderate; await new Promise(resolve => setTimeout(resolve, 500)); assert.equal(data.stats.moderate, conflictCalls);
    await dialogButton("Ricarica dettaglio"); await waitFor(`() => [...(${ALERT})?.querySelectorAll('button')??[]].some(e=>e.textContent==='Approva')`);
    await dialogButton("Annulla");
    data.setMode("moderate", "uncertain"); data.hold("moderate"); await begin(annunciId(3), "hide"); await confirm("hide", "Esito incerto sintetico"); await waitHeld("moderate");
    const submitting = data.stats.moderate;
    assert.equal(await evaluate(`() => [...(${ALERT}).querySelectorAll('button')].every(e=>e.disabled)`), true);
    await key("Escape"); assert.equal(await evaluate(`() => !!${ALERT}`), true);
    data.release("moderate"); await waitFor(`() => (${ALERT})?.textContent.includes('Esito non verificabile')`);
    assert.equal(data.stats.moderate, submitting); assert.equal(data.inspect(annunciId(3)).summary.hidden, true);
    data.setMode("moderate", "ok"); await dialogButton("Ricarica dettaglio");
    await waitFor(`() => (${ALERT})?.textContent.includes('L’annuncio è già nascosto')`); await dialogButton("Annulla");
    record("denied-capability-conflict-uncertain-commit-pending-and-no-retry");

    await begin(annunciId(4), "trash"); assert.equal(await evaluate(`() => (${ALERT}).textContent.includes('Il cestino non è ancora abilitato')`), true); await dialogButton("Annulla");
    data.setGate(true); await begin(annunciId(4), "trash"); await confirm("trash", "Motivo interno sintetico"); await success(); await dismiss();
    assert(!(await rowIds()).includes(annunciId(4))); await filter("annunci-trash", "Solo cestino"); assert((await rowIds()).includes(annunciId(4)));
    await begin(annunciId(4), "restore"); await confirm("restore"); await success(); await dismiss();
    const restored = data.inspect(annunciId(4)); assert.equal(restored.summary.trashed, false); assert.equal(restored.summary.hidden, true); assert.equal(restored.moderation.adminHidden, true);
    await reset(); record("trash-gate-internal-reason-exclusion-and-restore-under-hold");

    await cli(["emulate", pageId, "--viewport", "390x844x1,mobile,touch"]); await ready();

    const mobile = await evaluate("() => ({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,font:getComputedStyle(document.body).fontFamily,tableScroll:document.querySelector('[data-slot=table-container]')?.scrollWidth>document.querySelector('[data-slot=table-container]')?.clientWidth})");
    assert.equal(mobile.width, 390); assert.equal(mobile.overflow, false); assert.match(mobile.font, /Arial/); assert.equal(mobile.tableScroll, true);
    await evaluate("() => {window.scrollTo(0,0);return true;}"); await screenshot("annunci-mobile");
    await open(annunciId(1)); await screenshot("annunci-preview-mobile");
    await begin(annunciId(1), "hide", true); await screenshot("annunci-dialog-mobile"); await dialogButton("Annulla"); await close();
    await consoleCheck("console-annunci");
    // Exercise a write while its verified detail is already open, then an
    // authenticated HTTP read after revocation; no client state is seeded.
    await begin(annunciId(1), "hide"); const writes = data.stats.moderate; fixture.revoke(); await confirm("hide", "Revoca sintetica");
    await waitFor("() => location.pathname==='/accesso' && !document.querySelector('#annunci-search')"); assert.equal(data.stats.moderate, writes);
    const denial = await evaluate("async () => {const r=await fetch('/api/annunci',{cache:'no-store'});return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};}");
    assert.equal(denial.status, 403); assert.deepEqual(denial.body, { status: "denied", code: "ACCESS_DENIED" }); assert.match(denial.cache, /private.*no-store/);
    await click('button "Logout"'); await waitFor("() => !!document.querySelector('#admin-email')"); await consoleCheck("console");
    assert.equal(fixture.stats.unexpected, 0); details.fixture = fixture.stats; details.annunci = data.stats; details.mobile = mobile;
    record("mobile-scroll-dialog-focus-and-revoked-read-write-session", { mobile, denial });
  } catch (error) {
    details.fixture = fixture.stats; details.annunci = data.stats;
    try { details.annunciFailure = await evaluate("() => ({path:location.pathname,search:location.search,text:document.body.innerText.slice(0,7000)})"); await screenshot("annunci-failure"); writeFileSync(join(workspace.evidence, "console.txt"), await cli(["list_console_messages", pageId, "--includePreservedMessages", "true"])); } catch { /* Preserve failure if page was closed. */ }
    throw error;
  }
}

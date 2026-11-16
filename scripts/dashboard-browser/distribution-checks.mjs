import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {existsSync, createWriteStream, writeFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {randomUUID} from "node:crypto";
import {command, isolatedEnv, prepareWorkspace, stopChild} from "./core.mjs";
import {createSessionFixture, FIXTURE_EMAIL, FIXTURE_PASSWORD} from "./session-fixture.mjs";
import {launchAnnunciBrowser} from "./annunci-cdp.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixture = await createSessionFixture({distribution: true}), workspace = prepareWorkspace(root), env = isolatedEnv(process.env, fixture.origin);
env.SUPABASE_SECRET_KEY = fixture.secretKey;
const toolDir = join(root, "node_modules/.cache/dashboard-browser-tools/node_modules/chrome-devtools-mcp"), tool = join(toolDir, "build/src/bin/chrome-devtools.js");
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find(existsSync);
const session = randomUUID(), log = createWriteStream(join(workspace.evidence, "next.log")), checks = [];
const cli = async args => {const out = await command(process.execPath, [tool, ...args, "--sessionId", session], {cwd: workspace.run, env, timeout: 90000}); if (/^Error:/m.test(out)) throw new Error(out); return out;};
const probe = createServer(); await new Promise(r => probe.listen(0, "127.0.0.1", r)); const port = probe.address().port; await new Promise(r => probe.close(r));
const origin = "http://127.0.0.1:" + port;
let next, browser, pageId, started = false, failure;
const record = name => {checks.push(name); console.log("PASS " + name);};
try {
  console.log("Isolated distribution checks: " + workspace.run);
  next = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", workspace.app, "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {cwd: workspace.app, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"]});
  next.stdout.pipe(log); next.stderr.pipe(log, {end: false});
  let ready = false;
  for (let i = 0; i < 90; i++) {try {if ((await fetch(origin + "/accesso", {signal: AbortSignal.timeout(30000)})).ok) {ready = true; break;}} catch {} await new Promise(r => setTimeout(r, 500));}
  assert(ready);
  for (const path of ["/", "/distribuzione", "/annunci", "/profili", "/api/distribuzione"]) {
    const response = await fetch(origin + path, {redirect: "manual", signal: AbortSignal.timeout(180000)}); await response.text();
    if (path.startsWith("/api/")) {assert.equal(response.status,403); assert.match(response.headers.get("cache-control"),/private.*no-store/);}
  }
  record("anonymous-access-and-private-cache");
  browser = await launchAnnunciBrowser({toolDir, chrome, workspace, env});
  await cli(["start", "--browserUrl", browser.browserUrl, "--workspace", workspace.run, "--usageStatistics", "false", "--fileNavigations", "false"]); started = true;
  const created = await cli(["new_page", origin + "/accesso", "--timeout", "90000"]); pageId = /(?:^|\n)(\d+):[^\n]*\[selected\]/m.exec(created)?.[1]; assert(pageId, created);
  const evaluate = async script => {const out = await cli(["evaluate_script", script, "--pageId", pageId]); const m = /```json\s*([\s\S]*?)```/.exec(out); assert(m, out); return JSON.parse(m[1]);};
  const wait = async script => {for (let i = 0; i < 40; i++) {try {if (await evaluate(script)) return; if (await evaluate("() => document.body.textContent.includes('Operazione non verificabile')")) throw new Error("Browser received an unavailable response");} catch (e) {if (!/Execution context was destroyed|Cannot find context/.test(e.message)) throw e;} await new Promise(r => setTimeout(r, 150));} throw new Error("WAIT: " + script);};
  const uid = async label => {const snapshot = await cli(["take_snapshot", pageId]); const line = snapshot.split("\n").find(v => v.includes(label)); const id = /uid=([\w-]+)/.exec(line ?? "")?.[1]; assert(id, label + "\n" + snapshot); return id;};
  const click = async label => cli(["click", pageId, await uid(label)]);
  const activate = async selector => {assert(await evaluate(`() => {const e=document.querySelector(${JSON.stringify(selector)});e?.click();return !!e;}`));};
  await cli(["emulate", pageId, "--viewport", "1440x900x1"]);
  await cli(["fill", pageId, await uid('textbox "Indirizzo admin"'), FIXTURE_EMAIL]);
  await cli(["fill", pageId, await uid('textbox "Password"'), FIXTURE_PASSWORD]); await click('button "Accedi"');
  await wait("() => location.pathname==='/' && !!document.querySelector('h1')");
  // Establish a real dismissal before testing these pages: viewport emulation
  // can momentarily cross the mobile breakpoint during navigation/snapshots.
  await cli(["emulate",pageId,"--viewport","390x844x1"]);
  await wait("() => [...document.querySelectorAll('button')].some(b=>b.textContent==='Ho capito')");
  await click('button "Ho capito"');
  await cli(["emulate",pageId,"--viewport","1440x900x1"]);

  await cli(["navigate_page",pageId,"--url",origin+"/distribuzione","--timeout","90000"]);
  await wait("() => document.body.innerText.includes('Aggiungi il primo canale')");
  await click('button "Aggiungi canale"');
  await cli(["fill",pageId,await uid('textbox "Nome'),"Canale Lombardia"]);
  await cli(["fill",pageId,await uid('textbox "URL del canale'),"https://www.whatsapp.com/channel/BrowserLombardia123"]);
  await activate("#channel-region"); await click('option "Lombardia"');
  await click('button "Salva modifiche"');
  await wait("() => !document.querySelector('[data-slot=dialog-content]') && document.querySelectorAll('main tbody tr').length===2");
  await cli(["fill",pageId,await uid('textbox "Cerca annuncio"'),"740"]);
  assert(await evaluate("() => !location.search.includes('search=') && document.querySelectorAll('main tbody tr').length===2"));
  await click('button "Filtra"');
  await wait("() => location.search.includes('search=740')");
  await click('button "Azzera"');
  await wait("() => document.querySelectorAll('main tbody tr').length===2");
  record("channel-creation-regional-queue-and-url-filters");
  await activate("main tbody tr button");
  await wait("() => !!document.querySelector('#distribution-manual') && !!document.querySelector('#distribution-message')?.value");
  await activate("#distribution-manual");
  assert(await evaluate("() => document.querySelector('#distribution-url').disabled"));
  await click('button "Annulla"');
  await wait("() => document.body.innerText.includes('Modifiche non salvate!')");
  await click('button "Continua a modificare"');
  await click('button "Salva modifiche"');
  await wait("() => !document.querySelector('[data-slot=dialog-content]') && document.querySelectorAll('main tbody tr').length===1");
  record("manual-without-link-and-unsaved-dialog");
  await click('tab "Pubblicazioni"');
  await wait("() => location.search.includes('view=publications') && document.querySelectorAll('main tbody tr').length===1");
  assert(await evaluate("() => document.querySelector('main tbody').innerText.includes('Confermato senza link')"));
  await activate("main tbody tr button");
  await wait("() => document.querySelector('#distribution-url')?.disabled===true");
  await activate("#distribution-manual");
  await cli(["fill",pageId,await uid('textbox "Link messaggio WhatsApp"'),"https://www.whatsapp.com/channel/WrongChannel123/1"]);
  assert(await evaluate("() => document.querySelector('#distribution-url').getAttribute('aria-invalid')==='true'"));
  await cli(["fill",pageId,await uid('textbox "Link messaggio WhatsApp"'),"https://www.whatsapp.com/channel/BrowserLombardia123/1"]);
  await click('button "Salva modifiche"');
  await wait("() => !document.querySelector('[data-slot=dialog-content]') && document.querySelector('main tbody').innerText.includes('Confermato con link')");
  await activate("main tbody tr button"); await wait("() => !!document.querySelector('#distribution-message')");
  await click('button "Ricondividi"'); await click('button "Conferma"');
  await click('button "Salva modifiche"');
  await wait("() => !document.querySelector('[data-slot=dialog-content]') && document.querySelectorAll('main tbody tr').length===2");
  record("message-link-validation-repost-and-preserved-history");
  await click('tab "Da condividere"');
  await wait("() => document.querySelectorAll('main tbody tr').length===2 && !document.querySelector('main [aria-busy=true]')");
  await cli(["take_screenshot",pageId,"--filePath",join(workspace.evidence,"distribution-dark.png")]);
  await click('checkbox "Seleziona la pagina"');
  await click('button "Prepara selezionati');
  await wait("() => document.body.innerText.includes('Annuncio 1 di 2') && !!document.querySelector('#distribution-manual')");
  await activate("#distribution-manual"); await click('button "Salva modifiche"');
  await wait("() => document.body.innerText.includes('Annuncio 2 di 2') && !!document.querySelector('#distribution-manual')");
  await activate("#distribution-manual"); await click('button "Salva modifiche"');
  await wait("() => !document.querySelector('[data-slot=dialog-content]') && document.body.innerText.includes('Nessun risultato')");
  record("sequential-preparation-requires-each-confirmation");
  await click('tab "Canali"');
  await wait("() => document.querySelectorAll('main tbody tr').length===1");
  await activate("main tbody button"); await activate("#channel-active"); await click('button "Salva modifiche"');
  await wait("() => !document.querySelector('[data-slot=dialog-content]') && document.querySelector('main tbody').innerText.includes('Archiviato')");
  await activate("main tbody button"); await activate("#channel-active"); await click('button "Salva modifiche"');
  await wait("() => !document.querySelector('[data-slot=dialog-content]') && document.querySelector('main tbody').innerText.includes('Attivo')");
  record("channel-archive-and-reactivation");
  await cli(["navigate_page",pageId,"--url",origin+"/annunci?status=pubblicato","--timeout","90000"]);
  await wait("() => document.querySelectorAll('main tbody tr').length===3");
  assert(await evaluate("() => {const row=[...document.querySelectorAll('main tbody tr')].find(r=>r.innerText.includes('Annuncio distribuzione 740'));row?.querySelector('button')?.click();return !!row;}"));
  await click('menuitem "Esporta su WhatsApp"');
  await wait("() => !!document.querySelector('#distribution-channel')");
  await activate("#distribution-channel"); await click('option "Canale Lombardia');
  await wait("() => !!document.querySelector('#distribution-manual')");
  await click('button "Annulla"');
  record("announcements-use-the-same-distribution-editor");
  await cli(["navigate_page",pageId,"--url",origin+"/profili","--timeout","90000"]);
  await wait("() => document.querySelectorAll('main tbody tr').length===8");
  await click('button "Legenda visibilit\u00e0 profili"');
  await wait("() => document.querySelector('[data-slot=dialog-content]')?.innerText.includes('Le altre tipologie dell')");
  await cli(["press_key",pageId,"Escape"]);
  record("profile-visibility-legend");
  await cli(["navigate_page",pageId,"--url",origin+"/distribuzione?view=publications","--timeout","90000"]);
  await wait("() => document.querySelectorAll('main tbody tr').length===3");
  await click('button "Passa al tema chiaro"');
  await cli(["take_screenshot",pageId,"--filePath",join(workspace.evidence,"distribution-light.png")]);
  await cli(["emulate",pageId,"--viewport","390x844x1"]);
  assert(await evaluate("() => document.documentElement.scrollWidth<=innerWidth+1"));
  await cli(["take_screenshot",pageId,"--filePath",join(workspace.evidence,"distribution-mobile.png")]);
  record("light-dark-and-mobile-layout");
  const messages = await cli(["list_console_messages", pageId, "--includePreservedMessages", "true"]);
  writeFileSync(join(workspace.evidence, "console.txt"), messages);
  assert(!/hydration failed|hydration mismatch|did not match|uncaught|recoverable error|nativeButton/i.test(messages), messages);
  record("keyboard-focus-and-no-hydration-errors");
} catch (error) {failure = error.message; if (started && pageId) {try {writeFileSync(join(workspace.evidence, "failure-snapshot.txt"), await cli(["take_snapshot", pageId])); await cli(["take_screenshot", pageId, "--filePath", join(workspace.evidence, "failure.png")]);} catch {}} throw error;}
finally {
  const cleanup = [];
  for (const action of [() => started ? cli(["stop"]) : Promise.resolve(), () => browser?.close(), () => stopChild(next), () => fixture.close()]) {try {await action();} catch (e) {cleanup.push(e.message);}}
  log.end(); writeFileSync(join(workspace.evidence, "report.json"), JSON.stringify({checks, failure, cleanup}, null, 2)); console.log("Evidence: " + workspace.evidence);
  if (cleanup.length && !failure) throw new Error(cleanup.join("; "));
}



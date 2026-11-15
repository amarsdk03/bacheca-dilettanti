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
const fixture = await createSessionFixture({people: true}), workspace = prepareWorkspace(root), env = isolatedEnv(process.env, fixture.origin);
env.SUPABASE_SECRET_KEY = fixture.secretKey;
const toolDir = join(root, "node_modules/.cache/dashboard-browser-tools/node_modules/chrome-devtools-mcp"), tool = join(toolDir, "build/src/bin/chrome-devtools.js");
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find(existsSync);
const session = randomUUID(), log = createWriteStream(join(workspace.evidence, "next.log")), checks = [];
const cli = async args => {const out = await command(process.execPath, [tool, ...args, "--sessionId", session], {cwd: workspace.run, env, timeout: 90000}); if (/^Error:/m.test(out)) throw new Error(out); return out;};
const probe = createServer(); await new Promise(r => probe.listen(0, "127.0.0.1", r)); const port = probe.address().port; await new Promise(r => probe.close(r));
const origin = "http://127.0.0.1:" + port;
let next, browser, started = false, failure;
const record = name => {checks.push(name); console.log("PASS " + name);};
try {
  console.log("Isolated people checks: " + workspace.run);
  next = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", workspace.app, "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {cwd: workspace.app, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"]});
  next.stdout.pipe(log); next.stderr.pipe(log, {end: false});
  let ready = false;
  for (let i = 0; i < 90; i++) {try {if ((await fetch(origin + "/accesso", {signal: AbortSignal.timeout(30000)})).ok) {ready = true; break;}} catch {} await new Promise(r => setTimeout(r, 500));}
  assert(ready);
  for (const path of ["/", "/utenti", "/profili", "/api/utenti", "/api/profili"]) {
    const response = await fetch(origin + path, {redirect: "manual", signal: AbortSignal.timeout(180000)}); await response.text();
    if (path.startsWith("/api/")) {assert.equal(response.status,403); assert.match(response.headers.get("cache-control"),/private.*no-store/);}
  }
  record("anonymous-access-and-private-cache");
  browser = await launchAnnunciBrowser({toolDir, chrome, workspace, env});
  await cli(["start", "--browserUrl", browser.browserUrl, "--workspace", workspace.run, "--usageStatistics", "false", "--fileNavigations", "false"]); started = true;
  const created = await cli(["new_page", origin + "/accesso", "--timeout", "90000"]), pageId = /(?:^|\n)(\d+):[^\n]*\[selected\]/m.exec(created)?.[1]; assert(pageId, created);
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

  await cli(["navigate_page",pageId,"--url",origin+"/utenti","--timeout","90000"]);
  await wait("() => document.querySelectorAll('main tbody tr').length===2 && !!document.querySelector('.home-clock')");
  assert(await evaluate("() => getComputedStyle(document.querySelector('main')).fontFamily.includes('Inter')"));
  await activate("main tbody button");
  await wait("() => document.querySelector('[data-slot=sheet-content]')?.textContent.includes('Consensi')");
  assert(await evaluate("() => document.querySelector('[data-slot=sheet-content]')?.textContent.includes('UUID Auth')"));
  await cli(["press_key",pageId,"Escape"]);
  await wait("() => !document.querySelector('[data-slot=sheet-content]')");
  record("users-real-list-detail-and-keyboard-close");
  await cli(["fill",pageId,await uid('textbox "Cerca utente"'),"author-secret@example.test"]);
  await click('button "Filtra"');
  await wait("() => location.search.includes('search=') && document.querySelectorAll('main tbody tr').length===1");
  await cli(["navigate_page",pageId,"--type","reload"]);
  await wait("() => document.querySelectorAll('main tbody tr').length===1 && document.querySelector('#users-search')?.value==='author-secret@example.test'");
  record("users-url-filters-survive-reload");
  await cli(["take_screenshot",pageId,"--filePath",join(workspace.evidence,"users-dark.png")]);
  await cli(["navigate_page",pageId,"--url",origin+"/profili?type=giocatore","--timeout","90000"]);
  await wait("() => document.querySelectorAll('main tbody tr').length===1");
  assert(await evaluate("() => [...document.querySelectorAll('main button')].some(b=>b.disabled && b.textContent.includes('Crea profilo'))"));
  await click('button "Gestisci profilo"');
  await wait("() => document.querySelector('[data-slot=sheet-content]')?.textContent.includes('Verifica profilo')");
  await click('button "Verifica profilo"');
  await wait("() => !!document.querySelector('[data-slot=alert-dialog-content]')");
  assert(await evaluate("() => document.querySelector('[data-slot=alert-dialog-content]').contains(document.activeElement)"));
  await click('button "Conferma"');
  await wait("() => !document.querySelector('[data-slot=alert-dialog-content]') && document.querySelector('[data-slot=sheet-content]')?.textContent.includes('Revoca verifica')");
  await click('button "Oscura profilo"');
  await cli(["fill",pageId,await uid('textbox "Motivazione'),"Controllo sintetico locale"]);
  await click('button "Conferma"');
  await wait("() => !document.querySelector('[data-slot=alert-dialog-content]') && document.querySelector('[data-slot=sheet-content]')?.textContent.includes('Ripristina visibilità')");
  await cli(["take_screenshot",pageId,"--filePath",join(workspace.evidence,"profile-dark.png")]);
  await click('button "Ripristina visibilità"'); await click('button "Conferma"');
  await wait("() => !document.querySelector('[data-slot=alert-dialog-content]') && document.querySelector('[data-slot=sheet-content]')?.textContent.includes('Oscura profilo')");
  record("profile-verification-hold-and-restoration");
  await cli(["press_key",pageId,"Escape"]); await wait("() => !document.querySelector('[data-slot=sheet-content]')");
  await click('button "Passa al tema chiaro"');
  await cli(["take_screenshot",pageId,"--filePath",join(workspace.evidence,"profiles-light.png")]);
  await cli(["emulate",pageId,"--viewport","390x844x1"]);
  assert(await evaluate("() => !document.body.textContent.includes('Meglio su uno schermo più grande')"));
  assert(await evaluate("() => document.documentElement.scrollWidth<=innerWidth+1"));
  assert(await evaluate("() => [...document.querySelectorAll('main [data-slot=table-container]')].some(e=>e.scrollWidth>e.clientWidth && getComputedStyle(e).overflowX==='auto')"));
  await cli(["take_screenshot",pageId,"--filePath",join(workspace.evidence,"profiles-mobile.png")]);
  record("light-theme-dismissed-notice-and-mobile-table-overflow");
  const messages = await cli(["list_console_messages", pageId, "--includePreservedMessages", "true"]);
  writeFileSync(join(workspace.evidence, "console.txt"), messages);
  assert(!/hydration failed|hydration mismatch|did not match|uncaught|recoverable error|nativeButton/i.test(messages), messages);
  record("keyboard-focus-and-no-hydration-errors");
} catch (error) {failure = error.message; throw error;}
finally {
  const cleanup = [];
  for (const action of [() => started ? cli(["stop"]) : Promise.resolve(), () => browser?.close(), () => stopChild(next), () => fixture.close()]) {try {await action();} catch (e) {cleanup.push(e.message);}}
  log.end(); writeFileSync(join(workspace.evidence, "report.json"), JSON.stringify({checks, failure, cleanup}, null, 2)); console.log("Evidence: " + workspace.evidence);
  if (cleanup.length && !failure) throw new Error(cleanup.join("; "));
}



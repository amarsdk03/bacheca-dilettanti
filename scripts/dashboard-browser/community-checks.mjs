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
const fixture = await createSessionFixture({community: true}), workspace = prepareWorkspace(root), env = isolatedEnv(process.env, fixture.origin);
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
  console.log("Isolated community checks: " + workspace.run);
  next = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", workspace.app, "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {cwd: workspace.app, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"]});
  next.stdout.pipe(log); next.stderr.pipe(log, {end: false});
  let ready = false;
  for (let i = 0; i < 90; i++) {try {if ((await fetch(origin + "/accesso", {signal: AbortSignal.timeout(30000)})).ok) {ready = true; break;}} catch {} await new Promise(r => setTimeout(r, 500));}
  assert(ready);
  for (const path of ["/", "/segnalazioni", "/codici-invito", "/api/segnalazioni", "/api/codici-invito"]) {
    const response = await fetch(origin + path, {redirect: "manual", signal: AbortSignal.timeout(90000)}); await response.text();
    if (path.startsWith("/api/")) {assert.equal(response.status, 403); assert.match(response.headers.get("cache-control"), /private.*no-store/);}
  }
  record("anonymous-api-denial-and-private-cache-policy");
  browser = await launchAnnunciBrowser({toolDir, chrome, workspace, env});
  await cli(["start", "--browserUrl", browser.browserUrl, "--workspace", workspace.run, "--usageStatistics", "false", "--fileNavigations", "false"]); started = true;
  const created = await cli(["new_page", origin + "/accesso", "--timeout", "90000"]), pageId = /(?:^|\n)(\d+):[^\n]*\[selected\]/m.exec(created)?.[1]; assert(pageId, created);
  const evaluate = async script => {const out = await cli(["evaluate_script", script, "--pageId", pageId]); const m = /```json\s*([\s\S]*?)```/.exec(out); assert(m, out); return JSON.parse(m[1]);};
  const wait = async script => {for (let i = 0; i < 60; i++) {try {if (await evaluate(script)) return;} catch (e) {if (!/Execution context was destroyed|Cannot find context/.test(e.message)) throw e;} await new Promise(r => setTimeout(r, 150));} throw new Error("WAIT: " + script);};
  const uid = async label => {const snapshot = await cli(["take_snapshot", pageId]); const line = snapshot.split("\n").find(v => v.includes(label)); const id = /uid=([\w-]+)/.exec(line ?? "")?.[1]; assert(id, label + "\n" + snapshot); return id;};
  const click = async label => cli(["click", pageId, await uid(label)]);
  const activate = async selector => {assert(await evaluate(`() => {const e=document.querySelector(${JSON.stringify(selector)});e?.click();return !!e;}`));};
  await cli(["emulate", pageId, "--viewport", "1440x900x1"]);
  await cli(["fill", pageId, await uid('textbox "Indirizzo admin"'), FIXTURE_EMAIL]);
  await cli(["fill", pageId, await uid('textbox "Password"'), FIXTURE_PASSWORD]); await click('button "Accedi"');
  await wait("() => location.pathname==='/' && !!document.querySelector('h1')");
  await cli(["navigate_page", pageId, "--url", origin + "/segnalazioni", "--timeout", "90000"]);
  await wait("() => document.querySelectorAll('main tbody tr').length===1 && !!document.querySelector('.home-clock')");
  assert.equal(await evaluate("() => getComputedStyle(document.querySelector('main')).fontFamily.includes('Inter')"), true);
  assert(await evaluate("() => {const b=document.querySelector('main tbody button[aria-label=Dettagli]');return !!b?.querySelector('svg.lucide-settings') && b.textContent.trim()==='';}"));
  await click('button "Dettagli"'); await wait("() => !!document.querySelector('#report-note')");
  await cli(["fill", pageId, await uid('textbox "Nota interna"'), "Nota sintetica locale"]);
  await activate("#report-status"); await click('option "Risolta"'); await click('button "Salva modifiche"');
  await wait("() => document.body.textContent.includes('Segnalazione aggiornata.') && document.querySelector('#report-status')?.textContent.includes('Risolta')");
  assert.equal(await evaluate("() => !document.querySelector('main tbody tr')"), true);
  record("report-note-and-state-persist-with-default-list-refresh");
  await cli(["take_screenshot", pageId, "--filePath", join(workspace.evidence, "report-dark.png")]);
  await cli(["press_key", pageId, "Tab"]);
  assert(await evaluate("() => document.querySelector('[data-slot=sheet-content]')?.contains(document.activeElement)"));
  await cli(["press_key", pageId, "Escape"]); await wait("() => !document.querySelector('[data-slot=sheet-content]')");
  await click('button "Passa al tema chiaro"');
  await activate("#reports-state"); await click('option "Tutte"'); await click('button "Filtra"');
  await wait("() => document.querySelectorAll('main tbody tr').length===1");
  await click('button "Dettagli"'); await wait("() => document.querySelector('#report-note')?.value==='Nota sintetica locale'");
  await activate("#report-status"); await click('option "Aperta"'); await click('button "Salva modifiche"');
  await wait("() => document.querySelector('#report-status')?.textContent.includes('Aperta')");
  record("report-reopening-and-persisted-note");
  await cli(["press_key", pageId, "Escape"]);
  await cli(["navigate_page", pageId, "--url", origin + "/codici-invito", "--timeout", "90000"]);
  await wait("() => document.querySelectorAll('main tbody tr').length===2");
  await activate("main tbody tr:first-child button:last-child"); await wait("() => !!document.querySelector('[data-slot=sheet-content] tbody tr')");
  await click('button "Considera"'); await wait("() => !!document.querySelector('[data-slot=alert-dialog-content]')");
  assert(await evaluate("() => document.querySelector('[data-slot=alert-dialog-content]')?.contains(document.activeElement)"));
  await click('button "Conferma"'); await wait("() => !!document.querySelector('[data-slot=sheet-content] button') && document.querySelector('[data-slot=sheet-content]')?.textContent.includes('Considerato')");
  await click('button "Ripristina"'); await click('button "Conferma"');
  await wait("() => document.querySelector('[data-slot=sheet-content]')?.textContent.includes('Invito ripristinato')");
  record("invitation-consideration-confirmation-and-reversal");
  await cli(["take_screenshot", pageId, "--filePath", join(workspace.evidence, "invites-light.png")]);
  await cli(["emulate", pageId, "--viewport", "390x844x1"]);
  assert(await evaluate("() => document.documentElement.scrollWidth<=innerWidth+1"));
  assert(await evaluate("() => [...document.querySelectorAll('[data-slot=sheet-content] [data-slot=table-container]')].some(e=>e.scrollWidth>e.clientWidth && getComputedStyle(e).overflowX==='auto')"));
  await cli(["take_screenshot", pageId, "--filePath", join(workspace.evidence, "invites-mobile.png")]);
  record("mobile-table-scroll-without-page-overflow");
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

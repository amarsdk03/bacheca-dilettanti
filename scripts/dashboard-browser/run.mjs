import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, readFileSync, writeFileSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { command, createAuthFixture, inspectClientAssets, isLoginRedirect, isolatedEnv, prepareWorkspace, stopChild, TOOL_VERSION } from "./core.mjs";
import { createSessionFixture } from "./session-fixture.mjs";
import { checkSession } from "./session-checks.mjs";
import { checkHome } from "./home-checks.mjs";
import { checkAnnunci } from "./annunci-checks.mjs";
import { launchAnnunciBrowser } from "./annunci-cdp.mjs";
import { checkRegistro } from "./registro-checks.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export async function runBrowserChecks({ production = false, session: authenticated = false, home = false, annunci = false, registro = false } = {}) {
  if (registro && (production || authenticated || home || annunci)) throw new Error("BROWSER_SCENARIOS_MUTUALLY_EXCLUSIVE");
  if (annunci && (home || production || authenticated)) throw new Error("BROWSER_SCENARIOS_MUTUALLY_EXCLUSIVE");
  if (home && (production || authenticated)) throw new Error("BROWSER_SCENARIOS_MUTUALLY_EXCLUSIVE");
  if (production && authenticated) throw new Error("BROWSER_SESSION_PRODUCTION_NOT_IN_SCOPE");
  if (registro) production = true;
  const toolDir = join(ROOT, "node_modules/.cache/dashboard-browser-tools/node_modules/chrome-devtools-mcp");
  if (!existsSync(join(toolDir, "package.json")) || JSON.parse(readFileSync(join(toolDir, "package.json"), "utf8")).version !== TOOL_VERSION)
    throw new Error(`Installare il tool: npm install --prefix node_modules/.cache/dashboard-browser-tools --no-save --package-lock=false --ignore-scripts chrome-devtools-mcp@${TOOL_VERSION}`);
  const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"].find(existsSync);
  if (!chrome) throw new Error("Chrome non trovato nei percorsi Windows supportati dal runner.");
  const workspace = prepareWorkspace(ROOT, { production }), fixture = await (authenticated || home || annunci || registro ? createSessionFixture({ home, annunci, registro }) : createAuthFixture()), env = isolatedEnv(process.env, fixture.origin, production ? "production" : "development");
  if (production) env.SUPABASE_SECRET_KEY = "sb_secret_browser_fixture_" + randomUUID().replaceAll("-", "");
  if (authenticated || home || annunci || registro) env.SUPABASE_SECRET_KEY = fixture.secretKey;
  const tool = join(toolDir, "build/src/bin/chrome-devtools.js"), session = randomUUID();
  const cli = async (args, timeout) => {
    const output = await command(process.execPath, [tool, ...args, "--sessionId", session], { cwd: workspace.run, env, timeout });
    // The CLI can report a tool error in text while exiting with status zero.
    if (/^Error:/m.test(output)) throw new Error(output.trim());
    return output;
  };
  const log = createWriteStream(join(workspace.evidence, "next.log"));
  let next, browserStarted = false, extraBrowser;
  const results = [], details = { mode: env.NODE_ENV, scenario: registro ? "registro" : annunci ? "annunci" : home ? "home" : authenticated ? "session" : "anonymous", isolatedApp: workspace.app };
  console.log("Isolated run: " + workspace.run);
  const record = (name, data = true) => { results.push({ name, passed: true, data }); console.log("PASS " + name); };
  try {
    const nextBin = join(ROOT, "node_modules/next/dist/bin/next");
    if (production) {
      console.log("Building isolated Admin in production mode");
      try {
        const output = await command(process.execPath, [nextBin, "build", workspace.app], { cwd: workspace.app, env, timeout: 600000 });
        writeFileSync(join(workspace.evidence, "build.log"), output);
      } catch (error) {
        writeFileSync(join(workspace.evidence, "build.log"), error.message); throw error;
      }
      details.build = { bundler: "Turbopack", buildId: readFileSync(join(workspace.app, ".next/BUILD_ID"), "utf8").trim() };
      record("production-build", details.build);
      details.clientAssets = inspectClientAssets(join(workspace.app, ".next/static"), env.SUPABASE_SECRET_KEY);
      record("client-assets-without-synthetic-server-key", details.clientAssets);
    }
    const probe = createServer(); await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
    const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    const origin = `http://127.0.0.1:${port}`;
    next = spawn(process.execPath, [nextBin, production ? "start" : "dev", workspace.app, ...(production ? [] : ["--webpack"]), "--hostname", "127.0.0.1", "--port", String(port)],
      { cwd: workspace.app, env, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    next.stdout.pipe(log); next.stderr.pipe(log, { end: false });
    let exited = false; next.once("exit", () => { exited = true; }); next.once("error", () => { exited = true; });
    let ready = false;
    for (let i = 0; i < 6; i++) {
      if (exited) throw new Error("NEXT_BROWSER_SERVER_EXITED: vedere next.log");
      try { const response = await fetch(origin + "/accesso", { signal: AbortSignal.timeout(90000) }); if (response.ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert(ready, "Next browser server non pronto");
    if (annunci) {
      // Cold Webpack compilation can issue Fast Refresh during a Sheet/dialog
      // interaction. Compile these entrypoints anonymously before acceptance;
      // no session, functional fixture read or mutation is issued here.
      details.warmup = [];
      for (const route of ["/", "/annunci", "/api/home/charts?metric=users", "/api/annunci", "/api/annunci/dddddddd-dddd-4ddd-8ddd-000000000001", "/api/annunci/export"]) {
        const response = await fetch(origin + route, { ...(route.endsWith("export") ? { method: "POST" } : {}), redirect: "manual", signal: AbortSignal.timeout(90000) });
        await response.text(); details.warmup.push({ route, status: response.status });
      }
    }
    if (production) {
      const response = await fetch(origin + "/accesso");
      assert.match(response.headers.get("cache-control"), /private/); assert.match(response.headers.get("cache-control"), /no-store/);
      assert.match(response.headers.get("x-robots-tag"), /noindex/);
      details.loginHeaders = { status: response.status, cacheControl: response.headers.get("cache-control"), robots: response.headers.get("x-robots-tag") };
      record("production-login-private-no-store", details.loginHeaders);
    }
    console.log("Next ready; opening isolated Chrome");
    if (annunci || registro) extraBrowser = await launchAnnunciBrowser({ toolDir, chrome, workspace, env });
    browserStarted = true;
    await cli(["start", ...(extraBrowser ? ["--browserUrl", extraBrowser.browserUrl] : ["--executablePath", chrome, "--headless", "--userDataDir", join(workspace.run, "chrome-profile")]), "--workspace", workspace.run, "--usageStatistics", "false", "--fileNavigations", "false", ...(authenticated || home || annunci || registro ? ["--maxNavigationSaved", "25"] : [])]);
    const created = await cli(["new_page", origin + "/accesso", "--timeout", "90000"], 100000);
    const pageId = /(?:^|\n)(\d+):[^\n]*\[selected\]/m.exec(created)?.[1];
    assert(pageId, "Impossibile identificare la pagina: " + created);
    const evaluate = async script => {
      const raw = await cli(["evaluate_script", script, "--pageId", pageId]);
      const match = /```json\s*([\s\S]*?)```/.exec(raw); assert(match, raw); return JSON.parse(match[1]);
    };
    const snapshot = () => cli(["take_snapshot", pageId]);
    const uid = async label => {
      const raw = await snapshot(), line = raw.split("\n").find(line => line.includes(label));
      const value = /uid=([\w-]+)/.exec(line ?? "")?.[1]; assert(value, "Elemento non trovato: " + label + "\n" + raw); return value;
    };
    const waitFor = async script => {
      for (let i = 0; i < 60; i++) {
        try { const value = await evaluate(script); if (value) return value; }
        catch (error) {
          // A streamed redirect replaces the execution context during navigation.
          if (!/Execution context was destroyed|Cannot find context with specified id/.test(error.message)) throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      throw new Error("BROWSER_WAIT_TIMEOUT: " + script);
    };
    const key = name => cli(["press_key", pageId, name]);
    const fill = async (label, value) => cli(["fill", pageId, await uid(label), value]);
    const fillForm = async fields => {
      const raw = await snapshot();
      const elements = fields.map(([label, value]) => {
        const line = raw.split("\n").find(line => line.includes(label));
        const id = /uid=([\w-]+)/.exec(line ?? "")?.[1]; assert(id, "Elemento non trovato: " + label);
        return { uid: id, value };
      });
      // This CLI version exposes only individual fill commands. Reuse one
      // snapshot for the unchanged form, without additional snapshot processes.
      for (const { uid: id, value } of elements) await cli(["fill", pageId, id, value]);
    };
    const navigate = href => cli(["navigate_page", pageId, "--url", origin + href]);
    await waitFor("() => !!document.querySelector('#admin-email')");
    details.browser = await evaluate("() => navigator.userAgent");
    if (authenticated || home || annunci || registro) {
      await (registro ? checkRegistro : annunci ? checkAnnunci : home ? checkHome : checkSession)({ cli, pageId, evaluate, uid, waitFor, key, fillForm, fill, navigate, fixture, workspace, record, details, origin, extraBrowser });
      return { passed: true, results, details, evidence: workspace.evidence };
    }
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      await cli(["emulate", pageId, "--viewport", `${width}x${height}x1${width < 500 ? ",mobile,touch" : ""}`]);
      const view = await evaluate("() => ({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,font:getComputedStyle(document.body).fontFamily,scheme:getComputedStyle(document.documentElement).colorScheme,logo:!!document.querySelector('img[alt=\"Bacheca Dilettanti\"]')?.naturalWidth,button:document.querySelector('button[type=submit]').getBoundingClientRect().width,form:document.querySelector('form').getBoundingClientRect().width})");
      assert.equal(view.width, width); assert.equal(view.overflow, false); assert.match(view.font, /Arial/); assert.match(view.scheme, /light/); assert(view.logo); assert(Math.abs(view.button - view.form) < 2);
      await cli(["take_screenshot", pageId, "--filePath", join(workspace.evidence, `login-${width}.png`)]);
      record(`layout-${width}`, view);
    }
    await evaluate("() => {document.activeElement.blur(); document.body.focus(); return true;}");
    await cli(["click", pageId, await uid('textbox "Indirizzo admin"')]);
    assert.equal(await evaluate("() => document.activeElement.id"), "admin-email");
    await key("Tab"); assert.equal(await evaluate("() => document.activeElement.id"), "admin-password");
    await key("Tab"); assert.equal(await evaluate("() => document.activeElement.getAttribute('aria-label')"), "Mostra password");
    const focus = await evaluate("() => ({visible:document.activeElement.matches(':focus-visible'),ring:getComputedStyle(document.activeElement).boxShadow,outline:getComputedStyle(document.activeElement).outlineWidth})");
    assert(focus.visible); assert(focus.ring !== "none" || focus.outline !== "0px");
    await key("Shift+Tab"); assert.equal(await evaluate("() => document.activeElement.id"), "admin-password");
    await fill('textbox "Password"', "Only-a-local-fixture-123"); await key("Tab"); await key("Enter");
    assert.deepEqual(await evaluate("() => [document.querySelector('#admin-password').type,document.querySelector('[aria-controls=admin-password]').getAttribute('aria-pressed'),document.querySelector('#admin-password').value]"), ["text", "true", "Only-a-local-fixture-123"]);
    await key("Space"); assert.equal(await evaluate("() => document.querySelector('#admin-password').type"), "password");
    await key("Tab"); assert.equal(await evaluate("() => document.activeElement.textContent.trim()"), "Accedi");
    record("keyboard-focus-eye", focus);
    const before = fixture.calls;
    await key("Enter"); assert.equal(fixture.calls, before);
    await fill('textbox "Indirizzo admin"', "invalid-email"); await cli(["click", pageId, await uid('button "Accedi"')]);
    assert.equal(await evaluate("() => document.querySelector('#admin-email').validity.typeMismatch"), true); assert.equal(fixture.calls, before);
    await fill('textbox "Indirizzo admin"', "admin@example.test");
    await fill('textbox "Password"', ""); await cli(["click", pageId, await uid('button "Accedi"')]);
    assert.equal(await evaluate("() => document.querySelector('#admin-password').validity.valueMissing"), true); assert.equal(fixture.calls, before);
    record("native-validation-no-auth-request");
    await fill('textbox "Password"', "Only-a-local-fixture-123"); fixture.setMode("invalid"); fixture.hold();
    await cli(["click", pageId, await uid('button "Accedi"')]);
    await waitFor("() => document.querySelector('form').getAttribute('aria-busy')==='true'");
    assert.equal(await evaluate("() => [...document.querySelectorAll('#admin-email,#admin-password,button[aria-controls=admin-password],button[type=submit]')].every(e=>e.disabled)"), true);
    record("pending-disabled-controls");
    fixture.release();
    await waitFor("() => document.querySelector('form').getAttribute('aria-busy')==='false' && document.body.textContent.includes('Indirizzo o password non validi')");
    assert.equal(await evaluate("() => location.pathname"), "/accesso"); record("invalid-auth-error-and-recovery");
    fixture.setMode("unavailable");
    // React actions may reset uncontrolled inputs after resolving an error state.
    await fill('textbox "Indirizzo admin"', "admin@example.test");
    await fill('textbox "Password"', "Only-a-local-fixture-123");
    await cli(["click", pageId, await uid('button "Accedi"')]);
    await waitFor("() => document.body.textContent.includes('Accesso temporaneamente non disponibile') && document.querySelector('form').getAttribute('aria-busy')==='false'");
    record("unavailable-auth-error-and-recovery");
    const catalog = readFileSync(join(workspace.app, "src/features/dashboard/sections.ts"), "utf8");
    const routes = [...catalog.matchAll(/href: "([^"]+)"/g)].map(m => m[1]); assert.equal(routes.length, 13);
    details.pageHeaders = [];
    for (const route of routes) {
      const response = await fetch(origin + route, { redirect: "manual" }), html = await response.text();
      assert(isLoginRedirect(response, origin, html), `Redirect assente: ${route} (${response.status})`);
      assert(!html.includes('id="home-users-value"') && !html.includes("Bentornato, admin!"));
      // Next dev overwrites streamed HTML Cache-Control. Retain the observed value;
      // private/no-store for production HTML is explicitly outside this dev check.
      assert.match(response.headers.get("cache-control"), /no-cache|no-store/); assert.match(response.headers.get("x-robots-tag"), /noindex/);
      if (production) { assert.match(response.headers.get("cache-control"), /private/); assert.match(response.headers.get("cache-control"), /no-store/); }
      details.pageHeaders.push({ route, status: response.status, cacheControl: response.headers.get("cache-control"), robots: response.headers.get("x-robots-tag") });
      await navigate(route); await waitFor("() => location.pathname==='/accesso' && !!document.querySelector('#admin-email')");
    }
    record("all-13-page-guards-and-browser-redirect");
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-000000000001";
    const api = ["/api/annunci", `/api/annunci/${id}`, "/api/registro-attivita", `/api/registro-attivita/${id}`, "/api/home/summary", "/api/home/activity", "/api/home/charts?metric=users"];
    for (const route of api) {
      const response = await fetch(origin + route); assert.equal(response.status, 403, route); const body = await response.json(); assert.equal(body.status, "denied");
      assert.match(response.headers.get("cache-control"), /private/); assert.match(response.headers.get("cache-control"), /no-store/); assert(!("page" in body || "chart" in body || "detail" in body || "summary" in body));
    }
    record("all-7-read-api-denials-no-data");
    const browserDenial = await evaluate("async () => {const r=await fetch('/api/home/summary',{cache:'no-store'});return {status:r.status,body:await r.json()};}");
    assert.equal(browserDenial.status, 403); assert.equal(browserDenial.body.status, "denied");
    assert.equal(await evaluate("() => document.cookie.includes('bacheca-admin-auth-token')"), false);
    record("no-admin-session-issued");
    const consoleMessages = await cli(["list_console_messages", pageId, "--includePreservedMessages", "true"]);
    writeFileSync(join(workspace.evidence, "console.txt"), consoleMessages);
    assert(!/hydration failed|hydration mismatch|did not match|uncaught|recoverable error/i.test(consoleMessages), consoleMessages);
    record("no-hydration-errors");
    details.authRequests = fixture.calls;
    return { passed: true, results, details, evidence: workspace.evidence };
  } catch (error) {
    details.failure = error.message; throw error;
  } finally {
    const errors = [];
    details.cleanup = {};
    for (const [name, cleanup] of [["browser", () => browserStarted ? cli(["stop"]) : Promise.resolve()], ...(annunci || registro ? [["cdpBrowser", () => extraBrowser?.close()]] : []), ["next", () => stopChild(next)], ["fixture", () => fixture.close()]]) {
      try { await cleanup(); details.cleanup[name] = true; }
      catch (error) { details.cleanup[name] = false; errors.push(error.message); }
    }
    log.end();
    if (errors.length) details.cleanupErrors = errors;
    writeFileSync(join(workspace.evidence, "report.json"), JSON.stringify({ passed: !details.failure && !errors.length, results, details, evidence: workspace.evidence }, null, 2));
    console.log("Evidence: " + workspace.evidence);
    if (errors.length && !details.failure) throw new Error("BROWSER_CLEANUP_FAILED: " + errors.join("; "));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => !["--production", "--session", "--home", "--annunci", "--registro"].includes(arg))) { console.error("Usage: node scripts/dashboard-browser/run.mjs [--production | --session | --home | --annunci | --registro]"); process.exitCode = 1; }
  else runBrowserChecks({ production: args.includes("--production"), session: args.includes("--session"), home: args.includes("--home"), annunci: args.includes("--annunci"), registro: args.includes("--registro") }).then(report => { console.log(`Browser checks passed: ${report.results.length}`); }).catch(error => { console.error(error.message); process.exitCode = 1; });
}

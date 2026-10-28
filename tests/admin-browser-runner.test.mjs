import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { command, createAuthFixture, inspectClientAssets, isLoginRedirect, isolatedEnv, prepareWorkspace, stopChild } from "../scripts/dashboard-browser/core.mjs";
import { runBrowserChecks } from "../scripts/dashboard-browser/run.mjs";

test("browser scenarios reject conflicting modes before starting any process", async () => {
  for (const options of [{ home: true, production: true }, { home: true, session: true }, { home: true, session: true, production: true }, { annunci: true, home: true }, { annunci: true, session: true }, { annunci: true, production: true }, { registro: true, production: true }, { registro: true, session: true }, { registro: true, home: true }, { registro: true, annunci: true }])
    await assert.rejects(runBrowserChecks(options), /BROWSER_SCENARIOS_MUTUALLY_EXCLUSIVE/);
});
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "bacheca-browser-"));
  t.after(() => { assert.equal(dirname(resolve(root)), resolve(tmpdir())); assert(basename(root).startsWith("bacheca-browser-")); rmSync(root, { recursive: true }); });
  for (const dir of ["apps/admin/src", "apps/admin/public", "packages/database/src", "node_modules"]) mkdirSync(join(root, dir), { recursive: true });
  for (const file of ["package.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs"]) writeFileSync(join(root, "apps/admin", file), file);
  writeFileSync(join(root, "package.json"), "{}"); writeFileSync(join(root, "packages/database/src/index.ts"), "export type Id = string;");
  return root;
}
test("anonymous redirects require either HTTP Location or a real streamed refresh to the same login origin", () => {
  const origin = "http://127.0.0.1:12345";
  assert(isLoginRedirect(new Response(null, { status: 307, headers: { Location: "/accesso" } }), origin));
  assert(isLoginRedirect(new Response(null, { status: 200 }), origin, '<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/accesso"/>'));
  assert(!isLoginRedirect(new Response(null, { status: 200 }), origin, "ordinary page without redirect"));
  assert(!isLoginRedirect(new Response(null, { status: 307, headers: { Location: "https://other.test/accesso" } }), origin));
  assert(!isLoginRedirect(new Response(null, { status: 200 }), origin, '<meta http-equiv="refresh" content="1;url=/annunci"/>'));
});
test("browser copy preserves source/config and excludes all env files and generated data", t => {
  const root = fixture(t);
  writeFileSync(join(root, "apps/admin/.env.local"), "MUST_NOT_READ=secret");
  writeFileSync(join(root, "apps/admin/src/.env.test"), "MUST_NOT_COPY=secret");
  writeFileSync(join(root, "apps/admin/src/page.tsx"), "unchanged source");
  const w = prepareWorkspace(root);
  assert.equal(readFileSync(join(w.app, "src/page.tsx"), "utf8"), "unchanged source");
  assert(!existsSync(join(w.app, ".env.local"))); assert(!existsSync(join(w.app, "src/.env.test")));
  assert.equal(readFileSync(join(root, "apps/admin/next.config.ts"), "utf8"), "next.config.ts");
  assert(existsSync(join(w.run, "node_modules"))); assert.notEqual(prepareWorkspace(root).run, w.run);
});
test("browser preparation refuses a redirected output ancestor", t => {
  const root = fixture(t); symlinkSync(join(root, "node_modules"), join(root, ".local"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => prepareWorkspace(root), /BROWSER_PATH_REDIRECTED/);
});
test("production copy keeps the unmodified config root containing installed dependencies, without env files", t => {
  const root = fixture(t);
  writeFileSync(join(root, "apps/admin/.env.production"), "MUST_NOT_COPY=secret");
  const workspace = prepareWorkspace(root, { production: true });
  assert.equal(dirname(dirname(workspace.app)), root);
  assert.equal(readFileSync(join(workspace.app, "next.config.ts"), "utf8"), "next.config.ts");
  assert.equal(readFileSync(join(root, "package.json"), "utf8"), "{}");
  assert(!existsSync(join(workspace.app, ".env.production")));
  assert(!existsSync(join(root, "apps/admin/.next")));
});
test("browser copy refuses source symlinks rather than copying external files", t => {
  const root = fixture(t); symlinkSync(join(root, "node_modules"), join(root, "apps/admin/src/redirect"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => prepareWorkspace(root), /BROWSER_SOURCE_REDIRECTED/);
});
test("browser child env excludes inherited secrets, Node hooks and project settings", () => {
  const env = isolatedEnv({ PATH: "bin", SystemRoot: "system", SUPABASE_SECRET_KEY: "secret", NEXT_PUBLIC_SITE_URL: "https://real.test", NODE_OPTIONS: "--require hook", BACHECA_TEST_TARGET: "staging", STRIPE_SECRET_KEY: "secret" }, "http://127.0.0.1:12345");
  assert.equal(env.PATH, "bin"); assert.equal(env.SystemRoot, "system"); assert.equal(env.SUPABASE_SECRET_KEY, undefined); assert.equal(env.NODE_OPTIONS, undefined); assert.equal(env.NEXT_PUBLIC_SITE_URL, undefined); assert.equal(env.BACHECA_TEST_TARGET, undefined); assert.equal(env.STRIPE_SECRET_KEY, undefined);
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, "http://127.0.0.1:12345"); assert.equal(env.NEXT_TELEMETRY_DISABLED, "1");
  assert.equal(isolatedEnv({}, "http://127.0.0.1:12345", "production").NODE_ENV, "production");
  assert.throws(() => isolatedEnv({}, "http://127.0.0.1:12345", "arbitrary"), /BROWSER_NODE_ENV_INVALID/);
  for (const url of ["https://real.test", "http://localhost:1234", "http://127.0.0.1", "http://127.0.0.1:1234/path", "http://user:pass@127.0.0.1:1234", "http://127.0.0.1:1234/?x=1"]) assert.throws(() => isolatedEnv({}, url), /BROWSER_AUTH_MUST_BE_LOOPBACK/);
});
test("client asset inspection requires real JS and rejects the synthetic key in any public asset", t => {
  const root = fixture(t), assets = join(root, "assets"), sentinel = "sb_secret_synthetic_only_1234567890";
  mkdirSync(assets); mkdirSync(join(assets, "chunks"));
  assert.throws(() => inspectClientAssets(assets, sentinel), /BROWSER_CLIENT_BUNDLE_MISSING/);
  assert.throws(() => inspectClientAssets(assets, ""), /BROWSER_SENTINEL_INVALID/);
  writeFileSync(join(assets, "chunks/client.js"), "console.log('public bundle');");
  writeFileSync(join(assets, "style.css"), ".light{}");
  const result = inspectClientAssets(assets, sentinel);
  assert.equal(result.files, 2); assert.equal(result.javascriptFiles, 1); assert(result.bytes > 0); assert(result.sentinelAbsent);
  writeFileSync(join(assets, "style.css"), "/*" + sentinel + "*/");
  assert.throws(() => inspectClientAssets(assets, sentinel), /BROWSER_CLIENT_SECRET_EXPOSED: style.css/);
});
test("client asset inspection refuses symlinks instead of reading outside build output", t => {
  const root = fixture(t), assets = join(root, "assets"); mkdirSync(assets);
  symlinkSync(join(root, "node_modules"), join(assets, "external"), process.platform === "win32" ? "junction" : "dir");
  assert.throws(() => inspectClientAssets(assets, "synthetic-sentinel-1234567890"), /BROWSER_ASSET_REDIRECTED/);
});
test("synthetic Auth server never emits a valid session, supports controlled errors, and closes", async t => {
  const auth = await createAuthFixture(); t.after(auth.close);
  const invalid = await fetch(auth.origin + "/auth/v1/token?grant_type=password", { method: "POST", body: "synthetic only" });
  assert.equal(invalid.status, 400); assert.deepEqual(Object.keys(await invalid.json()).sort(), ["code", "msg"]); assert.equal(auth.calls, 1);
  auth.setMode("unavailable", 20);
  const unavailable = await fetch(auth.origin + "/auth/v1/token?grant_type=password", { method: "POST" }); assert.equal((await unavailable.json()).code, "unexpected_failure");
  const denied = await fetch(auth.origin + "/rest/v1/admin_get_context_v1"); assert.equal(denied.status, 403); assert.equal(auth.calls, 3);
  auth.setMode("invalid"); auth.hold();
  let received = false;
  const heldResponse = fetch(auth.origin + "/auth/v1/token?grant_type=password", { method: "POST" }).then(r => { received = true; return r; });
  await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(received, false);
  auth.release(); assert.equal((await heldResponse).status, 400);
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(auth.origin, "sb_publishable_browser_fixture", { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: "admin@example.test", password: "synthetic-only" });
  assert.equal(error.code, "invalid_credentials"); assert.equal(data.session, null);
  assert.throws(() => auth.setMode("authenticated"), /BROWSER_FIXTURE_MODE/);
});
test("browser command handles output, failure, missing executable and timeouts", async () => {
  assert.match(await command(process.execPath, ["-e", "console.log('OK')"]), /OK/);
  await assert.rejects(command(process.execPath, ["-e", "process.exit(9)"]), /BROWSER_COMMAND_FAILED \(9\)/);
  await assert.rejects(command("nonexistent-bacheca-command", []));
  await assert.rejects(command(process.execPath, ["-e", "setInterval(()=>{},1000)"], { timeout: 30 }), /BROWSER_COMMAND_TIMEOUT/);
});
test("cleanup handles an owned child, repeated cleanup and an absent child", async () => {
  const child = spawn(process.execPath, ["-e", "console.log('ready');setInterval(()=>{},1000)"], { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
  await new Promise((accept, reject) => { child.stdout.once("data", accept); child.once("error", reject); });
  await stopChild(child); assert(child.exitCode !== null || child.signalCode !== null);
  await stopChild(child); await stopChild(undefined);
});

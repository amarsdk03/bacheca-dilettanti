import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, symlinkSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export const TOOL_VERSION = "1.12.0";
const COPY_FILES = ["package.json", "tsconfig.json", "next.config.ts", "postcss.config.mjs"];

/** App Router can serialize a redirect into streamed HTML after sending 200. */
export function isLoginRedirect(response, origin, html = "") {
  let target;
  if (response.status === 307) target = response.headers.get("location");
  else if (response.status === 200) {
    const tag = [...html.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0])
      .find(tag => /http-equiv=["']refresh["']/i.test(tag));
    const content = /content=["']([^"']*)["']/i.exec(tag ?? "")?.[1];
    target = /^\d+;\s*url=(.+)$/i.exec(content ?? "")?.[1];
  }
  if (!target) return false;
  try { const url = new URL(target, origin); return url.origin === origin && url.pathname === "/accesso" && !url.search && !url.hash; }
  catch { return false; }
}

function safeDirectory(root, target) {
  const base = realpathSync(root), absolute = resolve(target);
  if (!absolute.startsWith(base + sep)) throw new Error("BROWSER_PATH_OUTSIDE_WORKSPACE");
  let current = base;
  for (const part of relative(base, absolute).split(sep)) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("BROWSER_PATH_REDIRECTED");
  }
  return absolute;
}
function copyTree(from, to) {
  if (lstatSync(from).isSymbolicLink()) throw new Error("BROWSER_SOURCE_REDIRECTED");
  if (lstatSync(from).isDirectory()) {
    mkdirSync(to, { recursive: true });
    for (const name of readdirSync(from)) {
      if (name.startsWith(".env") || name === "node_modules" || name === ".next") continue;
      copyTree(join(from, name), join(to, name));
    }
  } else copyFileSync(from, to);
}
export function prepareWorkspace(root, { production = false } = {}) {
  root = realpathSync(root);
  const base = safeDirectory(root, join(root, ".local", "dashboard-browser"));
  mkdirSync(base, { recursive: true });
  const run = mkdtempSync(join(base, "run-"));
  // Keep the original config's ../.. monorepo root for Turbopack: dependencies
  // must be within its filesystem root. Only the copied app receives outputs.
  const app = production ? mkdtempSync(join(root, ".local", "dashboard-production-admin-")) : join(run, "apps", "admin");
  mkdirSync(app, { recursive: true });
  for (const file of COPY_FILES) copyTree(join(root, "apps", "admin", file), join(app, file));
  for (const dir of ["src", "public"]) copyTree(join(root, "apps", "admin", dir), join(app, dir));
  copyTree(join(root, "packages", "database"), join(run, "packages", "database"));
  copyTree(join(root, "package.json"), join(run, "package.json"));
  // Only dependencies are shared. Sources/config/env are separate, never a junction to the app.
  symlinkSync(join(root, "node_modules"), join(run, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  const evidence = join(run, "evidence"); mkdirSync(evidence);
  return { run, app, evidence };
}
export function isolatedEnv(source, authOrigin, mode = "development") {
  if (!["development", "production"].includes(mode)) throw new Error("BROWSER_NODE_ENV_INVALID");
  const url = new URL(authOrigin);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    throw new Error("BROWSER_AUTH_MUST_BE_LOOPBACK");
  const allowed = new Set(["PATH", "SYSTEMROOT", "WINDIR", "COMSPEC", "TEMP", "TMP", "LOCALAPPDATA", "APPDATA", "USERPROFILE", "PATHEXT", "NUMBER_OF_PROCESSORS", "PROCESSOR_ARCHITECTURE"]);
  return { ...Object.fromEntries(Object.entries(source).filter(([key]) => allowed.has(key.toUpperCase()))),
    NODE_ENV: mode, NEXT_TELEMETRY_DISABLED: "1", CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: "1",
    NEXT_PUBLIC_SUPABASE_URL: url.origin, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_dashboard_browser_fixture" };
}
/** Scan only the isolated build's public assets, never original env or credentials. */
export function inspectClientAssets(directory, sentinel) {
  if (typeof sentinel !== "string" || sentinel.length < 16) throw new Error("BROWSER_SENTINEL_INVALID");
  const needle = Buffer.from(sentinel), result = { files: 0, javascriptFiles: 0, bytes: 0, sentinelAbsent: true };
  function inspect(path) {
    const entry = lstatSync(path);
    if (entry.isSymbolicLink()) throw new Error("BROWSER_ASSET_REDIRECTED");
    if (entry.isDirectory()) { for (const name of readdirSync(path)) inspect(join(path, name)); return; }
    if (!entry.isFile()) throw new Error("BROWSER_ASSET_NOT_FILE");
    const data = readFileSync(path);
    if (data.includes(needle)) throw new Error("BROWSER_CLIENT_SECRET_EXPOSED: " + relative(directory, path));
    result.files++; result.bytes += data.byteLength;
    if (path.endsWith(".js")) result.javascriptFiles++;
  }
  inspect(directory);
  if (!result.javascriptFiles) throw new Error("BROWSER_CLIENT_BUNDLE_MISSING");
  return result;
}
export async function createAuthFixture() {
  let mode = "invalid", delay = 0, calls = 0, held = false;
  const waiting = new Set();
  const server = createServer((request, response) => {
    // Deliberately discard credentials and headers: only count incoming requests.
    request.resume(); calls++;
    const invalid = request.method === "POST" && request.url === "/auth/v1/token?grant_type=password";
    const send = () => setTimeout(() => {
      if (response.destroyed) return;
      response.writeHead(invalid ? 400 : 403, { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Supabase-Api-Version": "2024-01-01" });
      response.end(JSON.stringify({ code: mode === "invalid" ? "invalid_credentials" : "unexpected_failure", msg: "Synthetic browser fixture" }));
    }, delay).unref();
    if (held) waiting.add(send); else send();
  });
  await new Promise((accept, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", accept); });
  return { origin: `http://127.0.0.1:${server.address().port}`, get calls() { return calls; },
    setMode(next, milliseconds = 0) { if (!["invalid", "unavailable"].includes(next)) throw new Error("BROWSER_FIXTURE_MODE"); mode = next; delay = milliseconds; },
    hold() { held = true; },
    release() { held = false; for (const send of waiting) send(); waiting.clear(); },
    close: () => new Promise(accept => { waiting.clear(); server.closeAllConnections(); server.close(accept); }) };
}
export function command(binary, args, { cwd, env, timeout = 60000 } = {}) {
  return new Promise((accept, reject) => {
    const child = spawn(binary, args, { cwd, env, shell: false, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.setEncoding("utf8").on("data", value => { stdout += value; });
    child.stderr.setEncoding("utf8").on("data", value => { stderr += value; });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      stopChild(child).then(() => reject(new Error("BROWSER_COMMAND_TIMEOUT")), () => reject(new Error("BROWSER_COMMAND_TIMEOUT")));
    }, timeout);
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("close", code => {
      clearTimeout(timer);
      if (timedOut) return;
      if (code === 0) accept(stdout);
      else reject(new Error(`BROWSER_COMMAND_FAILED (${code}): ${stderr || stdout}`));
    });
  });
}
export async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise(resolve => child.once("close", resolve));
  if (process.platform === "win32") {
    // Next's development CLI owns a worker process. Stop only this captured PID tree.
    await command("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"]).catch(() => { child.kill(); });
  } else child.kill();
  await closed;
}

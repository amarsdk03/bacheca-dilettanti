import assert from "node:assert/strict";
import { test } from "node:test";
import { EventEmitter } from "node:events";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { discoverTestFiles, runTests } from "../scripts/run-tests.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "bacheca test runner "));
  mkdirSync(join(root, "tests"));
  t.after(() => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert(basename(root).startsWith("bacheca test runner "));
    rmSync(root, { recursive: true });
  });
  return root;
}
test("runner discovers only root test files, including new ones, in deterministic order", t => {
  const root = fixture(t);
  for (const name of ["z.test.mjs", "a.test.mjs", "helper.mjs", "a.test.ts"]) writeFileSync(join(root, "tests", name), "");
  mkdirSync(join(root, "tests", "nested.test.mjs"));
  assert.deepEqual(discoverTestFiles(root), [join(root, "tests", "a.test.mjs"), join(root, "tests", "z.test.mjs")]);
  writeFileSync(join(root, "tests", "new.test.mjs"), ""); assert.equal(discoverTestFiles(root).length, 3);
});
test("empty discovery fails explicitly instead of reporting a successful empty suite", t => {
  const root = fixture(t); assert.throws(() => discoverTestFiles(root), /Nessun file/);
});
for (const code of [0, 7, null]) test(`runner propagates child status ${code}, with signal termination treated as failure`, async t => {
  const root = fixture(t); writeFileSync(join(root, "tests", "a.test.mjs"), "");
  const result = await runTests({ root, spawnProcess(binary, args, options) {
    assert.equal(binary, process.execPath); assert.deepEqual(args, ["--test", "--test-concurrency=4", join(root, "tests", "a.test.mjs")]);
    assert.deepEqual(options, { cwd: root, stdio: "inherit", shell: false, windowsHide: true });
    const child = new EventEmitter(); queueMicrotask(() => child.emit("exit", code, code === null ? "SIGTERM" : null)); return child;
  } });
  assert.equal(result, code ?? 1);
});
test("spawn errors reject rather than hanging or passing", async t => {
  const root = fixture(t); writeFileSync(join(root, "tests", "a.test.mjs"), "");
  await assert.rejects(runTests({ root, spawnProcess() { const child = new EventEmitter(); queueMicrotask(() => child.emit("error", Error("SPAWN_FAILED"))); return child; } }), /SPAWN_FAILED/);
  await assert.rejects(runTests({ root, spawnProcess() { throw Error("SPAWN_FAILED_SYNC"); } }), /SPAWN_FAILED_SYNC/);
});
test("real child process preserves paths with spaces and returns failure for a failing test", t => {
  const root = fixture(t); writeFileSync(join(root, "tests", "failure.test.mjs"), 'import { test } from "node:test"; test("deliberate failure", () => { throw Error("EXPECTED_FAILURE"); });');
  const runnerUrl = new URL("../scripts/run-tests.mjs", import.meta.url).href;
  const script = `import { runTests } from ${JSON.stringify(runnerUrl)}; process.exitCode = await runTests({root:${JSON.stringify(root)}});`;
  // This checks a new top-level invocation, not Node's nested test-worker mode.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== "NODE_TEST_CONTEXT"));
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8", windowsHide: true, env });
  assert.ifError(result.error); assert.equal(result.status, 1, result.stdout + result.stderr); assert.match(result.stdout, /EXPECTED_FAILURE/);
});
test("missing PGlite stops CLI with install instructions before starting tests", t => {
  const root = fixture(t); mkdirSync(join(root, "scripts")); mkdirSync(join(root, "tests", "helpers"));
  copyFileSync(new URL("../scripts/run-tests.mjs", import.meta.url), join(root, "scripts", "run-tests.mjs"));
  copyFileSync(new URL("./helpers/pglite.mjs", import.meta.url), join(root, "tests", "helpers", "pglite.mjs"));
  writeFileSync(join(root, "tests", "never.test.mjs"), 'throw Error("TEST_MUST_NOT_START");');
  const result = spawnSync(process.execPath, [join(root, "scripts", "run-tests.mjs")], { cwd: root, encoding: "utf8", windowsHide: true });
  assert.ifError(result.error); assert.equal(result.status, 1); assert.match(result.stderr, /PGlite non disponibile.*npm ci/); assert(!result.stdout.includes("TEST_MUST_NOT_START"));
});
test("SQL helper resolves the root dependency and keeps the pinned version", async () => {
  const { PGlite } = await import("./helpers/pglite.mjs"); assert.equal(typeof PGlite.create, "function");
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.devDependencies["@electric-sql/pglite"], "0.5.8");
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  assert.equal(lock.packages["node_modules/@electric-sql/pglite"].version, "0.5.8");
});

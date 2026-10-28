import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

export function discoverTestFiles(root = ROOT) {
  const files = readdirSync(join(root, "tests"), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".test.mjs"))
    .map(entry => join(root, "tests", entry.name)).sort();
  if (!files.length) throw new Error("Nessun file *.test.mjs trovato nella cartella tests.");
  return files;
}

export async function runTests({ root = ROOT, spawnProcess = spawn } = {}) {
  const files = discoverTestFiles(root);
  const child = spawnProcess(process.execPath, ["--test", "--test-concurrency=4", ...files], {
    cwd: root, stdio: "inherit", shell: false, windowsHide: true,
  });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", code => resolve(code ?? 1));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    // Fail before starting any tests when devDependencies are missing.
    await import("../tests/helpers/pglite.mjs");
    process.exitCode = await runTests();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

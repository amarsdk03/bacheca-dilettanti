import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const requireBuiltin = createRequire(import.meta.url);

/** Execute actual TS modules with isolated env and explicit transport stubs. */
export function adminServerLoader({ dependencies = {}, env = {}, globals = {}, fetch = () => { throw new Error("Unexpected network request"); } } = {}) {
  const cache = new Map();
  const load = (relativePath) => {
    const target = resolve(root, relativePath);
    const file = [target, target + ".ts", target + ".tsx", resolve(target, "index.ts")].find((path) => existsSync(path) && /\.tsx?$/.test(path));
    assert(file, `Missing TypeScript test module: ${target}`);
    if (cache.has(file)) return cache.get(file).exports;
    const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
      fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    });
    const loaded = { exports: {} }; cache.set(file, loaded);
    const moduleRequire = (name) => {
      if (name === "server-only") return {};
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name === "node:crypto" || name === "node:buffer") return requireBuiltin(name);
      if (name.startsWith(".")) return load(resolve(dirname(file), name));
      if (name.startsWith("@/")) return load("apps/admin/src/" + name.slice(2));
      assert.fail(`Unexpected server dependency: ${name}`);
    };
    new Function("require", "module", "exports", "process", "fetch", "window", "document", outputText)(moduleRequire, loaded, loaded.exports, { env }, fetch, globals.window, globals.document);
    return loaded.exports;
  };
  return load;
}

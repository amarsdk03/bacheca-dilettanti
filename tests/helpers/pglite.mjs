// Shared in-memory SQL engine. Never reads env files or accepts a database URL.
let PGlite;
try {
  ({ PGlite } = await import("@electric-sql/pglite"));
} catch (cause) {
  throw new Error("PGlite non disponibile: eseguire npm ci dalla root, includendo le devDependencies. I test SQL non vengono saltati.", { cause });
}
export { PGlite };

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { finished } from "node:stream/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";
import { assertLocalTarget, assertLocalDockerEndpoint, sourceConnection, dumpArguments, inspectCapture, CLI_VERSION, PG_IMAGE } from "./guard.mjs";

const sources = dirname(fileURLToPath(import.meta.url));
const root = resolve(sources, "../..");
const workdir = join(root, ".local/dashboard-supabase");
const read = (file) => readFileSync(file, "utf8");
const template = (file) => read(join(sources, file));
const localEnv = () => parseEnv(read(join(workdir, "target.env")));

function safeWorkdir() {
  // Reject redirected ancestors before making any preparation writes.
  for (const path of [join(root, ".local"), workdir, ...[
    "supabase", "cli-home", "captures", "supabase/config.toml", "target.env", "source.env", "session-policy.local.sql",
  ].map((name) => join(workdir, name))]) {
    if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error("Directory locale reindirizzata: interrompere e verificarla.");
  }
  if (existsSync(workdir) && !realpathSync(workdir).startsWith(realpathSync(root) + sep)) {
    throw new Error("Directory locale fuori dalla repository.");
  }
}

function prepare() {
  safeWorkdir();
  mkdirSync(join(workdir, "supabase"), { recursive: true });
  mkdirSync(join(workdir, "cli-home"), { recursive: true });
  for (const [name, contents] of [
    ["supabase/config.toml", template("config.toml")],
    ["target.env", template("target.env.example")],
    ["source.env", template("source.env.example")],
    // Never copy the operator's production values into the local policy.
    ["session-policy.local.sql", read(join(root, "supabase/scripts/dashboard_admin_verify_session_policy.sql"))
      .replace(/v_configuration_reviewed boolean := [^;]+;/, "v_configuration_reviewed boolean := false;")
      .replace(/v_timebox_seconds integer := [^;]+;/, "v_timebox_seconds integer := null;")
      .replace(/v_inactivity_timeout_seconds integer := [^;]+;/, "v_inactivity_timeout_seconds integer := null;")
      .replace(/v_single_session_per_user boolean := [^;]+;/, "v_single_session_per_user boolean := null;")
      .replace(/v_other_auth_limits_present boolean := [^;]+;/, "v_other_auth_limits_present boolean := null;")],
  ]) {
    const path = join(workdir, name);
    if (!existsSync(path)) writeFileSync(path, contents, { flag: "wx", mode: 0o600 });
  }
  console.log("Preparati i file in .local/dashboard-supabase; file esistenti conservati. Nessuna connessione eseguita.");
}

function assertPrepared() {
  safeWorkdir();
  assertLocalTarget(localEnv());
  const config = join(workdir, "supabase/config.toml");
  if (read(config) !== template("config.toml")) throw new Error("Configurazione locale diversa dal template: confrontarla prima di avviare lo stack.");
  if (existsSync(join(workdir, "supabase/.temp/project-ref")) ||
    existsSync(join(workdir, "supabase/migrations")) || existsSync(join(workdir, "supabase/seed.sql"))) {
    throw new Error("Lo stack deve restare scollegato, senza migrazioni o seed automatici.");
  }
}

function commandEnv() {
  // Do not inherit hosted-project settings or unrelated database credentials.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^(SUPABASE_|PG[A-Z_]|BACHECA_|NEXT_PUBLIC_SUPABASE_)/i.test(key)));
  return { ...env, SUPABASE_HOME: join(workdir, "cli-home"), DO_NOT_TRACK: "1", SUPABASE_TELEMETRY_DISABLED: "1" };
}

async function run(binary, args, { env = commandEnv(), input, output, inherit = false } = {}) {
  const child = spawn(binary, args, { env, cwd: root, windowsHide: true, shell: false,
    stdio: [input === undefined ? "ignore" : "pipe", inherit ? "inherit" : "pipe", inherit ? "inherit" : "ignore"] });
  const completion = new Promise((accept, reject) => {
    child.on("error", () => reject(new Error("Comando non disponibile: controllare Docker/CLI e i prerequisiti del runbook.")));
    child.on("close", (code) => code === 0 ? accept() : reject(new Error("Comando fallito; nessun dettaglio di connessione stampato. Controllare destinazione, credenziali, permessi e runtime.")));
  });
  if (input !== undefined) {
    child.stdin.on("error", () => {}); // The child completion reports connection/start failures.
    child.stdin.end(input);
  }
  let result = "";
  if (output) {
    const destination = createWriteStream(output, { flags: "wx", mode: 0o600 });
    child.stdout.pipe(destination);
    await Promise.all([completion, finished(destination)]);
  } else {
    if (!inherit) child.stdout.setEncoding("utf8").on("data", (chunk) => { result += chunk; });
    await completion;
  }
  return result;
}

async function dockerReady() {
  assertPrepared();
  if (process.env.DOCKER_HOST) assertLocalDockerEndpoint(process.env.DOCKER_HOST);
  const endpoint = JSON.parse(await run("docker", ["context", "inspect", "--format", "{{json .Endpoints.docker.Host}}"]));
  assertLocalDockerEndpoint(endpoint);
  await run("docker", ["info", "--format", "{{.ServerVersion}}"]);
}

function cliEntry() {
  // Reuse only the already pinned CLI cache; never silently install/update it.
  const cache = join(root, "node_modules/.cache/supabase-cli/_npx");
  for (const entry of existsSync(cache) ? readdirSync(cache) : []) {
    const packageDir = join(cache, entry, "node_modules/supabase");
    if (existsSync(join(packageDir, "package.json")) &&
      JSON.parse(read(join(packageDir, "package.json"))).version === CLI_VERSION) {
      return join(packageDir, "dist/supabase.js");
    }
  }
  throw new Error("CLI 2.122.0 non presente nella cache dedicata: seguire il comando di installazione nel runbook.");
}

async function cli(action) {
  const entry = cliEntry();
  const version = (await run(process.execPath, [entry, "--version"])).trim();
  if (version !== CLI_VERSION) throw new Error("Versione CLI diversa da quella prevista.");
  return run(process.execPath, [entry, "--workdir", workdir, action], { inherit: true });
}

async function exportSchema() {
  assertPrepared();
  const source = parseEnv(read(join(workdir, "source.env")));
  const connection = sourceConnection(source);
  await dockerReady();
  const dockerArgs = ["run", "--rm", "--interactive",
    ...Object.keys(connection).flatMap((key) => ["--env", key]), PG_IMAGE];
  const env = { ...commandEnv(), ...connection };
  const catalog = JSON.parse(await run("docker", [...dockerArgs, "psql", "--no-psqlrc", "--no-password",
    "--tuples-only", "--no-align", "--set=ON_ERROR_STOP=1"], { env, input: template("capture-catalog.sql") }));
  if (!catalog.admin_foundation || catalog.server_version_num < 170000 || catalog.server_version_num >= 180000) {
    throw new Error("La sorgente deve contenere la foundation Admin ed essere PostgreSQL 17. Verificare il catalogo/versione prima di adattare lo stack.");
  }
  const captureDir = join(workdir, "captures", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(captureDir, { recursive: true });
  writeFileSync(join(captureDir, "catalog.json"), JSON.stringify(catalog, null, 2), { flag: "wx", mode: 0o600 });
  const schemaPath = join(captureDir, "schema.sql");
  await run("docker", [...dockerArgs, ...dumpArguments()], { env, output: schemaPath });
  const schema = read(schemaPath);
  const inventory = inspectCapture(schema, catalog);
  writeFileSync(join(captureDir, "manifest.json"), JSON.stringify({
    capturedAt: new Date().toISOString(), cliVersion: CLI_VERSION, postgresImage: PG_IMAGE,
    schemaSha256: createHash("sha256").update(schema).digest("hex"),
    catalogSha256: createHash("sha256").update(readFileSync(join(captureDir, "catalog.json"))).digest("hex"),
    sourceProjectRef: source.BACHECA_SCHEMA_SOURCE_PROJECT_REF,
    sourceHasAdminFoundation: true, readOnlySource: true, schemaOnly: true, ...inventory,
  }, null, 2), { flag: "wx", mode: 0o600 });
  console.log(`Schema acquisito in ${relative(root, captureDir)}. Da revisionare; nessuna importazione eseguita.`);
}

function inspectSchema(directory) {
  assertPrepared();
  if (!directory) throw new Error("Indicare la cartella captures riportata dal comando export.");
  const captureRoot = realpathSync(join(workdir, "captures"));
  const captureDir = realpathSync(resolve(root, directory));
  if (!captureDir.startsWith(captureRoot + sep)) throw new Error("La cartella deve appartenere alle acquisizioni locali.");
  const schema = read(join(captureDir, "schema.sql"));
  const manifest = JSON.parse(read(join(captureDir, "manifest.json")));
  const catalogText = read(join(captureDir, "catalog.json"));
  if (manifest.schemaSha256 !== createHash("sha256").update(schema).digest("hex") ||
    manifest.catalogSha256 !== createHash("sha256").update(catalogText).digest("hex")) {
    throw new Error("Acquisizione cambiata dopo l'esportazione: revisionare le differenze.");
  }
  console.log(JSON.stringify(inspectCapture(schema, JSON.parse(catalogText)), null, 2));
}

export async function main([action, ...args]) {
  if (action !== "inspect-schema" && args.length) throw new Error("Argomenti aggiuntivi rifiutati.");
  switch (action) {
    case "prepare": prepare(); break;
    case "check":
      await dockerReady();
      cliEntry();
      console.log("Preflight locale riuscito. Nessuna connessione al database eseguita.");
      break;
    case "start": case "stop": await dockerReady(); await cli(action); break;
    case "export-schema": await exportSchema(); break;
    case "inspect-schema":
      if (args.length !== 1) throw new Error("Indicare una sola cartella di acquisizione.");
      inspectSchema(args[0]); break;
    default: throw new Error("Comando previsto: prepare, check, start, stop, export-schema, inspect-schema.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    // File/parse errors can contain connection values. Only deliberately authored errors are shown.
    console.error(error.code || error instanceof SyntaxError || error instanceof TypeError
      ? "Preparazione non valida: eseguire prepare e controllare i file locali secondo il runbook."
      : error.message);
    process.exitCode = 1;
  });
}

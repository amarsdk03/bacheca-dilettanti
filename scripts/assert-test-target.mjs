/** Mandatory preflight for future database tests/seeds. No network or writes. */
export function assertTestTarget(env) {
  const kind = env.BACHECA_TEST_TARGET;
  if (kind !== "local" && kind !== "staging") {
    throw new Error("Impostare BACHECA_TEST_TARGET a local o staging.");
  }
  const parseOrigin = (value) => {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) {
      throw new Error("Usare origini Supabase prive di percorso e credenziali.");
    }
    return url;
  };
  const target = parseOrigin(env.NEXT_PUBLIC_SUPABASE_URL);
  const allowed = (env.BACHECA_TEST_ALLOWED_SUPABASE_ORIGINS ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean).map(parseOrigin);
  if (!allowed.some((url) => url.origin === target.origin)) {
    throw new Error("Destinazione assente dalla lista esplicita locale/staging.");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
  if ((kind === "local" && !loopback) ||
      (kind === "staging" && (loopback || target.protocol !== "https:"))) {
    throw new Error("Destinazione incompatibile con il tipo di ambiente dichiarato.");
  }
  return { kind, origin: target.origin };
}

// Importable by future runners, so validation and the operation share one env.
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assertTestTarget(process.env);
    console.log("Destinazione di prova riconosciuta. Nessuna connessione eseguita.");
  } catch {
    console.error("Preflight bloccato: configurare URL, tipo e lista delle destinazioni locali/staging.");
    process.exitCode = 1;
  }
}

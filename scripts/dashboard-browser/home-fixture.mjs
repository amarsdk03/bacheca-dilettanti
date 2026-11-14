const AS_OF = "2026-10-25T12:00:00.000000Z";
const METRICS = ["users", "announcements", "pending", "profits"];
const BLOCKS = ["summary", "activity", ...METRICS.map(metric => "chart:" + metric)];
const actor = { authId: "aaaaaaaa-aaaa-4aaa-8aaa-000000000001", userId: "bbbbbbbb-bbbb-4bbb-8bbb-000000000001", email: "admin@example.test" };
const TYPES = ["annuncio_giocatore", "annuncio_squadra_cerca_giocatore", "annuncio_squadra_cerca_staff", "annuncio_squadra_cerca_partita", "annuncio_squadra_cerca_sponsor", "annuncio_staff_sportivo", "annuncio_arbitro", "annuncio_torneo_evento", "annuncio_campo_impianto", "annuncio_servizi_consulenze", "annuncio_creators"];

function chart(metric, empty, many = false) {
  const base = { metric, asOf: AS_OF, timezone: "Europe/Rome" };
  if (metric === "profits") return { ...base, available: false };
  const population = empty ? 0 : metric === "pending" && many ? 11 : { users: 120, announcements: 60, pending: 6 }[metric];
  const distribution = empty ? [] : metric === "users" ? [{ key: "giocatore", count: 100 }, { key: "squadra", count: 50 }] :
    metric === "announcements" ? [{ key: "pubblicato", count: 50 }, { key: "in_revisione", count: 6 }, { key: "rifiutato", count: 4 }] :
      many ? TYPES.map(key => ({key, count: 1})) : [{ key: "annuncio_giocatore", count: 4 }, { key: "annuncio_squadra_cerca_giocatore", count: 2 }];
  const common = { ...base, available: true, population, distribution, distributionTotal: distribution.reduce((n, row) => n + row.count, 0),
    excludedDates: { missingOrNonFinite: !empty && !many && metric === "pending" ? 1 : 0, future: 0 } };
  if (metric === "pending") {
    const age = ["0_2", "3_7", "8_30", "over_30", "unknown"].map((key, i) => ({ key, count: empty ? 0 : many ? (i === 0 ? 11 : 0) : [2, 1, 1, 1, 1][i] }));
    return { ...common, age, breakdown: age.map((row,i) => ({key:row.key,counts:empty ? [] : many ? (i === 0 ? TYPES.map(key => ({key,count:1})) : []) : [{key:i<3 ? "annuncio_giocatore" : "annuncio_squadra_cerca_giocatore",count:row.count}]})) };
  }
  const series = Array.from({ length: 12 }, (_, i) => ({ month: i < 2 ? "2025-" + (i + 11) : "2026-" + String(i - 1).padStart(2, "0"), count: empty ? 0 : metric === "users" ? 10 : 5 }));
  return { ...common, series, breakdown:series.map((row,i)=>({key:row.month,counts:empty ? [] : metric === "users" ? [{key:"giocatore",count:6},{key:"squadra",count:4}] : i<10 ? [{key:"pubblicato",count:5}] : i===10 ? [{key:"in_revisione",count:5}] : [{key:"in_revisione",count:1},{key:"rifiutato",count:4}]})),
    period: { from: "2025-10-31T23:00:00.000000Z", to: AS_OF } };
}

/** Controlled responses only. Authorization remains in the enclosing fixture. */
export function createHomeFixture() {
  let empty = false, many = false;
  const failures = new Set(), held = new Set(), waiting = new Map(BLOCKS.map(key => [key, new Set()]));
  const delays = new Map(), timers = new Set();
  const calls = Object.fromEntries(BLOCKS.map(key => [key, 0]));
  const valid = key => { if (!BLOCKS.includes(key)) throw new Error("BROWSER_HOME_BLOCK"); };
  return {
    get stats() { return { calls: { ...calls }, held: Object.fromEntries([...waiting].map(([key, entries]) => [key, entries.size])) }; },
    setDataset(value) { if (!["populated", "empty", "many"].includes(value)) throw new Error("BROWSER_HOME_DATASET"); empty = value === "empty"; many = value === "many"; },
    setFailure(key, value) { valid(key); if (value) failures.add(key); else failures.delete(key); },
    setDelay(key, milliseconds) { valid(key); if (!Number.isInteger(milliseconds) || milliseconds < 0 || milliseconds > 5000) throw new Error("BROWSER_HOME_DELAY"); delays.set(key, milliseconds); },
    hold(key) { valid(key); held.add(key); },
    release(key) { valid(key); held.delete(key); for (const send of waiting.get(key)) send(); waiting.get(key).clear(); },
    respond(key, response, reply) {
      valid(key); calls[key]++;
      // Snapshot at request time: a delayed response cannot borrow newer data.
      const failed = failures.has(key);
      const data = key === "summary" ? { asOf: AS_OF, users: empty ? 0 : 120, announcements: empty ? 0 : 60, pending: empty ? 0 : 6, profits: { available: false } } :
        key === "activity" ? { items: empty ? [] : Array.from({ length: 5 }, (_, i) => ({ id: `cccccccc-cccc-4ccc-8ccc-${String(5 - i).padStart(12, "0")}`,
          occurredAt: `2026-10-25T11:0${5 - i}:00.000000Z`, actor: { ...actor }, action: "auth.login", outcome: "success" })), hasMore: false, nextCursor: null } : chart(key.slice(6), empty, many);
      const pending = waiting.get(key);
      const send = () => { pending.delete(send); reply(failed ? 503 : 200, failed ? { code: "TEST_HOME_UNAVAILABLE", message: "Synthetic Home unavailable" } : data); };
      if (held.has(key)) { pending.add(send); response.once("close", () => pending.delete(send)); }
      else if (delays.get(key)) {
        const timer = setTimeout(() => { timers.delete(timer); send(); }, delays.get(key)); timers.add(timer);
        response.once("close", () => { clearTimeout(timer); timers.delete(timer); });
      } else send();
    },
    close() { for (const pending of waiting.values()) pending.clear(); for (const timer of timers) clearTimeout(timer); timers.clear(); },
  };
}

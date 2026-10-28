/** In-memory HTTP responses only: this does not implement retention or SQL ACLs. */
export const auditId = n => `eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12, "0")}`;
const AUTH = "aaaaaaaa-aaaa-4aaa-8aaa-000000000001", USER = "bbbbbbbb-bbbb-4bbb-8bbb-000000000001";
const FILTERS = ["from", "to", "operator", "action", "outcome"];
const ACTIONS = ["auth.login", "announcement.approve", "announcement.export", "auth.access_denied", "auth.logout", "announcement.hide", "announcement.reject", "announcement.show", "announcement.trash", "announcement.restore"];
const day = value => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
const copy = value => structuredClone(value);

export function createAuditFixture() {
  const rows = Array.from({ length: 37 }, (_, index) => {
    const n = index + 1, unknown = n === 4, authOnly = n === 5;
    const action = ACTIONS[index % ACTIONS.length];
    const outcome = unknown || authOnly || action === "auth.access_denied" || n % 10 === 0 ? "failure" : "success";
    return { id: auditId(n), occurredAt: n <= 35 ? `2026-10-25T10:00:00.${String(38 - n).padStart(6, "0")}Z` : n === 36 ? "2026-10-24T22:00:00.000000Z" : "2026-10-24T21:59:59.999999Z",
      actor: { authId: unknown ? null : AUTH, userId: unknown || authOnly ? null : USER, email: unknown || n === 6 ? null : "admin@example.test" }, action, outcome,
      resourceType: action.startsWith("auth.") ? "session" : action === "announcement.export" ? "announcement_export" : "announcement",
      resourceId: unknown ? null : "dddddddd-dddd-4ddd-8ddd-000000000001", correlationId: `ffffffff-ffff-4fff-8fff-${String(n).padStart(12, "0")}`,
      reason: action.startsWith("announcement.") ? "Motivo interno sintetico\nSeconda riga" : null,
      failureCode: outcome === "failure" ? "ACCESS_DENIED" : null,
      changes: action === "announcement.approve" ? { status: { before: "in_revisione", after: "pubblicato" } } : action === "announcement.hide" ? { hidden: { before: false, after: true } } : {},
      export: action === "announcement.export" && outcome === "success" ? { rowCount: 1, columns: ["title", "author"], announcementIds: ["dddddddd-dddd-4ddd-8ddd-000000000001"] } : null };
  });
  // Exercise a page boundary with equal timestamps and UUID tie breaking.
  rows[30].occurredAt = rows[29].occurredAt;
  rows.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id));
  const counters = { list: 0, detail: 0 }, modes = { list: "ok", detail: "ok" }, held = new Set(), delays = new Map(), timers = new Set();
  const waiting = { list: new Set(), detail: new Set() }, removed = new Set();
  const valid = key => { if (!["list", "detail"].includes(key)) throw new Error("BROWSER_AUDIT_BLOCK"); };
  const summary = row => { const { id, occurredAt, actor, action, outcome } = row; return copy({ id, occurredAt, actor, action, outcome }); };
  const page = q => {
    const filters = Object.fromEntries(FILTERS.map(key => [key, q[key] ?? ""]));
    if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 30 || q.cursor && (q.cursor.v !== 1 || FILTERS.some(key => q.cursor.filters?.[key] !== filters[key]) || !rows.some(row => row.id === q.cursor.id && row.occurredAt === q.cursor.occurredAt))) throw new Error("INVALID_QUERY");
    const selected = rows.filter(row => !removed.has(row.id) && (!filters.from || day(row.occurredAt) >= filters.from) && (!filters.to || day(row.occurredAt) <= filters.to) &&
      (!filters.operator || (filters.operator === "unknown" ? !row.actor.authId : [row.actor.email, row.actor.authId, row.actor.userId].includes(filters.operator))) &&
      (!filters.action || row.action === filters.action) && (!filters.outcome || row.outcome === filters.outcome) &&
      (!q.cursor || row.occurredAt < q.cursor.occurredAt || row.occurredAt === q.cursor.occurredAt && row.id < q.cursor.id));
    const items = selected.slice(0, q.limit).map(summary), hasMore = selected.length > q.limit, last = items.at(-1);
    return { items, hasMore, nextCursor: hasMore ? { v: 1, filters, id: last.id, occurredAt: last.occurredAt } : null };
  };
  return {
    page, inspect: id => copy(rows.find(row => row.id === id) ?? null),
    get stats() { return { ...counters, held: { list: waiting.list.size, detail: waiting.detail.size } }; },
    setMode(key, mode) { valid(key); if (!["ok", "unavailable", "not_found", "empty"].includes(mode)) throw new Error("BROWSER_AUDIT_MODE"); modes[key] = mode; },
    remove(id) { removed.add(id); },
    setDelay(key, ms) { valid(key); if (!Number.isInteger(ms) || ms < 0 || ms > 5000) throw new Error("BROWSER_AUDIT_DELAY"); delays.set(key, ms); },
    hold(key) { valid(key); held.add(key); },
    release(key) { valid(key); held.delete(key); for (const send of waiting[key]) send(); waiting[key].clear(); },
    respond(rpc, body, response, reply) {
      const key = rpc === "admin_list_audit_events_v1" && body.p_query?.limit === 30 ? "list" : rpc === "admin_get_audit_event_v1" ? "detail" : null;
      if (!key) return false;
      counters[key]++;
      let payload, status = 200;
      try { payload = key === "list" ? page(body.p_query) : copy(rows.find(row => row.id === body.p_id && !removed.has(row.id)) ?? null); }
      catch { reply(400, { code: "22023", message: "INVALID_QUERY" }); return true; }
      if (modes[key] === "unavailable") { status = 503; payload = { code: "TEST_AUDIT_UNAVAILABLE", message: "Synthetic read unavailable" }; }
      else if (modes[key] === "not_found") payload = null;
      else if (modes[key] === "empty" && key === "list") payload = { items: [], hasMore: false, nextCursor: null };
      const send = () => { waiting[key].delete(send); reply(status, payload); };
      if (held.has(key)) { waiting[key].add(send); response.once("close", () => waiting[key].delete(send)); }
      else if (delays.get(key)) {
        const timer = setTimeout(() => { timers.delete(timer); send(); }, delays.get(key)); timers.add(timer);
        response.once("close", () => { clearTimeout(timer); timers.delete(timer); });
      } else send();
      return true;
    },
    close() { for (const entries of Object.values(waiting)) entries.clear(); for (const timer of timers) clearTimeout(timer); timers.clear(); },
  };
}

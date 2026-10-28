import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Load a pure, trusted vocabulary without requiring native TS support in Node.
const source = readFileSync(new URL("../../apps/admin/src/features/annunci/detail-fields.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { DETAIL_FIELDS } = await import("data:text/javascript;base64," + Buffer.from(output).toString("base64"));
export const ANNUNCI_TYPES = Object.keys(DETAIL_FIELDS);
export const OPERATIONS = ["approve", "reject", "hide", "show", "trash", "restore"];
export const annunciId = number => "dddddddd-dddd-4ddd-8ddd-" + String(number).padStart(12, "0");
const USER = "bbbbbbbb-bbbb-4bbb-8bbb-000000000001", PROFILE = "eeeeeeee-eeee-4eee-8eee-000000000001";
const hash = (value, algorithm) => createHash(algorithm).update(JSON.stringify(value)).digest("hex");
const clone = value => structuredClone(value);

/** An HTTP double for browser acceptance, not a SQL authorization/locking engine. */
export function createAnnunciFixture() {
  let gate = false, externalOrigin = "http://127.0.0.1:1";
  const rows = new Map(), versions = new Map(), incomplete = new Set(), hiddenByAdmin = new Set(), timers = new Set(), held = new Set();
  const queues = new Map(), modes = new Map(), delays = new Map(), events = [], counters = { list: 0, detail: 0, moderate: 0, export: 0 };
  for (let i = 1; i <= 37; i++) {
    const type = ANNUNCI_TYPES[(i - 1) % 11], anonymous = i === 1;
    rows.set(annunciId(i), { id: annunciId(i), title: i === 2 ? '=SUM(1;2) "Èlite"' : i === 3 ? "Riga uno;\nRiga due" : `Annuncio sintetico ${String(i).padStart(2, "0")}`,
      type, status: i <= 11 ? "in_revisione" : ["pubblicato", "rifiutato", "in_attesa_pagamento"][i % 3],
      trashed: i > 35, hidden: i > 35 || i % 5 === 0, private: i % 7 === 0, creatorId: USER,
      createdAt: i === 35 ? null : `2026-10-25T10:00:00.${String(100000 - i).padStart(6, "0")}Z`, updatedAt: "2026-10-25T10:00:00.000000Z",
      author: { profileId: i === 34 ? null : PROFILE, userId: USER, displayName: i === 34 ? "Profilo non disponibile" : anonymous ? "Giocatore" : "Autore sintetico", anonymous, available: i !== 34 } });
    versions.set(annunciId(i), 1); if (i > 35) hiddenByAdmin.add(annunciId(i));
  }
  const summary = row => ({ ...clone(row), rowFingerprint: hash([row, versions.get(row.id)], "md5") });
  const capability = (row, operation) => {
    if (["trash", "restore"].includes(operation) && !gate) return "TRASH_NOT_ENABLED";
    if (row.trashed) return operation === "restore" ? null : "IN_TRASH";
    if (operation === "restore") return "NOT_TRASHED";
    if (["approve", "reject"].includes(operation) && row.status !== "in_revisione") return "REVIEW_REQUIRED";
    if (["approve", "show"].includes(operation) && incomplete.has(row.id)) return "INCOMPLETE_CONTENT";
    if (operation === "hide" && hiddenByAdmin.has(row.id)) return "ALREADY_HIDDEN";
    if (operation === "show" && !hiddenByAdmin.has(row.id)) return "NOT_HIDDEN";
    return null;
  };
  const detail = id => {
    const row = rows.get(id); if (!row) return null;
    const fields = Object.fromEntries(Object.entries(DETAIL_FIELDS[row.type]).map(([key, kind]) => [key, kind === "text" ? "Contenuto sintetico" : kind === "number" ? 12 : kind === "boolean" ? true : []]));
    const capabilities = Object.fromEntries(OPERATIONS.map(operation => { const reason = capability(row, operation); return [operation, { allowed: !reason, reason }]; }));
    return { summary: summary(row), metadata: { moderationInfo: null, level: null, priorityActive: false, priorityStartsAt: null, priorityEndsAt: null, updatedById: USER },
      content: { type: row.type, fields }, locations: [{ id: "9007199254740993", region: "Lazio", city: "Roma" }],
      contacts: [{ id: "1", kind: "email", value: "contatto@example.test", referent: null }],
      links: [{ id: "1", platform: "Sito sintetico", value: externalOrigin + "/external/announcement" }], media: [],
      contentFingerprint: "content-v1:" + hash([row, versions.get(id), incomplete.has(id), gate], "sha256"),
      complete: !incomplete.has(id), issues: incomplete.has(id) ? ["DETAIL_MISSING"] : [],
      moderation: { adminHidden: hiddenByAdmin.has(id), capabilities }, trash: { deletedAt: row.trashed ? "2026-10-25T11:00:00.000000Z" : null, deletedBy: row.trashed ? USER : null } };
  };
  const list = query => {
    const { cursor, limit = 30, ...filters } = query;
    const ordered = [...rows.values()].filter(row => (filters.trash === "all" || (filters.trash === "only" ? row.trashed : !row.trashed)) &&
      (!filters.status || filters.status === row.status) && (!filters.type || filters.type === row.type) &&
      (filters.visibility === "all" || filters.visibility === "shown" && row.hidden === false || filters.visibility === "hidden" && row.hidden === true || filters.visibility === "unknown" && row.hidden === null) &&
      (!filters.search || row.id === filters.search.toLowerCase() || row.title.toLowerCase().includes(filters.search.toLowerCase())))
      .sort((a, b) => a.createdAt === b.createdAt ? b.id.localeCompare(a.id) : a.createdAt === null ? 1 : b.createdAt === null ? -1 : b.createdAt.localeCompare(a.createdAt))
      .filter(row => !cursor || (cursor.createdAt === null ? row.createdAt === null && row.id < cursor.id : row.createdAt === null || row.createdAt < cursor.createdAt || row.createdAt === cursor.createdAt && row.id < cursor.id));
    const items = ordered.slice(0, limit).map(summary), hasMore = ordered.length > limit, last = items.at(-1);
    return { items, hasMore, nextCursor: hasMore ? { v: 2, filters, id: last.id, createdAt: last.createdAt } : null };
  };
  const mutate = input => {
    const correlationId = randomUUID(), row = rows.get(input.p_id), operation = input.p_operation;
    if (!row) return { status: "not_found", correlationId };
    if (!OPERATIONS.includes(operation)) return { status: "invalid", correlationId };
    if (detail(row.id).contentFingerprint !== input.p_fingerprint) return { status: "conflict", correlationId };
    const reason = capability(row, operation); if (reason) return { status: "not_allowed", reason, correlationId };
    if (["reject", "hide", "trash"].includes(operation) && !(typeof input.p_reason === "string" && input.p_reason.trim() && [...input.p_reason].length <= 1000)) return { status: "invalid", correlationId };
    if (operation === "approve") row.status = "pubblicato";
    if (operation === "reject") row.status = "rifiutato";
    if (operation === "hide" || operation === "restore") { row.hidden = true; hiddenByAdmin.add(row.id); }
    if (operation === "show") { row.hidden = false; hiddenByAdmin.delete(row.id); }
    if (operation === "trash") row.trashed = true;
    if (operation === "restore") row.trashed = false;
    versions.set(row.id, versions.get(row.id) + 1);
    const eventId = randomUUID(); events.push({ id: eventId, action: "announcement." + operation, resourceId: row.id, reason: input.p_reason, outcome: "success" });
    return { status: "ok", id: row.id, eventId, correlationId };
  };
  const validBlock = block => { if (!["list", "detail", "moderate", "export"].includes(block)) throw new Error("BROWSER_ANNUNCI_BLOCK"); };
  return {
    setExternalOrigin(value) { const url = new URL(value); if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port || url.pathname !== "/" || url.search || url.hash || url.username) throw new Error("BROWSER_EXTERNAL_ORIGIN"); externalOrigin = url.origin; },
    get stats() { return { ...counters, held: Object.fromEntries([...queues].map(([key, q]) => [key, q.size])), events: clone(events) }; },
    inspect: id => detail(id), page: query => list(query),
    setGate(value) { gate = Boolean(value); },
    setIncomplete(id, value) { if (value) incomplete.add(id); else incomplete.delete(id); },
    bump(id) { if (!versions.has(id)) throw new Error("BROWSER_ANNUNCI_ID"); versions.set(id, versions.get(id) + 1); },
    setMode(block, value) { validBlock(block); if (!["ok", "unavailable", "conflict", "not_found", "uncertain"].includes(value)) throw new Error("BROWSER_ANNUNCI_MODE"); modes.set(block, value); },
    setDelay(block, milliseconds) { validBlock(block); if (!Number.isInteger(milliseconds) || milliseconds < 0 || milliseconds > 5000) throw new Error("BROWSER_ANNUNCI_DELAY"); delays.set(block, milliseconds); },
    hold(block) { validBlock(block); held.add(block); },
    release(block) { validBlock(block); held.delete(block); for (const send of queues.get(block) ?? []) send(); },
    respond(rpc, input, response, reply) {
      const block = { admin_list_announcements_v1: "list", admin_get_announcement_v1: "detail", admin_moderate_announcement_v1: "moderate", admin_export_announcements_v1: "export" }[rpc];
      if (!block) return false;
      counters[block]++; const mode = modes.get(block) ?? "ok";
      let value, status = 200;
      if (mode === "unavailable" || mode === "uncertain") {
        if (mode === "uncertain" && block === "moderate") mutate(input);
        status = 503; value = { code: "TEST_ANNUNCI_UNAVAILABLE", message: "Synthetic response unavailable" };
      } else if (mode === "conflict") value = { status: "conflict", correlationId: randomUUID() };
      else if (mode === "not_found") value = block === "detail" ? null : { status: "not_found", correlationId: randomUUID() };
      else if (block === "list") value = list(input.p_query);
      else if (block === "detail") value = detail(input.p_id);
      else if (block === "moderate") value = mutate(input);
      else {
        const page = list(input.p_query), selection = page.items.map(row => ({ id: row.id, rowFingerprint: row.rowFingerprint, authorName: row.author.displayName }));
        const correlationId = randomUUID();
        if (!selection.length || JSON.stringify(selection) !== JSON.stringify(input.p_selection)) value = { status: "conflict", correlationId };
        else { const eventId = randomUUID(); events.push({ id: eventId, action: "announcement.export", outcome: "success", count: selection.length }); value = { status: "ok", eventId, correlationId, items: page.items }; }
      }
      const queue = queues.get(block) ?? new Set(); queues.set(block, queue);
      // Read snapshots are frozen before a delayed reply. Writes represent the
      // modeled commit before delivery; this does not prove SQL atomicity.
      const send = () => { queue.delete(send); reply(status, value); };
      response.once("close", () => queue.delete(send));
      if (held.has(block)) queue.add(send);
      else if (delays.get(block)) { const timer = setTimeout(() => { timers.delete(timer); send(); }, delays.get(block)); timers.add(timer); response.once("close", () => { clearTimeout(timer); timers.delete(timer); }); }
      else send();
      return true;
    },
    close() { for (const timer of timers) clearTimeout(timer); timers.clear(); for (const queue of queues.values()) queue.clear(); },
  };
}

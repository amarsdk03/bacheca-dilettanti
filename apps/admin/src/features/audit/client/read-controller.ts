import type { AuditDetailResult, AuditFilters, AuditListResult } from "../read-contracts";
import { auditHref, parseAuditUrl, type AuditUrl } from "../read-url";
import { DEFAULT_AUDIT_FILTERS, normalizeAuditFilters } from "../read-validation";
type State = { query: AuditUrl; draft: AuditFilters; error: string | null; list: { pending: boolean; result: AuditListResult | null };
  detail: { id: string | null; pending: boolean; result: AuditDetailResult | null }; canPrevious: boolean };
type Deps = { list(q: AuditUrl, signal: AbortSignal): Promise<AuditListResult>; detail(id: string, signal: AbortSignal): Promise<AuditDetailResult>;
  navigate(href: string): void; denied(): void };
const closed = { id: null, pending: false, result: null };
const unavailable = () => ({ status: "unavailable" as const, code: "AUDIT_UNAVAILABLE" as const, correlationId: "client" });
export function createAuditController(query: AuditUrl, result: AuditListResult, deps: Deps) {
  let state: State = { query, draft: query.filters, error: null, list: { pending: false, result }, detail: closed, canPrevious: false };
  const initial = state, listeners = new Set<() => void>();
  let listVersion = 0, detailVersion = 0, listAbort: AbortController | undefined, detailAbort: AbortController | undefined;
  let trail: (string | null)[] = [query.cursor], index = 0;
  const update = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
  const close = () => { detailVersion++; detailAbort?.abort(); update({ detail: closed }); };
  const cancel = () => { listVersion++; detailVersion++; listAbort?.abort(); detailAbort?.abort(); };
  const denied = () => { cancel(); update({ list: { pending: false, result: null }, detail: closed }); deps.denied(); };
  const sync = (search: string, force = false) => {
    const next = parseAuditUrl(search);
    if (!force && next.key === state.query.key) return;
    listVersion++; listAbort?.abort(); close();
    if (JSON.stringify(next.filters) !== JSON.stringify(state.query.filters) || !trail.includes(next.cursor)) { trail = [next.cursor]; index = 0; }
    else index = trail.indexOf(next.cursor);
    update({ query: next, draft: next.filters, error: null, canPrevious: index > 0,
      list: next.valid ? { pending: true, result: null } : { pending: false, result: { status: "invalid", code: "INVALID_QUERY" } } });
    if (!next.valid) return;
    const version = listVersion, abort = new AbortController(); listAbort = abort;
    void deps.list(next, abort.signal).then(value => {
      if (version !== listVersion || abort.signal.aborted) return;
      if (value.status === "denied") denied(); else update({ list: { pending: false, result: value } });
    }).catch(() => { if (version === listVersion && !abort.signal.aborted) update({ list: { pending: false, result: unavailable() } }); });
  };
  const navigate = (filters: AuditFilters, cursor: string | null) => {
    const href = auditHref(filters, cursor); deps.navigate(href); sync(href.slice("/registro-attivita".length));
    update({ draft: normalizeAuditFilters(filters), error: null });
  };
  const open = (id: string) => {
    detailVersion++; detailAbort?.abort(); const version = detailVersion, abort = new AbortController(); detailAbort = abort;
    update({ detail: { id, pending: true, result: null } });
    void deps.detail(id, abort.signal).then(value => {
      if (version !== detailVersion || abort.signal.aborted) return;
      if (value.status === "denied") denied(); else update({ detail: { id, pending: false, result: value } });
    }).catch(() => { if (version === detailVersion && !abort.signal.aborted) update({ detail: { id, pending: false, result: unavailable() } }); });
  };
  return {
    getSnapshot: () => state, getServerSnapshot: () => initial,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }, sync, cancel, close, open,
    draft(patch: Partial<AuditFilters>) { update({ draft: { ...state.draft, ...patch }, error: null }); },
    apply() { try { navigate(normalizeAuditFilters(state.draft), null); } catch { update({ error: "Controlla le date e inserisci un’email completa, un UUID oppure unknown per gli eventi non identificati." }); } },
    reset() { navigate(DEFAULT_AUDIT_FILTERS, null); }, first() { navigate(state.query.filters, null); },
    refresh() { sync(state.query.href.slice("/registro-attivita".length), true); },
    next() {
      const result = state.list.result;
      if (state.list.pending || result?.status !== "ok" || !result.page.nextCursor) return;
      trail = trail.slice(0, index + 1); trail.push(result.page.nextCursor); navigate(state.query.filters, result.page.nextCursor);
    },
    previous() { if (!state.list.pending && index > 0) navigate(state.query.filters, trail[index - 1]); },
  };
}

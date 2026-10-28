import type { AnnouncementDetail, AnnouncementDetailResult, AnnouncementFilters, AnnouncementListResult } from "../contracts";
import { capability, parseModerationInput, type ModerationInput, type ModerationOperation, type ModerationResult } from "../moderation";
import { annunciHref, parseAnnunciUrl, type AnnunciUrl } from "../url-state";
import { normalizeFilters } from "../validation";
import { exportSelection, type ExportDownload, type ExportFailure, type ExportSelection } from "../export-contract";

export type AnnunciState = {
  query: AnnunciUrl; draft: AnnouncementFilters; searchError: string | null;
  list: { pending: boolean; result: AnnouncementListResult | null };
  preview: { id: string | null; pending: boolean; result: AnnouncementDetailResult | null };
  canPrevious: boolean;
  exporting: { pending: boolean; result: ExportFailure | null };
  moderation: { id: string; operation: ModerationOperation; phase: "loading" | "ready" | "submitting" | "result"; detail: AnnouncementDetail | null; reason: string; error: string | null; result: ModerationResult | null } | null;
};
type Dependencies = {
  list(query: AnnunciUrl, signal: AbortSignal): Promise<AnnouncementListResult>;
  detail(id: string, signal: AbortSignal): Promise<AnnouncementDetailResult>;
  navigate(href: string, mode: "push" | "replace"): void;
  denied(): void;
  moderate?(input: ModerationInput): Promise<ModerationResult>;
  export?(query: AnnunciUrl, selection: ExportSelection, signal: AbortSignal): Promise<ExportDownload | ExportFailure>;
  download?(file: ExportDownload): void;
};
const closedPreview = { id: null, pending: false, result: null };
const unavailable = () => ({ status: "unavailable" as const, code: "ANNOUNCEMENTS_UNAVAILABLE" as const, correlationId: "client" });

export function canExportAnnouncements(state: AnnunciState) {
  if (!state.query.valid || state.list.pending || state.list.result?.status !== "ok" || !state.list.result.page.items.length ||
    state.exporting.pending || state.exporting.result || state.moderation || state.searchError) return false;
  try { return JSON.stringify(normalizeFilters(state.draft)) === JSON.stringify(state.query.filters); }
  catch { return false; }
}

/** State and request lifetime live in one instance per mounted page. No role/data
 * cache across visits. Generations remain necessary when a transport ignores abort.
 */
export function createAnnunciController(query: AnnunciUrl, result: AnnouncementListResult, deps: Dependencies) {
  let state: AnnunciState = { query, draft: query.filters, searchError: null, list: { pending: false, result }, preview: closedPreview, canPrevious: false, moderation: null, exporting: { pending: false, result: null } };
  const initial = state, listeners = new Set<() => void>();
  let listAbort: AbortController | undefined, detailAbort: AbortController | undefined;
  let listVersion = 0, detailVersion = 0, timer: ReturnType<typeof setTimeout> | undefined;
  let moderationVersion = 0, moderationAbort: AbortController | undefined;
  let exportVersion = 0, exportAbort: AbortController | undefined;
  let trail: (string | null)[] = [query.cursor], trailIndex = 0;
  const update = (patch: Partial<AnnunciState>) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn()); };
  const clearTimer = () => { clearTimeout(timer); timer = undefined; };
  const closePreview = () => { detailVersion++; detailAbort?.abort(); update({ preview: closedPreview }); };
  const invalidateExport = () => { exportVersion++; exportAbort?.abort(); update({ exporting: { pending: false, result: null } }); };
  const cancel = () => { clearTimer(); listVersion++; detailVersion++; moderationVersion++; exportVersion++; listAbort?.abort(); detailAbort?.abort(); moderationAbort?.abort(); exportAbort?.abort(); };
  const denied = () => { cancel(); update({ list: { pending: false, result: null }, preview: closedPreview, moderation: null, exporting: { pending: false, result: null } }); deps.denied(); };
  const sync = (search: string, force = false, keepPreview = false, draftSearch?: string) => {
    const next = parseAnnunciUrl(search);
    if (!force && next.key === state.query.key) return;
    invalidateExport();
    clearTimer(); listVersion++; listAbort?.abort(); if (!keepPreview) closePreview();
    if (JSON.stringify(next.filters) !== JSON.stringify(state.query.filters)) { trail = [next.cursor]; trailIndex = 0; }
    else {
      const index = trail.indexOf(next.cursor);
      if (index < 0) { trail = [next.cursor]; trailIndex = 0; } else trailIndex = index;
    }
    update({ query: next, draft: draftSearch === undefined ? next.filters : { ...next.filters, search: draftSearch }, searchError: null, canPrevious: trailIndex > 0,
      list: next.valid ? { pending: true, result: null } : { pending: false, result: { status: "invalid", code: "INVALID_QUERY" } } });
    if (!next.valid) return;
    const version = listVersion; const abort = new AbortController(); listAbort = abort;
    void deps.list(next, abort.signal).then((value) => {
      if (version !== listVersion || abort.signal.aborted) return;
      if (value.status === "denied") denied(); else update({ list: { pending: false, result: value } });
    }).catch(() => { if (version === listVersion && !abort.signal.aborted) update({ list: { pending: false, result: unavailable() } }); });
  };
  const navigate = (filters: AnnouncementFilters, cursor: string | null, mode: "push" | "replace", draftSearch?: string) => {
    clearTimer();
    const href = annunciHref(filters, cursor); deps.navigate(href, mode);
    if (parseAnnunciUrl(href.slice("/annunci".length)).key === state.query.key) {
      closePreview(); update({ draft: { ...normalizeFilters(filters), ...(draftSearch === undefined ? {} : { search: draftSearch }) }, searchError: null });
    } else sync(href.slice("/annunci".length), false, false, draftSearch);
  };
  const apply = (mode: "push" | "replace", preserveSearch = false) => {
    clearTimer();
    // The query is canonical; the controlled input must retain a trailing space
    // when the debounce fires between two words of a slowly typed search.
    try { navigate(normalizeFilters(state.draft), null, mode, preserveSearch ? state.draft.search : undefined); }
    catch { update({ searchError: "La ricerca può contenere al massimo 200 caratteri." }); }
  };
  const openPreview = (id: string) => {
    detailVersion++; detailAbort?.abort(); const version = detailVersion;
    const abort = new AbortController(); detailAbort = abort;
    update({ preview: { id, pending: true, result: null } });
    void deps.detail(id, abort.signal).then((value) => {
      if (version !== detailVersion || abort.signal.aborted) return;
      if (value.status === "denied") denied(); else update({ preview: { id, pending: false, result: value } });
    }).catch(() => { if (version === detailVersion && !abort.signal.aborted) update({ preview: { id, pending: false, result: unavailable() } }); });
  };
  const beginModeration = (id: string, operation: ModerationOperation) => {
    if (state.moderation?.phase === "submitting" || state.exporting.pending) return;
    clearTimer(); moderationVersion++; moderationAbort?.abort();
    const version = moderationVersion, abort = new AbortController(); moderationAbort = abort;
    const current = { id, operation, phase: "loading" as const, detail: null, reason: "", error: null, result: null };
    update({ moderation: current });
    void deps.detail(id, abort.signal).then((result) => {
      if (version !== moderationVersion || abort.signal.aborted) return;
      if (result.status === "denied") { denied(); return; }
      update({ moderation: result.status === "ok" ? { ...current, phase: "ready", detail: result.detail } :
        { ...current, phase: "result", error: result.status === "not_found" ? "L’annuncio non è più disponibile." : "Impossibile verificare il dettaglio. Ricarica prima di confermare." } });
    }).catch(() => { if (version === moderationVersion && !abort.signal.aborted) update({ moderation: { ...current, phase: "result", error: "Impossibile verificare il dettaglio. Ricarica prima di confermare." } }); });
  };
  const closeModeration = () => {
    if (state.moderation?.phase === "submitting") return;
    moderationVersion++; moderationAbort?.abort(); update({ moderation: null });
  };
  const confirmModeration = async () => {
    const current = state.moderation;
    if (!current || current.phase !== "ready" || !current.detail || !capability(current.detail, current.operation).allowed) return;
    let input: ModerationInput;
    try { input = parseModerationInput({ id: current.id, operation: current.operation, fingerprint: current.detail.contentFingerprint, reason: current.reason || null }); }
    catch { update({ moderation: { ...current, error: "Inserisci una motivazione da 1 a 1.000 caratteri." } }); return; }
    const version = moderationVersion;
    update({ moderation: { ...current, phase: "submitting", error: null } });
    let outcome: ModerationResult;
    try { outcome = await deps.moderate!(input); }
    catch { outcome = { status: "unavailable", correlationId: "client" }; }
    if (version !== moderationVersion) return;
    if (outcome.status === "denied") { denied(); return; }
    update({ moderation: { ...current, phase: "result", result: outcome, error: null } });
    if (outcome.status === "ok") {
      sync(state.query.href.slice("/annunci".length), true, true);
      if (state.preview.id === current.id) openPreview(current.id);
    }
  };
  const exportPage = async () => {
    const current = state.list.result;
    if (!canExportAnnouncements(state) || current?.status !== "ok" || !deps.export || !deps.download) return;
    clearTimer(); exportVersion++; const version = exportVersion;
    const abort = new AbortController(); exportAbort = abort;
    const items = current.page.items;
    update({ exporting: { pending: true, result: null } });
    try {
      const outcome = await deps.export(state.query, exportSelection(items), abort.signal);
      if (version !== exportVersion || abort.signal.aborted) return;
      if (outcome.status === "denied") { denied(); return; }
      if (outcome.status === "ok") { deps.download(outcome); update({ exporting: { pending: false, result: null } }); }
      else update({ exporting: { pending: false, result: outcome } });
    } catch {
      if (version === exportVersion && !abort.signal.aborted) update({ exporting: { pending: false, result: { status: "unavailable", correlationId: "client" } } });
    }
  };
  return {
    getSnapshot: () => state, getServerSnapshot: () => initial,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    sync, cancel, closePreview, openPreview, exportPage,
    beginModeration, closeModeration, confirmModeration,
    reloadModeration: () => { const current = state.moderation; if (current) beginModeration(current.id, current.operation); },
    setReason: (reason: string) => { const current = state.moderation; if (current?.phase === "ready") update({ moderation: { ...current, reason, error: null } }); },
    refresh: () => sync(state.query.href.slice("/annunci".length), true),
    retryPreview: () => { if (state.preview.id) openPreview(state.preview.id); },
    setSearch(search: string) {
      invalidateExport();
      clearTimer(); const invalid = [...search.trim()].length > 200;
      update({ draft: { ...state.draft, search }, searchError: invalid ? "La ricerca può contenere al massimo 200 caratteri." : null });
      if (!invalid) timer = setTimeout(() => apply("replace", true), 350);
    },
    submitSearch: () => apply("replace"),
    setFilter(patch: Partial<AnnouncementFilters>) { update({ draft: { ...state.draft, ...patch } }); apply("push"); },
    reset: () => navigate({ search: "", status: null, type: null, visibility: "all", trash: "exclude" }, null, "push"),
    first: () => navigate(state.query.filters, null, "push"),
    previous() { if (trailIndex > 0) navigate(state.query.filters, trail[trailIndex - 1], "push"); },
    next() {
      const result = state.list.result;
      if (state.list.pending || result?.status !== "ok" || !result.page.hasMore || !result.page.nextCursor) return;
      trail = [...trail.slice(0, trailIndex + 1), result.page.nextCursor];
      navigate(state.query.filters, result.page.nextCursor, "push");
    },
  };
}
export type AnnunciController = ReturnType<typeof createAnnunciController>;

import type { HomeActivityResult, HomeSummaryResult } from "../contracts";
import type { HomeSession } from "./session";
type Result = HomeSummaryResult | HomeActivityResult;

export function createHomeBlockController<T extends Result>(initialResult: T, deps: {
  request(signal: AbortSignal): Promise<T>; unavailable(): T; session: HomeSession;
}) {
  let state: { pending: boolean; result: T | null } = { pending: false, result: initialResult };
  const initial = state, listeners = new Set<() => void>();
  let version = 0, abort: AbortController | undefined;
  const update = (pending: boolean, result: T | null) => { state = { pending, result }; listeners.forEach(fn => fn()); };
  const cancel = () => { version++; abort?.abort(); };
  return {
    getSnapshot: () => state, getServerSnapshot: () => initial,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    cancel, clear() { cancel(); update(false, null); },
    refresh() {
      if (deps.session.getSnapshot().denied) return;
      cancel(); const generation = version, request = new AbortController(); abort = request;
      update(true, null);
      void Promise.resolve().then(() => {
        if (generation !== version || request.signal.aborted || deps.session.getSnapshot().denied) return null;
        return deps.request(request.signal);
      }).then(result => {
        if (!result || generation !== version || request.signal.aborted || deps.session.getSnapshot().denied) return;
        if (result.status === "denied") deps.session.deny(); else update(false, result);
      }).catch(() => {
        if (generation === version && !request.signal.aborted && !deps.session.getSnapshot().denied) update(false, deps.unavailable());
      });
    },
  };
}

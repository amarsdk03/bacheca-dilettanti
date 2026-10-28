import type { HomeChartResult, HomeMetric } from "../contracts";
import type { HomeSession } from "./session";

type State = { metric: HomeMetric; pending: boolean; result: HomeChartResult | null };
export function createHomeChartController(session: HomeSession, request: (metric: HomeMetric, signal: AbortSignal) => Promise<HomeChartResult>) {
  let state: State = { metric: session.getSnapshot().selected, pending: true, result: null };
  const initial = state, listeners = new Set<() => void>();
  let generation = 0, abort: AbortController | null = null, started = false;
  const notify = (next: State) => { state = next; listeners.forEach(fn => fn()); };
  const invalidate = () => { generation++; abort?.abort(); abort = null; };
  const refresh = () => {
    if (session.getSnapshot().denied) return;
    invalidate(); started = true;
    const metric = session.getSnapshot().selected, current = generation, controller = new AbortController(); abort = controller;
    notify({ metric, pending: true, result: null });
    const valid = () => generation === current && !controller.signal.aborted && !session.getSnapshot().denied;
    Promise.resolve().then(() => valid() ? request(metric, controller.signal) : null).then(result => {
      if (!valid() || !result) return;
      if (result.status === "denied") { session.deny(); return; }
      if (result.status === "ok" && result.chart.metric !== metric) throw new Error("INVALID_HOME_RESPONSE");
      notify({ metric, pending: false, result });
    }).catch(() => {
      if (valid()) notify({ metric, pending: false, result: { status: "unavailable", code: "HOME_UNAVAILABLE", correlationId: "client" } });
    });
  };
  return {
    getSnapshot: () => state, getServerSnapshot: () => initial,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    refresh,
    start() { if (!started) refresh(); },
    sync() { if (state.metric !== session.getSnapshot().selected) refresh(); },
    cancel() { invalidate(); started = false; },
    clear() { invalidate(); started = false; notify({ metric: session.getSnapshot().selected, pending: false, result: null }); },
  };
}

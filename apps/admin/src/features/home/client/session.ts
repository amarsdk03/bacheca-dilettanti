import type { HomeMetric } from "../contracts";
import { homeMetric } from "../validation";
type State = { selected: HomeMetric; denied: boolean };
type Block = { cancel(): void; clear(): void; refresh(): void };

/** One Home visit only. No persisted data or cached authorization. */
export function createHomeSession(redirect: () => void) {
  let state: State = { selected: "users", denied: false }, resumed = false;
  const initial = state, listeners = new Set<() => void>(), blocks = new Set<Block>();
  const update = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()); };
  return {
    getSnapshot: () => state, getServerSnapshot: () => initial,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    select(metric: unknown) { if (!state.denied && homeMetric(metric) && metric !== state.selected) update({ selected: metric }); },
    register(block: Block) {
      if (state.denied) { block.clear(); return () => {}; }
      blocks.add(block); if (resumed) block.refresh();
      return () => { blocks.delete(block); block.cancel(); };
    },
    resume() { if (!state.denied) { resumed = true; for (const block of blocks) block.refresh(); } },
    deny() {
      if (state.denied) return;
      // Set the latch first, so clearing/subscription callbacks cannot restart work.
      state = { ...state, denied: true };
      for (const block of blocks) block.clear();
      listeners.forEach(fn => fn()); redirect();
    },
  };
}
export type HomeSession = ReturnType<typeof createHomeSession>;

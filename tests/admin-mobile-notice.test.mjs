import assert from "node:assert/strict";
import {test} from "node:test";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
const {createMobileNoticeStore, MOBILE_NOTICE_COOLDOWN: day, MOBILE_NOTICE_STORAGE_KEY: key} = adminServerLoader()("apps/admin/src/features/dashboard/mobile-notice.ts");
function fixture() {
  let now = 1800000000000;
  const data = new Map();
  const deps = {now: () => now, storage: () => ({getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v)})};
  return {data, deps, store: createMobileNoticeStore(deps), advance: ms => {now += ms;}};
}
test("mobile entry opens; desktop entry and resize do not store a dismissal", () => {
  const h = fixture(); assert.equal(h.store.getServerSnapshot(), false);
  h.store.check(false); assert.equal(h.store.getSnapshot(), false);
  h.store.check(true); assert.equal(h.store.getSnapshot(), true);
  h.store.check(false); assert.equal(h.store.getSnapshot(), false); assert.equal(h.data.size, 0);
  h.store.check(true); assert.equal(h.store.getSnapshot(), true);
});
test("dismissal survives navigation and reload for exactly 24 hours", () => {
  const h = fixture(); h.store.check(true); h.store.dismiss(); assert(h.data.has(key));
  h.store.check(true); assert.equal(h.store.getSnapshot(), false);
  h.advance(day - 1);
  const reloaded = createMobileNoticeStore(h.deps); reloaded.check(true); assert.equal(reloaded.getSnapshot(), false);
  h.advance(1); reloaded.check(true); assert.equal(reloaded.getSnapshot(), true);
});
test("blocked storage retains the dismissal in memory during the visit", () => {
  const h = fixture(); h.deps.storage = () => {throw new Error("blocked");};
  h.store.check(true); h.store.dismiss(); h.store.check(false); h.store.check(true);
  assert.equal(h.store.getSnapshot(), false);
  h.advance(day); h.store.check(true); assert.equal(h.store.getSnapshot(), true);
});
test("corrupt or future timestamps do not suppress the information", () => {
  for (const value of ["", "NaN", "Infinity", "-1", "abc", "9999999999999999", "1900000000000"]) {
    const h = fixture(); h.data.set(key, value); h.store.check(true); assert.equal(h.store.getSnapshot(), true);
  }
});
test("subscribers are notified only when visible state changes and can unsubscribe", () => {
  const h = fixture(); let changes = 0; const unsubscribe = h.store.subscribe(() => changes++);
  h.store.check(true); h.store.check(true); assert.equal(changes, 1);
  h.store.dismiss(); h.store.dismiss(); assert.equal(changes, 2);
  unsubscribe(); h.advance(day); h.store.check(true); assert.equal(changes, 2);
});

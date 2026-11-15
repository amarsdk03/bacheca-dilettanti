export const MOBILE_NOTICE_STORAGE_KEY = "bd-admin-mobile-notice-dismissed-at:v1";
export const MOBILE_NOTICE_COOLDOWN = 24 * 60 * 60 * 1000;

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

/** Recheck only on entry/navigation/viewport changes; never interrupt via a timer. */
export function createMobileNoticeStore(deps: {now(): number; storage(): Storage}) {
  let open = false;
  let dismissedAt: number | null = null;
  const listeners = new Set<() => void>();
  const update = (next: boolean) => {
    if (open === next) return;
    open = next;
    listeners.forEach(listener => listener());
  };
  return {
    subscribe(listener: () => void) {listeners.add(listener); return () => {listeners.delete(listener);};},
    getSnapshot: () => open,
    getServerSnapshot: () => false,
    check(mobile: boolean) {
      if (!mobile) {update(false); return;}
      const now = deps.now();
      let storedAt: number | null = null;
      try {
        const raw = deps.storage().getItem(MOBILE_NOTICE_STORAGE_KEY);
        const parsed = raw !== null && /^\d+$/.test(raw) ? Number(raw) : NaN;
        if (Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= now) storedAt = parsed;
      } catch { /* Memory retains this visit's dismissal when storage is blocked. */ }
      const last = Math.max(dismissedAt ?? -Infinity, storedAt ?? -Infinity);
      update(now - last >= MOBILE_NOTICE_COOLDOWN);
    },
    dismiss() {
      if (!open) return;
      dismissedAt = deps.now();
      try {deps.storage().setItem(MOBILE_NOTICE_STORAGE_KEY, String(dismissedAt));} catch {}
      update(false);
    },
  };
}

import "server-only";

import type { CookieOptions } from "@supabase/ssr";
import { ADMIN_COOKIE_OPTIONS } from "./config";

type Cookie = { name: string; value: string };
type WriteCookie = (name: string, value: string, options: CookieOptions) => void;

/** Exact storage families only; never match the Web cookie or similar prefixes. */
export function isAdminCookie(name: string) {
  const base = ADMIN_COOKIE_OPTIONS.name;
  if (!name.startsWith(base)) return false;
  return /^(?:-(?:code-verifier|user))?(?:\.\d+)?$/.test(name.slice(base.length));
}

/** A fresh login starts with empty storage, retaining old names only for expiry.
 * SDK cookie writes stay in memory until audit succeeds. No shared request state.
 */
export function createAdminCookieBuffer(incoming: Cookie[], write: WriteCookie, fresh = false) {
  const { name: cookieName, ...cookieOptions } = ADMIN_COOKIE_OPTIONS;
  const owned = incoming.filter(({ name }) => isAdminCookie(name));
  const known = new Set([cookieName, ...owned.map(({ name }) => name)]);
  const current = new Map(fresh ? [] : owned.map(({ name, value }) => [name, value]));
  const pending = new Map<string, { value: string; options: CookieOptions }>();
  // Next spreads options after the positional name. Carrying the storage base
  // name here would expire the base repeatedly and leave every chunk alive.
  const expired = { ...cookieOptions, maxAge: 0, expires: new Date(0) };
  if (fresh) for (const { name } of owned) pending.set(name, { value: "", options: expired });

  return {
    getAll: () => Array.from(current, ([name, value]) => ({ name, value })),
    setAll(updates: (Cookie & { options: CookieOptions })[]) {
      for (const { name, value, options } of updates) {
        if (!isAdminCookie(name)) throw new Error("ADMIN_COOKIE_SCOPE_INVALID");
        known.add(name);
        if (options.maxAge === 0) current.delete(name); else current.set(name, value);
        pending.set(name, { value, options });
      }
    },
    commit() {
      for (const [name, { value, options }] of pending) write(name, value, options);
      pending.clear();
    },
    clear() {
      current.clear(); pending.clear();
      let failed = false;
      for (const name of known) {
        try { write(name, "", expired); } catch { failed = true; }
      }
      if (failed) throw new Error("ADMIN_COOKIE_CLEANUP_FAILED");
    },
  };
}

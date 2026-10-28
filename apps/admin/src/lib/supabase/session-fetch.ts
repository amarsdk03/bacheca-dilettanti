/** Bound each Auth/Data API request and avoid Next's shared fetch cache. */
export const sessionFetch: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(10000);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, cache: "no-store", signal });
};

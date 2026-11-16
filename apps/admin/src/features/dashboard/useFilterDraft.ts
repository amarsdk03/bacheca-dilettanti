"use client";

import {useState} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";

/** Only explicit submission commits the search text. Other controls use the
 * last committed search, while preserving text being edited across navigation. */
export function useFilterDraft<T extends {search?: string}>(query: T, normalize: (v: T) => T, href: (v: T) => string, refresh: () => void) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const key = JSON.stringify(query);
  const [state, setState] = useState({key, expected: null as string | null, draft: query, error: ""});
  let current = state;
  if (state.key !== key) {
    current = {key, expected: null, draft: state.expected === key ? {...query, search: state.draft.search} : query, error: ""};
    setState(current);
  }
  const commit = (value: T, preserveSearch: boolean) => {
    try {
      const next = normalize(value), target = href(next);
      setState({key, expected: preserveSearch ? JSON.stringify(next) : null, draft: preserveSearch ? {...next, search: current.draft.search} : next, error: ""});
      if (target === pathname + (params.size ? `?${params}` : "")) refresh();
      else router.push(target, {scroll: false});
    } catch {setState({...current, draft: preserveSearch ? {...value, search: current.draft.search} : value, error: "Controlla i filtri e l’intervallo delle date."});}
  };
  return {
    draft: current.draft, error: current.error,
    search: (search: string) => setState({...current, draft: {...current.draft, search}, error: ""}),
    filter: (patch: Partial<T>) => commit({...current.draft, ...patch, search: query.search, offset: 0}, true),
    submit: () => commit({...current.draft, offset: 0}, false),
    reset: (defaults: T) => commit(defaults, false),
  };
}

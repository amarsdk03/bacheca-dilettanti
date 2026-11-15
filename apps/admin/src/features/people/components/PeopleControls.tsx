"use client";
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {record} from "../../annunci/validation";
import type {CommunityFailure, CommunityResult} from "../../community/contracts";
import type {PeopleKind, PeopleQuery} from "../contracts";

export function usePeopleRead<T>(kind: PeopleKind, query: PeopleQuery, parse: (v: unknown) => T, selected?: {id: string; type?: string} | null) {
  const router = useRouter(), [revision, setRevision] = useState(0);
  const params = new URLSearchParams();
  if (selected) {if (selected.type) params.set("type", selected.type);} else for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "" && v !== "all") params.set(k, String(v));
  const href = `/api/${kind === "users" ? "utenti" : "profili"}${selected ? "/" + encodeURIComponent(selected.id) : ""}?${params}`, key = href + ":" + revision;
  const [state, setState] = useState<{key: string; result: CommunityResult<T>} | null>(null);
  const disabled = selected === null;
  useEffect(() => {const restore = (e: PageTransitionEvent) => {if (e.persisted) setRevision(v => v + 1);}; window.addEventListener("pageshow", restore); return () => window.removeEventListener("pageshow", restore);}, []);
  useEffect(() => {
    if (disabled) return;
    const abort = new AbortController();
    void (async () => {
      try {
        const response = await fetch(href, {cache: "no-store", credentials: "same-origin", signal: abort.signal, headers: {Accept: "application/json"}});
        if (abort.signal.aborted) return;
        if (response.status === 403) {router.replace("/accesso"); return;}
        const value: unknown = await response.json();
        if (!record(value) || typeof value.status !== "string" || ({ok: 200, invalid: 400, denied: 403, not_found: 404, conflict: 409, unavailable: 503} as Record<string, number>)[value.status] !== response.status) throw Error();
        const result: CommunityResult<T> = value.status === "ok" ? {status: "ok", data: parse(value.data)} : {status: value.status as CommunityFailure["status"], ...(typeof value.correlationId === "string" ? {correlationId: value.correlationId} : {})};
        if (!abort.signal.aborted) setState({key, result});
      } catch {if (!abort.signal.aborted) setState({key, result: {status: "unavailable"}});}
    })();
    return () => abort.abort();
  }, [href, key, disabled, parse, router]);
  return {pending: selected !== null && state?.key !== key, result: state?.key === key ? state.result : null, refresh: () => setRevision(v => v + 1)};
}
export function Fact({label, children}: {label: string; children: React.ReactNode}) {
  return <div className="admin-fact"><dt>{label}</dt><dd>{children ?? "—"}</dd></div>;
}

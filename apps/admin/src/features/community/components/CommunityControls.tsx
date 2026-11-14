"use client";
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowLeft, ArrowRight, Check, Copy, RefreshCw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Field, FieldLabel} from "@/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {record} from "@/features/annunci/validation";
import type {CommunityFailure, CommunityKind, CommunityQuery, CommunityResult} from "../contracts";

export const communityDate = (v: string | null) => v ? new Intl.DateTimeFormat("it-IT", {dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome"}).format(new Date(v)) : "—";
export function Choice({id, label, value, options, onChange, disabled}: {id: string; label: string; value: string; options: Record<string, string>; onChange(v: string): void; disabled?: boolean}) {
  const items = Object.entries(options).map(([value, label]) => ({value, label}));
  return <Field data-disabled={disabled}><FieldLabel htmlFor={id}>{label}</FieldLabel><Select disabled={disabled} items={items} value={value} onValueChange={v => {if (v) onChange(v);}}>
    <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{items.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
  </Select></Field>;
}
export function Failure({result, retry}: {result: CommunityFailure; retry(): void}) {
  const message = {invalid: "Controlla i filtri o i valori inseriti.", denied: "La sessione non è più autorizzata.", not_found: "L’elemento non è più disponibile.", conflict: "I dati sono cambiati. Ricarica il dettaglio prima di modificarli.", unavailable: "Operazione non verificabile. Ricarica i dati prima di riprovare. Se la sezione è appena stata attivata, verifica le migrazioni."}[result.status];
  return <Alert variant="warning"><AlertDescription><p>{message}</p>{result.correlationId && <p className="admin-note">Riferimento: {result.correlationId}</p>}<Button variant="outline" size="sm" onClick={retry}><RefreshCw data-icon="inline-start" aria-hidden="true" />Ricarica</Button></AlertDescription></Alert>;
}
export function Pagination({offset, more, busy, onChange}: {offset: number; more: boolean; busy?: boolean; onChange(offset: number): void}) {
  return <nav className="admin-pagination" aria-label="Paginazione"><p className="admin-note">Pagina {offset / 30 + 1}</p><div className="admin-action-list">
    <Button variant="outline" disabled={busy || offset === 0} onClick={() => onChange(Math.max(0, offset - 30))}><ArrowLeft data-icon="inline-start" aria-hidden="true" />Precedente</Button>
    <Button variant="outline" disabled={busy || !more || offset >= 999990} onClick={() => onChange(offset + 30)}>Successiva<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
  </div></nav>;
}
export function CopyCode({code}: {code: string}) {
  const [feedback, setFeedback] = useState("");
  return <div className="admin-code-copy"><code>{code}</code><Button size="icon-sm" variant="ghost" aria-label="Copia codice invito" onClick={async () => {
    try {await navigator.clipboard.writeText(code); setFeedback("Codice copiato");} catch {setFeedback("Copia non disponibile: seleziona il codice");}
  }}>{feedback === "Codice copiato" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</Button><span role="status" className="admin-note">{feedback}</span></div>;
}

/** Requests are cancelled and ignored on replacement; no data cache survives the page. */
export function useCommunityRead<T>(kind: CommunityKind, query: CommunityQuery, parse: (v: unknown) => T, id?: string | null) {
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
  const href = `/api/${kind === "reports" ? "segnalazioni" : "codici-invito"}${id ? "/" + encodeURIComponent(id) : ""}?${params}`;
  const key = href + ":" + revision;
  const [state, setState] = useState<{key: string; result: CommunityResult<T>} | null>(null);
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {if (event.persisted) setRevision(v => v + 1);};
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  useEffect(() => {
    if (id === null) return;
    const abort = new AbortController();
    void (async () => {
      try {
        const response = await fetch(href, {cache: "no-store", credentials: "same-origin", signal: abort.signal, headers: {Accept: "application/json"}});
        if (abort.signal.aborted) return;
        if (response.status === 403) {router.replace("/accesso"); return;}
        const value: unknown = await response.json();
        if (!record(value) || typeof value.status !== "string" || ({ok: 200, invalid: 400, denied: 403, not_found: 404, conflict: 409, unavailable: 503} as Record<string, number>)[value.status] !== response.status) throw new Error();
        const result: CommunityResult<T> = value.status === "ok" ? {status: "ok", data: parse(value.data)} : {status: value.status as CommunityFailure["status"], ...(typeof value.correlationId === "string" ? {correlationId: value.correlationId} : {})};
        if (!abort.signal.aborted) setState({key, result});
      } catch {if (!abort.signal.aborted) setState({key, result: {status: "unavailable"}});}
    })();
    return () => abort.abort();
  }, [href, key, id, parse, router]);
  return {pending: id !== null && state?.key !== key, result: state?.key === key ? state.result : null, refresh: () => setRevision(v => v + 1)};
}

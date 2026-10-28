"use client";

import type { ReactNode } from "react";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink } from "@/features/navigation/ExternalNavigation";
import type { AnnouncementDetail } from "../contracts";
import { DETAIL_FIELDS, type DetailFieldKind, type DetailFieldValue, type DetailType, type HistoryEntry, type PrizeEntry, type ScheduleEntry } from "../detail-fields";
import { displayDate, FIELD_LABELS, issueLabel, money, statusLabel, typeLabel, visibilityLabel } from "../presentation";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="flex min-w-0 flex-col gap-3"><h3 className="text-base font-semibold">{title}</h3>{children}</section>;
}
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-1"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap break-words">{children ?? "Non specificato"}</dd></div>;
}
export function DetailValue({ kind, value, field }: { kind: DetailFieldKind; value: DetailFieldValue; field: string }) {
  if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) return <>Non specificato</>;
  if (typeof value === "boolean") return <>{value ? "Sì" : "No"}</>;
  if (typeof value === "number") return <>{["compenso_mensile", "costo_partecipazione", "costo_partenza"].includes(field) ? money(value) : value}</>;
  if (typeof value === "string") return <>{value}</>;
  if (kind === "strings") return <>{(value as string[]).join(", ")}</>;
  if (kind === "history") return <ul className="flex flex-col gap-4">{(value as HistoryEntry[]).map((entry, index) => <li key={index} className="flex flex-col gap-1">
    <span className="font-medium">{entry.titolo || "Esperienza senza titolo"}</span>
    {entry.ente && <span>{entry.ente}</span>}
    <span className="text-sm text-muted-foreground">{entry.periodoDa ? "Dal " + entry.periodoDa : "Periodo non specificato"}{entry.periodoA ? entry.periodoA === "oggi" ? " ad oggi" : " al " + entry.periodoA : ""}</span>
    {entry.stato && entry.stato !== "non-specificare" && <span>{entry.stato === "in-corso" ? "In corso" : entry.stato === "conseguito" ? "Conseguito" : entry.stato}</span>}
    {entry.descrizione && <span>{entry.descrizione}</span>}
  </li>)}</ul>;
  if (kind === "prizes") return <ul className="flex flex-col gap-2">{(value as PrizeEntry[]).map((entry, index) => <li key={index}>{entry.posto && `${entry.posto} — `}{entry.titoloPremio || "Premio non specificato"}</li>)}</ul>;
  return <ul className="flex flex-col gap-2">{(value as ScheduleEntry[]).map((entry, index) => <li key={index}>
    <span className="capitalize">{entry.giorno || "Giorno non specificato"}</span>: {entry.attivo === null ? "Non specificato" : entry.attivo ? `${entry.dalle || "—"} – ${entry.alle || "—"}` : "Chiuso"}
  </li>)}</ul>;
}

export function AnnouncementDetailContent({ detail }: { detail: AnnouncementDetail }) {
  const { summary: row, metadata, content } = detail;
  const fields = content.type === "unsupported" ? null : DETAIL_FIELDS[content.type as DetailType];
  return <div className="flex min-w-0 flex-col gap-6">
    {row.trashed && <Alert><AlertTitle>Annuncio nel cestino</AlertTitle><AlertDescription>Conservato e non disponibile sul sito. Il ripristino manterrà l’oscuramento amministrativo.<dl className="mt-3 grid gap-3 sm:grid-cols-2"><Fact label="Spostato nel cestino il">{displayDate(detail.trash?.deletedAt ?? null)}</Fact><Fact label="Operatore">{detail.trash?.deletedBy ?? "Non disponibile"}</Fact></dl></AlertDescription></Alert>}
    {!detail.complete && <Alert><AlertTitle>Alcune informazioni non sono disponibili</AlertTitle><AlertDescription><ul className="flex flex-col gap-1">{[...new Set(detail.issues.map(issueLabel))].map((issue) => <li key={issue}>{issue}</li>)}</ul></AlertDescription></Alert>}
    <Section title="Riepilogo e stato"><div className="flex flex-wrap gap-2"><Badge variant="secondary">{statusLabel(row.status)}</Badge>{visibilityLabel(row).map((label) => <Badge variant="outline" key={label}>{label}</Badge>)}</div>
      <dl className="grid gap-4 sm:grid-cols-2"><Fact label="Tipologia">{typeLabel(row.type)}</Fact><Fact label="Creazione (Europe/Rome)">{displayDate(row.createdAt)}</Fact><Fact label="Ultima modifica (Europe/Rome)">{displayDate(row.updatedAt)}</Fact><Fact label="ID annuncio"><span className="break-all">{row.id}</span></Fact></dl>
    </Section><Separator />
    <Section title="Autore"><dl className="grid gap-4 sm:grid-cols-2"><Fact label="Nome pubblico">{row.author.displayName}</Fact><Fact label="ID profilo"><span className="break-all">{row.author.profileId ?? "Non specificato"}</span></Fact><Fact label="ID utente"><span className="break-all">{row.author.userId ?? "Non specificato"}</span></Fact></dl></Section><Separator />
    <Section title="Contenuto">{fields ? <dl className="flex flex-col gap-5">{Object.entries(fields).map(([key, kind]) => <Fact key={key} label={FIELD_LABELS[key]}><DetailValue field={key} kind={kind} value={(content.fields as Record<string, DetailFieldValue>)[key]} /></Fact>)}</dl> : <p className="text-muted-foreground">Dettaglio non supportato per questa tipologia.</p>}</Section><Separator />
    <Section title="Località">{detail.locations.length ? <ul className="flex flex-col gap-2">{detail.locations.map((location) => <li key={location.id}>{[location.city, location.region].filter(Boolean).join(", ")}</li>)}</ul> : <p className="text-muted-foreground">Nessuna località indicata.</p>}</Section><Separator />
    <Section title="Contatti dell’annuncio">{detail.contacts.length ? <ul className="flex flex-col gap-4">{detail.contacts.map((contact) => <li key={contact.id} className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{contact.kind === "email" ? "Email" : contact.kind === "phone" ? "Telefono" : "Recapito"}{!contact.valid && " — formato non valido"}</span><span className="break-all">{contact.value}</span>{contact.referent && <span>{contact.referent}</span>}
    </li>)}</ul> : <p className="text-muted-foreground">Nessun recapito indicato nell’annuncio.</p>}</Section><Separator />
    <Section title="Collegamenti e media">{detail.links.length + detail.media.length ? <ul className="flex flex-col gap-4">{[...detail.links.map((link) => ({ ...link, key: "link:" + link.id, label: link.platform || "Collegamento" })), ...detail.media.map((media) => ({ ...media, key: "media:" + media.id, label: media.mimeType ? "Media · " + media.mimeType : "Media" }))].map((item) => <li key={item.key} className="flex min-w-0 flex-col gap-1">
      <span className="text-sm text-muted-foreground">{item.label}</span>{item.url ? <ExternalLink href={item.url} className="inline-flex items-start gap-2 break-all underline underline-offset-4"><ExternalLinkIcon className="size-4 shrink-0" aria-hidden="true" /><span>{item.value}</span></ExternalLink> : <><span className="break-all">{item.value}</span><span className="text-sm text-muted-foreground">Collegamento non apribile</span></>}
    </li>)}</ul> : <p className="text-muted-foreground">Nessun collegamento o media indicato.</p>}</Section><Separator />
    <Section title="Metadati amministrativi"><dl className="grid gap-4 sm:grid-cols-2"><Fact label="Informazioni di moderazione">{metadata.moderationInfo}</Fact><Fact label="Livello">{metadata.level}</Fact><Fact label="Priorità">{metadata.priorityActive ? "Attiva" : "Non attiva"}</Fact><Fact label="Inizio priorità">{displayDate(metadata.priorityStartsAt)}</Fact><Fact label="Fine priorità">{displayDate(metadata.priorityEndsAt)}</Fact><Fact label="Ultima modifica di"><span className="break-all">{metadata.updatedById ?? "Non specificato"}</span></Fact></dl></Section>
  </div>;
}

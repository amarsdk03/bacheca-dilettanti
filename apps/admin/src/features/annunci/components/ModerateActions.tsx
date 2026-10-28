"use client";

import { Check, X, EyeOff, Eye, Trash2, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnnouncementDetail } from "../contracts";
import { capability, moderationReason, MODERATION_LABELS, type ModerationOperation } from "../moderation";

const icons = { approve: Check, reject: X, hide: EyeOff, show: Eye, trash: Trash2, restore: ArchiveRestore };
export function ModerateActions({ detail, disabled, onChoose }: { detail: AnnouncementDetail; disabled?: boolean; onChoose(operation: ModerationOperation, trigger: HTMLElement): void }) {
  return <section aria-label="Moderazione annuncio" className="flex flex-col gap-3">{(detail.summary.trashed ? ["restore"] as ModerationOperation[] : ["approve", "reject", detail.summary.hidden === true ? "show" : "hide", "trash"] as ModerationOperation[]).map((operation) => {
    const cap = capability(detail, operation), Icon = icons[operation];
    return <div key={operation} className="flex flex-col gap-1"><Button className="self-start" size="sm" variant={(operation === "reject" || operation === "trash") ? "destructive" : "outline"} disabled={disabled || !cap.allowed} onClick={(event) => onChoose(operation, event.currentTarget)}><Icon data-icon="inline-start" aria-hidden="true" />{MODERATION_LABELS[operation]}</Button>{!cap.allowed && <p className="text-sm text-muted-foreground">{moderationReason(cap.reason)}</p>}</div>;
  })}</section>;
}

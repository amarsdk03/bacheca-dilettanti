"use client";

import { Check, X, EyeOff, Eye, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnnouncementDetail } from "../contracts";
import { capability, moderationReason, MODERATION_LABELS, type ModerationOperation } from "../moderation";

export const moderationIcons = { approve: Check, reject: X, hide: EyeOff, show: Eye, trash: Trash2, restore: Undo2 };
export function ModerateActions({ detail, disabled, onChoose }: { detail: AnnouncementDetail; disabled?: boolean; onChoose(operation: ModerationOperation, trigger: HTMLElement): void }) {
  return <section aria-label="Moderazione annuncio" className="admin-moderation-actions">{(detail.summary.trashed ? ["restore"] as ModerationOperation[] : ["approve", "reject", detail.summary.hidden === true ? "show" : "hide", "trash"] as ModerationOperation[]).map((operation) => {
    const cap = capability(detail, operation), Icon = moderationIcons[operation];
    return <div key={operation} className="admin-moderation-action"><Button size="sm" variant={(operation === "reject" || operation === "trash") ? "outline-danger" : operation === "approve" ? "default" : "secondary"} disabled={disabled || !cap.allowed} onClick={(event) => onChoose(operation, event.currentTarget)}><Icon data-icon="inline-start" aria-hidden="true" />{MODERATION_LABELS[operation]}</Button>{!cap.allowed && <p className="admin-note">{moderationReason(cap.reason)}</p>}</div>;
  })}</section>;
}

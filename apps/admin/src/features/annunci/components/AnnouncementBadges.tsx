import {Check, Clock3, Trash2, X} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import type {AnnouncementListItem} from "../contracts";
import {statusLabel, visibilityLabel} from "../presentation";

export function AnnouncementStatusBadge({ status }: { status: string | null }) {
  const appearance = status === "pubblicato" ? { variant: "success", Icon: Check } as const :
    status === "in_revisione" ? { variant: "warning", Icon: Clock3 } as const :
    status === "rifiutato" ? { variant: "danger", Icon: X } as const : { variant: "neutral", Icon: null } as const;
  return <Badge variant={appearance.variant}>{appearance.Icon && <appearance.Icon aria-hidden="true" />}{statusLabel(status)}</Badge>;
}

export function AnnouncementVisibilityBadges({ row }: { row: Pick<AnnouncementListItem, "hidden" | "private"> }) {
  return <AnnouncementVisibilityBadge row={row} />;
}

export function AnnouncementVisibilityBadge({row}: {row: Pick<AnnouncementListItem, "hidden" | "private">}) {
  return <Badge variant={row.hidden === true ? "warning" : "neutral"}>{visibilityLabel(row).join(" · ")}</Badge>;
}

export function AnnouncementTrashBadge() {
  return <Badge variant="neutral"><Trash2 aria-hidden="true" />Nel cestino</Badge>;
}

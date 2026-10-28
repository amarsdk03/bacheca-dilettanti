import { Clock3 } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import type { ReactNode } from "react";

export function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <Empty><EmptyHeader><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>
    {children && <EmptyContent>{children}</EmptyContent>}
  </Empty>;
}

export function ComingSoon() {
  return <Empty className="min-h-64 border">
    <EmptyHeader>
      <EmptyMedia variant="icon"><Clock3 aria-hidden="true" /></EmptyMedia>
      <EmptyTitle>Presto in arrivo…</EmptyTitle>
      <EmptyDescription>Tranquillo Gabbo, ti prometto che questa sezione arriverà molto presto</EmptyDescription>
    </EmptyHeader>
  </Empty>;
}

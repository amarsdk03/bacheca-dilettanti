import { Clock3 } from "lucide-react";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

export function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <Empty className="admin-empty-state"><EmptyHeader><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>
    {children && <EmptyContent>{children}</EmptyContent>}
  </Empty>;
}

export function ComingSoon() {
  return <Card className="admin-coming-soon"><CardContent><Empty>
    <EmptyHeader>
      <EmptyMedia><Clock3 aria-hidden="true" /></EmptyMedia>
      <EmptyTitle>Presto in arrivo…</EmptyTitle>
      <EmptyDescription>Tranquillo Gabbo, ti prometto che questa sezione arriverà presto...</EmptyDescription>
    </EmptyHeader>
  </Empty></CardContent></Card>;
}

import {Clock3} from "lucide-react";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import {Card, CardContent} from "@/components/ui/card";
import type {ReactNode} from "react";

export function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <Empty className="admin-empty-state"><EmptyHeader><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>
    {children && <EmptyContent>{children}</EmptyContent>}
  </Empty>;
}

export function ComingSoon() {
  return <Card className="admin-coming-soon"><CardContent><Empty>
    <EmptyHeader>
      <EmptyMedia><Clock3 aria-hidden="true" /></EmptyMedia>
      <EmptyTitle>Sezione non ancora disponibile</EmptyTitle>
      <EmptyDescription>Questa sezione della dashboard è in preparazione</EmptyDescription>
    </EmptyHeader>
  </Empty></CardContent></Card>;
}

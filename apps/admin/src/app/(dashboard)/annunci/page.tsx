import { redirect } from "next/navigation";
import { requireAdminPageContext } from "@/features/dashboard/server/guard";
import { findDashboardSection } from "@/features/dashboard/sections";
import { SectionHeading } from "@/features/dashboard/components/SectionHeading";
import { AnnunciWorkspace } from "@/features/annunci/components/AnnunciWorkspace";
import { listAdminAnnouncements } from "@/features/annunci/server/queries";
import { annunciSearchParams, parseAnnunciUrl } from "@/features/annunci/url-state";
import type { AnnouncementListResult } from "@/features/annunci/contracts";

export default async function AnnunciPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPageContext();
  const query = parseAnnunciUrl(annunciSearchParams(await searchParams));
  const result: AnnouncementListResult = query.valid ? await listAdminAnnouncements({ ...query.filters, cursor: query.cursor, limit: 30 }) : { status: "invalid", code: "INVALID_QUERY" };
  if (result.status === "denied") redirect("/accesso");
  return <section className="admin-page"><SectionHeading section={findDashboardSection("annunci")!} /><AnnunciWorkspace key={query.key} initialQuery={query} initialResult={result} /></section>;
}

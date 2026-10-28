import { redirect } from "next/navigation";
import { requireAdminPageContext } from "@/features/dashboard/server/guard";
import { findDashboardSection } from "@/features/dashboard/sections";
import { SectionHeading } from "@/features/dashboard/components/SectionHeading";
import { AuditWorkspace } from "@/features/audit/components/AuditWorkspace";
import { listAdminAuditEvents } from "@/features/audit/server/read-queries";
import { auditSearchParams, parseAuditUrl } from "@/features/audit/read-url";
import type { AuditListResult } from "@/features/audit/read-contracts";
export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPageContext();
  const query = parseAuditUrl(auditSearchParams(await searchParams));
  const result: AuditListResult = query.valid ? await listAdminAuditEvents({ ...query.filters, cursor: query.cursor, limit: 30 }) : { status: "invalid", code: "INVALID_QUERY" };
  if (result.status === "denied") redirect("/accesso");
  return <section className="admin-page"><SectionHeading section={findDashboardSection("registro-attivita")!} /><AuditWorkspace key={query.key} initialQuery={query} initialResult={result} /></section>;
}

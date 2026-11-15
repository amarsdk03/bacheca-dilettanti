import {requireAdminPageContext} from "@/features/dashboard/server/guard";
import {SectionHeading} from "@/features/dashboard/components/SectionHeading";
import {findDashboardSection} from "@/features/dashboard/sections";
import {ReportsWorkspace} from "@/features/community/components/ReportsWorkspace";
import {parseReportsUrl} from "@/features/community/reports-url";
export default async function ReportsPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  await requireAdminPageContext();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, item);
  }
  const parsed = parseReportsUrl(params);
  return <section className="admin-page"><SectionHeading section={findDashboardSection("segnalazioni")!} /><ReportsWorkspace key={params.toString()} initialUrl={parsed} /></section>;
}

import {requireAdminPageContext} from "@/features/dashboard/server/guard";
import {SectionHeading} from "@/features/dashboard/components/SectionHeading";
import {findDashboardSection} from "@/features/dashboard/sections";
import {ReportsWorkspace} from "@/features/community/components/ReportsWorkspace";
export default async function ReportsPage() {
  await requireAdminPageContext();
  return <section className="admin-page"><SectionHeading section={findDashboardSection("segnalazioni")!} /><ReportsWorkspace /></section>;
}

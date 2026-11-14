import {requireAdminPageContext} from "@/features/dashboard/server/guard";
import {SectionHeading} from "@/features/dashboard/components/SectionHeading";
import {findDashboardSection} from "@/features/dashboard/sections";
import {InvitationCodesWorkspace} from "@/features/community/components/InvitationCodesWorkspace";
export default async function InvitationCodesPage() {
  await requireAdminPageContext();
  return <section className="admin-page"><SectionHeading section={findDashboardSection("codici-invito")!} /><InvitationCodesWorkspace /></section>;
}

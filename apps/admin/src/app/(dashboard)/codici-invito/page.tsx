import {requireAdminPageContext} from "@/features/dashboard/server/guard";
import {SectionHeading} from "@/features/dashboard/components/SectionHeading";
import {findDashboardSection} from "@/features/dashboard/sections";
import {InvitationCodesWorkspace} from "@/features/community/components/InvitationCodesWorkspace";
import {parseInvitationsUrl} from "@/features/community/reports-url";

export default async function InvitationCodesPage({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const params = new URLSearchParams();
  for (const [k, value] of Object.entries(await searchParams)) for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(k, v);
  await requireAdminPageContext();
  return <section className="admin-page"><SectionHeading section={findDashboardSection("codici-invito")!} /><InvitationCodesWorkspace initialUrl={parseInvitationsUrl(params)} /></section>;
}

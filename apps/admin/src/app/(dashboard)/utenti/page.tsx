import {requireAdminPageContext} from "@/features/dashboard/server/guard";
import {SectionHeading} from "@/features/dashboard/components/SectionHeading";
import {findDashboardSection} from "@/features/dashboard/sections";
import {UsersWorkspace} from "@/features/people/components/UsersWorkspace";
import {parsePeopleUrl} from "@/features/people/contracts";
export default async function Page({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  await requireAdminPageContext();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, v);
  return <section className="admin-page"><SectionHeading section={findDashboardSection("utenti")!} /><UsersWorkspace key={params.toString()} initialUrl={parsePeopleUrl("users", params)} /></section>;
}

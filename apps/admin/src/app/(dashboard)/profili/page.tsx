import {requireAdminPageContext} from "@/features/dashboard/server/guard";
import {SectionHeading} from "@/features/dashboard/components/SectionHeading";
import {findDashboardSection} from "@/features/dashboard/sections";
import {ProfilesWorkspace} from "@/features/people/components/ProfilesWorkspace";
import {parsePeopleUrl} from "@/features/people/contracts";
import {Plus} from "lucide-react";
import {Button} from "@/components/ui/button";

export default async function Page({searchParams}: {searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  await requireAdminPageContext();
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, v);
  return <section className="admin-page"><SectionHeading section={findDashboardSection("profili")!} actions={<Button size="sm" disabled><Plus data-icon="inline-start" aria-hidden="true" />Crea profilo</Button>} /><ProfilesWorkspace initialUrl={parsePeopleUrl("profiles", params)} /></section>;
}

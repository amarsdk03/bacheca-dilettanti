import {requireAdminPageContext} from "@/features/dashboard/server/guard";
import {SectionHeading} from "@/features/dashboard/components/SectionHeading";
import {findDashboardSection} from "@/features/dashboard/sections";
import {DistributionWorkspace} from "@/features/distribution/components/DistributionWorkspace";
import {parseUrl} from "@/features/distribution/contracts";

export default async function DistributionPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  await requireAdminPageContext();const params=new URLSearchParams();for(const[k,value]of Object.entries(await searchParams))for(const v of Array.isArray(value)?value:value===undefined?[]:[value])params.append(k,v);
  return <section className="admin-page"><SectionHeading section={findDashboardSection("distribuzione")!}/><DistributionWorkspace initialUrl={parseUrl(params)}/></section>;
}

import {parseUrl} from "@/features/distribution/contracts";
import {distributionService} from "@/features/distribution/server";

export async function GET(request:Request){const parsed=parseUrl(new URL(request.url).searchParams);const result=parsed.valid?await distributionService().list(parsed.query):{status:"invalid" as const};return Response.json(result,{status:{ok:200,invalid:400,denied:403,not_found:404,not_allowed:409,conflict:409,unavailable:503,source_exists:409,confirmation_required:409}[result.status],headers:{"Cache-Control":"private, no-store, max-age=0",Vary:"Cookie"}});}

import {communityHttp} from "@/features/community/server/http";
export async function GET(request: Request, context: {params: Promise<{id: string}>}) {return communityHttp("reports", request, (await context.params).id);}

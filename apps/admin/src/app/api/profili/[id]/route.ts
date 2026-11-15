import {peopleHttp} from "@/features/people/server/http";
export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {return peopleHttp("profiles", request, (await params).id);}

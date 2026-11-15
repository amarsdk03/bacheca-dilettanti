import {peopleHttp} from "@/features/people/server/http";
export async function GET(request: Request) {return peopleHttp("profiles", request);}

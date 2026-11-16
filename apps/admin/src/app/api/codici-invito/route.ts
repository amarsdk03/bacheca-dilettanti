import {communityHttp} from "@/features/community/server/http";

export async function GET(request: Request) {return communityHttp("invitations", request);}

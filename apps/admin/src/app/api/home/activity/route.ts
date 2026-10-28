import { homeHttp } from "@/features/home/server/http";
export async function GET(request: Request) { return homeHttp().activity(request); }

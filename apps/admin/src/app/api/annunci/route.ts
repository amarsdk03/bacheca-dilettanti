import { announcementHttp } from "@/features/annunci/server/http";

export async function GET(request: Request) { return announcementHttp().list(request); }

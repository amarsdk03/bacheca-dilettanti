import { announcementHttp } from "@/features/annunci/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return announcementHttp().detail((await params).id);
}

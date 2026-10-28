import { announcementExportHttp } from "@/features/annunci/server/export-http";

export async function POST(request: Request) { return announcementExportHttp()(request); }

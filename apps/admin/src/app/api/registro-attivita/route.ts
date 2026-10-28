import { auditHttp } from "@/features/audit/server/read-http";
export async function GET(request: Request) { return auditHttp().list(request); }

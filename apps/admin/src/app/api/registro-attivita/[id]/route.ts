import { auditHttp } from "@/features/audit/server/read-http";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { return auditHttp().detail((await params).id); }

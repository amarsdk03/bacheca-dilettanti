import {NextRequest, NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {searchPublicTournamentProfiles} from "@/features/profilo/server/public-team-profiles";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
	const headers = {"Cache-Control": "no-store"};
	try {
		return NextResponse.json({items: await searchPublicTournamentProfiles(createAdminClient(), request.nextUrl.searchParams.get("q") ?? "")}, {headers});
	} catch {
		return NextResponse.json({items: []}, {status: 503, headers});
	}
}

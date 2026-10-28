import {type NextRequest, NextResponse} from "next/server";

import {createAdminClient} from "@/lib/supabase/admin";
import {loadPublicTeamProfiles, searchPublicTeamProfiles,} from "@/features/profilo/server/public-team-profiles";
import {
	normalizeTeamSearchQuery,
	TEAM_PROFILE_RESOLVE_LIMIT,
	TEAM_PROFILE_SEARCH_MIN_LENGTH,
	UUID_PATTERN,
} from "@/features/profilo/team-profile";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
	const ids = [...new Set((request.nextUrl.searchParams.get("ids") ?? "")
		.split(",")
		.map((id) => id.trim().toLocaleLowerCase("en-US"))
		.filter((id) => UUID_PATTERN.test(id)))]
		.slice(0, TEAM_PROFILE_RESOLVE_LIMIT);
	const query = normalizeTeamSearchQuery(request.nextUrl.searchParams.get("q") ?? "");

	if (ids.length === 0 && query.length < TEAM_PROFILE_SEARCH_MIN_LENGTH) {
		return NextResponse.json({items: []}, {headers: {"Cache-Control": "no-store"}});
	}

	try {
		const admin = createAdminClient();
		const items = ids.length > 0
			? await loadPublicTeamProfiles(admin, ids)
			: await searchPublicTeamProfiles(admin, query);
		return NextResponse.json({items}, {headers: {"Cache-Control": "no-store"}});
	} catch (error) {
		console.error("[team-profile-search] Public team lookup failed", {
			cause: error instanceof Error ? error.name : "unknown",
		});
		return NextResponse.json({items: []}, {status: 500, headers: {"Cache-Control": "no-store"}});
	}
}

import {type NextRequest, NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createPublicProfileLookupClient} from "@/lib/supabase/public-profile-lookup";
import {verifyAdminContext} from "@/features/auth/server/context";
import {searchPublicTournamentProfiles} from "@bacheca/announcements/features/profilo/server/public-team-profiles";

export const dynamic = "force-dynamic";
export async function GET(request:NextRequest) {
  const headers={"Cache-Control":"private, no-store"};
  try {
  const client=await createClient(),context=await verifyAdminContext(async()=>client);
  if(context.status!=="admin")return NextResponse.json({items:[]},{status:context.status==="unavailable"?503:403,headers});
  return NextResponse.json({items:await searchPublicTournamentProfiles(createPublicProfileLookupClient(),request.nextUrl.searchParams.get("q")??"")},{headers});}
  catch {return NextResponse.json({items:[]},{status:503,headers});}
}

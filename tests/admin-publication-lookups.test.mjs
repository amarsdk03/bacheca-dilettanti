import assert from "node:assert/strict";
import {test} from "node:test";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";

for (const kind of ["squadre", "tornei"]) {
  function route(status, fail = false) {
    const calls = [], client = {}, lookupClient = {};
    const lookup = async (sessionClient, query) => {
      calls.push(["lookup", sessionClient === lookupClient, query]);
      if (fail) throw new Error("local fixture error");
      return [{profileId:"profile-fixture",name:"Società sintetica"}];
    };
    const load = adminServerLoader({dependencies:{
      "next/server":{NextResponse:{json:(body,options)=>({body,...options})}},
      "@/lib/supabase/server":{createClient:async()=>client},
      "@/lib/supabase/public-profile-lookup":{createPublicProfileLookupClient:()=>{calls.push(["lookup-client"]);return lookupClient;}},
      "@/features/auth/server/context":{verifyAdminContext:async()=>{calls.push(["guard"]);return {status};}},
      "@bacheca/announcements/features/profilo/server/public-team-profiles":{searchPublicTeamProfiles:lookup,searchPublicTournamentProfiles:lookup},
    }});
    return {GET:load("apps/admin/src/app/api/profili/"+kind+"/route.ts").GET,calls};
  }
  test(kind+" lookup verifies Admin before returning public choices",async()=>{
    const {GET,calls}=route("admin"),response=await GET({nextUrl:new URL("http://127.0.0.1/api/profili/"+kind+"?q=Fixture")});
    assert.deepEqual(calls,[["guard"],["lookup-client"],["lookup",true,"Fixture"]]);
    assert.equal(response.body.items[0].name,"Società sintetica");
    assert.match(response.headers["Cache-Control"],/private, no-store/);
  });
  for(const status of ["anonymous","denied","unavailable"])test(kind+" lookup denies "+status+" without a data query",async()=>{
    const {GET,calls}=route(status),response=await GET({nextUrl:new URL("http://127.0.0.1/api/profili/"+kind+"?q=Fixture")});
    assert.equal(response.status,status==="unavailable"?503:403);assert.deepEqual(calls,[["guard"]]);assert.deepEqual(response.body.items,[]);
  });
  test(kind+" lookup failure returns a bounded unavailable response",async()=>{
    const {GET}=route("admin",true),response=await GET({nextUrl:new URL("http://127.0.0.1/api/profili/"+kind+"?q=Fixture")});
    assert.equal(response.status,503);assert.deepEqual(response.body,{items:[]});
  });
}

import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@bacheca/database";
import type {ProfileType} from "../profile-model.ts";
import {stateForProfile, type ProfileState} from "../profile-state.ts";
export async function loadProfileStates(client: SupabaseClient<Database>, ids: readonly string[]) {
  const unique = [...new Set(ids)], result = new Map<string, ProfileState[]>();
  for (let start = 0; start < unique.length; start += 100) {
    const {data, error} = await client.from("profile_type_state").select("profile_id,profile_type,verified_at,admin_hidden").in("profile_id", unique.slice(start, start + 100));
    if (error) throw Error("PROFILE_STATES_UNAVAILABLE");
    for (const row of data ?? []) {const rows = result.get(row.profile_id) ?? []; rows.push(row); result.set(row.profile_id, rows);}
  }
  return result;
}
export async function isProfileHeld(client: SupabaseClient<Database>, id: string, type: ProfileType) {
  const states = await loadProfileStates(client, [id]);
  return stateForProfile(states.get(id), type).hidden;
}

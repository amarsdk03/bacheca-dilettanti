import type {ProfileType} from "./profile-model.ts";
export type ProfileState = {profile_type: string; verified_at: string | null; admin_hidden: boolean};
export function stateForProfile(states: readonly ProfileState[] | null | undefined, type: ProfileType) {
  const state = states?.find(s => s.profile_type === type);
  // A missing state is unavailable, never a reason to reuse the legacy badge.
  return {verified: Boolean(state?.verified_at), hidden: state?.admin_hidden !== false};
}

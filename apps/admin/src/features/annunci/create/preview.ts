import {buildRegionalPublishPreviews} from "@bacheca/announcements/features/pubblica-annuncio/announcement-preview";
import {createProfileDrafts} from "@bacheca/announcements/features/profilo/profile-model";
import {canonicalProfile, creationPayload, locations} from "./domain";
import type {AuthorProfile, CreationInput} from "./contracts";

export function buildCreationPreviews(input: CreationInput, profile?: AuthorProfile, imageUrl: string | null = null, imageName: string | null = null) {
  const drafts = createProfileDrafts();
  drafts[input.profileType] = {...drafts[input.profileType], ...(profile?.draft ?? canonicalProfile(input.profileType, input.profile))} as never;
  const previews = buildRegionalPublishPreviews(creationPayload(input), drafts, imageUrl, imageName, profile?.locations ?? locations(input.profile));
  if (input.approveImmediately) for (const item of previews) item.preview.status = "Pubblicato dopo l’invio";
  return previews;
}

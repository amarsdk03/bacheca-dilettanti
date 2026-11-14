import {createProfileDrafts, createProfileLocations, type ProfileDrafts, type ProfileLocations} from "@bacheca/announcements/features/profilo/profile-model";
import {createProfileSocialLinks, type ProfileSocialLinksByType} from "@bacheca/announcements/features/profilo/profile-social-links";
import {createAnnouncementDetailsDrafts, type AnnouncementDetailsDrafts, type AnnouncementContacts, type AnnouncementExtras} from "@bacheca/announcements/features/pubblica-annuncio/publish-model";
import type {ProfileLocationDraft} from "@bacheca/announcements/features/profilo/profile-model";
import type {CreationInput} from "./contracts";
import {textValue} from "./prototype-model";
import {canonicalAnnouncement, canonicalProfile, locations, rows} from "./domain";

/** The same state and controls as Web. Legacy values are read only during migration/import. */
export interface CanonicalDraft {
  profiles: ProfileDrafts;
  profileLocations: ProfileLocations;
  socialLinks: ProfileSocialLinksByType;
  details: AnnouncementDetailsDrafts;
  locations: ProfileLocationDraft[];
  contacts: AnnouncementContacts;
  extras: AnnouncementExtras;
  title: string;
}
export function migrateCanonicalDraft(input: Pick<CreationInput, "profileType" | "teamType" | "profile" | "announcement">): CanonicalDraft {
  const profiles = createProfileDrafts(), profileLocations = createProfileLocations(), socialLinks = createProfileSocialLinks();
  const type = input.profileType;
  profiles[type] = canonicalProfile(type, input.profile) as never;
  // A known year must survive even when the original message has no complete date.
  if (["giocatore", "staff-sportivo", "arbitro"].includes(type) && textValue(input.profile,"birthYear")) {
    Object.assign(profiles[type], {anno_nascita: textValue(input.profile,"birthYear")});
  }
  profileLocations[type] = locations(input.profile);
  const platforms = {"Sito web":"website", Instagram:"instagram", Facebook:"facebook", YouTube:"youtube", LinkedIn:"linkedin"} as const;
  for (const row of rows(input.profile,"social")) {
    const platform = platforms[textValue(row,"platform") as keyof typeof platforms];
    if (platform) socialLinks[type][platform] = textValue(row,"url");
  }
  return {profiles, profileLocations, socialLinks, details: canonicalAnnouncement(type,input.teamType,input.announcement).drafts,
    locations: locations(input.announcement), title: textValue(input.announcement,"title"),
    contacts: {email:textValue(input.announcement,"publicEmail"),phone:textValue(input.announcement,"publicPhone"),contactRole:textValue(input.announcement,"contactRole")},
    extras: {genericLink:textValue(input.announcement,"link")}};
}
export {createAnnouncementDetailsDrafts};

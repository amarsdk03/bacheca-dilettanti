import type {ProfileLocationDraft} from "@bacheca/announcements/features/profilo/profile-model";
import {
	createProfileDrafts,
	createProfileLocations,
	type ProfileDrafts,
	type ProfileLocations
} from "@bacheca/announcements/features/profilo/profile-model";
import {
	createProfileSocialLinks,
	type ProfileSocialLinksByType
} from "@bacheca/announcements/features/profilo/profile-social-links";
import {
	type AnnouncementContacts,
	type AnnouncementDetailsDrafts,
	type AnnouncementExtras,
	createAnnouncementDetailsDrafts
} from "@bacheca/announcements/features/pubblica-annuncio/publish-model";
import type {CreationInput} from "./contracts";
import {textValue} from "./prototype-model";
import {canonicalAnnouncement, canonicalProfile, locations, rows} from "./domain";
import {withBirthYearDefaults} from "./date-defaults";
import type {AutomaticContacts} from "./contact-defaults";

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
  automaticContacts?: AutomaticContacts;
}
export function migrateCanonicalDraft(input: Pick<CreationInput, "profileType" | "teamType" | "profile" | "announcement">): CanonicalDraft {
  const profiles = createProfileDrafts(), profileLocations = createProfileLocations(), socialLinks = createProfileSocialLinks();
  const type = input.profileType;
  profiles[type] = canonicalProfile(type, input.profile) as never;
  // Admin convention: missing day/month default to January 1 for year-only sources.
  if (["giocatore", "staff-sportivo", "arbitro"].includes(type) && textValue(input.profile,"birthYear")) {
    profiles[type] = withBirthYearDefaults(profiles[type], "anno_nascita", textValue(input.profile,"birthYear")) as never;
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

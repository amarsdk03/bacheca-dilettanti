import type {AnnouncementContacts} from "@bacheca/announcements/features/pubblica-annuncio/publish-model";

export const EDITORIAL_CONTACTS = {email: "info@bachecadilettanti.it", phone: "3445325588"} as const;
export type AutomaticContacts = {email?: boolean; phone?: boolean};

/** Only generated values are removed when an actual contact becomes available. */
export function adminContacts(contacts: AnnouncementContacts, automatic: AutomaticContacts = {}, enabled = true, needsSelection = false) {
  const next = {...contacts};
  const generated: AutomaticContacts = {};
  for (const key of ["email", "phone"] as const) {
    if (automatic[key] && next[key] === EDITORIAL_CONTACTS[key]) generated[key] = true;
  }
  const hasRealContact = (["email", "phone"] as const).some(key => next[key].trim() && !generated[key]);
  if (!enabled || needsSelection || hasRealContact) {
    for (const key of ["email", "phone"] as const) if (generated[key]) next[key] = "";
    return {contacts: next, automaticContacts: {}};
  }
  if (!next.email.trim() && !next.phone.trim() || Object.keys(generated).length) {
    return {contacts: {...next, ...EDITORIAL_CONTACTS}, automaticContacts: {email: true, phone: true}};
  }
  return {contacts: next, automaticContacts: {}};
}

export function editedContacts(previous: AnnouncementContacts, next: AnnouncementContacts, automatic: AutomaticContacts = {}) {
  return Object.fromEntries(Object.entries(automatic).filter(([key]) => previous[key as keyof AnnouncementContacts] === next[key as keyof AnnouncementContacts])) as AutomaticContacts;
}

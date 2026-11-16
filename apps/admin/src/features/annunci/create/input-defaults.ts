import type {CreationInput} from "./contracts";
import {adminContacts} from "./contact-defaults";
import {needsContactSelection, parseWhatsAppMessage} from "./whatsapp-parser";

/** Shared by the Admin editor, preview and server. Never changes public-site rules. */
export function prepareCreationInput(input: CreationInput): CreationInput {
  const source=input.provenance;
  const extraction=source?parseWhatsAppMessage(source.rawText,source.messageUrl,source.manualTarget,source.context):undefined;
  const enabled=input.authorMode === "unregistered", selection=needsContactSelection(extraction);
  if(input.canonical){
    const c=input.canonical;
    return {...input,canonical:{...c,...adminContacts(c.contacts,c.automaticContacts,enabled,selection)}};
  }
  const result=adminContacts({email:String(input.announcement.publicEmail??""),phone:String(input.announcement.publicPhone??""),contactRole:String(input.announcement.contactRole??"")},{},enabled,selection);
  return {...input,announcement:{...input.announcement,publicEmail:result.contacts.email,publicPhone:result.contacts.phone}};
}

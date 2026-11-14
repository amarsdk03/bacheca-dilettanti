import {createProfileDrafts, createProfileLocations} from "@bacheca/announcements/features/profilo/profile-model";
import {createProfileSocialLinks} from "@bacheca/announcements/features/profilo/profile-social-links";
import {createAnnouncementDetailsDrafts} from "@bacheca/announcements/features/pubblica-annuncio/publish-model";
import type {CanonicalDraft} from "./canonical-draft";
const record=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==="object"&&!Array.isArray(v);
function safe(v:unknown,depth=0):boolean {
 if(depth>12)return false;
 if(v===null||typeof v==="boolean"||typeof v==="number")return true;
 if(typeof v==="string")return v.length<=50_000;
 if(Array.isArray(v))return v.length<=200&&v.every(x=>safe(x,depth+1));
 return record(v)&&Object.entries(v).every(([k,x])=>!["__proto__","constructor","prototype"].includes(k)&&safe(x,depth+1));
}
function matches(value:unknown,template:unknown):boolean {
 if(template===null)return value===null||typeof value==="string"||typeof value==="number";
 if(Array.isArray(template))return Array.isArray(value);
 if(record(template))return record(value)&&Object.entries(template).every(([k,v])=>matches(value[k],v));
 return typeof value===typeof template;
}
export function isCanonicalDraft(v:unknown):v is CanonicalDraft {
 if(!record(v)||!safe(v))return false;
 const locs=(x:unknown)=>Array.isArray(x)&&x.every(row=>record(row)&&typeof row.regione === "string"&&(row.citta === null||typeof row.citta === "string"));
 if(!locs(v.locations)||!record(v.profileLocations)||!Object.values(v.profileLocations).every(locs)||!record(v.contacts)||(v.contacts.contactRole !== undefined && typeof v.contacts.contactRole !== "string"))return false;
 return matches(v,{profiles:createProfileDrafts(),profileLocations:createProfileLocations(),socialLinks:createProfileSocialLinks(),details:createAnnouncementDetailsDrafts(),locations:[],contacts:{email:"",phone:""},extras:{genericLink:""},title:""});
}
import "server-only";
import {createHash} from "node:crypto";
import type {Json} from "@bacheca/database";
import {normalizeCreation, UUID, validateCreation} from "./domain";
import {PROFILE_OPTIONS, REGIONS, TEAM_OPTIONS} from "./prototype-model";
import {WHATSAPP_TARGETS, whatsappLinkError} from "./whatsapp-parser";
import type {AnnouncementAuthor, AuthorProfile, CreationInput, CreationReceipt, CreationResult} from "./contracts";

export type CreationRpc = (name: string, args: Record<string, Json>) => PromiseLike<{data: unknown; error: unknown}>;
export interface CreationSession {actorId: string; rpc: CreationRpc}
export interface CreationDependencies {
  session(): Promise<CreationSession>;
  upload(path: string, bytes: Uint8Array, mime: string): Promise<void>;
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function parseAuthors(raw: unknown): AnnouncementAuthor[] {
  if (!Array.isArray(raw) || raw.length > 20) throw new Error("INVALID_AUTHORS");
  return raw.map(author => {
    if (!record(author) || typeof author.id !== "string" || !UUID.test(author.id) || typeof author.name !== "string" || typeof author.email !== "string" || !Array.isArray(author.profiles)) throw new Error("INVALID_AUTHOR");
    const profiles = author.profiles.map((profile: unknown): AuthorProfile => {
      if (!record(profile) || typeof profile.id !== "string" || !PROFILE_OPTIONS.some(p => p.value === profile.type) || (!UUID.test(profile.id.split(":")[0]) || profile.id.split(":")[1] !== profile.type) || !record(profile.draft) || !Array.isArray(profile.locations) || !["name", "city", "region", "facts"].every(k => typeof profile[k] === "string")) throw new Error("INVALID_PROFILE");
      if (!profile.locations.every(loc => record(loc) && typeof loc.regione === "string" && (loc.citta === null || typeof loc.citta === "string"))) throw new Error("INVALID_LOCATIONS");
      return {...profile, allowedRegions: Array.isArray(profile.allowedRegions) ? profile.allowedRegions : undefined} as unknown as AuthorProfile;
    });
    return {id: author.id, name: author.name, email: author.email, profiles};
  });
}
export function parseReceipt(raw: unknown): CreationReceipt | null {
  if (raw === null) return null;
  if (!record(raw) || !["success", "consumed"].includes(String(raw.status))) throw new Error("INVALID_RECEIPT");
  if (raw.status === "consumed") throw new Error("SUBMISSION_CONSUMED");
  if (typeof raw.publicationId !== "string" || !UUID.test(raw.publicationId) || typeof raw.announcementId !== "string" || !UUID.test(raw.announcementId) || typeof raw.idempotent !== "boolean" || !Array.isArray(raw.announcements) || !raw.announcements.length || !raw.announcements.every(item => record(item) && typeof item.id === "string" && UUID.test(item.id) && (item.region === null || typeof item.region === "string") && typeof item.status === "string")) throw new Error("INVALID_RECEIPT");
  return raw as unknown as CreationReceipt;
}
export function validCreationInput(raw: unknown): raw is CreationInput {
  if (!record(raw) || JSON.stringify(raw).length > 400_000 || raw.version !== 1 || typeof raw.submissionId !== "string" || !UUID.test(raw.submissionId) || !["registered", "unregistered"].includes(String(raw.authorMode)) || !PROFILE_OPTIONS.some(p => p.value === raw.profileType) || !TEAM_OPTIONS.includes(raw.teamType as never) || !record(raw.profile) || !record(raw.announcement) || typeof raw.referenceEmail !== "string" || raw.referenceEmail.length > 254 || typeof raw.authorized !== "boolean") return false;
  if (raw.approveImmediately !== undefined && typeof raw.approveImmediately !== "boolean") return false;
  const values = (v: Record<string, unknown>, depth = 0): boolean => depth < 8 && Object.entries(v).every(([k, item]) => !["__proto__", "constructor", "prototype"].includes(k) && (typeof item === "string" || Array.isArray(item) && item.length <= 100 && item.every(x => typeof x === "string" || record(x) && values(x, depth + 1))));
  if (!values(raw.profile) || !values(raw.announcement) || !(raw.profileId === null || typeof raw.profileId === "string")) return false;
  if (raw.provenance !== undefined && (!record(raw.provenance) || raw.provenance.source !== "whatsapp" || typeof raw.provenance.rawText !== "string" || !raw.provenance.rawText.trim() || raw.provenance.rawText.length > 50_000 || typeof raw.provenance.messageUrl !== "string" || whatsappLinkError(raw.provenance.messageUrl))) return false;
  if (record(raw.provenance)) {
    const {context, manualTarget} = raw.provenance;
    if (context !== undefined && (!record(context) || typeof context.channelRegion !== "string" || !REGIONS.includes(context.channelRegion) || context.resolvedRegion !== undefined && (typeof context.resolvedRegion !== "string" || !REGIONS.includes(context.resolvedRegion)))) return false;
    if (manualTarget !== undefined && !WHATSAPP_TARGETS.some(target => target.id === manualTarget)) return false;
  }
  return raw.image == null || record(raw.image) && typeof raw.image.hash === "string" && /^[a-f0-9]{64}$/.test(raw.image.hash) && ["image/jpeg", "image/png", "image/webp"].includes(String(raw.image.mime)) && typeof raw.image.size === "number" && raw.image.size > 0 && raw.image.size <= 5 * 1024 * 1024;
}
export function inspectImage(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error("INVALID_IMAGE");
  const prefix = Array.from(bytes.slice(0, 12));
  const mime = prefix.slice(0, 8).join() === "137,80,78,71,13,10,26,10" ? "image/png" : prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255 ? "image/jpeg" : String.fromCharCode(...prefix.slice(0, 4)) === "RIFF" && String.fromCharCode(...prefix.slice(8, 12)) === "WEBP" ? "image/webp" : null;
  if (!mime) throw new Error("INVALID_IMAGE");
  return {hash: createHash("sha256").update(bytes).digest("hex"), mime, size: bytes.length};
}
export function createAnnouncementCreation(deps: CreationDependencies) {
  return {
    async search(query: string): Promise<{status: "ok"; authors: AnnouncementAuthor[]} | {status: "denied" | "unavailable"}> {
      try {const {rpc} = await deps.session(); if (query.trim().length < 2 || query.length > 254) return {status: "ok", authors: []};
        const {data, error} = await rpc("admin_search_announcement_authors_v1", {p_query: query.trim()}); if (error) throw error;
        return {status: "ok", authors: parseAuthors(data)};
      } catch (error) {return {status: error instanceof Error && error.message === "ADMIN_ACCESS_DENIED" ? "denied" : "unavailable"};}
    },
    async receipt(id: string): Promise<CreationResult | {status: "absent"}> {
      try {const {rpc} = await deps.session(); if (!UUID.test(id)) return {status: "unavailable"};
        const {data, error} = await rpc("admin_get_announcement_submission_v1", {p_submission: id}); if (error) throw error;
        const receipt = parseReceipt(data); return receipt ? {status: "ok", receipt} : {status: "absent"};
      } catch (error) {return {status: error instanceof Error && error.message === "SUBMISSION_CONSUMED" ? "consumed" : error instanceof Error && error.message === "ADMIN_ACCESS_DENIED" ? "denied" : "unavailable"};}
    },
    async submit(raw: unknown, bytes?: Uint8Array): Promise<CreationResult> {
      try {
        const {actorId, rpc} = await deps.session();
        if (!validCreationInput(raw)) return {status: "invalid", issues: [{path: "author._form", severity: "error", code: "INVALID_INPUT", tab: "author", message: "La compilazione non è valida. Controlla i dati inseriti."}]};
        const input = raw; let existing: AuthorProfile | undefined;
        if (input.authorMode === "registered") {
          const owner = input.profileId?.split(":")[0] ?? "";
          const {data, error} = await rpc("admin_search_announcement_authors_v1", {p_query: owner}); if (error) throw error;
          existing = parseAuthors(data).flatMap(a => a.profiles).find(p => p.id === input.profileId);
        }
        const issues = validateCreation(input, existing); if (issues.length) return {status: "invalid", issues};
        const normalized = normalizeCreation(input);
        const extras: Record<string, Json> = {generic_link: normalized.extras.genericLink};
        if (bytes) {
          let image;
          try {image = inspectImage(bytes);} catch {return {status: "invalid", issues: [{path: "announcement.image", severity: "error", code: "INVALID_IMAGE", tab: "contacts", message: "Scegli un file PNG, JPEG o WebP valido, fino a 5 MB."}]};}
          if (!input.image || image.hash !== input.image.hash || image.mime !== input.image.mime || image.size !== input.image.size) return {status: "invalid", issues: [{path: "announcement.image", severity: "error", code: "INVALID_IMAGE", tab: "contacts", message: "Il contenuto dell’immagine non corrisponde al formato dichiarato."}]};
        }
        const path = input.image ? `${actorId}/${input.submissionId}/${input.image.hash}.${input.image.mime === "image/jpeg" ? "jpg" : input.image.mime === "image/png" ? "png" : "webp"}` : null;
        if (input.image && path) {extras.image_path = path; extras.image_mime = input.image.mime;}
        // Read first: after an uncertain response, recover the receipt before any
        // upload. The create RPC still compares the canonical payload hash.
        const previous = await rpc("admin_get_announcement_submission_v1", {p_submission: input.submissionId});
        if (previous.error) throw previous.error;
        if (input.image && !previous.data) {
          if (!bytes) return {status: "invalid", issues: [{path: "announcement.image", severity: "error", code: "RESELECT_IMAGE", tab: "contacts", message: "Seleziona di nuovo l’immagine oppure rimuovila."}]};
          await deps.upload(path!, bytes, input.image.mime);
        }
        const payload = {...(input.approveImmediately ? {approve_immediately: true} : {}), author_mode: input.authorMode, profile_id: input.profileId?.split(":")[0] ?? null,
          profile_type: input.profileType, profile_draft: normalized.profileDraft, profile_locations: normalized.profileLocations,
          profile_social_links: normalized.profileSocialLinks, announcement_type: normalized.announcementType,
          announcement_title: normalized.announcementTitle, detail: normalized.detail, announcement_locations: normalized.announcementLocations,
          contacts: normalized.contacts, extras, authorized: true, source: input.provenance ? "whatsapp" : "manual",
          original_text: input.provenance?.rawText ?? null, message_url: input.provenance?.messageUrl ? new URL(input.provenance.messageUrl).href : null, reference_email: input.referenceEmail || null};
        const {data, error} = await rpc(input.approveImmediately ? "admin_create_announcement_v2" : "admin_create_announcement_v1", {p_submission: input.submissionId, p_payload: payload as unknown as Json});
        if (error) {
          const failure = error as {message?: string; code?: string};
          if (failure.message === "ADMIN_CREATION_CONFLICT") return {status: "conflict"};
          if (failure.code === "42501" && failure.message !== "ADMIN_SESSION_POLICY_UNVERIFIED") return {status: "denied"};
          if (failure.code === "22023") return {status: "invalid", issues: [{path: "announcement._form", severity: "error", code: "DATABASE_VALIDATION", tab: "announcement", message: "Il profilo o l’annuncio non soddisfano i requisiti attuali. Ricontrolla i dati e l’autore."}]};
          return {status: "unknown"};
        }
        const receipt = parseReceipt(data); if (!receipt) return {status: "unknown"}; return {status: "ok", receipt};
      } catch (error) {
        if (error instanceof Error && error.message === "SUBMISSION_CONSUMED") return {status: "consumed"};
        if (error instanceof Error && error.message === "ADMIN_ACCESS_DENIED") return {status: "denied"};
        return {status: "unavailable"};
      }
    },
  };
}

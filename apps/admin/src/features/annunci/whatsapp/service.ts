import "server-only";
import type {CreationRpc} from "../create/service";
import {canonicalUuid, record} from "../validation";
import {parseDetailResponse} from "../server/detail-response";
import {whatsappLinkError} from "../create/whatsapp-parser";
import {generateWhatsAppMessage} from "./templates";
import {canPrepareWhatsApp, type WhatsAppExport, type WhatsAppFailure, type WhatsAppSaveInput} from "./model";
import type {AnnouncementDetail} from "../contracts";

export type WhatsAppReadResult = {status: "ok"; detail: AnnouncementDetail; saved: WhatsAppExport; generated: ReturnType<typeof generateWhatsAppMessage>} | {status: WhatsAppFailure};
export type WhatsAppSaveResult = {status: "ok" | WhatsAppFailure};
export function validWhatsAppSave(value: unknown): value is WhatsAppSaveInput {
  if (!record(value)) return false;
  return canonicalUuid(value.id) && typeof value.text === "string" && Boolean(value.text.trim()) && value.text.length <= 50_000 &&
    typeof value.url === "string" && value.url.length <= 2048 && !whatsappLinkError(value.url) &&
    typeof value.templateVersion === "string" && /^[0-9]{4}-[0-9]{2}-v[0-9]{1,4}$/.test(value.templateVersion) &&
    Number.isSafeInteger(value.version) && Number(value.version) >= 0 && Number(value.version) < Number.MAX_SAFE_INTEGER &&
    typeof value.fingerprint === "string" && /^content-v1:[a-f0-9]{64}$/.test(value.fingerprint);
}
function status(value: unknown): WhatsAppFailure | null {
  return ["invalid","denied","not_found","not_allowed","conflict","unavailable"].includes(String(value)) ? value as WhatsAppFailure : null;
}
function failure(error: unknown): WhatsAppFailure {
  return record(error) && error.code === "42501" && error.message !== "ADMIN_SESSION_POLICY_UNVERIFIED" || error instanceof Error && error.message === "ADMIN_ACCESS_DENIED" ? "denied" : "unavailable";
}
function publicUrl(id: string, origin?: string) {
  try {
    const url = new URL(origin ?? "https://www.bachecadilettanti.it");
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return new URL(`/dettagli-annuncio?id=${id}`,url).href;
  } catch {return null;}
}
export function createWhatsAppService(deps: {session(): Promise<{rpc: CreationRpc}>; websiteOrigin?: string}) {
  return {
    async read(id: unknown): Promise<WhatsAppReadResult> {
      try {
        const {rpc} = await deps.session();
        if (!canonicalUuid(id)) return {status: "invalid"};
        const {data, error} = await rpc("admin_get_announcement_whatsapp_v1", {p_id: id});
        if (error) return {status: failure(error)};
        if (!record(data)) return {status: "unavailable"};
        if (data.status !== "ok") return {status: status(data.status) ?? "unavailable"};
        const detail = parseDetailResponse(data.detail,id), saved = data.export;
        if (!canPrepareWhatsApp(detail.summary)) return {status: "not_allowed"};
        if (!record(saved) || typeof saved.text !== "string" || saved.text.length > 50_000 || typeof saved.url !== "string" || saved.url.length > 2048 || whatsappLinkError(saved.url) || !Number.isSafeInteger(saved.version) || Number(saved.version)<0 ||
          typeof saved.templateVersion !== "string" || saved.templateVersion.length>120 || !(saved.contentFingerprint === null || typeof saved.contentFingerprint === "string" && /^content-v1:[a-f0-9]{64}$/.test(saved.contentFingerprint))) return {status: "unavailable"};
        return {status: "ok",detail,saved: saved as unknown as WhatsAppExport, generated: generateWhatsAppMessage(detail,publicUrl(id,deps.websiteOrigin))};
      } catch (error) {return {status: failure(error)};}
    },
    async save(raw: unknown): Promise<WhatsAppSaveResult> {
      try {
        const {rpc} = await deps.session();
        if (!validWhatsAppSave(raw)) return {status: "invalid"};
        const {data,error} = await rpc("admin_save_announcement_whatsapp_v1",{p_id:raw.id,p_text:raw.text,p_url:raw.url.trim() ? new URL(raw.url.trim()).href : "",p_template_version:raw.templateVersion,p_version:raw.version,p_fingerprint:raw.fingerprint});
        if (error) return {status: failure(error)};
        if (!record(data)) return {status: "unavailable"};
        return {status: data.status === "ok" ? "ok" : status(data.status) ?? "unavailable"};
      } catch (error) {return {status: failure(error)};}
    },
  };
}

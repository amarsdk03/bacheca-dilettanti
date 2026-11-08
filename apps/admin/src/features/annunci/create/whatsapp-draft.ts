import type {createAnnouncementDraftStore, DraftData} from "./store";
import {parseWhatsAppMessage, type WhatsAppExtraction, type WhatsAppProvenance} from "./whatsapp-parser";

export function extractStoredMessage(state: DraftData) {
  return parseWhatsAppMessage(state.whatsappContent, state.whatsappLink, state.whatsappManualTarget,
    {channelRegion: state.whatsappRegion, ...(state.whatsappResolvedRegion ? {resolvedRegion: state.whatsappResolvedRegion} : {})});
}
export function reextractSource(source: WhatsAppProvenance) {
  return parseWhatsAppMessage(source.rawText, source.messageUrl, source.manualTarget, source.context);
}
export function whatsappDraftKeys(state: DraftData, extraction: WhatsAppExtraction) {
  const type = extraction.target?.profileType;
  const id = state.profilesByUser[`whatsapp:${state.userIds.whatsapp ?? ""}`];
  const profile = state.authors.flatMap(author => author.profiles).find(profile => profile.id === id && profile.type === type);
  const owner = state.whatsappAuthorMode === "unregistered" ? `whatsapp:anonymous:${type}` : profile ? `whatsapp:${profile.id}` : `whatsapp:pending:${type}`;
  return {draftKey: `${owner}:${type === "squadra" ? extraction.target?.teamType : "default"}`, profileKey: `whatsapp:${type}`, profile};
}
export function hasWhatsAppEdits(state: DraftData, extraction: WhatsAppExtraction) {
  const keys = whatsappDraftKeys(state, extraction), draft = state.drafts[keys.draftKey];
  if (!draft) return false;
  const original = draft.provenance ? reextractSource(draft.provenance) : null;
  return JSON.stringify(draft.values) !== JSON.stringify(original?.announcement ?? {}) ||
    state.whatsappAuthorMode === "unregistered" && JSON.stringify(state.profileDrafts[keys.profileKey] ?? {}) !== JSON.stringify(original?.profile ?? {});
}
export function applyWhatsAppExtraction(store: ReturnType<typeof createAnnouncementDraftStore>, extraction: WhatsAppExtraction, bindPending = false) {
  if (!extraction.target || extraction.blocked) return;
  const state = store.getState(), keys = whatsappDraftKeys(state, extraction);
  const pending = state.drafts[`whatsapp:pending:${extraction.target.profileType}:${extraction.target.profileType === "squadra" ? extraction.target.teamType : "default"}`];
  const previous = state.drafts[keys.draftKey] ?? pending ?? {image: null, values: {}};
  // Created/uncertain submissions must never become writable through re-analysis.
  if (state.receipts[keys.draftKey] || ["unknown", "conflict", "consumed"].includes(state.results[keys.draftKey]?.status ?? "")) return;
  if (bindPending && state.drafts[keys.draftKey] && Object.keys(state.drafts[keys.draftKey].values).length) {
    store.setState({whatsappApplied: false}); return;
  }
  const staged = bindPending && pending?.provenance && pending.provenance.rawText === extraction.provenance.rawText && pending.provenance.messageUrl === extraction.provenance.messageUrl ? pending : null;
  store.setState({dirty: true, issues: [], whatsappAnalysis: extraction, whatsappResult: extraction, whatsappApplied: true,
    drafts: {...state.drafts, [keys.draftKey]: {...previous, values: staged?.values ?? extraction.announcement, provenance: extraction.provenance}},
    ...(state.whatsappAuthorMode === "unregistered" ? {profileDrafts: {...state.profileDrafts, [keys.profileKey]: extraction.profile}} : {})});
}
export function whatsappSourceIsCurrent(state: DraftData, source?: WhatsAppProvenance) {
  return Boolean(state.whatsappApplied && source?.context && source.rawText === state.whatsappContent && source.messageUrl === state.whatsappLink.trim() &&
    source.context.channelRegion === state.whatsappRegion && (source.context.resolvedRegion ?? "") === state.whatsappResolvedRegion &&
    (source.manualTarget ?? "") === state.whatsappManualTarget);
}

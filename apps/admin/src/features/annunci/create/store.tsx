"use client";

import {createContext, type ReactNode, type SetStateAction, useCallback, useContext, useEffect, useState} from "react";
import {createStore, useStore} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";
import type {MockAuthorMode, MockProfileType, MockTeamType, MockValues} from "./prototype-model";
import {REGIONS} from "./prototype-model";
import type {WhatsAppExtraction, WhatsAppProvenance} from "./whatsapp-parser";
import type {
	AnnouncementAuthor,
	CreateTab,
	CreationInput,
	CreationReceipt,
	CreationResult,
	FieldIssue
} from "./contracts";

export interface LocalDraft {values: MockValues; image: File | null; imageMeta?: {name: string; size: number; type: string}; provenance?: WhatsAppProvenance}
export interface DraftData {
  mode: MockAuthorMode; search: string; userIds: Record<string, string>; profilesByUser: Record<string, string>;
  manualAnonymousType: MockProfileType | ""; authorEmails: Record<string, string>; whatsappAnalysis: WhatsAppExtraction | null;
  whatsappAuthorMode: "registered" | "unregistered"; profileDrafts: Record<string, MockValues>;
  teamTypes: Record<string, MockTeamType>; drafts: Record<string, LocalDraft>; dirty: boolean;
  activeTab: CreateTab; authorized: boolean; approveImmediately: boolean; authors: AnnouncementAuthor[]; issues: FieldIssue[];
  whatsappContent: string; whatsappLink: string; whatsappManualTarget: string; whatsappResult: WhatsAppExtraction | null;
  whatsappApplied: boolean; submissionIds: Record<string, string>; receipts: Record<string, CreationReceipt>;
  whatsappRegion: string; whatsappResolvedRegion: string;
  results: Record<string, CreationResult | null>;
  lastRequest: CreationInput | null; attempted: boolean; storageError: boolean; hydrated: boolean;
}
export const initialDraft = (): DraftData => ({mode: "registered", search: "", userIds: {}, profilesByUser: {}, manualAnonymousType: "", authorEmails: {}, whatsappAnalysis: null, whatsappAuthorMode: "unregistered", profileDrafts: {}, teamTypes: {}, drafts: {}, dirty: false, activeTab: "author", authorized: true, approveImmediately: false, authors: [], issues: [], whatsappContent: "", whatsappLink: "", whatsappManualTarget: "", whatsappRegion: "", whatsappResolvedRegion: "", whatsappResult: null, whatsappApplied: false, submissionIds: {}, receipts: {}, results: {}, lastRequest: null, attempted: false, storageError: false, hydrated: false});
const tabs = new Set(["author", "profile", "announcement", "contacts", "review"]);
export function restoredDraft(value: unknown): Partial<DraftData> {
  if (!value || typeof value !== "object" || Array.isArray(value) || JSON.stringify(value).length > 2_000_000) return {};
  const raw = value as Partial<DraftData>;
  if (!["registered", "unregistered", "whatsapp"].includes(raw.mode ?? "") || !tabs.has(raw.activeTab ?? "")) return {};
  const safe: Partial<DraftData> = {};
  const defaults = initialDraft();
  for (const key of Object.keys(defaults) as (keyof DraftData)[]) {
    const item = raw[key], fallback = defaults[key];
    if (typeof fallback === "string" && typeof item === "string" || typeof fallback === "boolean" && typeof item === "boolean" ||
      Array.isArray(fallback) && Array.isArray(item) || fallback === null && (item === null || item && typeof item === "object" && !Array.isArray(item)) ||
      fallback && typeof fallback === "object" && !Array.isArray(fallback) && item && typeof item === "object" && !Array.isArray(item)) Object.assign(safe, {[key]: item});
  }
  // Persisted drafts are untrusted input, not a source of executable actions or Files.
  const records = (item: unknown) => item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
  const types = new Set(["giocatore", "squadra", "staff-sportivo", "arbitro", "torneo-evento", "campi-impianti-sportivi", "servizi-consulenze", "creators", ""]);
  const teamTypes = new Set(["Cerca giocatori", "Cerca staff", "Cerca partite amichevoli", "Cerca sponsor"]);
  safe.manualAnonymousType = types.has(String(raw.manualAnonymousType)) ? raw.manualAnonymousType : "";
  safe.whatsappAuthorMode = raw.whatsappAuthorMode === "registered" ? "registered" : "unregistered";
  safe.whatsappRegion = REGIONS.includes(raw.whatsappRegion ?? "") ? raw.whatsappRegion : "";
  safe.whatsappResolvedRegion = REGIONS.includes(raw.whatsappResolvedRegion ?? "") ? raw.whatsappResolvedRegion : "";
  safe.authorized = true;
  const validValues = (item: unknown, depth = 0): boolean => depth < 8 && Boolean(item) && typeof item === "object" && !Array.isArray(item) && Object.entries(item as object).every(([key, v]) => !["__proto__", "constructor", "prototype"].includes(key) && (typeof v === "string" || Array.isArray(v) && v.length <= 100 && v.every(child => typeof child === "string" || validValues(child, depth + 1))));
  safe.profileDrafts = Object.fromEntries(Object.entries(records(raw.profileDrafts)).filter(([, v]) => validValues(v))) as Record<string, MockValues>;
  safe.drafts = Object.fromEntries(Object.entries(records(raw.drafts)).flatMap(([key, v]) => {
    const draft = records(v); if (!validValues(draft.values)) return [];
    const meta = records(draft.imageMeta), source = records(draft.provenance);
    const imageMeta = typeof meta.name === "string" && typeof meta.size === "number" && meta.size > 0 && typeof meta.type === "string" ? {name: meta.name, size: meta.size, type: meta.type} : undefined;
    const context = records(source.context);
    const provenance = source.source === "whatsapp" && typeof source.rawText === "string" && source.rawText.length <= 50_000 && typeof source.messageUrl === "string" ? {source: "whatsapp" as const, rawText: source.rawText, messageUrl: source.messageUrl,
      ...(REGIONS.includes(String(context.channelRegion)) ? {context: {channelRegion: String(context.channelRegion), ...(REGIONS.includes(String(context.resolvedRegion)) ? {resolvedRegion: String(context.resolvedRegion)} : {})}} : {}),
      ...(typeof source.manualTarget === "string" ? {manualTarget: source.manualTarget} : {})} : undefined;
    return [[key, {image: null, values: draft.values, imageMeta, provenance}]];
  })) as Record<string, LocalDraft>;
  safe.receipts = Object.fromEntries(Object.entries(records(raw.receipts)).filter(([,v]) => {
    const receipt = records(v);
    return typeof receipt.publicationId === "string" && typeof receipt.announcementId === "string" && typeof receipt.idempotent === "boolean" && Array.isArray(receipt.announcements) && receipt.announcements.length > 0 && receipt.announcements.every(item => {
      const row = records(item); return typeof row.id === "string" && (row.region === null || typeof row.region === "string") && typeof row.status === "string";
    });
  })) as Record<string, CreationReceipt>;
  safe.results = Object.fromEntries(Object.entries(records(raw.results)).flatMap<[string, unknown]>(([key,v]) => {
    if (v === null) return [[key,null]];
    const result = records(v);
    if (result.status === "ok") return safe.receipts?.[key] ? [[key,{status: "ok",receipt: safe.receipts[key]}]] : [];
    if (["denied", "unavailable", "conflict", "consumed", "unknown"].includes(String(result.status))) return [[key,{status: result.status}]];
    if (result.status === "invalid" && Array.isArray(result.issues) && result.issues.length <= 100 && result.issues.every(issue => {
      const i = records(issue); return typeof i.path === "string" && /^(?:(?:author|profile|announcement)\.[A-Za-z0-9_.]+|authorized)$/.test(i.path) && tabs.has(String(i.tab)) && ["error","warning"].includes(String(i.severity)) && typeof i.code === "string" && typeof i.message === "string" && i.message.length <= 1000;
    })) return [[key,{status: "invalid",issues: result.issues}]];
    return [];
  })) as Record<string, CreationResult | null>;
  for (const key of ["userIds", "profilesByUser", "authorEmails", "teamTypes", "submissionIds"] as const) safe[key] = Object.fromEntries(Object.entries(records(raw[key])).filter(([k, v]) => typeof v === "string" && !["__proto__", "constructor", "prototype"].includes(k))) as never;
  safe.teamTypes = Object.fromEntries(Object.entries(safe.teamTypes ?? {}).filter(([,type]) => teamTypes.has(type)));
  safe.authors = []; safe.issues = []; safe.whatsappAnalysis = null; safe.whatsappResult = null; safe.lastRequest = null;
  safe.storageError = false; safe.hydrated = false;
  return safe;
}
type DraftStore = DraftData & {setField: <K extends keyof DraftData>(key: K, value: SetStateAction<DraftData[K]>) => void; clear: (keepChannelRegion?: boolean) => void};
export function createAnnouncementDraftStore(actorId: string, storage?: Storage) {
  let writeFailed = () => {};
  const store = createStore<DraftStore>()(persist((set) => ({...initialDraft(),
    setField: (key, value) => set(state => ({[key]: typeof value === "function" ? (value as (v: DraftData[typeof key]) => DraftData[typeof key])(state[key]) : value} as Partial<DraftStore>)),
    clear: (keepChannelRegion = false) => set(state => ({...initialDraft(), whatsappRegion: keepChannelRegion ? state.whatsappRegion : "", approveImmediately: keepChannelRegion ? state.approveImmediately : false, hydrated: true})),
  }), {name: `bd-admin-create-announcement:v1:${actorId}`, version: 1, skipHydration: true,
    storage: createJSONStorage(() => {
      return {getItem: (key: string) => {try {return (storage ?? sessionStorage).getItem(key);} catch {writeFailed(); return null;}},
        setItem: (key: string, value: string) => {try {(storage ?? sessionStorage).setItem(key, value);} catch {writeFailed();}},
        removeItem: (key: string) => {try {(storage ?? sessionStorage).removeItem(key);} catch {writeFailed();}}};
    }),
    partialize: state => ({...state, drafts: Object.fromEntries(Object.entries(state.drafts).map(([key, draft]) => [key, {...draft, image: null}])), authors: [], issues: [], hydrated: false, storageError: false, setField: undefined, clear: undefined}),
    merge: (persisted, current) => ({...current, ...restoredDraft(persisted), setField: current.setField, clear: current.clear}),
  }));
  writeFailed = () => {if (!store.getState().storageError) queueMicrotask(() => store.setState({storageError: true}));};
  return store;
}
type Store = ReturnType<typeof createAnnouncementDraftStore>;
const Context = createContext<Store | null>(null);
export function AnnouncementDraftProvider({actorId, children}: {actorId: string; children: ReactNode}) {
  const [store] = useState(() => createAnnouncementDraftStore(actorId));
  useEffect(() => {void Promise.resolve(store.persist.rehydrate()).catch(() => store.setState({storageError: true})).finally(() => store.setState({hydrated: true}));}, [store]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useOptionalAnnouncementDraft() {return useContext(Context);}
export function useAnnouncementDraft<T>(selector: (state: DraftStore) => T) {
  const store = useContext(Context); if (!store) throw new Error("ANNOUNCEMENT_DRAFT_PROVIDER_REQUIRED"); return useStore(store, selector);
}
export function useDraftField<K extends keyof DraftData>(key: K): [DraftData[K], (value: SetStateAction<DraftData[K]>) => void] {
  const value = useAnnouncementDraft(state => state[key]), setField = useAnnouncementDraft(state => state.setField);
  const setter = useCallback((next: SetStateAction<DraftData[K]>) => setField(key, next), [key, setField]);
  return [value, setter];
}

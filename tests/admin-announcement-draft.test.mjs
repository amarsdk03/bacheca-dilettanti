import assert from "node:assert/strict";
import {test} from "node:test";
import {createRequire} from "node:module";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
const require=createRequire(import.meta.url);
const dependencies=Object.fromEntries(["react","react/jsx-runtime","zustand","zustand/middleware"].map(name=>[name,require(name)]));
const {createAnnouncementDraftStore,restoredDraft}=adminServerLoader({dependencies})("apps/admin/src/features/annunci/create/store.tsx");
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}};
test("the session draft preserves fields and steps, isolates Admins and persists file metadata only",async()=>{
  const storage=memory(),first=createAnnouncementDraftStore("admin-A",storage);
  first.getState().setField("activeTab","review");first.getState().setField("whatsappContent","Message");
  first.getState().setField("results",{draft:{status:"unknown"}});
  first.getState().setField("drafts",{draft:{values:{title:"Conserved",locations:[{region:"Lazio",city:"Roma"}]},image:new File(["x"],"photo.png"),imageMeta:{name:"photo.png",size:1,type:"image/png"}}});
  const next=createAnnouncementDraftStore("admin-A",storage);await next.persist.rehydrate();
  assert.equal(next.getState().activeTab,"review");assert.equal(next.getState().drafts.draft.values.title,"Conserved");assert.equal(next.getState().whatsappContent,"Message");assert.equal(next.getState().drafts.draft.image,null);assert.equal(next.getState().drafts.draft.imageMeta.name,"photo.png");
  assert.equal(next.getState().results.draft.status,"unknown");
  const another=createAnnouncementDraftStore("admin-B",storage);await another.persist.rehydrate();assert.deepEqual(another.getState().drafts,{});
  next.getState().clear();await next.persist.clearStorage();assert.equal(storage.getItem("bd-admin-create-announcement:v1:admin-A"),null);
});
test("denied browser storage degrades to memory and malformed restoration cannot supply Files or receipts",async()=>{
  const store=createAnnouncementDraftStore("admin-A",{getItem:()=>{throw Error()},setItem:()=>{throw Error()},removeItem:()=>{throw Error()}});
  await store.persist.rehydrate();await Promise.resolve();assert.equal(store.getState().storageError,true);
  const restored=restoredDraft({mode:"registered",activeTab:"review",drafts:{invalid:{values:{title:{bad:true}}}},receipts:{bad:{announcements:"crash"}}});
  assert.deepEqual(restored.drafts,{});assert.deepEqual(restored.receipts,{});
});

import assert from "node:assert/strict";
import {test} from "node:test";
import {createRequire} from "node:module";
import {renderToStaticMarkup} from "react-dom/server";
import {adminServerLoader} from "./helpers/admin-server-loader.mjs";
import {creationInput} from "./helpers/admin-creation-data.mjs";

const require = createRequire(import.meta.url);
const dependencies = Object.fromEntries(["react", "react/jsx-runtime", "zustand", "zustand/middleware"].map(name => [name, require(name)]));
const load = adminServerLoader({dependencies});
const base = "apps/admin/src/features/annunci/create/";
const {createAnnouncementDraftStore, restoredDraft} = load(base + "store.tsx");
const {extractStoredMessage, applyWhatsAppExtraction, hasWhatsAppEdits, whatsappDraftKeys, whatsappSourceIsCurrent} = load(base + "whatsapp-draft.ts");
const {parseWhatsAppMessage} = load(base + "whatsapp-parser.ts");
const {validateCreation} = load(base + "domain.ts");
const {createAnnouncementCreation} = load(base + "service.ts");
const {buildCreationPreviews} = load(base + "preview.ts");
const memory = () => {const values = new Map(); return {getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key)};};
const content = "🔵 GIOCATORE CERCA SQUADRA\n📍 Zona: Milano\n⚽ Calcio: 11\n🧍 Ruolo: Portiere\n📲 Contatto: +393331234567";
function draft() {
  const store = createAnnouncementDraftStore("admin-A", memory());
  store.setState({mode: "whatsapp", whatsappContent: content, whatsappRegion: "Lombardia"});
  return store;
}

test("channel region is required, supplies missing regional context and never invents a city", () => {
  const store = draft();
  store.setState({whatsappRegion: ""});
  assert.equal(extractStoredMessage(store.getState()).blocked, true);
  store.setState({whatsappRegion: "Lombardia"});
  const result = extractStoredMessage(store.getState());
  assert.equal(result.blocked, false);
  assert.equal(result.profile.region, "Lombardia");
  assert.equal(result.profile.city, "");
  assert.deepEqual(result.announcement.locations, [{region: "Lombardia", city: ""}]);
  assert(result.issues.some(issue => /Zona/.test(issue.label)));
});

test("conflicting and multiple message regions require an explicit valid resolution", () => {
  for (const suffix of ["\n#Lazio", "\n#Lazio #Lombardia", "\n#Lazio #Veneto"]) {
    const result = parseWhatsAppMessage(content + suffix, "", "", {channelRegion: "Lombardia"});
    assert.equal(result.blocked, true);
    assert(result.regionConflict.includes("Lazio"));
    assert.equal(result.announcement.locations, undefined);
    const resolved = parseWhatsAppMessage(content + suffix, "", "", {channelRegion: "Lombardia", resolvedRegion: "Lazio"});
    assert.equal(resolved.blocked, false);
    assert.equal(resolved.profile.region, "Lazio");
    assert.equal(resolved.profile.city, "");
    assert.equal(parseWhatsAppMessage(content + suffix, "", "", {channelRegion: "Lombardia", resolvedRegion: "Sicilia"}).blocked, true);
  }
});

test("one analysis applies the newly detected type atomically; edits and images are preserved until confirmed", () => {
  const store = draft();
  let extraction = extractStoredMessage(store.getState());
  applyWhatsAppExtraction(store, extraction);
  let key = whatsappDraftKeys(store.getState(), extraction).draftKey;
  assert.equal(key, "whatsapp:anonymous:giocatore:default");
  assert.equal(store.getState().whatsappApplied, true);
  assert.equal(hasWhatsAppEdits(store.getState(), extraction), false);
  const old = store.getState().drafts[key], image = new File(["x"], "image.png");
  store.setState({drafts: {...store.getState().drafts, [key]: {...old, image, values: {...old.values, title: "Correzione"}}}});
  assert.equal(hasWhatsAppEdits(store.getState(), extraction), true);
  assert.equal(store.getState().drafts[key].values.title, "Correzione");
  applyWhatsAppExtraction(store, extraction);
  assert.equal(store.getState().drafts[key].image, image);
  store.setState({whatsappContent: "🟠 SOCIETÀ CERCA STAFF\n📍 Zona: Lombardia\n👤 Ruolo cercato: Allenatore"});
  extraction = extractStoredMessage(store.getState());
  applyWhatsAppExtraction(store, extraction);
  key = whatsappDraftKeys(store.getState(), extraction).draftKey;
  assert.equal(key, "whatsapp:anonymous:squadra:Cerca staff");
  assert.equal(store.getState().whatsappAnalysis.target.profileType, "squadra");
  assert.equal(store.getState().drafts["whatsapp:anonymous:giocatore:default"].image, image);
});

test("an unknown heading can be corrected manually, while stale content cannot be submitted as current", () => {
  const store = draft();
  store.setState({whatsappContent: content.replace("GIOCATORE CERCA SQUADRA", "NUOVO MESSAGGIO")});
  assert.equal(extractStoredMessage(store.getState()).blocked, true);
  store.setState({whatsappManualTarget: "player"});
  const result = extractStoredMessage(store.getState());
  applyWhatsAppExtraction(store, result);
  const source = store.getState().drafts[whatsappDraftKeys(store.getState(),result).draftKey].provenance;
  assert.equal(whatsappSourceIsCurrent(store.getState(), source), true);
  store.setState({whatsappContent: content + "\nAggiornamento"});
  assert.equal(whatsappSourceIsCurrent(store.getState(), source), false);
  store.setState({whatsappContent: source.rawText, whatsappRegion: "Lazio"});
  assert.equal(whatsappSourceIsCurrent(store.getState(), source), false);
});

test("registered attribution stages the extraction and binds it without writing profile data", () => {
  const store = draft(); store.setState({whatsappAuthorMode: "registered"});
  const result = extractStoredMessage(store.getState());
  applyWhatsAppExtraction(store, result);
  assert(store.getState().drafts["whatsapp:pending:giocatore:default"]);
  const pending = store.getState().drafts["whatsapp:pending:giocatore:default"];
  store.setState({drafts: {...store.getState().drafts, "whatsapp:pending:giocatore:default": {...pending, values: {...pending.values, title: "Correzione prima dell’attribuzione"}}}});
  const profile = {id: "profile:giocatore", type: "giocatore", draft: {nome: "Autore originale"}};
  store.setState({userIds: {whatsapp: "user"}, profilesByUser: {"whatsapp:user": profile.id}, authors: [{id: "user", profiles: [profile]}]});
  applyWhatsAppExtraction(store, result, true);
  assert(store.getState().drafts["whatsapp:profile:giocatore:default"]);
  assert.equal(store.getState().drafts["whatsapp:profile:giocatore:default"].values.title, "Correzione prima dell’attribuzione");
  assert.deepEqual(store.getState().profileDrafts, {});
  assert.equal(profile.draft.nome, "Autore originale");
});

test("the session remembers the region across resets, isolates Admins, and clears it at logout", async () => {
  const storage = memory(), store = createAnnouncementDraftStore("A", storage);
  store.setState({whatsappRegion: "Lazio", whatsappContent: content});
  store.getState().clear(true);
  assert.equal(store.getState().whatsappRegion, "Lazio"); assert.equal(store.getState().whatsappContent, "");
  const restored = createAnnouncementDraftStore("A", storage); await restored.persist.rehydrate();
  assert.equal(restored.getState().whatsappRegion, "Lazio");
  const other = createAnnouncementDraftStore("B", storage); await other.persist.rehydrate();
  assert.equal(other.getState().whatsappRegion, "");
  restored.getState().clear(); await restored.persist.clearStorage();
  assert.equal(restored.getState().whatsappRegion, "");
  assert.equal(restoredDraft({mode: "whatsapp", activeTab: "author", whatsappRegion: "inventata"}).whatsappRegion, "");
});

test("re-analysis cannot replace a completed or uncertain submission", () => {
  for (const status of ["unknown", "conflict", "consumed", "ok"]) {
    const store = draft(), result = extractStoredMessage(store.getState());
    applyWhatsAppExtraction(store, result);
    const key = whatsappDraftKeys(store.getState(), result).draftKey, previous = store.getState().drafts[key];
    store.setState(status === "ok" ? {receipts: {[key]: {publicationId: "receipt"}}} : {results: {[key]: {status}}});
    applyWhatsAppExtraction(store, {...result, announcement: {title: "Replacement"}});
    assert.equal(store.getState().drafts[key], previous);
  }
});

test("the server rejects unresolved regions before any upload or creation RPC", async () => {
  const input = creationInput();
  input.provenance = {source: "whatsapp", rawText: content + "\n#Lazio", messageUrl: "", context: {channelRegion: "Lombardia"}};
  assert(validateCreation(input).some(issue => issue.path === "author._form"));
  const service = createAnnouncementCreation({session: async () => ({actorId: input.submissionId, rpc: () => assert.fail("RPC must not execute")}), upload: () => assert.fail("Upload must not execute")});
  assert.equal((await service.submit(input)).status, "invalid");
  input.provenance.context.resolvedRegion = "Lazio";
  assert.equal(validateCreation(input).some(issue => issue.path === "author._form"), false);
});

test("Admin previews use canonical Web projections for all types and separate regional publications", () => {
  for (const type of ["giocatore", "squadra", "staff-sportivo", "arbitro", "torneo-evento", "campi-impianti-sportivi", "servizi-consulenze", "creators"]) {
    for (const team of type === "squadra" ? ["Cerca giocatori", "Cerca staff", "Cerca partite amichevoli", "Cerca sponsor"] : ["Cerca giocatori"]) {
      const input = creationInput(type, team); input.referenceEmail = "private@example.test";
      const previews = buildCreationPreviews(input, undefined, "blob:local", "image.png");
      assert(previews.length > 0); assert.equal(previews[0].preview.profileType, type);
      assert.equal(previews[0].preview.imageUrl, "blob:local");
      assert(!JSON.stringify(previews).includes("private@example.test"));
    }
  }
  const input = creationInput(); input.announcement.locations.push({region: "Lazio", city: "Roma"});
  const previews = buildCreationPreviews(input);
  assert.deepEqual(previews.map(item => item.region), ["Lazio", "Lombardia"]);
  for (const item of previews) assert(item.preview.locations.every(location => location.region === item.region));
});

test("the shared preview renderer shows actual details and contacts, excluding private import metadata", () => {
  const {createAnnouncementPreviewCard} = load("packages/announcements/src/ui/preview-card.tsx");
  const ui = Object.fromEntries(["Card", "CardContent", "CardDescription", "CardHeader", "CardTitle", "Alert", "AlertDescription", "Badge", "Separator", "ExternalLink", "TeamProfileLinks"].map(key => [key, ({children}) => dependencies.react.createElement("div", null, children)]));
  ui.cn = (...values) => values.filter(Boolean).join(" ");
  const View = createAnnouncementPreviewCard(ui), input = creationInput();
  input.provenance = {source: "whatsapp", rawText: "PRIVATE SOURCE", messageUrl: "https://wa.me/private"};
  const html = renderToStaticMarkup(dependencies.react.createElement(View, {preview: buildCreationPreviews(input)[0].preview}));
  assert(html.includes("Portiere")); assert(html.includes("+393331234567"));
  assert(!html.includes("PRIVATE SOURCE")); assert(!html.includes("wa.me/private"));
});

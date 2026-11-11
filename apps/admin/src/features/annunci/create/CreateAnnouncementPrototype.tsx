"use client";

import {type ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {ToggleGroup} from "@base-ui/react/toggle-group";
import {Toggle} from "@base-ui/react/toggle";
import {Check, Search, UserRound} from "lucide-react";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Checkbox} from "@/components/ui/checkbox";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Empty, EmptyDescription, EmptyHeader, EmptyTitle} from "@/components/ui/empty";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group";
import {GuardedLink, useUnsavedChanges} from "@/features/navigation/UnsavedChanges";
import {FieldIssuesProvider, PrototypeFields, PrototypeSelect} from "./PrototypeFields";
import {WhatsAppImport} from "./WhatsAppImport";
import type {WhatsAppExtraction} from "./whatsapp-parser";
import {
	ANNOUNCEMENT_FIELDS,
	defaultMockTitle,
	type MockField,
	type MockProfileType,
	type MockTeamType,
	type MockValues,
	PROFILE_FIELDS,
	PROFILE_OPTIONS,
	PROFILE_SOCIAL_FIELD,
	profileLabel,
	REGIONS,
	TEAM_FIELDS,
	TEAM_OPTIONS,
	textValue,
} from "./prototype-model";

import {Tabs} from "@base-ui/react/tabs";
import {CREATE_TABS, type CreateTab, type CreationInput, type CreationResult, type FieldIssue} from "./contracts";
import {type LocalDraft, useAnnouncementDraft, useDraftField, useOptionalAnnouncementDraft} from "./store";
import {validateCreation} from "./domain";
import {getCreationCapabilities, getCreationReceipt, searchAnnouncementAuthors, submitAnnouncement} from "./actions";
import {
	applyWhatsAppExtraction,
	extractStoredMessage,
	hasWhatsAppEdits,
	reextractSource,
	whatsappSourceIsCurrent
} from "./whatsapp-draft";
import {CreationPreview} from "./CreationPreview";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog";

const EMPTY_DRAFT: LocalDraft = {values: {}, image: null};
const EMPTY_VALUES: MockValues = {};
const locationFields = (single: boolean, cityRequired = false): readonly MockField[] => single ? [
  {key: "region", label: "Regione", kind: "select", options: REGIONS, required: true},
  {key: "city", label: "Città/comune", required: cityRequired},
] : [
  {key: "locations", label: "Località", kind: "repeat", wide: true, required: true, fields: [
    {key: "region", label: "Regione", kind: "select", options: REGIONS, required: true}, {key: "city", label: "Città/comune"},
  ]},
];

function FormSection({id, number, title, description, children}: {
  id: string; number: string; title: string; description?: string; children: ReactNode;
}) {
  return <Card className="admin-create-section" id={id}>
    <CardHeader><div className="admin-create-section-heading"><span className="admin-create-section-number" aria-hidden="true">{number}</span>
      <CardTitle><h2>{title}</h2></CardTitle></div>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>;
}

function ImagePreview({file}: {file: File}) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const url = URL.createObjectURL(file);
    element.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  // Only local blob URLs; Next's remote image loader must not receive this file.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} alt="Anteprima locale dell’immagine selezionata" className="admin-create-image" />;
}

export function CreateAnnouncementPrototype() {
  const [mode, setMode] = useDraftField("mode");
  const [search, setSearch] = useDraftField("search");
  const [userIds, setUserIds] = useDraftField("userIds");
  const [profilesByUser, setProfilesByUser] = useDraftField("profilesByUser");
  const [manualAnonymousType, setAnonymousType] = useDraftField("manualAnonymousType");
  const [authorEmails, setAuthorEmails] = useDraftField("authorEmails");
  const [whatsappAnalysis, setWhatsappAnalysis] = useDraftField("whatsappAnalysis");
  const [whatsappAuthorMode, setWhatsappAuthorMode] = useDraftField("whatsappAuthorMode");
  const [profileDrafts, setProfileDrafts] = useDraftField("profileDrafts");
  const [teamTypes, setTeamTypes] = useDraftField("teamTypes");
  const [drafts, setDrafts] = useDraftField("drafts");
  const [dirty, setDirty] = useDraftField("dirty");
  const [approveImmediately, setApproveImmediately] = useDraftField("approveImmediately");
  const [approvalAvailable,setApprovalAvailable] = useState<boolean|null>(null);
  useEffect(()=>{let active=true;void getCreationCapabilities().then(value=>{if(active)setApprovalAvailable(value);}).catch(()=>{if(active)setApprovalAvailable(false);});return()=>{active=false;};},[]);
  const [activeTab, setActiveTab] = useDraftField("activeTab");
  const whatsappApplied = useAnnouncementDraft(state => state.whatsappApplied);
  const [authors, setAuthors] = useDraftField("authors");
  const [serverIssues, setServerIssues] = useDraftField("issues");
  const [submissionIds, setSubmissionIds] = useDraftField("submissionIds");
  const [receipts, setReceipts] = useDraftField("receipts");
  const [results, setResults] = useDraftField("results");
  const [attempted, setAttempted] = useDraftField("attempted");
  const hydrated = useAnnouncementDraft(state => state.hydrated);
  const storageError = useAnnouncementDraft(state => state.storageError);
  const store = useOptionalAnnouncementDraft()!;
  const [busy, setBusy] = useState(false), [searchState, setSearchState] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [imageError, setImageError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const {setDirty: setExitDirty} = useUnsavedChanges();

  useEffect(() => {
    setExitDirty(dirty);
    return () => setExitDirty(false);
  }, [dirty, setExitDirty]);

  const userScope = mode === "whatsapp" ? "whatsapp" : "manual";
  const whatsappTarget = whatsappAnalysis?.target;
  const authorMode = mode === "whatsapp" ? whatsappAuthorMode : mode;
  const userId = userIds[userScope] ?? "";
  const setUserId = (id: string) => setUserIds(previous => ({...previous, [userScope]: id}));
  const authorEmail = authorEmails[userScope] ?? "";
  const setAuthorEmail = (email: string) => setAuthorEmails(previous => ({...previous, [userScope]: email}));
  const anonymousType = mode === "whatsapp" ? whatsappTarget?.profileType ?? "" : manualAnonymousType;
  const user = authors.find(item => item.id === userId);
  const availableProfiles = user?.profiles.filter(item => mode !== "whatsapp" || item.type === whatsappTarget?.profileType) ?? [];
  const profileKey = `${userScope}:${userId}`;
  const profile = availableProfiles.find(item => item.id === profilesByUser[profileKey]);
  const selectedType = mode === "whatsapp" ? whatsappTarget?.profileType : authorMode === "registered" ? profile?.type : anonymousType || undefined;
  const ownerKey = `${mode === "whatsapp" ? "whatsapp:" : ""}${authorMode === "registered" ? profile?.id ?? (mode === "whatsapp" ? `pending:${selectedType}` : "") : anonymousType ? `anonymous:${anonymousType}` : ""}`;
  const teamType = mode === "whatsapp" ? whatsappTarget?.teamType ?? TEAM_OPTIONS[0] : teamTypes[ownerKey] ?? TEAM_OPTIONS[0];
  const draftKey = `${ownerKey}:${selectedType === "squadra" ? teamType : "default"}`;
  const result = results[draftKey] ?? null;
  const setResult = useCallback((result: CreationResult | null) => setResults(previous => ({...previous,[draftKey]:result})), [draftKey,setResults]);
  const draft = drafts[draftKey] ?? EMPTY_DRAFT;
  const type = selectedType;
  const values = draft.values;
  const profileDraftKey = `${mode === "whatsapp" ? "whatsapp:" : ""}${anonymousType}`;
  const profileValues = profileDrafts[profileDraftKey] ?? EMPTY_VALUES;
  const anonymousName = textValue(profileValues, "name");
  const privateName = textValue(profileValues, "anonymousName") === "Sì";
  const authorName = authorMode === "registered" ? profile?.name ?? "" : privateName && type ? profileLabel(type) : [anonymousName, textValue(profileValues, "surname")].filter(Boolean).join(" ");
  const autoTitle = type ? defaultMockTitle(type, teamType, authorName, values) : "Titolo dell’annuncio";
  const sponsor = type === "squadra" && teamType === "Cerca sponsor";
  const singleLocation = type === "campi-impianti-sportivi";
  const fields = type ? type === "squadra" ? TEAM_FIELDS[teamType] : ANNOUNCEMENT_FIELDS[type] : [];
  
  const users = authors;
  const isMinor = authorMode === "unregistered" && textValue(profileValues, "birthDate") > `${new Date().getFullYear() - 18}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

  function changeValue(key: string, value: MockValues[string]) {
    setDirty(true); setServerIssues([]);
    setDrafts(previous => ({...previous, [draftKey]: {...(previous[draftKey] ?? EMPTY_DRAFT), values: {...(previous[draftKey]?.values ?? {}), [key]: value}}}));
  }
  function changeProfile(key: string, value: MockValues[string]) {
    setDirty(true); setServerIssues([]);
    setProfileDrafts(previous => ({...previous, [profileDraftKey]: {...(previous[profileDraftKey] ?? {}), [key]: value}}));
  }
  function chooseUser(id: string) {
    setDirty(true);
    setUserId(id);
    const selected = authors.find(item => item.id === id);
    const compatible = selected?.profiles.filter(item => mode !== "whatsapp" || item.type === whatsappTarget?.profileType) ?? [];
    if (compatible.length === 1) setProfilesByUser(previous => ({...previous, [`${userScope}:${id}`]: compatible[0].id}));
  }

  function applyWhatsApp(result: WhatsAppExtraction) {
    applyWhatsAppExtraction(store, result); setImageError("");
  }
  const authorFields = <FieldGroup>
    {mode === "whatsapp" && <Field><FieldLabel id="whatsapp-author-binding">Attribuzione</FieldLabel>
      <ToggleGroup className="admin-create-author-mode" aria-labelledby="whatsapp-author-binding" value={[whatsappAuthorMode]}
        onValueChange={(next) => {const value = next[0]; if (value === "registered" || value === "unregistered") {setWhatsappAuthorMode(value); setDirty(true);}}}>
        <Toggle type="button" value="registered">Profilo esistente</Toggle><Toggle type="button" value="unregistered">Senza account</Toggle>
      </ToggleGroup>
    </Field>}
{authorMode === "registered" ? <>
              <Field><FieldLabel htmlFor="create-user-search">Cerca utente</FieldLabel>
                <InputGroup><InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
                  <InputGroupInput id="create-user-search" placeholder="Nome, email o identificativo" value={search} aria-describedby="create-user-search-note"
                    onChange={(event) => {setSearch(event.target.value); setDirty(true);}} />
                </InputGroup>
                <FieldDescription id="create-user-search-note">Cerca almeno due caratteri.</FieldDescription>
              </Field>
              {user ? <div className="admin-create-chosen-user">
                <UserRound aria-hidden="true" /><div><strong>{user.name}</strong><p>{user.email}</p></div>
                <Button type="button" variant="ghost" size="sm" onClick={() => {setUserId(""); setDirty(true);}}>Cambia</Button>
              </div> : users.length ? <ul className="admin-create-user-results" aria-label="Utenti trovati">
                {users.map(item => <li key={item.id}><Button type="button" variant="ghost" className="admin-create-user-result" onClick={() => chooseUser(item.id)}>
                  <span><strong>{item.name}</strong><span>{item.email}</span></span><span className="admin-create-result-meta">{item.profiles.length} {item.profiles.length === 1 ? "profilo" : "profili"}</span>
                </Button></li>)}
              </ul> : <Empty><EmptyHeader><EmptyTitle>Nessun utente trovato</EmptyTitle><EmptyDescription>Prova un altro nome o passa a «Senza account».</EmptyDescription></EmptyHeader></Empty>}
              {user && (availableProfiles.length ? <Field>
                <FieldLabel htmlFor="create-profile">Profilo autore <span className="admin-create-required" aria-hidden="true">*</span></FieldLabel>
                <PrototypeSelect id="create-profile" required value={profile?.id ?? ""} options={availableProfiles.map(item => ({value: item.id, label: `${item.name} · ${profileLabel(item.type)}`}))}
                  placeholder="Seleziona il profilo" onChange={(next) => {setProfilesByUser(previous => ({...previous, [profileKey]: next})); setDirty(true); setImageError("");}} />
              </Field> : <Empty><EmptyHeader><EmptyTitle>{mode === "whatsapp" ? "Nessun profilo compatibile" : "Questo utente non ha profili"}</EmptyTitle><EmptyDescription>Scegli un profilo attivo e completo oppure il percorso senza account.</EmptyDescription></EmptyHeader></Empty>)}
              {profile && <div className="admin-create-profile-recap"><div><Check aria-hidden="true" /><strong>{profile.name}</strong></div>
                <p>{profile.facts}</p><p>{profile.city}, {profile.region}</p><span>Dati del profilo in sola lettura</span>
              </div>}
              {mode === "whatsapp" && profile && whatsappAnalysis && <>
                {[["name", profile.name, "Nome del profilo"], ["region", profile.region, "Regione del profilo"], ["city", profile.city, "Città del profilo"]].map(([key, current, label]) => {
                  const imported = textValue(whatsappAnalysis.profile, key);
                  return imported && imported.toLocaleLowerCase("it-IT").trim() !== current.toLocaleLowerCase("it-IT").trim() ?
                    <Alert key={key} variant="warning" role="note"><AlertDescription>{label}: il messaggio riporta «{imported}», il profilo selezionato «{current}». Il profilo non verrà modificato: verifica l’attribuzione.</AlertDescription></Alert> : null;
                })}
                {profile.sports && Array.isArray(whatsappAnalysis.profile.sports) && whatsappAnalysis.profile.sports.some(item => typeof item === "string" && !profile.sports!.includes(item)) &&
                  <Alert variant="warning" role="note"><AlertDescription>La tipologia di calcio del messaggio è diversa da quella del profilo. Verifica l’attribuzione o scegli il percorso senza account; i dati del profilo esistente non verranno modificati.</AlertDescription></Alert>}
              </>}
            </> : <>
              <Field data-field-path="author.email"><FieldLabel htmlFor="create-author-email">Email di riferimento <span className="admin-create-optional">Facoltativa</span></FieldLabel>
                <Input id="create-author-email" type="email" maxLength={254} placeholder="nome@esempio.it" value={authorEmail} aria-describedby="create-author-email-note"
                  onChange={(event) => {setAuthorEmail(event.target.value); setDirty(true);}} />
                <FieldDescription id="create-author-email-note">Riferimento privato. Non viene creato un account né inviata una verifica email.</FieldDescription>
              </Field>
              {mode !== "whatsapp" && <Field><FieldLabel htmlFor="create-anonymous-profile-type">Tipologia del profilo <span className="admin-create-required" aria-hidden="true">*</span></FieldLabel>
                <PrototypeSelect id="create-anonymous-profile-type" required value={anonymousType} options={PROFILE_OPTIONS.filter(option => !["servizi-consulenze", "creators"].includes(option.value))}
                  onChange={(next) => {if (PROFILE_OPTIONS.some(option => option.value === next)) {setAnonymousType(next as MockProfileType); setDirty(true); setImageError("");}}} />
              </Field>}

            </>}
  </FieldGroup>;

  const receipt = receipts[draftKey];
  const submissionId = submissionIds[draftKey] ?? "";
  const input: CreationInput | null = type ? {version: 1, submissionId, authorMode, profileId: profile?.id ?? null, profileType: type, teamType,
    profile: authorMode === "unregistered" ? profileValues : {}, announcement: values, referenceEmail: authorMode === "unregistered" ? authorEmail : "", authorized: true, approveImmediately, provenance: draft.provenance} : null;
  const errors = input && (attempted || Boolean(draft.provenance)) ? validateCreation(input, profile).filter(issue => attempted || issue.path !== "authorized") : [];
  const warnings: FieldIssue[] = [];
  if (draft.provenance) {
    const extraction = reextractSource(draft.provenance);
    const allFields = [...(type ? PROFILE_FIELDS[type] : []), ...fields];
    for (const issue of extraction.issues) {
      const definition = allFields.find(field => field.label.toLocaleLowerCase("it-IT") === issue.label.toLocaleLowerCase("it-IT"));
      const key = issue.path?.split(".")[1] ?? definition?.key ?? (/zona|localit|comune/i.test(issue.label) ? "locations" : /calcio/i.test(issue.label) ? "sports" : /anno di nascita/i.test(issue.label) ? "birthDate" : /contatt/i.test(issue.label) ? "publicEmail" : null);
      if (!key) continue;
      const scope = issue.scope === "profile" ? "profile" : "announcement";
      if (scope === "profile" && authorMode === "registered") continue;
      const current = scope === "profile" ? profileValues[key] : values[key], original = scope === "profile" ? extraction.profile[key] : extraction.announcement[key];
      if (JSON.stringify(current) === JSON.stringify(original)) warnings.push({path: `${scope}.${key}`, severity: "warning", code: "WHATSAPP_REVIEW", message: issue.reason, tab: scope === "profile" ? "profile" : /public/.test(key) ? "contacts" : "announcement"});
    }
  }
  const issues = [...errors, ...serverIssues.filter(issue => !errors.some(e => e.path === issue.path)), ...warnings.filter(w => !errors.some(e => e.path === w.path))];
  useEffect(() => {
    if (hydrated && ownerKey && !submissionIds[draftKey]) setSubmissionIds(previous => ({...previous, [draftKey]: crypto.randomUUID()}));
  }, [hydrated, ownerKey, draftKey, submissionIds, setSubmissionIds]);
  const authorSearchQuery = userId && !user ? userId : search.trim();
  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    const query = authorSearchQuery;
    if (query.length < 2) return;
    const timer = setTimeout(() => {
      setSearchState("Ricerca in corso…");
      void searchAnnouncementAuthors(query).then(response => {if (!active) return;
        if (response.status === "ok") {setAuthors(response.authors); setSearchState(response.authors.length ? "" : "Nessun utente trovato.");}
        else setSearchState("Ricerca non disponibile. Riprova.");
      }).catch(() => {if (active) setSearchState("Ricerca non disponibile. Riprova.");});
    }, 350);
    return () => {active = false; clearTimeout(timer);};
  }, [hydrated, authorSearchQuery, setAuthors]);
  useEffect(() => {
    const state = store.getState();
    if (hydrated && mode === "whatsapp" && !state.whatsappAnalysis && state.whatsappContent) {
      const extraction = extractStoredMessage(state);
      setWhatsappAnalysis(extraction); store.getState().setField("whatsappResult", extraction);
    }
  }, [hydrated, mode, store, setWhatsappAnalysis]);
  useEffect(() => {
    if (!hydrated || !submissionId) return;
    let active = true;
    void getCreationReceipt(submissionId).then(response => {if (!active) return;
      if (response.status === "ok") {setReceipts(previous => ({...previous, [draftKey]: response.receipt})); setResult(response);}
      else if (response.status === "absent") setReceipts(previous => {const next = {...previous}; delete next[draftKey]; return next;});
    }).catch(() => {});
    return () => {active = false;};
  }, [hydrated, submissionId, draftKey, setReceipts, setResult]);
  useEffect(() => {
    if (mode === "whatsapp" && whatsappApplied && whatsappAnalysis && !whatsappAnalysis.blocked && authorMode === "registered" && profile && !draft.provenance) {
      applyWhatsAppExtraction(store, whatsappAnalysis, true);
    }
  }, [mode, whatsappApplied, whatsappAnalysis, authorMode, profile, draft.provenance, store]);
  const currentSource = useAnnouncementDraft(state => mode !== "whatsapp" || whatsappSourceIsCurrent(state, state.drafts[draftKey]?.provenance));
  const changeTab = (tab: CreateTab) => {setActiveTab(tab);};
  function showIssues(next: FieldIssue[]) {
    setServerIssues(next); const first = next.find(issue => issue.severity === "error");
    if (first) {setActiveTab(first.tab); setTimeout(() => (formRef.current?.querySelector(`[data-field-path="${first.path}"] input, [data-field-path="${first.path}"] textarea, [data-field-path="${first.path}"] button`) as HTMLElement | null)?.focus(), 0);}
  }
  async function save() {
    if (busy || receipt || result && ["unknown", "conflict", "consumed"].includes(result.status)) return;
    setAttempted(true); setServerIssues([]); setResult(null);
    if (!input) {showIssues([{path: "author.profileId", severity: "error", code: "REQUIRED", message: "Seleziona l’autore e la tipologia del profilo.", tab: "author"}]); return;}
    const next = validateCreation(input, profile);
    if (!currentSource) next.unshift({path: "author._form", severity: "error", code: "WHATSAPP_STALE", message: "Analizza il messaggio e risolvi le informazioni segnalate prima dell’invio.", tab: "author"});
    if (next.length) {showIssues(next); return;}
    setBusy(true);
    try {
      const request = {...input};
      if (draft.image) {
        const bytes = await draft.image.arrayBuffer(); const digest = await crypto.subtle.digest("SHA-256", bytes);
        request.image = {hash: Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join(""), mime: draft.image.type, size: draft.image.size};
      } else if (draft.imageMeta) {showIssues([{path: "announcement.image", severity: "error", code: "RESELECT_IMAGE", message: "Seleziona nuovamente l’immagine o rimuovila.", tab: "contacts"}]); return;}
      store.getState().setField("lastRequest", request);
      const data = new FormData(); data.set("input", JSON.stringify(request)); if (draft.image) data.set("image", draft.image);
      const response = await submitAnnouncement(data); setResult(response);
      if (response.status === "ok") {setReceipts(previous => ({...previous, [draftKey]: response.receipt})); setDirty(false); setActiveTab("review");}
      else if (response.status === "invalid") showIssues(response.issues);
    } catch {setResult({status: "unknown"});} finally {setBusy(false);}
  }
  const profilePanel = authorMode === "registered" ? <div className="admin-create-profile-recap"><strong>{profile?.name ?? "Seleziona un profilo nella tab Autore"}</strong><p>{profile?.facts}</p><p>{profile?.city} {profile?.region}</p><p>Dati del profilo in sola lettura.</p></div> : <FieldGroup>
              {anonymousType && <>
                <PrototypeFields prefix={`create-profile-${anonymousType}`} fields={PROFILE_FIELDS[anonymousType]} values={profileValues} onChange={changeProfile} />
                {anonymousType === "servizi-consulenze" && <FieldDescription>Il profilo richiede almeno un recapito tra email e telefono, distinto dai contatti pubblici dell’annuncio.</FieldDescription>}
                <div className="admin-create-subsection"><h3>Località del profilo</h3>
                  <PrototypeFields prefix={`create-profile-location-${anonymousType}`} fields={locationFields(["giocatore", "squadra", "staff-sportivo", "arbitro", "campi-impianti-sportivi"].includes(anonymousType), anonymousType === "campi-impianti-sportivi")} values={profileValues} onChange={changeProfile} />
                </div>
                <details className="admin-create-profile-more"><summary>Collegamenti del profilo</summary>
                  <PrototypeFields prefix={`create-profile-social-${anonymousType}`} fields={[PROFILE_SOCIAL_FIELD]} values={profileValues} onChange={changeProfile} />
                </details>
              </>}
  </FieldGroup>;
  const currentIndex = CREATE_TABS.findIndex(tab => tab.value === activeTab);
  if (!hydrated) return <p role="status">Ripristino della bozza…</p>;
  return <FieldIssuesProvider value={issues}><div className="admin-create-prototype">
    {storageError && <Alert variant="warning"><AlertDescription>La bozza resta in memoria: il browser non consente il salvataggio nella scheda.</AlertDescription></Alert>}
    <form ref={formRef} noValidate onSubmit={event => {event.preventDefault(); void save();}} className="admin-create-form">
      <Tabs.Root value={activeTab} onValueChange={value => changeTab(value as CreateTab)}>
        <Tabs.List className="admin-create-tabs" aria-label="Creazione annuncio">{CREATE_TABS.map((tab,index) => <Tabs.Tab key={tab.value} value={tab.value}><span aria-hidden="true">{index+1}</span> {tab.label}{issues.some(issue => issue.tab === tab.value && issue.severity === "error") && <span className="admin-create-tab-error" aria-label="Errori">!</span>}</Tabs.Tab>)}</Tabs.List>
        <fieldset disabled={busy || Boolean(receipt)} className="admin-create-editable">
        {issues.filter(issue => issue.tab === activeTab && (issue.path.endsWith("._form") || activeTab === "profile" && authorMode === "registered")).map((issue,index) => <Alert key={index} variant="danger" role="alert"><AlertDescription>{issue.message}{authorMode === "registered" && " Il profilo esistente deve essere completato sulla piattaforma principale prima di creare l’annuncio."}</AlertDescription></Alert>)}
        <Tabs.Panel value="author"><FormSection id="create-author" number="01" title="Autore dell’annuncio">
          <FieldGroup><ToggleGroup className="admin-create-author-mode" aria-label="Autore dell’annuncio" value={[mode]} onValueChange={next => {const selected=next[0]; if (selected === "registered" || selected === "unregistered" || selected === "whatsapp") {setMode(selected); setDirty(true); setServerIssues([]);}}}>
            <Toggle type="button" value="registered">Utente registrato</Toggle><Toggle type="button" value="unregistered">Senza account</Toggle><Toggle type="button" value="whatsapp">Da WhatsApp</Toggle>
          </ToggleGroup>
          {mode === "whatsapp" ? <WhatsAppImport onChange={() => setDirty(true)} onApply={applyWhatsApp} needsConfirmation={result => hasWhatsAppEdits(store.getState(), result)}>{authorFields}</WhatsAppImport> : authorFields}
          {searchState && authorMode === "registered" && <p role="status">{searchState}</p>}
          {issues.filter(issue => issue.tab === "author").map(issue => <p key={issue.path} className="admin-create-error" role="alert">{issue.message}</p>)}
          </FieldGroup>
        </FormSection></Tabs.Panel>
        <Tabs.Panel value="profile"><FormSection id="create-profile-data" number="02" title="Profilo">{profilePanel}</FormSection></Tabs.Panel>
        <Tabs.Panel value="announcement"><FormSection id="create-data" number="03" title="Annuncio">
          {type ? <FieldGroup>
            {type === "squadra" && mode !== "whatsapp" && <Field><FieldLabel htmlFor="create-team-type">Tipo di annuncio <span className="admin-create-required">*</span></FieldLabel><PrototypeSelect id="create-team-type" required value={teamType} options={TEAM_OPTIONS.map(value => ({value,label:value}))} onChange={next => {setTeamTypes(previous => ({...previous,[ownerKey]:next as MockTeamType})); setDirty(true);}} /></Field>}
            <PrototypeFields prefix="create-title" fields={[{key:"title",label:"Titolo",maxLength:50}]} values={values} onChange={changeValue} />
            <FieldDescription>Titolo automatico: {autoTitle}</FieldDescription>
            <PrototypeFields prefix="create-data" fields={fields} values={values} onChange={changeValue} />
            {!sponsor && <PrototypeFields prefix="create-location" fields={locationFields(singleLocation,singleLocation)} values={values} onChange={changeValue} />}
          </FieldGroup> : <p>Seleziona prima l’autore e il profilo.</p>}
        </FormSection></Tabs.Panel>
        <Tabs.Panel value="contacts"><FormSection id="create-contacts" number="04" title="Contatti e media">
          <FieldGroup><FieldDescription>{authorMode === "unregistered" ? "Indica almeno un contatto pubblico autorizzato." : "I contatti pubblici sono facoltativi."}</FieldDescription>
          <PrototypeFields prefix="create-contacts" fields={[{key:"publicEmail",label:"Email pubblica",kind:"email",maxLength:254},{key:"publicPhone",label:"Telefono pubblico",kind:"tel",maxLength:40},{key:"contactRole",label:"Referente / ruolo contatto",maxLength:120},{key:"link",label:"Collegamento",maxLength:2048}]} values={values} onChange={changeValue} />
          {isMinor && <p>Per un minorenne usa un recapito autorizzato del genitore o tutore.</p>}
          <Field data-field-path="announcement.image"><FieldLabel htmlFor="create-image">Immagine</FieldLabel><Input ref={fileRef} id="create-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => {const file=event.target.files?.[0]; if (!file) return; if (!["image/png","image/jpeg","image/webp"].includes(file.type) || file.size>5*1024*1024) {setImageError("Scegli PNG, JPEG o WebP fino a 5 MB."); return;} setImageError(""); setDirty(true); setDrafts(previous => ({...previous,[draftKey]:{...draft,image:file,imageMeta:{name:file.name,size:file.size,type:file.type}}}));}} />
          <FieldDescription>PNG, JPEG o WebP, massimo 5 MB.</FieldDescription>
          {(imageError || issues.find(issue => issue.path === "announcement.image")) && <p className="admin-create-error">{imageError || issues.find(issue => issue.path === "announcement.image")?.message}</p>}
          {draft.image && <ImagePreview file={draft.image} />}
          {draft.imageMeta && <div><p>{draft.imageMeta.name}{!draft.image && " — seleziona di nuovo il file per inviarlo"}</p><Button type="button" variant="outline" onClick={() => {setDrafts(previous => ({...previous,[draftKey]:{...draft,image:null,imageMeta:undefined}})); if (fileRef.current) fileRef.current.value=""; setDirty(true);}}>Rimuovi immagine</Button></div>}
          </Field></FieldGroup>
        </FormSection></Tabs.Panel>
        <Tabs.Panel value="review"><FormSection id="create-review" number="05" title="Riepilogo">
          <div className="admin-create-summary-content w-full">
          {input ? <CreationPreview input={input} profile={profile} image={draft.image} imageName={draft.imageMeta?.name} /> : <p>Seleziona l’autore e il profilo.</p>}
          {draft.provenance && <details><summary>Fonte WhatsApp · privata</summary><p className="whitespace-pre-wrap">{draft.provenance.rawText}</p><p>{draft.provenance.messageUrl}</p>{reextractSource(draft.provenance).unmapped.map((item,i) => <p key={i}><strong>{item.label}:</strong> {item.value}</p>)}</details>}
          <Field orientation="horizontal"><Checkbox id="create-approve-immediately" checked={approveImmediately} disabled={busy || Boolean(receipt) || (!approveImmediately && approvalAvailable !== true) || Boolean(result && ["unknown","conflict","consumed"].includes(result.status))} onCheckedChange={checked => setApproveImmediately(checked === true)} /><FieldLabel htmlFor="create-approve-immediately">Approva direttamente l’annuncio</FieldLabel></Field>
          {approvalAvailable === false && <p className="admin-create-note">Approvazione diretta non disponibile. Verifica la migrazione del database.</p>}
          <p className="admin-create-note">{approveImmediately ? "L’annuncio sarà pubblicato direttamente." : "L’annuncio sarà inviato in revisione."} Per più regioni verrà creata una pubblicazione per regione.</p>
          {issues.length > 0 && <ul>{issues.map((issue,i) => <li key={`${issue.path}-${i}`}><button type="button" className={issue.severity === "error" ? "admin-create-error" : "admin-create-warning"} onClick={() => showIssues([issue])}>{issue.message}</button></li>)}</ul>}
          </div>
        </FormSection></Tabs.Panel>
        </fieldset>
        <div className="admin-create-step-actions"><Button type="button" variant="outline" disabled={!currentIndex || busy} onClick={() => changeTab(CREATE_TABS[currentIndex-1].value)}>Indietro</Button>
          {currentIndex < CREATE_TABS.length-1 ? <Button type="button" onClick={() => changeTab(CREATE_TABS[currentIndex+1].value)}>Continua</Button> : <Button type="submit" disabled={busy || Boolean(receipt) || Boolean(result && ["unknown","conflict","consumed"].includes(result.status))}>{busy ? "Invio in corso…" : receipt ? "Annuncio creato" : "Crea annuncio"}</Button>}
        </div>
      </Tabs.Root>
    </form>
    {receipt && <Alert variant="success" role="status"><AlertDescription><strong>Annuncio creato.</strong> {receipt.announcements.length} pubblicazioni {receipt.announcements.every(item => item.status === "pubblicato") ? "approvate" : "salvate"}. La compilazione è conservata.<ul>{receipt.announcements.map(item => <li key={item.id}>{item.region ?? "Senza regione"} · {item.status}</li>)}</ul></AlertDescription></Alert>}
    {result && result.status !== "ok" && result.status !== "invalid" && <Alert variant="danger" role="alert"><AlertDescription>{result.status === "unknown" ? "Esito da verificare. Premi Verifica invio prima di riprovare." : result.status === "conflict" ? "Questo invio corrisponde a una compilazione diversa. Avvia un nuovo annuncio." : result.status === "denied" ? "Accesso non autorizzato. Accedi di nuovo come Admin." : result.status === "consumed" ? "Questo invio è già stato utilizzato. Avvia un nuovo annuncio." : "Servizio non disponibile. La bozza è conservata; puoi riprovare."}</AlertDescription></Alert>}
    <div className="admin-create-step-actions"><Button type="button" variant="outline" disabled={busy || !submissionId} onClick={() => {setBusy(true); void getCreationReceipt(submissionId).then(response => {if (response.status === "ok") {setReceipts(previous => ({...previous,[draftKey]:response.receipt})); setResult(response);} else if (response.status === "absent") setResult(null); else setResult(response);}).finally(() => setBusy(false));}}>Verifica invio</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setResetOpen(true)}>{receipt || result && ["conflict","consumed"].includes(result.status) ? "Nuovo annuncio" : "Svuota bozza"}</Button><GuardedLink href="/annunci" prefetch={false}>Torna agli annunci</GuardedLink></div>
    <AlertDialog open={resetOpen} onOpenChange={setResetOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Iniziare una nuova compilazione?</AlertDialogTitle><AlertDialogDescription>I campi conservati verranno svuotati. Gli annunci già creati rimangono salvati.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annulla</AlertDialogCancel><AlertDialogAction onClick={() => {store.getState().clear(true); setResetOpen(false);}}>Nuova compilazione</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div></FieldIssuesProvider>;
}

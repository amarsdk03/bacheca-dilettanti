import {
	ANNOUNCEMENT_FIELDS,
	type MockField,
	type MockProfileType,
	type MockTeamType,
	type MockValues,
	PROFILE_FIELDS,
	REGIONS,
	TEAM_FIELDS
} from "./prototype-model";

export interface WhatsAppTarget {id: string; label: string; profileType: MockProfileType; teamType?: MockTeamType}
export const WHATSAPP_TARGETS: readonly WhatsAppTarget[] = [
  {id: "player", label: "Giocatore cerca squadra", profileType: "giocatore"},
  {id: "team-player", label: "Squadra cerca giocatori", profileType: "squadra", teamType: "Cerca giocatori"},
  {id: "staff", label: "Staff cerca opportunità", profileType: "staff-sportivo"},
  {id: "team-staff", label: "Squadra / società cerca staff", profileType: "squadra", teamType: "Cerca staff"},
  {id: "match", label: "Cercasi amichevole", profileType: "squadra", teamType: "Cerca partite amichevoli"},
  {id: "sponsor", label: "Società cerca sponsor", profileType: "squadra", teamType: "Cerca sponsor"},
  {id: "facility", label: "Campo sportivo disponibile per affitto", profileType: "campi-impianti-sportivi"},
  {id: "event", label: "Torneo / evento calcistico", profileType: "torneo-evento"},
];
export interface ExtractionItem {label: string; value: string}
export interface ExtractionIssue extends ExtractionItem {scope: "source" | "profile" | "announcement"; reason: string; path?: string}
export interface WhatsAppImportContext {channelRegion: string; resolvedRegion?: string}
export interface WhatsAppProvenance {source: "whatsapp"; messageUrl: string; rawText: string; context?: WhatsAppImportContext; manualTarget?: string}
export interface WhatsAppExtraction {
  target: WhatsAppTarget | null;
  profile: MockValues;
  announcement: MockValues;
  recognized: ExtractionItem[];
  issues: ExtractionIssue[];
  unmapped: ExtractionItem[];
  provenance: WhatsAppProvenance;
  blocked: boolean;
  regionConflict?: string[];
}
export const WHATSAPP_CONTENT_LIMIT = 50_000;
const norm = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const clean = (value: string) => value.trim().replace(/^\[([^\[\]]+)\]$/, "$1").trim();
const aliasGroups: Record<string, string[]> = {
  zone: ["zona", "località", "localita"], sport: ["calcio", "tipologia del campo", "tipologia campo"],
  roles: ["ruolo", "ruoli", "ruoli cercati"], birthYear: ["anno", "anno di nascita"],
  soughtCategory: ["categoria cercata", "categoria settore cercato"], category: ["categoria", "categoria squadra"],
  history: ["categorie precedenti"], contact: ["contatto", "contatti", "contatti per prenotazioni", "candidature"],
  requirements: ["requisiti"], period: ["periodo", "data periodo"], availability: ["disponibilità"], years: ["annate età", "categorie annate"],
  figure: ["figura", "figura cercata", "ruolo cercato"], qualifications: ["qualifiche"], experience: ["esperienza"],
  travel: ["spostamento", "trasferta"], commitment: ["impegno", "disponibilità oraria"], time: ["orario"],
  field: ["campo disponibile"], opponent: ["avversario cercato"], notes: ["note", "informazioni aggiuntive"],
  company: ["società", "nome società"], sector: ["categoria settore", "settore"], search: ["ricerca"], offer: ["visibilità offerta"],
  cost: ["costo", "costo iscrizione"], services: ["servizi inclusi"], venue: ["campo"], teams: ["squadre cercate"],
  level: ["livello indicativo"], prizes: ["premi"], deadline: ["scadenza iscrizioni"], registration: ["iscrizioni"],
  tasks: ["mansioni"], requiredExperience: ["esperienza richiesta"], eventName: ["nome torneo", "nome evento", "nome torneo evento"],
};
const aliases = new Map(Object.entries(aliasGroups).flatMap(([key, labels]) => labels.map(label => [norm(label), key] as const)));
const headings: Record<string, string> = {
  "giocatore cerca squadra": "player", "squadra cerca giocatori": "team-player", "squadra cerca giocatore": "team-player",
  "staff cerca opportunita": "staff", "squadra cerca staff": "team-staff", "societa cerca staff": "team-staff",
  "cercasi amichevole": "match", "squadra cerca amichevole": "match", "societa cerca sponsor": "sponsor", "squadra cerca sponsor": "sponsor",
  "campo sportivo disponibile per affitto": "facility", "torneo evento calcistico": "event",
};
const placeholders = new Set(["provincia citta", "comune provincia", "regione", "ruolo i", "ruoli", "anno di nascita", "categoria", "categoria o settore", "squadre categorie", "contatto autorizzato", "referente autorizzato", "requisiti", "figura", "ruolo figura", "qualifiche patentini corsi", "esperienza principale", "disponibilita", "nome societa", "nome campo indirizzo", "categoria livello", "categoria livello avversario", "numero squadre", "data o periodo", "orario indicativo", "eventuali note", "breve descrizione qui", "scadenza", "modalita iscrizione", "esperienza richiesta", "giorni orari indicativi", "giorni allenamento gara", "premi o riconoscimenti se previsti", "link"]);
const footer = (line: string) => norm(line).startsWith("bacheca dilettanti raccoglie il contatto e lo inoltra alla societa") || norm(line).startsWith("accordi e valutazioni restano direttamente tra le parti");

export function whatsappLinkError(value: string): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol === "https:" && !url.username && !url.password && !url.port &&
      (url.hostname === "wa.me" || url.hostname === "whatsapp.com" || url.hostname.endsWith(".whatsapp.com"))) return null;
  } catch { /* Kept as a field error; never dereference an imported URL. */ }
  return "Inserisci un collegamento HTTPS di WhatsApp valido oppure lascia vuoto il campo.";
}

function isoDate(value: string): string | null {
  const match = /^(?:(\d{4})-(\d{2})-(\d{2})|(\d{1,2})[/.](\d{1,2})[/.](\d{4}))$/.exec(value);
  if (!match) return null;
  const year = Number(match[1] ?? match[6]), month = Number(match[2] ?? match[5]), day = Number(match[3] ?? match[4]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : null;
}

/** No requests, account lookup, persistence or inference of missing identities. */
export function parseWhatsAppMessage(rawText: string, messageUrl = "", manualTarget = "", context?: WhatsAppImportContext): WhatsAppExtraction {
  const result: WhatsAppExtraction = {target: null, profile: {}, announcement: {}, recognized: [], issues: [], unmapped: [],
    provenance: {source: "whatsapp", rawText, messageUrl: messageUrl.trim(), ...(context ? {context} : {}), ...(manualTarget ? {manualTarget} : {})}, blocked: false};
  const issue = (label: string, value: string, reason: string, scope: ExtractionIssue["scope"] = "announcement", field?: string) => {
    const keys: Record<string, string> = {zona: "locations", "zona hashtag": "locations", "calcio hashtag": "sports", calcio: "sports", "anno di nascita": "birthDate", ruoli: "mainRoles", "squadre cercate": "teams", "annate eta": "yearFrom", "data periodo": "dateFrom", orario: "timeFrom", costo: result.target?.id === "facility" ? "hourlyCost" : "cost", "contatti pubblici": "publicEmail", "contatto candidature": "publicPhone", descrizione: "description"};
    const key = field ?? keys[norm(label)];
    const path = key ? `${scope}.${key}` : undefined;
    if (!result.issues.some(item => item.label === label && item.reason === reason)) result.issues.push({label, value, reason, scope, ...(path ? {path} : {})});
  };
  if (!rawText.trim() || rawText.length > WHATSAPP_CONTENT_LIMIT) {
    issue("Contenuto", "", rawText.trim() ? "Il messaggio supera 50.000 caratteri." : "Incolla il contenuto del messaggio.", "source");
    result.blocked = true; return result;
  }
  if (context && !REGIONS.includes(context.channelRegion)) {
    issue("Regione del canale", "", "Seleziona la regione del canale.", "source", "channelRegion");
    result.blocked = true;
  }
  const linkError = whatsappLinkError(messageUrl);
  if (linkError) { issue("Link messaggio", messageUrl, linkError, "source"); result.blocked = true; }
  const lines = rawText.replace(/\r\n?/g, "\n").split("\n");
  const first = lines.findIndex(line => Boolean(line.trim()));
  const headerId = headings[norm(lines[first])];
  result.target = WHATSAPP_TARGETS.find(target => target.id === (manualTarget || headerId)) ?? null;
  if (!result.target) {
    issue("Tipologia", lines[first], "Intestazione non riconosciuta: scegli manualmente la tipologia e analizza di nuovo.", "source");
    result.blocked = true;
  } else result.recognized.push({label: "Tipologia", value: result.target.label});

  const fields = new Map<string, {label: string; values: string[]}>();
  const free: string[] = [], hashtags: string[] = [];
  let active: string | null = null;
  for (const rawLine of lines.slice(first + 1)) {
    const line = rawLine.trim();
    if (!line) { active = null; continue; }
    if (/^#/.test(line)) { hashtags.push(line); active = null; continue; }
    if (footer(line)) { active = null; continue; }
    const match = /^([^:]{1,90}):\s*(.*)$/.exec(line);
    const key = match ? aliases.get(norm(match[1])) : undefined;
    if (match && (key || /^[^A-Za-zÀ-ž0-9\s*_[#]/.test(line))) {
      active = key ?? `unknown:${norm(match[1])}`;
      const entry = fields.get(active) ?? {label: match[1].replace(/^[^A-Za-zÀ-ž0-9]+/, "").trim(), values: []};
      entry.values.push(match[2]); fields.set(active, entry);
    } else if (active) {
      const entry = fields.get(active)!;
      entry.values[entry.values.length - 1] += `\n${line}`;
    } else if (!placeholders.has(norm(clean(line)))) free.push(line);
  }
  const mapped = new Set<string>();
  const conflicting = (key: string) => new Set(fields.get(key)?.values.map(clean) ?? []).size > 1;
  for (const [key, entry] of fields) if (conflicting(key)) {
    issue(entry.label, entry.values.join(" | "), "Valori duplicati discordanti: nessuno è stato scelto automaticamente.");
  }
  const read = (key: string) => {
    const entry = fields.get(key);
    if (!entry) return "";
    const values = [...new Set(entry.values.map(clean))];
    if (values.length > 1) { issue(entry.label, values.join(" | "), "Valori duplicati discordanti: nessuno è stato scelto automaticamente."); return ""; }
    const value = values[0] ?? "";
    if (!value || placeholders.has(norm(value))) { issue(entry.label, value, "Valore assente o segnaposto del template."); return ""; }
    return value;
  };
  const remember = (key: string, label: string, value: string) => { mapped.add(key); result.recognized.push({label, value}); };
  const put = (key: string, destination: "profile" | "announcement", field: string, value: MockValues[string], label?: string) => {
    result[destination][field] = value;
    remember(key, label ?? fields.get(key)?.label ?? field, typeof value === "string" ? value : JSON.stringify(value));
  };
  const target = result.target;
  if (!target) {
    result.unmapped = [...fields.values()].map(entry => ({label: entry.label, value: entry.values.join("\n")}));
    if (free.length) result.unmapped.push({label: "Testo libero", value: free.join("\n")});
    return result;
  }
  const profileFields = PROFILE_FIELDS[target.profileType];
  const announcementFields = target.profileType === "squadra" ? TEAM_FIELDS[target.teamType!] : ANNOUNCEMENT_FIELDS[target.profileType];
  const select = (key: string, destination: "profile" | "announcement", field: string, explicitValue?: string) => {
    const value = explicitValue ?? read(key);
    if (!value) return;
    const definition = (destination === "profile" ? profileFields : announcementFields).find(item => item.key === field);
    if (!definition) return;
    const options = definition?.options ?? [];
    const synonyms: Record<string, string> = {"vice allenatore": "Allenatore in seconda", "preparatore dei portieri": "Preparatore portieri", "segretario a": "Segretario"};
    const matchOption = (item: string) => {
      const needle = norm(synonyms[norm(item)] ?? item);
      const direct = options.find(option => norm(option) === needle); if (direct) return direct;
      // Resolve a category only when both the group and label are unambiguous.
      // Gender is not guessed from an emoji or from the template's heading.
      const sport = fields.get("sport")?.values.join(" ") ?? "";
      const matches = options.filter(option => option.includes("::") && norm(option.split("::")[1]) === needle && (!sport || norm(option.split("::")[0]).includes(norm(sport))));
      return matches.length === 1 ? matches[0] : undefined;
    };
    const whole = matchOption(value);
    const parts = whole ? [whole] : value.replace(/segretario\/a/gi, "Segretario").split(/[,;\n/]+/).map(part => part.trim()).filter(Boolean);
    const matches = parts.map(matchOption);
    if (matches.some(item => !item)) issue(fields.get(key)?.label ?? field, value, "Una o più opzioni non sono riconoscibili nel catalogo. Verifica il valore originale.", destination, field);
    const found = [...new Set(matches.filter((item): item is string => Boolean(item)))];
    if (definition?.kind === "select" && (found.length !== 1 || matches.some(item => !item))) {
      issue(fields.get(key)?.label ?? field, value, "Il campo richiede una sola scelta univoca.", destination); return;
    }
    if (found.length) {
      result[destination][field] = definition?.kind === "select" ? found[0] : found;
      if (matches.every(Boolean)) mapped.add(key);
      result.recognized.push({label: `${destination === "profile" ? "Profilo" : "Annuncio"} · ${definition?.label ?? field}`, value: found.join(", ")});
    }
  };
  const text = (key: string, destination: "profile" | "announcement", field: string) => {
    const value = read(key);
    const definition = (destination === "profile" ? profileFields : announcementFields).find(item => item.key === field);
    if (value && value.length <= (definition?.maxLength ?? (definition?.kind === "textarea" ? 5000 : 160))) put(key, destination, field, value);
    else if (value) issue(fields.get(key)!.label, value, "Il testo supera la lunghezza del campo: conserva e verifica il valore originale.", destination);
  };

  // A single region can be extracted without guessing a city/province's region.
  const zone = read("zone");
  const regionMatches = (input: string) => REGIONS.filter(region => (` ${norm(input)} `).includes(` ${norm(region)} `));
  const explicitRegions = regionMatches(zone);
  const compactRegion = (value: string) => norm(value).replace(/\s/g, "");
  const hashRegions = [...new Set(hashtags.flatMap(line => [...line.matchAll(/#\[?([^\s#\]]+)/g)]
    .flatMap(match => REGIONS.filter(region => compactRegion(region) === compactRegion(match[1])))))];
  let region = explicitRegions.length === 1 ? explicitRegions[0] : explicitRegions.length === 0 && hashRegions.length === 1 ? hashRegions[0] : "";
  const conflict = explicitRegions.length > 0 && hashRegions.some(item => !explicitRegions.includes(item));
  const candidates = [...new Set([...explicitRegions, ...hashRegions, ...(context && REGIONS.includes(context.channelRegion) ? [context.channelRegion] : [])])];
  const regionalConflict = conflict || explicitRegions.length > 1 || hashRegions.length > 1 || Boolean(context && candidates.length > 1);
  const resolved = Boolean(context?.resolvedRegion && candidates.includes(context.resolvedRegion));
  if (context?.resolvedRegion && !resolved) {
    result.blocked = true;
    issue("Regione da usare", context.resolvedRegion, "Scegli una delle regioni individuate nel messaggio o nel canale.", "source", "resolvedRegion");
  }
  if (regionalConflict && !resolved) {
    result.regionConflict = candidates;
    if (context) result.blocked = true;
    issue("Zona / hashtag", [zone, ...hashtags].join("\n"), "Regioni discordanti: scegli la regione da usare.", "source", "resolvedRegion");
  }
  if (resolved) region = context!.resolvedRegion!;
  else if (!region && !regionalConflict && context && REGIONS.includes(context.channelRegion)) region = context.channelRegion;
  if (region && (!regionalConflict || resolved) && !conflicting("zone")) {
    const remainder = zone.split(/[,;/]+/).map(clean).filter(item => norm(item) !== norm(region));
    const city = explicitRegions.length === 1 && explicitRegions[0] === region && remainder.length === 1 && !/provincia|regione/i.test(remainder[0]) ? remainder[0] : "";
    const location = {region, city};
    if (["giocatore", "squadra", "staff-sportivo", "arbitro", "campi-impianti-sportivi"].includes(target.profileType)) Object.assign(result.profile, location);
    else result.profile.locations = [location];
    if (target.profileType === "campi-impianti-sportivi") Object.assign(result.announcement, location);
    else if (target.id !== "sponsor") result.announcement.locations = [location];
    if (city || !zone || norm(zone) === norm(region)) mapped.add("zone");
    result.recognized.push({label: "Località suggerita", value: [city, region].filter(Boolean).join(", ")});
    if (zone && !city && norm(zone) !== norm(region)) issue("Zona", zone, "Regione riconosciuta; città e provincia non sono distinguibili con certezza.");
    if (target.id === "facility" && !city) issue("Città/comune dell’impianto", zone, "La sede dell’impianto richiede una città o un comune espliciti.");
  } else issue("Zona", zone, "Regione non determinabile con certezza: completa le località del profilo e dell’annuncio.");

  const sport = read("sport");
  const hashSports = [...new Set(hashtags.flatMap(line => [...line.matchAll(/#\[?Calcio(11|8|7|5)\b/gi)].map(match => `Calcio ${match[1]}`)))];
  const normalizedSport = sport.replace(/(?:calcio\s*(?:a\s*)?)/gi, "").split(/[,;/]+/).map(item => item.trim()).filter(Boolean);
  const explicitSports = normalizedSport.filter(item => /^(11|8|7|5)$/.test(item)).map(item => `Calcio ${item}`);
  const sportsConflict = sport && hashSports.some(item => !explicitSports.includes(item));
  if (sportsConflict) issue("Calcio / hashtag", sport, "Le tipologie di calcio nel testo e negli hashtag sono discordanti.");
  if (sport && explicitSports.length !== normalizedSport.length) issue("Calcio", sport, "Tipologia di calcio non riconosciuta: verifica il valore originale.");
  const football = sport ? explicitSports.join(" / ") : hashSports.join(" / ");
  if (!sportsConflict && !conflicting("sport") && (!sport || explicitSports.length === normalizedSport.length)) {
    if (profileFields.some(field => field.key === "sports")) select("sport", "profile", "sports", football);
    if (announcementFields.some(field => field.key === "sports")) select("sport", "announcement", "sports", football);
    if (!profileFields.some(field => field.key === "sports") && !announcementFields.some(field => field.key === "sports") && football) {
      issue("Calcio", football, "Dato riconosciuto da conservare nella revisione: il profilo selezionato determina la tipologia di calcio.");
    }
  }

  if (target.profileType === "squadra") text("company", "profile", "name");
  if (profileFields.some(field => field.key === "currentCategory")) select("category", "profile", "currentCategory");
  if (target.id === "player" || target.id === "team-player") {
    const rawRoles = read("roles");
    const roleParts = rawRoles.split(/[,;/]+/).map(clean).filter(Boolean);
    const specificOptions = PROFILE_FIELDS.giocatore.find(field => field.key === "specificRoles")!.options!;
    const parents: Record<string, string> = {"Terzino destro": "Difensore", "Difensore centrale": "Difensore", "Terzino sinistro": "Difensore", "Mediano": "Centrocampista", "Esterno sinistro": "Centrocampista", "Centrocampista Centrale": "Centrocampista", "Esterno destro": "Centrocampista", "Trequartista": "Centrocampista", "Ala sinistra": "Attaccante", "Seconda Punta": "Attaccante", "Ala destra": "Attaccante", "Punta centrale": "Attaccante"};
    const primaryOptions = ["Portiere", "Difensore", "Centrocampista", "Attaccante"];
    const primary: string[] = [], specific: string[] = [];
    for (const part of roleParts) {
      const exact = specificOptions.find(item => norm(item) === norm(part));
      const broad = primaryOptions.find(item => norm(item) === norm(part));
      if (exact) { specific.push(exact); primary.push(parents[exact]); }
      else if (broad) primary.push(broad);
      else issue("Ruoli", part, "Ruolo non riconosciuto nel catalogo: completalo manualmente.");
    }
    const destination = target.id === "player" ? "profile" : "announcement";
    if (primary.length) {
      result[destination].mainRoles = [...new Set(primary)]; result[destination].specificRoles = [...new Set(specific)];
      result.recognized.push({label: "Ruoli", value: [...new Set([...primary, ...specific])].join(", ")});
      if (!result.issues.some(item => item.label === "Ruoli")) mapped.add("roles");
    }
  }
  if (target.id === "player") {
    select("soughtCategory", "announcement", "categories");
    const year = read("birthYear");
    if (year) issue("Anno di nascita", year, /^\d{4}$/.test(year) ? "Anno presente, ma giorno e mese sono assenti: completa la data di nascita senza inventarli." : "Anno di nascita non univoco.", "profile");
  }
  if (target.id === "staff") { select("figure", "profile", "figures"); select("soughtCategory", "announcement", "categories"); }
  if (target.id === "team-staff") {
    select("figure", "announcement", "figures"); text("sector", "announcement", "teamGroup");
    if (!read("sector")) text("category", "announcement", "teamGroup");
    text("requirements", "announcement", "requirements");
  }
  if (target.id === "match") text("opponent", "announcement", "opponentCategory");
  if (target.id === "sponsor") { text("sector", "announcement", "sector"); text("offer", "announcement", "offer"); }
  if (target.id === "facility") {
    const services = read("services").replace(/^✅\s*/gm, "").split("\n").map(clean).filter(line => norm(line) && !/^servizio (?:n )?\d+$/.test(norm(line))).join("\n");
    if (services && services.length <= 5000) put("services", "announcement", "services", services);
  }
  if (target.id === "event") {
    text("eventName", "announcement", "eventName");
    const teams = read("teams");
    if (/^\d+$/.test(teams) && Number(teams) >= 1 && Number(teams) <= 100000) put("teams", "announcement", "teams", teams);
    else if (teams) issue("Squadre cercate", teams, "Inserisci un numero di squadre intero e univoco.");
    select("registration", "announcement", "registration");
  }
  const travel = read("travel");
  if (travel && announcementFields.some(field => field.key === "travel")) select("travel", "announcement", "travel", /^(si|no|da valutare)$/.test(norm(travel)) ? (norm(travel) === "si" ? "Sì" : norm(travel) === "no" ? "No" : "Da valutare") : travel);
  const years = read("years");
  if (years && ["team-player", "event"].includes(target.id)) {
    const range = /^(\d{4})(?:\s*(?:-|\/|al|a)\s*(\d{4}))?$/.exec(years);
    if (range && Number(range[1]) >= 1900 && Number(range[2] ?? range[1]) <= new Date().getFullYear() && Number(range[1]) <= Number(range[2] ?? range[1])) {
      put("years", "announcement", "yearFrom", range[1]); result.announcement.yearTo = range[2] ?? range[1];
    } else issue("Annate/età", years, "Intervallo non univoco, invertito o espresso come età: indica le annate manualmente.");
  }
  if (target.id === "match") {
    const period = read("period");
    const dates = period.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}[/.]\d{4}/g) ?? [];
    const remainder = period.replace(/\d{4}-\d{2}-\d{2}|\d{1,2}[/.]\d{1,2}[/.]\d{4}/g, "").replace(/\b(?:dal|al|da|a)\b/gi, "").replace(/[\s–—-]/g, "");
    if (dates.length >= 1 && dates.length <= 2 && !remainder && dates.every(date => isoDate(date))) {
      const from = isoDate(dates[0]!)!, to = isoDate(dates[1] ?? dates[0]!)!;
      if (from <= to) { put("period", "announcement", "dateFrom", from); result.announcement.dateTo = to; }
      else issue("Data/periodo", period, "La fine precede l’inizio.");
    } else if (period) issue("Data/periodo", period, "Data incompleta o periodo relativo: completa le date manualmente.");
    const time = read("time");
    const hours = /^(\d{1,2}):([0-5]\d)(?:\s*[-–—/]\s*(\d{1,2}):([0-5]\d))?$/.exec(time);
    if (hours && Number(hours[1]) < 24 && Number(hours[3] ?? hours[1]) < 24) {
      const from = `${hours[1].padStart(2, "0")}:${hours[2]}`;
      if (hours[3]) {
        const to = `${hours[3].padStart(2, "0")}:${hours[4]}`;
        if (from < to) { put("time", "announcement", "timeFrom", from); result.announcement.timeTo = to; }
        else issue("Orario", time, "Intervallo invertito o a cavallo della mezzanotte: verifica manualmente.");
      } else issue("Orario", time, "È presente solo l’inizio: il modulo richiede entrambi gli orari.");
    } else if (time) issue("Orario", time, "Orario non univoco: usa HH:MM oppure HH:MM–HH:MM.");
  }
  const cost = read("cost");
  if (cost && ["facility", "event"].includes(target.id)) {
    const zero = /^(?:gratuito|gratis|gratuita)$/i.test(cost);
    const amount = /^(?:da\s+|a partire da\s+)?(?:€\s*)?(\d+(?:\.\d{3})*(?:,\d{1,2})?|\d+\.\d{1,2})\s*(?:€|euro)?\s*(?:(?:\/\s*(?:h|1h|ora))|(?:all['’]ora)|(?:per\s+(?:ora|squadra|giocatore)))?$/i.exec(cost);
    const hourly = /\/\s*(?:h|1h|ora)\b|all['’]ora|per ora/i.test(cost);
    const eventUnit = /per (?:squadra|giocatore)/i.test(cost);
    if ((zero || amount) && (zero || (target.id === "facility" ? hourly : eventUnit && !hourly))) {
      const rawAmount = amount?.[1] ?? "0";
      const value = rawAmount.includes(",") ? rawAmount.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(rawAmount) ? rawAmount.replace(/\./g, "") : rawAmount;
      if (Number(value) <= 999999.99) {
        put("cost", "announcement", target.id === "facility" ? "hourlyCost" : "cost", value);
        if (/per squadra/i.test(cost)) result.announcement.unit = "Per squadra";
        if (/per giocatore/i.test(cost)) result.announcement.unit = "Per giocatore";
      } else issue("Costo", cost, "Importo oltre il limite del campo.");
    } else issue("Costo", cost, "Importo o unità non univoci: nessun costo è stato inventato.");
  }

  const contact = read("contact");
  if (contact) {
    const emailMatches = [...contact.matchAll(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map(match => match[0]);
    // Links are not telephone numbers; don't turn a wa.me path into public contact data.
    const withoutLinks = contact.replace(/https?:\/\/\S+/gi, " ").replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ");
    const phones = [...withoutLinks.matchAll(/(?:\+\d[\d ().-]{6,}\d|\b\d[\d ().-]{7,}\d\b)/g)].map(match => match[0].trim()).filter(value => {const n = value.replace(/\D/g, "").length; return n >= 8 && n <= 15;});
    const emails = [...new Set(emailMatches)], uniquePhones = [...new Set(phones)];
    if (emails.length === 1) put("contact", "announcement", "publicEmail", emails[0], "Email pubblica");
    if (uniquePhones.length === 1) put("contact", "announcement", "publicPhone", uniquePhones[0], "Telefono pubblico");
    const residue = contact.replace(/https?:\/\/\S+/gi, "LINK").replace(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "");
    const remaining = uniquePhones.reduce((value, phone) => value.replace(phone, ""), residue).replace(/[\s,;/|–—-]/g, "");
    if (remaining || emails.length > 1 || uniquePhones.length > 1 || !emails.length && !uniquePhones.length) {
      mapped.delete("contact"); issue("Contatto / candidature", contact, "Conserva nomi, link e istruzioni nella revisione; non identificano automaticamente l’autore né un recapito pubblico univoco.");
    }
  }
  if (!result.announcement.publicEmail && !result.announcement.publicPhone) issue("Contatti pubblici", "", "Da completare con almeno un’email o un telefono se scegli un autore senza account; facoltativi per un profilo esistente.");
  const description = [...free, read("notes")].filter(Boolean).join("\n\n");
  if (description && description.length <= 5000) {
    result.announcement.description = description;
    result.recognized.push({label: "Informazioni aggiuntive", value: description});
    if (read("notes")) mapped.add("notes");
  } else if (description) issue("Descrizione", description, "Oltre 5.000 caratteri: riduci il testo prima di inserirlo nel modulo.");

  for (const [key, entry] of fields) {
    const value = entry.values.join("\n");
    if (!mapped.has(key)) {
      result.unmapped.push({label: entry.label, value});
      if (!result.issues.some(item => norm(item.label) === norm(entry.label))) issue(entry.label, value, "Informazione senza una conversione strutturata certa: verifica o riportala manualmente nel campo appropriato.");
    }
  }
  if (description.length > 5000) result.unmapped.push({label: "Descrizione originale", value: description});
  if (hashtags.length) result.unmapped.push({label: "Hashtag originali", value: hashtags.join("\n")});
  const present = (value: MockValues[string] | undefined) => typeof value === "string" ? Boolean(value.trim()) : Boolean(value?.length);
  for (const [scope, definitions] of [["profile", profileFields], ["announcement", announcementFields]] as const) {
    for (const field of definitions.filter((field: MockField) => field.required)) if (!present(result[scope][field.key])) {
      issue(field.label, "", scope === "profile" ? "Da completare se crei un profilo senza account; il messaggio non contiene un dato certo." : "Dato obbligatorio da completare nel modulo.", scope, field.key);
    }
  }
  return result;
}



import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
	User,
	Users,
	Briefcase,
	MapPin,
	Ruler,
	Trophy,
	Phone,
	Mail,
	AtSign,
	ChevronsUpDown,
	Check,
	ShieldCheck,
	GraduationCap,
	CalendarDays,
} from "lucide-react";

// -----------------------------------------------------------------------------
// Dati statici
// -----------------------------------------------------------------------------

const REGIONI_ITALIANE = [
	"Abruzzo",
	"Basilicata",
	"Calabria",
	"Campania",
	"Emilia-Romagna",
	"Friuli-Venezia Giulia",
	"Lazio",
	"Liguria",
	"Lombardia",
	"Marche",
	"Molise",
	"Piemonte",
	"Puglia",
	"Sardegna",
	"Sicilia",
	"Toscana",
	"Trentino-Alto Adige",
	"Umbria",
	"Valle d'Aosta",
	"Veneto",
];

const SOCIAL_OPTIONS = [
	{ value: "instagram", label: "Instagram" },
	{ value: "tiktok", label: "TikTok" },
	{ value: "facebook", label: "Facebook" },
	{ value: "youtube", label: "YouTube" },
	{ value: "x", label: "X (Twitter)" },
];

// -----------------------------------------------------------------------------
// Funzioni gestione form (da implementare)
// -----------------------------------------------------------------------------

function handleSubmitGiocatore(event) {
	// TODO: gestire l'invio dei dati del giocatore
}

function handleSubmitSquadra(event) {
	// TODO: gestire l'invio dei dati della squadra
}

function handleSubmitStaff(event) {
	// TODO: gestire l'invio dei dati dello staff
}

function handleRegionToggle(regione) {
	// TODO: gestire selezione/deselezione regione
}

function handleFieldChange(field, value) {
	// TODO: gestire aggiornamento singolo campo
}

// -----------------------------------------------------------------------------
// Sotto-componenti riutilizzabili
// -----------------------------------------------------------------------------

function SectionHeading({ icon: Icon, title, description }) {
	return (
		<div className="flex items-start gap-3">
			<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
				<Icon className="h-4.5 w-4.5" />
			</div>
			<div>
				<h3 className="text-sm font-semibold leading-none">{title}</h3>
				{description && (
					<p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
				)}
			</div>
		</div>
	);
}

function RegioneSelector() {
	return (
		<div className="grid gap-2">
			<Label>
				Regione/i di appartenenza <span className="text-destructive">*</span>
			</Label>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						className="w-full justify-between font-normal text-muted-foreground"
						onClick={handleFieldChange}
					>
						Seleziona una o più regioni
						<ChevronsUpDown className="h-4 w-4 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
					<div className="max-h-64 overflow-y-auto p-1">
						{REGIONI_ITALIANE.map((regione) => (
							<button
								type="button"
								key={regione}
								onClick={() => handleRegionToggle(regione)}
								className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
							>
                <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-primary">
                  <Check className="hidden h-3 w-3" />
                </span>
								{regione}
							</button>
						))}
					</div>
				</PopoverContent>
			</Popover>
			<div className="flex flex-wrap gap-1.5 empty:hidden">
				{/* Badge di esempio per mostrare lo stato selezionato — nessuno stato reale collegato */}
				{/* <Badge variant="secondary">Veneto ×</Badge> */}
			</div>
			<p className="text-xs text-muted-foreground">
				Campo obbligatorio: è possibile selezionare più di una regione.
			</p>
		</div>
	);
}

function ProvinciaField() {
	return (
		<div className="grid gap-2">
			<Label htmlFor="provincia">Provincia</Label>
			<Input
				id="provincia"
				placeholder="Es. Verona"
				onChange={(e) => handleFieldChange("provincia", e.target.value)}
			/>
			<p className="text-xs text-muted-foreground">Campo facoltativo.</p>
		</div>
	);
}

function ContattiSection() {
	return (
		<div className="grid gap-6">
			<SectionHeading
				icon={Phone}
				title="Contatti"
				description="Inserisci almeno uno dei seguenti recapiti: email, telefono o username social."
			/>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="grid gap-2">
					<Label htmlFor="email" className="flex items-center gap-1.5">
						<Mail className="h-3.5 w-3.5 text-muted-foreground" />
						Indirizzo email
					</Label>
					<Input
						id="email"
						type="email"
						placeholder="nome.cognome@email.com"
						onChange={(e) => handleFieldChange("email", e.target.value)}
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="telefono" className="flex items-center gap-1.5">
						<Phone className="h-3.5 w-3.5 text-muted-foreground" />
						Numero di telefono
					</Label>
					<Input
						id="telefono"
						type="tel"
						placeholder="+39 333 1234567"
						onChange={(e) => handleFieldChange("telefono", e.target.value)}
					/>
				</div>
			</div>

			<div className="grid gap-3">
				<Label className="flex items-center gap-1.5">
					<AtSign className="h-3.5 w-3.5 text-muted-foreground" />
					Profilo social
				</Label>
				<div className="grid gap-3 sm:grid-cols-[180px_1fr]">
					<Select onValueChange={(value) => handleFieldChange("socialPlatform", value)}>
						<SelectTrigger>
							<SelectValue placeholder="Piattaforma" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Social più diffusi</SelectLabel>
								{SOCIAL_OPTIONS.map((social) => (
									<SelectItem key={social.value} value={social.value}>
										{social.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					<Input
						placeholder="@username"
						onChange={(e) => handleFieldChange("socialUsername", e.target.value)}
					/>
				</div>
			</div>

			<p className="text-xs text-muted-foreground">
				* È necessario compilare almeno uno tra email, telefono o username social.
			</p>
		</div>
	);
}

// -----------------------------------------------------------------------------
// Form: Giocatori
// -----------------------------------------------------------------------------

function GiocatoreForm() {
	return (
		<form onSubmit={handleSubmitGiocatore} className="grid gap-8">
			{/* Localizzazione */}
			<div className="grid gap-4">
				<SectionHeading
					icon={MapPin}
					title="Localizzazione"
					description="Area geografica di riferimento del giocatore."
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<RegioneSelector />
					<ProvinciaField />
				</div>
			</div>

			<Separator />

			{/* Dati anagrafici */}
			<div className="grid gap-4">
				<SectionHeading
					icon={User}
					title="Dati anagrafici"
					description="Informazioni personali di base."
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="grid gap-2">
						<Label htmlFor="nome-giocatore">Nome</Label>
						<Input id="nome-giocatore" placeholder="Mario" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="cognome-giocatore">Cognome</Label>
						<Input id="cognome-giocatore" placeholder="Rossi" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="data-nascita">Data di nascita</Label>
						<Input id="data-nascita" type="date" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="nazionalita">Nazionalità</Label>
						<Input id="nazionalita" placeholder="Italiana" />
					</div>
				</div>
			</div>

			<Separator />

			{/* Caratteristiche fisiche */}
			<div className="grid gap-4">
				<SectionHeading
					icon={Ruler}
					title="Caratteristiche fisiche"
					description="Dati utili per la valutazione tecnica."
				/>
				<div className="grid gap-4 sm:grid-cols-3">
					<div className="grid gap-2">
						<Label htmlFor="altezza">Altezza (cm)</Label>
						<Input id="altezza" type="number" placeholder="180" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="peso">Peso (kg)</Label>
						<Input id="peso" type="number" placeholder="75" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="piede">Piede preferito</Label>
						<Select>
							<SelectTrigger id="piede">
								<SelectValue placeholder="Seleziona" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="destro">Destro</SelectItem>
								<SelectItem value="sinistro">Sinistro</SelectItem>
								<SelectItem value="ambidestro">Ambidestro</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<Separator />

			{/* Profilo sportivo */}
			<div className="grid gap-4">
				<SectionHeading
					icon={Trophy}
					title="Profilo sportivo"
					description="Ruolo, esperienza e livello agonistico."
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="grid gap-2">
						<Label htmlFor="ruolo">Ruolo principale</Label>
						<Input id="ruolo" placeholder="Es. Centrocampista" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="ruolo-secondario">Ruolo secondario</Label>
						<Input id="ruolo-secondario" placeholder="Es. Terzino" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="squadra-attuale">Squadra attuale</Label>
						<Input id="squadra-attuale" placeholder="Es. A.S.D. Verona Calcio" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="categoria">Categoria/campionato</Label>
						<Select>
							<SelectTrigger id="categoria">
								<SelectValue placeholder="Seleziona categoria" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="serie-a">Serie A</SelectItem>
								<SelectItem value="serie-b">Serie B</SelectItem>
								<SelectItem value="serie-c">Serie C</SelectItem>
								<SelectItem value="serie-d">Serie D</SelectItem>
								<SelectItem value="eccellenza">Eccellenza</SelectItem>
								<SelectItem value="promozione">Promozione</SelectItem>
								<SelectItem value="giovanili">Settore giovanile</SelectItem>
								<SelectItem value="amatoriale">Amatoriale</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="anni-esperienza">Anni di esperienza</Label>
						<Input id="anni-esperienza" type="number" placeholder="5" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="numero-maglia">Numero di maglia preferito</Label>
						<Input id="numero-maglia" type="number" placeholder="10" />
					</div>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="palmares">Palmarès / riconoscimenti</Label>
					<Textarea
						id="palmares"
						placeholder="Elenca eventuali titoli, premi individuali o riconoscimenti ottenuti"
						className="min-h-20"
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="bio-giocatore">Presentazione breve</Label>
					<Textarea
						id="bio-giocatore"
						placeholder="Racconta in poche righe il tuo percorso sportivo"
						className="min-h-24"
					/>
				</div>
			</div>

			<Separator />

			{/* Disponibilità */}
			<div className="grid gap-4">
				<SectionHeading
					icon={CalendarDays}
					title="Disponibilità"
					description="Stato contrattuale e apertura a nuove proposte."
				/>
				<div className="grid gap-3">
					<Label>Stato attuale</Label>
					<RadioGroup defaultValue="svincolato" className="grid gap-2 sm:grid-cols-3">
						<div className="flex items-center gap-2 rounded-md border p-3">
							<RadioGroupItem value="tesserato" id="stato-tesserato" />
							<Label htmlFor="stato-tesserato" className="font-normal">
								Tesserato
							</Label>
						</div>
						<div className="flex items-center gap-2 rounded-md border p-3">
							<RadioGroupItem value="svincolato" id="stato-svincolato" />
							<Label htmlFor="stato-svincolato" className="font-normal">
								Svincolato
							</Label>
						</div>
						<div className="flex items-center gap-2 rounded-md border p-3">
							<RadioGroupItem value="in-prova" id="stato-prova" />
							<Label htmlFor="stato-prova" className="font-normal">
								In prova
							</Label>
						</div>
					</RadioGroup>
				</div>
				<div className="flex items-center gap-2">
					<Checkbox id="disponibile-trasferte" />
					<Label htmlFor="disponibile-trasferte" className="font-normal">
						Disponibile a trasferirsi fuori regione
					</Label>
				</div>
			</div>

			<Separator />

			<ContattiSection />

			<div className="flex justify-end gap-3">
				<Button type="button" variant="outline">
					Annulla
				</Button>
				<Button type="submit">Salva profilo giocatore</Button>
			</div>
		</form>
	);
}

// -----------------------------------------------------------------------------
// Form: Squadre
// -----------------------------------------------------------------------------

function SquadraForm() {
	return (
		<form onSubmit={handleSubmitSquadra} className="grid gap-8">
			{/* Localizzazione */}
			<div className="grid gap-4">
				<SectionHeading
					icon={MapPin}
					title="Localizzazione"
					description="Area geografica in cui opera la squadra."
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<RegioneSelector />
					<ProvinciaField />
				</div>
			</div>

			<Separator />

			{/* Identità del club */}
			<div className="grid gap-4">
				<SectionHeading
					icon={Users}
					title="Identità del club"
					description="Informazioni generali sulla società."
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="grid gap-2">
						<Label htmlFor="nome-squadra">Nome della squadra</Label>
						<Input id="nome-squadra" placeholder="Es. A.S.D. Verona Calcio" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="anno-fondazione">Anno di fondazione</Label>
						<Input id="anno-fondazione" type="number" placeholder="1985" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="sport">Disciplina sportiva</Label>
						<Select>
							<SelectTrigger id="sport">
								<SelectValue placeholder="Seleziona disciplina" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="calcio">Calcio</SelectItem>
								<SelectItem value="basket">Basket</SelectItem>
								<SelectItem value="volley">Pallavolo</SelectItem>
								<SelectItem value="rugby">Rugby</SelectItem>
								<SelectItem value="futsal">Calcio a 5</SelectItem>
								<SelectItem value="altro">Altro</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="colori-sociali">Colori sociali</Label>
						<Input id="colori-sociali" placeholder="Es. Giallo e blu" />
					</div>
				</div>
			</div>

			<Separator />

			{/* Struttura e campionato */}
			<div className="grid gap-4">
				<SectionHeading
					icon={Trophy}
					title="Struttura e campionato"
					description="Livello competitivo e organizzazione della rosa."
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="grid gap-2">
						<Label htmlFor="categoria-squadra">Categoria/campionato</Label>
						<Select>
							<SelectTrigger id="categoria-squadra">
								<SelectValue placeholder="Seleziona categoria" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="serie-a">Serie A</SelectItem>
								<SelectItem value="serie-b">Serie B</SelectItem>
								<SelectItem value="serie-c">Serie C</SelectItem>
								<SelectItem value="serie-d">Serie D</SelectItem>
								<SelectItem value="eccellenza">Eccellenza</SelectItem>
								<SelectItem value="promozione">Promozione</SelectItem>
								<SelectItem value="giovanili">Settore giovanile</SelectItem>
								<SelectItem value="amatoriale">Amatoriale</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="numero-tesserati">Numero tesserati</Label>
						<Input id="numero-tesserati" type="number" placeholder="25" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="sede-campo">Sede/campo di gioco</Label>
						<Input id="sede-campo" placeholder="Es. Stadio Comunale, Via Roma 12" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="presidente">Nome del presidente</Label>
						<Input id="presidente" placeholder="Nome e cognome" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="allenatore-squadra">Allenatore attuale</Label>
						<Input id="allenatore-squadra" placeholder="Nome e cognome" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="affiliazione">Ente di affiliazione</Label>
						<Select>
							<SelectTrigger id="affiliazione">
								<SelectValue placeholder="Seleziona ente" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="figc">FIGC</SelectItem>
								<SelectItem value="fip">FIP</SelectItem>
								<SelectItem value="fipav">FIPAV</SelectItem>
								<SelectItem value="fir">FIR</SelectItem>
								<SelectItem value="csi">CSI</SelectItem>
								<SelectItem value="altro">Altro</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Checkbox id="cerca-giocatori" />
					<Label htmlFor="cerca-giocatori" className="font-normal">
						Attualmente alla ricerca di nuovi giocatori
					</Label>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="descrizione-squadra">Descrizione della società</Label>
					<Textarea
						id="descrizione-squadra"
						placeholder="Racconta la storia, i valori e gli obiettivi della squadra"
						className="min-h-24"
					/>
				</div>
			</div>

			<Separator />

			<ContattiSection />

			<div className="flex justify-end gap-3">
				<Button type="button" variant="outline">
					Annulla
				</Button>
				<Button type="submit">Salva profilo squadra</Button>
			</div>
		</form>
	);
}

// -----------------------------------------------------------------------------
// Form: Staff
// -----------------------------------------------------------------------------

function StaffForm() {
	return (
		<form onSubmit={handleSubmitStaff} className="grid gap-8">
			{/* Localizzazione */}
			<div className="grid gap-4">
				<SectionHeading
					icon={MapPin}
					title="Localizzazione"
					description="Area geografica di riferimento."
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<RegioneSelector />
					<ProvinciaField />
				</div>
			</div>

			<Separator />

			{/* Dati anagrafici */}
			<div className="grid gap-4">
				<SectionHeading
					icon={User}
					title="Dati anagrafici"
					description="Informazioni personali di base."
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="grid gap-2">
						<Label htmlFor="nome-staff">Nome</Label>
						<Input id="nome-staff" placeholder="Giulia" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="cognome-staff">Cognome</Label>
						<Input id="cognome-staff" placeholder="Bianchi" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="data-nascita-staff">Data di nascita</Label>
						<Input id="data-nascita-staff" type="date" />
					</div>
				</div>
			</div>

			<Separator />

			{/* Ruolo professionale */}
			<div className="grid gap-4">
				<SectionHeading
					icon={Briefcase}
					title="Ruolo professionale"
					description="Funzione ricoperta all'interno dello staff tecnico o dirigenziale."
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="grid gap-2">
						<Label htmlFor="ruolo-staff">Ruolo</Label>
						<Select>
							<SelectTrigger id="ruolo-staff">
								<SelectValue placeholder="Seleziona ruolo" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="allenatore">Allenatore</SelectItem>
								<SelectItem value="vice-allenatore">Vice allenatore</SelectItem>
								<SelectItem value="preparatore-atletico">Preparatore atletico</SelectItem>
								<SelectItem value="preparatore-portieri">Preparatore portieri</SelectItem>
								<SelectItem value="fisioterapista">Fisioterapista</SelectItem>
								<SelectItem value="team-manager">Team manager</SelectItem>
								<SelectItem value="direttore-sportivo">Direttore sportivo</SelectItem>
								<SelectItem value="osservatore">Osservatore/scout</SelectItem>
								<SelectItem value="dirigente">Dirigente</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="squadra-appartenenza">Squadra di appartenenza</Label>
						<Input id="squadra-appartenenza" placeholder="Es. A.S.D. Verona Calcio" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="anni-esperienza-staff">Anni di esperienza</Label>
						<Input id="anni-esperienza-staff" type="number" placeholder="8" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="categoria-staff">Categoria seguita</Label>
						<Select>
							<SelectTrigger id="categoria-staff">
								<SelectValue placeholder="Seleziona categoria" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="prima-squadra">Prima squadra</SelectItem>
								<SelectItem value="giovanili">Settore giovanile</SelectItem>
								<SelectItem value="primavera">Primavera</SelectItem>
								<SelectItem value="scuola-calcio">Scuola calcio</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<Separator />

			{/* Qualifiche */}
			<div className="grid gap-4">
				<SectionHeading
					icon={GraduationCap}
					title="Qualifiche e certificazioni"
					description="Titoli professionali conseguiti."
				/>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="grid gap-2">
						<Label htmlFor="patentino">Patentino/licenza</Label>
						<Input id="patentino" placeholder="Es. UEFA B" />
					</div>
					<div className="grid gap-2">
						<Label htmlFor="ente-rilascio">Ente di rilascio</Label>
						<Input id="ente-rilascio" placeholder="Es. FIGC - Settore Tecnico" />
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Checkbox id="disponibile-staff" />
					<Label htmlFor="disponibile-staff" className="font-normal">
						Attualmente disponibile per nuovi incarichi
					</Label>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="bio-staff">Presentazione breve</Label>
					<Textarea
						id="bio-staff"
						placeholder="Descrivi il tuo percorso professionale e il tuo metodo di lavoro"
						className="min-h-24"
					/>
				</div>
			</div>

			<Separator />

			<ContattiSection />

			<div className="flex justify-end gap-3">
				<Button type="button" variant="outline">
					Annulla
				</Button>
				<Button type="submit">Salva profilo staff</Button>
			</div>
		</form>
	);
}

// -----------------------------------------------------------------------------
// Homepage
// -----------------------------------------------------------------------------

export default function PubblicaAnnuncio() {
	return (
		<div className="min-h-screen bg-muted/30 py-10">
			<div className="mx-auto max-w-3xl px-4">
				<header className="mb-8">
					<Badge variant="secondary" className="mb-3 gap-1.5">
						<ShieldCheck className="h-3.5 w-3.5" />
						Nuovo profilo
					</Badge>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
						Crea il tuo profilo sportivo
					</h1>
					<p className="mt-2 text-muted-foreground">
						Seleziona la categoria più adatta e compila i campi richiesti per
						entrare a far parte della community.
					</p>
				</header>

				<Card>
					<CardHeader>
						<Tabs defaultValue="giocatori">
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="giocatori" className="gap-2">
									<User className="h-4 w-4" />
									Giocatori
								</TabsTrigger>
								<TabsTrigger value="squadre" className="gap-2">
									<Users className="h-4 w-4" />
									Squadre
								</TabsTrigger>
								<TabsTrigger value="staff" className="gap-2">
									<Briefcase className="h-4 w-4" />
									Staff
								</TabsTrigger>
							</TabsList>

							<CardContent className="px-0 pt-6">
								<TabsContent value="giocatori" className="mt-0">
									<CardTitle className="mb-1 text-lg">Profilo giocatore</CardTitle>
									<CardDescription className="mb-6">
										Inserisci i tuoi dati per farti scoprire da squadre e
										osservatori.
									</CardDescription>
									<GiocatoreForm />
								</TabsContent>

								<TabsContent value="squadre" className="mt-0">
									<CardTitle className="mb-1 text-lg">Profilo squadra</CardTitle>
									<CardDescription className="mb-6">
										Presenta la tua società sportiva e trova nuovi talenti.
									</CardDescription>
									<SquadraForm />
								</TabsContent>

								<TabsContent value="staff" className="mt-0">
									<CardTitle className="mb-1 text-lg">Profilo staff</CardTitle>
									<CardDescription className="mb-6">
										Registra le tue competenze professionali nel mondo dello
										sport.
									</CardDescription>
									<StaffForm />
								</TabsContent>
							</CardContent>
						</Tabs>
					</CardHeader>
				</Card>

				<CardFooter className="mt-6 justify-center px-0">
					<p className="text-center text-xs text-muted-foreground">
						I campi contrassegnati con * sono obbligatori. I tuoi dati saranno
						trattati nel rispetto della normativa sulla privacy.
					</p>
				</CardFooter>
			</div>
		</div>
	);
}
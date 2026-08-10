"use client";

import {
	formatContatti,
	PremiumLinkRecap,
	RecapField,
	RegioniRecap,
} from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapHelpers";
import {
	type TipologiaAnnuncioNuova,
	useAnnuncioAziendeEntiStore,
	useAnnuncioProfessionistiStudiStore,
	useAnnuncioTorneoEventoStore,
} from "@/features/pubblica-annuncio/state/AnnuncioNuoveTipologie.store";

function OptionalRecapField({label, value}: {label: string; value: string}) {
	if (value.trim() === "") return null;
	return <RecapField label={label} wide>{value}</RecapField>;
}

function RecapAziendeEnti() {
	const data = useAnnuncioAziendeEntiStore();

	return (
		<div>
			<p className="mb-1 text-muted-foreground">Dettagli azienda / ente</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<RecapField label="Nome / ragione sociale">{data.nomeRagioneSociale || "—"}</RecapField>
				<RecapField label="Tipologia di attività">{data.tipologiaAttivita || "—"}</RecapField>
				<RecapField label="Contatto">{data.contatto || "—"}</RecapField>
				<RecapField label="Sede">{data.sede || "—"}</RecapField>
				<OptionalRecapField label="Servizi offerti" value={data.serviziOfferti} />
				<RegioniRecap
					titolo="Zona operativa"
					regioni={data.regioniInteressate}
					cittaComuniPerRegione={data.cittaComuniPerRegione}
				/>
				<OptionalRecapField label="Categorie / realtà a cui si rivolge" value={data.categorieDestinatarie} />
				<OptionalRecapField label="Esperienza / presentazione" value={data.esperienzaPresentazione} />
				<OptionalRecapField label="Qualifiche / certificazioni" value={data.qualificheCertificazioni} />
				<OptionalRecapField label="Descrizione / info aggiuntive" value={data.infoAggiuntive} />
				<PremiumLinkRecap link={data.linkAnnuncio} />
			</dl>
		</div>
	);
}

const MODALITA_SERVIZIO_LABELS: Record<string, string> = {
	"in-presenza": "In presenza",
	online: "Online",
	entrambe: "Entrambe",
};

const DISPONIBILITA_LABELS: Record<string, string> = {
	si: "Sì",
	no: "No",
};

function RecapProfessionistiStudi() {
	const data = useAnnuncioProfessionistiStudiStore();

	return (
		<div>
			<p className="mb-1 text-muted-foreground">Dettagli professionista / studio</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<RecapField label="Nome e cognome">{data.nomeCognome || "—"}</RecapField>
				<RecapField label="Figura professionale">{data.figuraProfessionale || "—"}</RecapField>
				<RecapField label="Specializzazione">{data.specializzazione || "—"}</RecapField>
				<RecapField label="Modalità del servizio">{MODALITA_SERVIZIO_LABELS[data.modalitaServizio] || "Non specificata"}</RecapField>
				<RecapField label="Disponibilità agli spostamenti">{DISPONIBILITA_LABELS[data.disponibilitaSpostamenti] || "Non specificata"}</RecapField>
				<RecapField label="Contatti" wide>{formatContatti(data.contatti)}</RecapField>
				<OptionalRecapField label="Servizi offerti" value={data.serviziOfferti} />
				<RegioniRecap
					titolo="Zona operativa"
					regioni={data.regioniInteressate}
					cittaComuniPerRegione={data.cittaComuniPerRegione}
				/>
				<OptionalRecapField label="Categorie / realtà a cui si rivolge" value={data.categorieDestinatarie} />
				<OptionalRecapField label="Qualifiche / titoli / abilitazioni" value={data.qualificheTitoliAbilitazioni} />
				<OptionalRecapField label="Esperienza" value={data.esperienza} />
				<OptionalRecapField label="Info aggiuntive" value={data.infoAggiuntive} />
				<PremiumLinkRecap link={data.linkAnnuncio} />
			</dl>
		</div>
	);
}

const MODALITA_ISCRIZIONE_LABELS: Record<string, string> = {
	libera: "Libera",
	"posti-limitati": "Posti limitati",
};

function RecapTorneoEvento() {
	const data = useAnnuncioTorneoEventoStore();
	const annate = data.annataDa || data.annataA
		? [data.annataDa, data.annataA].filter(Boolean).join(" – ")
		: "—";
	const costoPer = data.costoPer === "giocatore" ? "per giocatore" : "per squadra";

	return (
		<div>
			<p className="mb-1 text-muted-foreground">Dettagli torneo / evento</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<RecapField label="Nome torneo / evento" wide>{data.nome}</RecapField>
				<RegioniRecap
					titolo="Luogo"
					regioni={data.regioniInteressate}
					cittaComuniPerRegione={data.cittaComuniPerRegione}
				/>
				<RecapField label="Modalità di iscrizione">{MODALITA_ISCRIZIONE_LABELS[data.modalitaIscrizione] || "Non specificata"}</RecapField>
				<RecapField label="Annate ammesse">{annate}</RecapField>
				<RecapField label="Posti per squadre">{data.numeroPostiSquadre || "—"}</RecapField>
				<RecapField label="Costo partecipazione">{data.costoPartecipazione ? `${data.costoPartecipazione} EUR ${costoPer}` : "—"}</RecapField>
				<OptionalRecapField label="Informazioni aggiuntive" value={data.infoAggiuntive} />
				<PremiumLinkRecap link={data.linkAnnuncio} />
			</dl>
		</div>
	);
}

export default function RecapAnnuncioNuovaTipologia({tipologia}: {tipologia: TipologiaAnnuncioNuova}) {
	switch (tipologia) {
		case "aziende-enti":
			return <RecapAziendeEnti />;
		case "professionisti-studi":
			return <RecapProfessionistiStudi />;
		case "torneo-evento":
			return <RecapTorneoEvento />;
	}
}

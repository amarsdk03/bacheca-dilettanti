"use client";

import {
	formatContatti,
	PremiumImageRecap,
	PremiumLinkRecap,
	RecapField,
	RegioniRecap,
} from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapHelpers";
import {useAnnuncioProfessionistiStudiStore} from "@/features/pubblica-annuncio/state/AnnuncioProfessionistiStudi.store";
import {
	DISPONIBILITA_SPOSTAMENTI_PROFESSIONISTA_OPTIONS,
	getOptionLabel,
	MODALITA_SERVIZIO_OPTIONS,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

function OptionalRecapField({label, value}: {label: string; value: string}) {
	if (value.trim() === "") return null;
	return <RecapField label={label} wide>{value}</RecapField>;
}

export default function RecapAnnuncioProfessionistiStudi() {
	const data = useAnnuncioProfessionistiStudiStore();

	return (
		<div>
			<p className="mb-1 text-muted-foreground">Dettagli professionista / studio</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<RecapField label="Nome">{data.nome || "—"}</RecapField>
				<RecapField label="Cognome">{data.cognome || "—"}</RecapField>
				<RecapField label="Figura professionale">{data.figuraProfessionale || "—"}</RecapField>
				<RecapField label="Specializzazione">{data.specializzazione || "—"}</RecapField>
				<RecapField label="Modalità del servizio">{getOptionLabel(MODALITA_SERVIZIO_OPTIONS, data.modalitaServizio) || "Non specificata"}</RecapField>
				<RecapField label="Disponibilità agli spostamenti">{getOptionLabel(DISPONIBILITA_SPOSTAMENTI_PROFESSIONISTA_OPTIONS, data.disponibilitaSpostamenti) || "Non specificata"}</RecapField>
				<RecapField label="Contatti" wide>{formatContatti(data.contatti)}</RecapField>
				<OptionalRecapField label="Servizi offerti" value={data.serviziOfferti} />
				<RegioniRecap regioni={data.regioniInteressate} cittaComuniPerRegione={data.cittaComuniPerRegione} />
				<OptionalRecapField label="Categorie / realtà a cui si rivolge" value={data.categorieDestinatarie} />
				<OptionalRecapField label="Qualifiche / titoli / abilitazioni" value={data.qualificheTitoliAbilitazioni} />
				<OptionalRecapField label="Esperienza" value={data.esperienza} />
				<OptionalRecapField label="Info aggiuntive" value={data.infoAggiuntive} />
				<PremiumImageRecap image={data.immagineAnnuncio} />
				<PremiumLinkRecap link={data.linkAnnuncio} />
			</dl>
		</div>
	);
}

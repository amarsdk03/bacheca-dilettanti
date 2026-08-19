"use client";

import {
	formatContatti,
	PremiumImageRecap,
	PremiumLinkRecap,
	RecapField,
	RegioniRecap,
} from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapHelpers";
import {useAnnuncioAziendeEntiStore} from "@/features/pubblica-annuncio/state/AnnuncioAziendeEnti.store";

function OptionalRecapField({label, value}: {label: string; value: string}) {
	if (value.trim() === "") return null;
	return <RecapField label={label} wide>{value}</RecapField>;
}

export default function RecapAnnuncioAziendeEnti() {
	const data = useAnnuncioAziendeEntiStore();

	return (
		<div>
			<p className="mb-1 text-muted-foreground">Dettagli azienda / ente</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<RecapField label="Nome / ragione sociale">{data.nomeRagioneSociale || "—"}</RecapField>
				<RecapField label="Tipologia di attività">{data.tipologiaAttivita || "—"}</RecapField>
				<RecapField label="Contatti" wide>{formatContatti(data.contatti)}</RecapField>
				<RecapField label="Sede">{data.sede || "—"}</RecapField>
				<OptionalRecapField label="Servizi offerti" value={data.serviziOfferti} />
				<RegioniRecap regioni={data.regioniInteressate} cittaComuniPerRegione={data.cittaComuniPerRegione} />
				<OptionalRecapField label="Categorie / realtà a cui si rivolge" value={data.categorieDestinatarie} />
				<OptionalRecapField label="Esperienza / presentazione" value={data.esperienzaPresentazione} />
				<OptionalRecapField label="Qualifiche / certificazioni" value={data.qualificheCertificazioni} />
				<OptionalRecapField label="Descrizione / info aggiuntive" value={data.infoAggiuntive} />
				<PremiumImageRecap image={data.immagineAnnuncio} />
				<PremiumLinkRecap link={data.linkAnnuncio} />
			</dl>
		</div>
	);
}

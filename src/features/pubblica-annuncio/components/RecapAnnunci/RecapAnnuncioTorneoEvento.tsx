"use client";

import {
	formatContatti,
	PremiumImageRecap,
	PremiumLinkRecap,
	RecapField,
	RegioniRecap,
} from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapHelpers";
import {useAnnuncioTorneoEventoStore} from "@/features/pubblica-annuncio/state/AnnuncioTorneoEvento.store";
import {getOptionLabel, MODALITA_ISCRIZIONE_OPTIONS} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export default function RecapAnnuncioTorneoEvento() {
	const data = useAnnuncioTorneoEventoStore();
	const annate = data.annataDa || data.annataA
		? [data.annataDa, data.annataA].filter(Boolean).join(" – ")
		: "—";
	const costoPer = data.costoPer === "giocatore" ? "per giocatore" : "per squadra";

	return (
		<div>
			<p className="mb-1 text-muted-foreground">Dettagli torneo / evento</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<RecapField label="Nome torneo / evento" wide>{data.nome || "—"}</RecapField>
				<RecapField label="Contatti" wide>{formatContatti(data.contatti)}</RecapField>
				<RegioniRecap regioni={data.regioniInteressate} cittaComuniPerRegione={data.cittaComuniPerRegione} />
				<RecapField label="Modalità di iscrizione">{getOptionLabel(MODALITA_ISCRIZIONE_OPTIONS, data.modalitaIscrizione) || "Non specificata"}</RecapField>
				<RecapField label="Annate ammesse">{annate}</RecapField>
				<RecapField label="Numero squadre">{data.numeroSquadre || "—"}</RecapField>
				<RecapField label="Costo partecipazione">{data.costoPartecipazione ? `${data.costoPartecipazione} EUR ${costoPer}` : "—"}</RecapField>
				{data.infoAggiuntive.trim() !== "" && <RecapField label="Informazioni aggiuntive" wide>{data.infoAggiuntive}</RecapField>}
				<PremiumImageRecap image={data.immagineAnnuncio} />
				<PremiumLinkRecap link={data.linkAnnuncio} />
			</dl>
		</div>
	);
}

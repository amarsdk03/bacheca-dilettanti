import {useAnnuncioSocietaEnteStore} from "@/features/pubblica-annuncio/state/AnnuncioSocietaEnte.store";
import {
	formatContatti,
	formatPeriodo,
	RecapField,
} from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapHelpers";

export default function RecapAnnuncioSocietaEnte() {
	const data = useAnnuncioSocietaEnteStore();
	const {evento} = data;

	return (
		<div>
			<p className="mb-1 text-muted-foreground">Dettagli società / ente</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<RecapField label="Nome ente">{data.nomeEnte || "—"}</RecapField>
				<RecapField label="Indirizzo evento">{data.indirizzo || "—"}</RecapField>
				<RecapField label="Contatti pubblici" wide>{formatContatti(data.contatti)}</RecapField>
				{data.presentazione.trim() !== "" && <RecapField label="Presentazione" wide>{data.presentazione}</RecapField>}
				<RecapField label="Periodo">{formatPeriodo(evento.periodoDa, evento.periodoA)}</RecapField>
				<RecapField label="Orario">{evento.orario || "—"}</RecapField>
				<RecapField label="Tipologia calcio">{evento.tipologieCalcio.join(", ") || "—"}</RecapField>
				<RecapField label="Scadenza iscrizioni">{evento.scadenzaIscrizioni || "—"}</RecapField>
				<RecapField label="Annate ammesse">{evento.annateAmmesse.join(", ") || "—"}</RecapField>
				<RecapField label="Partecipazione">{evento.partecipazione || "Non specificata"}</RecapField>
				<RecapField label="Costo partecipazione">{evento.costoPartecipazione ? `${evento.costoPartecipazione} €` : "—"}</RecapField>
				<RecapField label="Posti disponibili">{evento.postiDisponibili || "—"}</RecapField>
				{evento.descrizioneEvento.trim() !== "" && <RecapField label="Descrizione evento" wide>{evento.descrizioneEvento}</RecapField>}
				{evento.modalitaIscrizioneRequisiti.trim() !== "" && <RecapField label="Modalità e requisiti" wide>{evento.modalitaIscrizioneRequisiti}</RecapField>}
				{evento.livelloIndicativo.trim() !== "" && <RecapField label="Livello indicativo" wide>{evento.livelloIndicativo}</RecapField>}
			</dl>
		</div>
	);
}

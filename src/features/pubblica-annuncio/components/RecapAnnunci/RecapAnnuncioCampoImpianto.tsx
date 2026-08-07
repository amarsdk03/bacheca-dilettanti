import {useAnnuncioCampoImpiantoStore} from "@/features/pubblica-annuncio/state/AnnuncioCampoImpianto.store";
import {
	formatContatti,
	formatPeriodo,
	RecapField,
} from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapHelpers";

export default function RecapAnnuncioCampoImpianto() {
	const data = useAnnuncioCampoImpiantoStore();

	return (
		<div>
			<p className="mb-1 text-muted-foreground">Dettagli campo / impianto</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<RecapField label="Nome impianto">{data.nomeImpianto || "—"}</RecapField>
				<RecapField label="Indirizzo">{data.indirizzo || "—"}</RecapField>
				<RecapField label="Contatti pubblici" wide>{formatContatti(data.contatti)}</RecapField>
				{data.presentazione.trim() !== "" && <RecapField label="Presentazione" wide>{data.presentazione}</RecapField>}
				<RecapField label="Periodo disponibile">{formatPeriodo(data.disponibilita.periodoDa, data.disponibilita.periodoA)}</RecapField>
				<RecapField label="Orario">{data.disponibilita.orario || "—"}</RecapField>
				<RecapField label="Costo orario">{data.disponibilita.costoOrario ? `${data.disponibilita.costoOrario} €` : "—"}</RecapField>
				{data.disponibilita.serviziInclusi.trim() !== "" && <RecapField label="Servizi inclusi" wide>{data.disponibilita.serviziInclusi}</RecapField>}
			</dl>
		</div>
	);
}

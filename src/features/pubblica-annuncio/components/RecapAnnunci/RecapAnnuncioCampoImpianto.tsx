import {useAnnuncioCampoImpiantoStore} from "@/features/pubblica-annuncio/state/AnnuncioCampoImpianto.store";
import {
	formatContatti,
	PremiumImageRecap,
	PremiumLinkRecap,
	RecapField,
	RegioniRecap,
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
				<RegioniRecap regioni={data.regioniInteressate} cittaComuniPerRegione={data.cittaComuniPerRegione} />
				{data.presentazione.trim() !== "" && <RecapField label="Breve presentazione" wide>{data.presentazione}</RecapField>}
				<RecapField label="Orario">{data.disponibilita.orario || "—"}</RecapField>
				<RecapField label="Costo orario">{data.disponibilita.costoOrario ? `${data.disponibilita.costoOrario} €` : "—"}</RecapField>
				{data.disponibilita.serviziInclusi.trim() !== "" && <RecapField label="Servizi inclusi" wide>{data.disponibilita.serviziInclusi}</RecapField>}
				<PremiumImageRecap image={data.immagineAnnuncio} />
				<PremiumLinkRecap link={data.linkAnnuncio} />
			</dl>
		</div>
	);
}

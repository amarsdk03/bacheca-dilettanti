import {useAnnuncioSquadraStore} from "@/features/pubblica-annuncio/state/AnnuncioSquadra.store";
import {
	formatContatti,
	formatPeriodo,
	RecapField,
} from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapHelpers";

export default function RecapAnnuncioSquadra({sottotipologia}: {sottotipologia: string}) {
	const data = useAnnuncioSquadraStore();
	const sede = [data.sedePrincipale.indirizzo, data.sedePrincipale.cap, data.sedePrincipale.citta]
		.filter(Boolean)
		.join(", ");

	return (
		<div>
			<p className="mb-1 text-muted-foreground">Dettagli squadra</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<RecapField label="Nome società">{data.nomeSocieta || "—"}</RecapField>
				<RecapField label="Tipologia sport">{data.tipologiaSport || "—"}</RecapField>
				<RecapField label="Sede principale">{sede || "—"}</RecapField>
				{data.linkStemma.trim() !== "" && <RecapField label="Link stemma">{data.linkStemma}</RecapField>}
				<RecapField label="Contatti pubblici" wide>{formatContatti(data.contatti)}</RecapField>
				{data.descrizione.trim() !== "" && <RecapField label="Descrizione" wide>{data.descrizione}</RecapField>}

				{sottotipologia === "cerca-giocatore" && (
					<>
						<RecapField label="Ruoli principali">{data.cercaGiocatore.ruoliPrincipali.join(", ") || "—"}</RecapField>
						<RecapField label="Ruoli specifici">{data.cercaGiocatore.ruoliSpecifici.join(", ") || "—"}</RecapField>
						<RecapField label="Annate cercate">{data.cercaGiocatore.annateCercate.join(", ") || "—"}</RecapField>
						<RecapField label="Periodo">{formatPeriodo(data.cercaGiocatore.periodoDa, data.cercaGiocatore.periodoA)}</RecapField>
						{data.cercaGiocatore.requisiti.trim() !== "" && <RecapField label="Requisiti" wide>{data.cercaGiocatore.requisiti}</RecapField>}
					</>
				)}

				{sottotipologia === "cerca-staff" && (
					<>
						<RecapField label="Figura cercata">{data.cercaStaff.figuraCercata || "—"}</RecapField>
						<RecapField label="Settore">{data.cercaStaff.settore || "—"}</RecapField>
						<RecapField label="Compenso mensile">{data.cercaStaff.compensoMensile ? `${data.cercaStaff.compensoMensile} €` : "—"}</RecapField>
						<RecapField label="Periodo">{formatPeriodo(data.cercaStaff.periodoDa, data.cercaStaff.periodoA)}</RecapField>
						{data.cercaStaff.requisiti.trim() !== "" && <RecapField label="Requisiti" wide>{data.cercaStaff.requisiti}</RecapField>}
					</>
				)}

				{sottotipologia === "cerca-partite-amichevoli" && (
					<>
						<RecapField label="Categorie avversario" wide>{data.cercaAmichevoli.categorieAvversario.join(", ") || "—"}</RecapField>
						<RecapField label="Periodo">{formatPeriodo(data.cercaAmichevoli.periodoDa, data.cercaAmichevoli.periodoA)}</RecapField>
						<RecapField label="Disponibilità trasferta">{data.cercaAmichevoli.disponibilitaTrasferta || "Non specificata"}</RecapField>
						{data.cercaAmichevoli.campoIndirizzo.trim() !== "" && <RecapField label="Campo scelto" wide>{data.cercaAmichevoli.campoIndirizzo}</RecapField>}
					</>
				)}

				{sottotipologia === "cerca-sponsor" && (
					<>
						<RecapField label="Categoria / settore">{data.cercaSponsor.categoriaSettore || "—"}</RecapField>
						<RecapField label="Supporto ricercato">{data.cercaSponsor.supportoRicercato || "—"}</RecapField>
						<RecapField label="Cosa offrite" wide>{data.cercaSponsor.cosaOffrite || "—"}</RecapField>
					</>
				)}
			</dl>
		</div>
	);
}

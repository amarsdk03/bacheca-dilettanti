import DynamicLucideIcon from "@/components/dynamic/DynamicLucideIcon";
import {Button} from "@/components/ui/button";
import {FieldGroup, FieldLegend, FieldSet} from "@/components/ui/field";
import RecapAnnuncioArbitro from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncioArbitro";
import RecapAnnuncioCampoImpianto from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncioCampoImpianto";
import RecapAnnuncioGiocatore from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncioGiocatore";
import RecapAnnuncioSocietaEnte from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncioSocietaEnte";
import RecapAnnuncioSquadra from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncioSquadra";
import RecapAnnuncioStaff from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncioStaff";
import {getTipologia} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type RecapAnnuncioProps = {
	tipologia: string;
	sottotipologia: string;
	onEditStep: (step: number) => void;
};

export default function RecapAnnuncio({tipologia, sottotipologia, onEditStep}: RecapAnnuncioProps) {
	const tipologiaSelezionata = getTipologia(tipologia);
	const sottotipologiaSelezionata = tipologiaSelezionata?.sottotipologie?.find(
		(opzione) => opzione.valore === sottotipologia
	);

	const dettagli = (() => {
		switch (tipologia) {
			case "giocatore":
				return <RecapAnnuncioGiocatore />;
			case "squadra":
				return <RecapAnnuncioSquadra sottotipologia={sottotipologia} />;
			case "arbitro":
				return <RecapAnnuncioArbitro />;
			case "staff":
				return <RecapAnnuncioStaff />;
			case "societa-ente-sportivo":
				return <RecapAnnuncioSocietaEnte />;
			case "campo-impianto-sportivo":
				return <RecapAnnuncioCampoImpianto />;
			default:
				return null;
		}
	})();

	return (
		<FieldGroup className="w-full">
			<FieldSet>
				<FieldLegend variant="label" className="field-legend-title mb-2">Riepilogo annuncio</FieldLegend>
				<div className="space-y-4 rounded-lg border bg-background p-4 text-sm">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-muted-foreground">Profilo</p>
							<p className="flex items-center gap-1.5 font-medium">
								{tipologiaSelezionata?.icona && <DynamicLucideIcon iconName={tipologiaSelezionata.icona} className="size-4" />}
								{tipologiaSelezionata?.nome ?? "—"}
								{sottotipologiaSelezionata && ` · ${sottotipologiaSelezionata.nome}`}
							</p>
						</div>
						<Button variant="outline" size="sm" onClick={() => onEditStep(1)}>Modifica profilo</Button>
					</div>

					{dettagli}

					<div className="flex justify-end border-t pt-4">
						<Button variant="outline" size="sm" onClick={() => onEditStep(2)}>Modifica dati</Button>
					</div>
				</div>
			</FieldSet>
		</FieldGroup>
	);
}

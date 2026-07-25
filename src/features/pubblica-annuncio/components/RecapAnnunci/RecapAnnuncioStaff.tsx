import {type EsperienzaAnnuncio} from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import {EsperienzeRecap, formatDataNascita} from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapHelpers";

type RecapAnnuncioStaffProps = {
	nome: string;
	cognome: string;
	giornoNascita: string;
	meseNascita: string;
	annoNascita: string;
	tipologiaCalcioLabel: string;
	figuraProfessionaleLabel: string;
	categoriaRicercataLabel: string;
	disponibilitaSpostamentoLabel: string;
	presentazione: string;
	esperienze: EsperienzaAnnuncio[];
};

export default function RecapAnnuncioStaff({
	nome,
	cognome,
	giornoNascita,
	meseNascita,
	annoNascita,
	tipologiaCalcioLabel,
	figuraProfessionaleLabel,
	categoriaRicercataLabel,
	disponibilitaSpostamentoLabel,
	presentazione,
	esperienze,
}: RecapAnnuncioStaffProps) {
	return (
		<div>
			<p className="text-muted-foreground mb-1">Dettagli staff</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<div>
					<dt className="text-xs text-muted-foreground">Nome e cognome</dt>
					<dd className="font-medium">{`${nome} ${cognome}`.trim() || "—"}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Data di nascita</dt>
					<dd className="font-medium">{formatDataNascita(giornoNascita, meseNascita, annoNascita)}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Tipologia calcio</dt>
					<dd className="font-medium">{tipologiaCalcioLabel || "—"}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Figura professionale</dt>
					<dd className="font-medium">{figuraProfessionaleLabel || "—"}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Categoria ricercata</dt>
					<dd className="font-medium">{categoriaRicercataLabel || "—"}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Disponibilità spostamento</dt>
					<dd className="font-medium">{disponibilitaSpostamentoLabel || "Non specificato"}</dd>
				</div>
				{presentazione.trim() !== "" && (
					<div className="sm:col-span-2">
						<dt className="text-xs text-muted-foreground">Presentazione personale</dt>
						<dd className="font-medium whitespace-pre-wrap">{presentazione}</dd>
					</div>
				)}
				<EsperienzeRecap esperienze={esperienze} />
			</dl>
		</div>
	);
}

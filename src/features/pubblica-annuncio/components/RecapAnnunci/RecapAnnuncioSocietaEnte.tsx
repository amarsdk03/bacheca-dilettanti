import {
	type DisponibilitaStrutturaSocietaEnte,
	type EventoSocietaEnte,
} from "@/features/pubblica-annuncio/components/AnnuncioSocietaEnte";
import {formatPeriodo} from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapHelpers";

type RecapAnnuncioSocietaEnteProps = {
	sottotipologia: string;
	nomeEnte: string;
	indirizzo: string;
	contattiPubblici: string;
	presentazione: string;
	evento: EventoSocietaEnte;
	disponibilitaStruttura: DisponibilitaStrutturaSocietaEnte;
	tipologiaCalcioLabel: string;
	partecipazioneLabel: string;
};

export default function RecapAnnuncioSocietaEnte({
	sottotipologia,
	nomeEnte,
	indirizzo,
	contattiPubblici,
	presentazione,
	evento,
	disponibilitaStruttura,
	tipologiaCalcioLabel,
	partecipazioneLabel,
}: RecapAnnuncioSocietaEnteProps) {
	return (
		<div>
			<p className="text-muted-foreground mb-1">Dettagli società / ente</p>
			<dl className="grid gap-1 sm:grid-cols-2">
				<div>
					<dt className="text-xs text-muted-foreground">Nome ente</dt>
					<dd className="font-medium">{nomeEnte || "—"}</dd>
				</div>
				<div>
					<dt className="text-xs text-muted-foreground">Indirizzo evento / struttura</dt>
					<dd className="font-medium">{indirizzo || "—"}</dd>
				</div>
				<div className="sm:col-span-2">
					<dt className="text-xs text-muted-foreground">Contatti pubblici</dt>
					<dd className="font-medium">{contattiPubblici || "—"}</dd>
				</div>
				{presentazione.trim() !== "" && (
					<div className="sm:col-span-2">
						<dt className="text-xs text-muted-foreground">Presentazione</dt>
						<dd className="font-medium whitespace-pre-wrap">{presentazione}</dd>
					</div>
				)}

				{(sottotipologia === "openday-allenamento-libero" ||
					sottotipologia === "evento-torneo-sportivo") && (
					<>
						<div>
							<dt className="text-xs text-muted-foreground">Periodo</dt>
							<dd className="font-medium">{formatPeriodo(evento.periodoDa, evento.periodoA)}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Orario</dt>
							<dd className="font-medium">{evento.orario || "—"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Tipologia calcio</dt>
							<dd className="font-medium">{tipologiaCalcioLabel || "—"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Scadenza iscrizioni</dt>
							<dd className="font-medium">{evento.scadenzaIscrizioni || "—"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Annate ammesse</dt>
							<dd className="font-medium">{evento.annateAmmesse.join(", ") || "—"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Partecipazione</dt>
							<dd className="font-medium">{partecipazioneLabel || "Non specificata"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Costo partecipazione</dt>
							<dd className="font-medium">{evento.costoPartecipazione ? `${evento.costoPartecipazione} €` : "—"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Posti disponibili</dt>
							<dd className="font-medium">{evento.postiDisponibili || "—"}</dd>
						</div>
						{evento.descrizioneEvento.trim() !== "" && (
							<div className="sm:col-span-2">
								<dt className="text-xs text-muted-foreground">Descrizione evento</dt>
								<dd className="font-medium whitespace-pre-wrap">{evento.descrizioneEvento}</dd>
							</div>
						)}
						{evento.modalitaIscrizioneRequisiti.trim() !== "" && (
							<div className="sm:col-span-2">
								<dt className="text-xs text-muted-foreground">Modalità iscrizione e requisiti</dt>
								<dd className="font-medium whitespace-pre-wrap">{evento.modalitaIscrizioneRequisiti}</dd>
							</div>
						)}
						{evento.livelloIndicativo.trim() !== "" && (
							<div className="sm:col-span-2">
								<dt className="text-xs text-muted-foreground">Livello indicativo</dt>
								<dd className="font-medium whitespace-pre-wrap">{evento.livelloIndicativo}</dd>
							</div>
						)}
					</>
				)}

				{sottotipologia === "struttura-campo" && (
					<>
						<div>
							<dt className="text-xs text-muted-foreground">Periodo</dt>
							<dd className="font-medium">
								{formatPeriodo(disponibilitaStruttura.periodoDa, disponibilitaStruttura.periodoA)}
							</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Orario</dt>
							<dd className="font-medium">{disponibilitaStruttura.orario || "—"}</dd>
						</div>
						<div>
							<dt className="text-xs text-muted-foreground">Costo orario</dt>
							<dd className="font-medium">
								{disponibilitaStruttura.costoOrario ? `${disponibilitaStruttura.costoOrario} €` : "—"}
							</dd>
						</div>
						{disponibilitaStruttura.serviziInclusi.trim() !== "" && (
							<div className="sm:col-span-2">
								<dt className="text-xs text-muted-foreground">Servizi inclusi</dt>
								<dd className="font-medium whitespace-pre-wrap">{disponibilitaStruttura.serviziInclusi}</dd>
							</div>
						)}
					</>
				)}
			</dl>
		</div>
	);
}

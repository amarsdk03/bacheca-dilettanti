import DynamicLucideIcon from "@/components/dynamic/DynamicLucideIcon";
import {Button} from "@/components/ui/button";
import {FieldGroup, FieldLegend, FieldSet} from "@/components/ui/field";
import {type SottotipologiaAnnuncio, type TipologiaAnnuncio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {
	type CercaAmichevoliSquadra,
	type CercaGiocatoreSquadra,
	type CercaSponsorSquadra,
	type CercaStaffSquadra,
	type SedePrincipaleSquadra,
} from "@/features/pubblica-annuncio/components/AnnuncioSquadra";
import {type EsperienzaAnnuncio} from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import {
	type DisponibilitaStrutturaSocietaEnte,
	type EventoSocietaEnte,
} from "@/features/pubblica-annuncio/components/AnnuncioSocietaEnte";
import RecapAnnuncioArbitro from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncioArbitro";
import RecapAnnuncioGiocatore from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncioGiocatore";
import RecapAnnuncioScouting from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncioScouting";
import RecapAnnuncioSocietaEnte from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncioSocietaEnte";
import RecapAnnuncioSquadra from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncioSquadra";
import RecapAnnuncioStaff from "@/features/pubblica-annuncio/components/RecapAnnunci/RecapAnnuncioStaff";

type RecapAnnuncioProps = {
	tipologiaSelezionata?: TipologiaAnnuncio;
	sottotipologiaSelezionata?: SottotipologiaAnnuncio;
	setStep: (step: number) => void;
	isAnnuncioGiocatore: boolean;
	isAnnuncioSquadra: boolean;
	isAnnuncioArbitro: boolean;
	isAnnuncioStaff: boolean;
	isAnnuncioScouting: boolean;
	isAnnuncioSocietaEnte: boolean;
	recapRegioniInteressate: string[];
	recapCittaComuniPerRegione: Record<string, string[]>;
	nomeGiocatore: string;
	cognomeGiocatore: string;
	giornoNascitaGiocatore: string;
	meseNascitaGiocatore: string;
	annoNascitaGiocatore: string;
	tipologiaCalcioGiocatoreLabel: string;
	ruoloPrincipaleGiocatoreLabel: string;
	emailCollegamentoGiocatore: string;
	linkFotoGiocatore: string;
	contattiGiocatorePubblici: string;
	biografiaGiocatore: string;
	nomeSocietaSquadra: string;
	tipologiaSportSquadraLabel: string;
	linkStemmaSquadra: string;
	sedePrincipaleSquadra: SedePrincipaleSquadra;
	contattiSquadraPubblici: string;
	descrizioneSquadra: string;
	cercaGiocatoreSquadra: CercaGiocatoreSquadra;
	cercaStaffSquadra: CercaStaffSquadra;
	cercaAmichevoliSquadra: CercaAmichevoliSquadra;
	cercaSponsorSquadra: CercaSponsorSquadra;
	figuraStaffSquadraLabel: string;
	disponibilitaTrasfertaSquadraLabel: string;
	sottotipologiaAnnuncio: string;
	nomeArbitro: string;
	cognomeArbitro: string;
	giornoNascitaArbitro: string;
	meseNascitaArbitro: string;
	annoNascitaArbitro: string;
	tipologiaCalcioArbitroLabel: string;
	disponibilitaSpostamentoArbitroLabel: string;
	presentazioneArbitro: string;
	esperienzeArbitro: EsperienzaAnnuncio[];
	nomeStaff: string;
	cognomeStaff: string;
	giornoNascitaStaff: string;
	meseNascitaStaff: string;
	annoNascitaStaff: string;
	tipologiaCalcioStaffLabel: string;
	figuraProfessionaleStaffLabel: string;
	categoriaRicercataStaffLabel: string;
	disponibilitaSpostamentoStaffLabel: string;
	presentazioneStaff: string;
	esperienzeStaff: EsperienzaAnnuncio[];
	nomeScouting: string;
	tipologiaCalcioScoutingLabel: string;
	linkLogoScouting: string;
	contattiScoutingPubblici: string;
	presentazioneScouting: string;
	nomeSocietaEnte: string;
	indirizzoSocietaEnte: string;
	contattiSocietaEntePubblici: string;
	presentazioneSocietaEnte: string;
	eventoSocietaEnte: EventoSocietaEnte;
	disponibilitaStrutturaSocietaEnte: DisponibilitaStrutturaSocietaEnte;
	tipologiaCalcioSocietaEnteLabel: string;
	partecipazioneSocietaEnteLabel: string;
};

export default function RecapAnnuncio({
	tipologiaSelezionata,
	sottotipologiaSelezionata,
	setStep,
	isAnnuncioGiocatore,
	isAnnuncioSquadra,
	isAnnuncioArbitro,
	isAnnuncioStaff,
	isAnnuncioScouting,
	isAnnuncioSocietaEnte,
	recapRegioniInteressate,
	recapCittaComuniPerRegione,
	...props
}: RecapAnnuncioProps) {
	return (
		<FieldGroup className="w-full">
			<FieldSet>
				<FieldLegend variant="label" className="field-legend-title mb-2">
					Riepilogo annuncio
				</FieldLegend>

				<div className="rounded-lg border bg-background p-4 space-y-3 text-sm">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-muted-foreground">Profilo</p>
							<p className="font-medium flex items-center gap-1.5">
								{tipologiaSelezionata?.icona && (
									<DynamicLucideIcon iconName={tipologiaSelezionata.icona} className="size-4" />
								)}
								{tipologiaSelezionata?.nome ?? "—"}
								{sottotipologiaSelezionata && ` · ${sottotipologiaSelezionata.nome}`}
							</p>
						</div>
						<Button variant="outline" size="sm" onClick={() => setStep(1)}>
							Modifica
						</Button>
					</div>

					{!isAnnuncioSquadra && !isAnnuncioScouting && !isAnnuncioSocietaEnte && (
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-muted-foreground">Regioni d&apos;interesse</p>
								<div className="mt-1 flex flex-wrap gap-1.5">
									{recapRegioniInteressate.length > 0
										? recapRegioniInteressate.map((regione) => {
											const cittaComuni = recapCittaComuniPerRegione[regione] ?? [];
											return (
												<span
													key={regione}
													className="rounded-full bg-fuchsia-100 text-fuchsia-800 px-2 py-0.5 text-xs"
												>
													{regione}
													{cittaComuni.length > 0 ? `: ${cittaComuni.join(", ")}` : ""}
												</span>
											);
										})
										: "—"}
								</div>
							</div>
							<Button variant="outline" size="sm" onClick={() => setStep(2)}>
								Modifica
							</Button>
						</div>
					)}

					{isAnnuncioGiocatore ? (
						<RecapAnnuncioGiocatore
							nome={props.nomeGiocatore}
							cognome={props.cognomeGiocatore}
							giornoNascita={props.giornoNascitaGiocatore}
							meseNascita={props.meseNascitaGiocatore}
							annoNascita={props.annoNascitaGiocatore}
							tipologiaCalcioLabel={props.tipologiaCalcioGiocatoreLabel}
							ruoloPrincipaleLabel={props.ruoloPrincipaleGiocatoreLabel}
							emailCollegamento={props.emailCollegamentoGiocatore}
							linkFoto={props.linkFotoGiocatore}
							contattiPubblici={props.contattiGiocatorePubblici}
							biografia={props.biografiaGiocatore}
						/>
					) : isAnnuncioSquadra ? (
						<RecapAnnuncioSquadra
							sottotipologia={props.sottotipologiaAnnuncio}
							nomeSocieta={props.nomeSocietaSquadra}
							tipologiaSportLabel={props.tipologiaSportSquadraLabel}
							linkStemma={props.linkStemmaSquadra}
							sedePrincipale={props.sedePrincipaleSquadra}
							contattiPubblici={props.contattiSquadraPubblici}
							descrizione={props.descrizioneSquadra}
							cercaGiocatore={props.cercaGiocatoreSquadra}
							cercaStaff={props.cercaStaffSquadra}
							cercaAmichevoli={props.cercaAmichevoliSquadra}
							cercaSponsor={props.cercaSponsorSquadra}
							figuraStaffLabel={props.figuraStaffSquadraLabel}
							disponibilitaTrasfertaLabel={props.disponibilitaTrasfertaSquadraLabel}
						/>
					) : isAnnuncioArbitro ? (
						<RecapAnnuncioArbitro
							nome={props.nomeArbitro}
							cognome={props.cognomeArbitro}
							giornoNascita={props.giornoNascitaArbitro}
							meseNascita={props.meseNascitaArbitro}
							annoNascita={props.annoNascitaArbitro}
							tipologiaCalcioLabel={props.tipologiaCalcioArbitroLabel}
							disponibilitaSpostamentoLabel={props.disponibilitaSpostamentoArbitroLabel}
							presentazione={props.presentazioneArbitro}
							esperienze={props.esperienzeArbitro}
						/>
					) : isAnnuncioStaff ? (
						<RecapAnnuncioStaff
							nome={props.nomeStaff}
							cognome={props.cognomeStaff}
							giornoNascita={props.giornoNascitaStaff}
							meseNascita={props.meseNascitaStaff}
							annoNascita={props.annoNascitaStaff}
							tipologiaCalcioLabel={props.tipologiaCalcioStaffLabel}
							figuraProfessionaleLabel={props.figuraProfessionaleStaffLabel}
							categoriaRicercataLabel={props.categoriaRicercataStaffLabel}
							disponibilitaSpostamentoLabel={props.disponibilitaSpostamentoStaffLabel}
							presentazione={props.presentazioneStaff}
							esperienze={props.esperienzeStaff}
						/>
					) : isAnnuncioScouting ? (
						<RecapAnnuncioScouting
							nome={props.nomeScouting}
							tipologiaCalcioLabel={props.tipologiaCalcioScoutingLabel}
							linkLogo={props.linkLogoScouting}
							contattiPubblici={props.contattiScoutingPubblici}
							presentazione={props.presentazioneScouting}
						/>
					) : isAnnuncioSocietaEnte ? (
						<RecapAnnuncioSocietaEnte
							sottotipologia={props.sottotipologiaAnnuncio}
							nomeEnte={props.nomeSocietaEnte}
							indirizzo={props.indirizzoSocietaEnte}
							contattiPubblici={props.contattiSocietaEntePubblici}
							presentazione={props.presentazioneSocietaEnte}
							evento={props.eventoSocietaEnte}
							disponibilitaStruttura={props.disponibilitaStrutturaSocietaEnte}
							tipologiaCalcioLabel={props.tipologiaCalcioSocietaEnteLabel}
							partecipazioneLabel={props.partecipazioneSocietaEnteLabel}
						/>
					) : null}
				</div>
			</FieldSet>
		</FieldGroup>
	);
}

"use client";

import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {useAnnuncioGiocatoreStore} from "@/features/pubblica-annuncio/state/AnnuncioGiocatore.store";
import ContattiAnnuncioFields from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";
import DataNascitaFields from "@/features/pubblica-annuncio/components/InputFields/DataNascitaFields";
import RegioniInteresseField from "@/features/pubblica-annuncio/components/InputFields/RegioniInteresseField";
import RuoloPrincipaleMultiselectField from "@/features/pubblica-annuncio/components/InputFields/RuoloPrincipaleMultiselectField";
import TipologiaCalcioMultiselectField from "@/features/pubblica-annuncio/components/InputFields/TipologiaCalcioMultiselectField";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";
import LinkAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/LinkAnnuncioPremiumField";
import ImmagineAnnuncioPremiumField from "@/features/pubblica-annuncio/components/InputFields/ImmagineAnnuncioPremiumField";
import {RUOLI_SPECIFICI_PER_RUOLO} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export default function AnnuncioGiocatore() {
	const {
		nome,
		cognome,
		giornoNascita,
		meseNascita,
		annoNascita,
		regioniInteressate,
		cittaComuniPerRegione,
		contatti,
		descrizioneAggiuntiva,
		tipologieCalcio,
		ruoliPrincipali,
		ruoliSpecifici,
		immagineAnnuncio,
		linkAnnuncio,
		setField,
	} = useAnnuncioGiocatoreStore();

	const ruoliAvanzatiDisponibili = Array.from(
		new Set(ruoliPrincipali.flatMap((ruolo) => RUOLI_SPECIFICI_PER_RUOLO[ruolo] ?? []))
	);

	return (
		<FieldGroup className="w-full">
			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Dati giocatore
					</FieldLegend>
					<FieldDescription>Puoi lasciare anonimi i dati personali.</FieldDescription>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="giocatore-nome">Nome <OptionalLabel /></FieldLabel>
						<Input
							id="giocatore-nome"
							value={nome}
							onChange={(event) => setField("nome", event.target.value)}
							placeholder="Mario"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="giocatore-cognome">Cognome <OptionalLabel /></FieldLabel>
						<Input
							id="giocatore-cognome"
							value={cognome}
							onChange={(event) => setField("cognome", event.target.value)}
							placeholder="Rossi"
						/>
					</Field>
				</div>

				<DataNascitaFields
					idPrefix="giocatore"
					giornoNascita={giornoNascita}
					setGiornoNascita={(value) => setField("giornoNascita", value)}
					meseNascita={meseNascita}
					setMeseNascita={(value) => setField("meseNascita", value)}
					annoNascita={annoNascita}
					setAnnoNascita={(value) => setField("annoNascita", value)}
				/>
			</FieldSet>

			<div className="mt-2">
				<ContattiAnnuncioFields
					contatti={contatti}
					setContatti={(value) => setField("contatti", value)}
				/>
			</div>

			<RegioniInteresseField
				regioniInteressate={regioniInteressate}
				setRegioniInteressate={(value) => setField("regioniInteressate", value)}
				cittaComuniPerRegione={cittaComuniPerRegione}
				setCittaComuniPerRegione={(value) => setField("cittaComuniPerRegione", value)}
			/>

			<FieldSet>
				<div className="mt-4">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Profilo calcistico
					</FieldLegend>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<TipologiaCalcioMultiselectField
						value={tipologieCalcio}
						onValueChange={(value) => setField("tipologieCalcio", value)}
					/>

					<RuoloPrincipaleMultiselectField
						value={ruoliPrincipali}
						onValueChange={(value) => {
							const opzioniDisponibili = new Set(
								value.flatMap((ruolo) => RUOLI_SPECIFICI_PER_RUOLO[ruolo] ?? [])
							);
							setField("ruoliPrincipali", value);
							setField("ruoliSpecifici", ruoliSpecifici.filter((ruolo) => opzioniDisponibili.has(ruolo)));
						}}
					/>
				</div>

				<MultiselectField
					label="Ruolo specifico"
					options={ruoliAvanzatiDisponibili}
					value={ruoliSpecifici}
					onValueChange={(value) => setField("ruoliSpecifici", value)}
					placeholder={ruoliPrincipali.length > 0 ? "Seleziona i ruoli specifici..." : "Prima seleziona un ruolo principale"}
				/>

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="giocatore-descrizione-aggiuntiva">Breve descrizione aggiuntiva <OptionalLabel /></FieldLabel>
						<span className="text-xs text-muted-foreground">{descrizioneAggiuntiva.length}/2000</span>
					</div>
					<Textarea
						id="giocatore-descrizione-aggiuntiva"
						value={descrizioneAggiuntiva}
						onChange={(event) => setField("descrizioneAggiuntiva", event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Racconta esperienze, caratteristiche tecniche, disponibilità, obiettivi..."
						className="min-h-32 resize-y"
					/>
				</Field>

				<ImmagineAnnuncioPremiumField
					idPrefix="giocatore"
					tipologia="giocatore"
					value={immagineAnnuncio}
					onValueChange={(value) => setField("immagineAnnuncio", value)}
				/>

				<LinkAnnuncioPremiumField
					idPrefix="giocatore"
					tipologia="giocatore"
					value={linkAnnuncio}
					onValueChange={(value) => setField("linkAnnuncio", value)}
				/>
			</FieldSet>
		</FieldGroup>
	);
}

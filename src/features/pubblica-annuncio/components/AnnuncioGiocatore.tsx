"use client";

import {useRef} from "react";
import {X} from "lucide-react";

import {Button} from "@/components/ui/button";
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
import PremiumOnlyBadge from "@/features/pubblica-annuncio/components/InputFields/PremiumOnlyBadge";
import {RUOLI_AVANZATI_PER_RUOLO} from "@/features/pubblica-annuncio/components/AnnuncioSquadra";

export default function AnnuncioGiocatore() {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const {
		nome,
		cognome,
		giornoNascita,
		meseNascita,
		annoNascita,
		regioniInteressate,
		cittaComuniPerRegione,
		contatti,
		descrizione,
		tipologieCalcio,
		ruoliPrincipali,
		ruoliSpecifici,
		foto,
		linkAnnuncio,
		setField,
	} = useAnnuncioGiocatoreStore();

	const ruoliAvanzatiDisponibili = Array.from(
		new Set(ruoliPrincipali.flatMap((ruolo) => RUOLI_AVANZATI_PER_RUOLO[ruolo] ?? []))
	);

	const removeFoto = () => {
		setField("foto", null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

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
								value.flatMap((ruolo) => RUOLI_AVANZATI_PER_RUOLO[ruolo] ?? [])
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
						<FieldLabel htmlFor="giocatore-descrizione">Breve descrizione aggiuntiva <OptionalLabel /></FieldLabel>
						<span className="text-xs text-muted-foreground">{descrizione.length}/2000</span>
					</div>
					<Textarea
						id="giocatore-descrizione"
						value={descrizione}
						onChange={(event) => setField("descrizione", event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Racconta esperienze, caratteristiche tecniche, disponibilità, obiettivi..."
						className="min-h-32 resize-y"
					/>
				</Field>

				<Field>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<FieldLabel htmlFor="giocatore-foto">Immagine dell&apos;annuncio <OptionalLabel /></FieldLabel>
						<PremiumOnlyBadge tipologia="giocatore" funzione="Immagine dell'annuncio" />
					</div>
					<Input
						ref={fileInputRef}
						id="giocatore-foto"
						type="file"
						accept="image/png,image/jpeg,image/webp"
						onChange={(event) => setField("foto", event.target.files?.[0] ?? null)}
					/>
					<FieldDescription>
						L&apos;immagine sarà inclusa nell&apos;annuncio solo se si sceglie una pubblicazione a pagamento.
					</FieldDescription>
					{foto && (
						<div className="flex items-center justify-between gap-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-900">
							<span className="min-w-0 truncate">{foto.name}</span>
							<Button type="button" variant="ghost" size="icon-xs" onClick={removeFoto} aria-label="Rimuovi immagine">
								<X />
							</Button>
						</div>
					)}
				</Field>

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

"use client";

import {useRef} from "react";
import {Crown, X} from "lucide-react";

import {Badge} from "@/components/ui/badge";
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

const optionalLabel = <span className="font-normal text-neutral-400 -translate-x-1">(facoltativo)</span>;

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
		biografia,
		tipologieCalcio,
		ruoliPrincipali,
		foto,
		setField,
	} = useAnnuncioGiocatoreStore();

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
						<FieldLabel htmlFor="giocatore-nome">Nome {optionalLabel}</FieldLabel>
						<Input
							id="giocatore-nome"
							value={nome}
							onChange={(event) => setField("nome", event.target.value)}
							placeholder="Mario"
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="giocatore-cognome">Cognome {optionalLabel}</FieldLabel>
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
						onValueChange={(value) => setField("ruoliPrincipali", value)}
					/>
				</div>

				<Field>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<FieldLabel htmlFor="giocatore-foto">Immagine dell&apos;annuncio</FieldLabel>
						<Badge className="border border-purple-200 bg-purple-100 text-purple-700 hover:bg-purple-100">
							<Crown className="size-3.5" /> Premium only
						</Badge>
					</div>
					<Input
						ref={fileInputRef}
						id="giocatore-foto"
						type="file"
						accept="image/png,image/jpeg,image/webp"
						onChange={(event) => setField("foto", event.target.files?.[0] ?? null)}
					/>
					<FieldDescription>
						L&apos;immagine sarà inclusa nell'annuncio, solo se si sceglie una pubblicazione a pagamento.
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

				<Field>
					<div className="flex items-center justify-between gap-3">
						<FieldLabel htmlFor="giocatore-biografia">Breve descrizione</FieldLabel>
						<span className="text-xs text-muted-foreground">{biografia.length}/2000</span>
					</div>
					<Textarea
						id="giocatore-biografia"
						value={biografia}
						onChange={(event) => setField("biografia", event.target.value.slice(0, 2000))}
						maxLength={2000}
						placeholder="Racconta esperienze, caratteristiche tecniche, disponibilità, obiettivi..."
						className="min-h-32 resize-y"
					/>
				</Field>
			</FieldSet>
		</FieldGroup>
	);
}

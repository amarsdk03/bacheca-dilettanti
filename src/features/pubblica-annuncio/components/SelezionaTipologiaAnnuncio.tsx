"use client";

import {useState} from "react";

import DynamicLucideIcon from "@/components/dynamic/DynamicLucideIcon";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {isLimitedProfileType, type ProfileType} from "@/features/profilo/profile-model";
import type {PublishableProfileType} from "@/features/pubblica-annuncio/publish-model";
import {getTipologia, tipologieAnnuncio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type SelezionaTipologiaAnnuncioProps = {
	tipologia: string;
	sottotipologia: string;
	onTipologiaChange: (value: string) => void;
	onSottotipologiaChange: (value: string) => void;
	onContinue: () => void;
	registered: boolean;
	enabledProfileTypes: readonly PublishableProfileType[];
};

export default function SelezionaTipologiaAnnuncio({
	tipologia,
	sottotipologia,
	onTipologiaChange,
	onSottotipologiaChange,
	onContinue,
	registered,
	enabledProfileTypes,
}: SelezionaTipologiaAnnuncioProps) {
	const [validationVisible, setValidationVisible] = useState(false);
	const tipologiaSelezionata = getTipologia(tipologia);
	const richiedeSottotipologia = Boolean(tipologiaSelezionata?.sottotipologie?.length);
	const isValid = tipologia !== "" && (!richiedeSottotipologia || sottotipologia !== "");
	const typeError = validationVisible && tipologia === "" ? "Seleziona il tipo di annuncio." : null;
	const subtypeError = validationVisible && richiedeSottotipologia && sottotipologia === ""
		? "Seleziona la tipologia di annuncio."
		: null;

	const continueToProfile = () => {
		if (!isValid) {
			setValidationVisible(true);
			return;
		}
		onContinue();
	};

	return (
		<div className="grid gap-8">
			<FieldGroup className="w-full">
				<FieldSet>
					<FieldLegend variant="label" className="field-legend-title mb-0">Seleziona il tipo di annuncio</FieldLegend>
					<Field data-invalid={Boolean(typeError)} className="mt-4">
						<FieldDescription>
						{registered
							? "Puoi pubblicare soltanto con i sottoprofili attualmente abilitati."
							: "Scegli il profilo con cui vuoi presentarti nell’annuncio."}
						</FieldDescription>
						{typeError && <FieldError>{typeError}</FieldError>}

				<RadioGroup className="grid w-full gap-3 sm:grid-cols-2" value={tipologia} onValueChange={onTipologiaChange} aria-invalid={Boolean(typeError)}>
					{tipologieAnnuncio.map((opzione) => {
						const limited = isLimitedProfileType(opzione.valore as ProfileType);
						const enabledForAccount = enabledProfileTypes.includes(opzione.valore as PublishableProfileType);
						const disabled = limited || (registered && !enabledForAccount);
						return (
						<FieldLabel key={opzione.valore} htmlFor={opzione.valore} className="group/card" data-disabled={disabled}>
							<Field orientation="horizontal" data-disabled={disabled} className="rounded-lg transition-all group-has-[data-checked]/card:bg-accent">
								<FieldContent>
									<FieldTitle className="field-content-title flex-wrap gap-1.5">
										{opzione.icona && <DynamicLucideIcon iconName={opzione.icona} className="size-4" />}
										{opzione.nome}
										{limited && <Badge variant="secondary" className="text-fuchsia-600">Coming soon...</Badge>}
										{!limited && registered && !enabledForAccount && <Badge variant="outline">Non abilitato</Badge>}
									</FieldTitle>
									<FieldDescription>{opzione.descrizione}</FieldDescription>
								</FieldContent>
								<RadioGroupItem value={opzione.valore} id={opzione.valore} disabled={disabled} />
							</Field>
						</FieldLabel>
						);
					})}
				</RadioGroup>
					</Field>
				</FieldSet>

				{richiedeSottotipologia && tipologiaSelezionata?.sottotipologie && (
					<FieldSet>
						<FieldLegend variant="label" className="field-legend-title mb-0">Seleziona la tipologia di annuncio:</FieldLegend>
						<Field data-invalid={Boolean(subtypeError)} className="mt-4">
							{subtypeError && <FieldError>{subtypeError}</FieldError>}
						<RadioGroup className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2" value={sottotipologia} onValueChange={onSottotipologiaChange} aria-invalid={Boolean(subtypeError)}>
							{tipologiaSelezionata.sottotipologie.map((opzione) => (
								<FieldLabel key={opzione.valore} htmlFor={`sotto-${opzione.valore}`} className="group/card">
									<Field orientation="horizontal" className="rounded-lg transition-all group-has-[data-checked]/card:bg-fuchsia-100">
										<FieldContent>
											<FieldTitle className="field-content-title gap-1.5">
												{opzione.icona && <DynamicLucideIcon iconName={opzione.icona} className="me-1.5 size-4 sm:me-0" />}
												{opzione.nome}
											</FieldTitle>
											{opzione.descrizione && <FieldDescription>{opzione.descrizione}</FieldDescription>}
										</FieldContent>
										<RadioGroupItem value={opzione.valore} id={`sotto-${opzione.valore}`} />
									</Field>
								</FieldLabel>
							))}
						</RadioGroup>
						</Field>
					</FieldSet>
				)}
			</FieldGroup>

			<div className="flex justify-end">
				<Button onClick={continueToProfile}>Avanti</Button>
			</div>
		</div>
	);
}

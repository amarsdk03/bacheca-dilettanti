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
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {isLimitedProfileType, type ProfileType} from "@/features/profilo/profile-model";
import ProfilePngIcon, {getProfileAccent} from "@/features/profilo/ProfilePngIcon";
import {RequiredMark} from "@/features/pubblica-annuncio/components/InputFields/FieldRequirementIndicator";
import type {PublishableProfileType} from "@/features/pubblica-annuncio/publish-model";
import {getTipologia, tipologieAnnuncio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type SelezionaTipologiaAnnuncioProps = {
	tipologia: string;
	sottotipologia: string;
	onTipologiaChangeAction: (value: string) => void;
	onSottotipologiaChangeAction: (value: string) => void;
	onContinueAction: () => void;
	registered: boolean;
	enabledProfileTypes: readonly PublishableProfileType[];
};

export default function SelezionaTipologiaAnnuncio({
	tipologia,
	sottotipologia,
	onTipologiaChangeAction,
	onSottotipologiaChangeAction,
	onContinueAction,
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
		onContinueAction();
	};

	return (
		<div className="grid gap-8">
			<FieldGroup className="w-full">
				<FieldSet>
					<FieldLegend variant="label" className="field-legend-title mb-0">Seleziona il tipo di profilo: <RequiredMark /></FieldLegend>
						<Field data-invalid={Boolean(typeError)} className="mt-4">
						{typeError && <FieldError>{typeError}</FieldError>}

						<ToggleGroup
							className="grid w-full gap-3 sm:grid-cols-2"
							value={tipologia ? [tipologia] : []}
							onValueChange={(values) => values[0] && onTipologiaChangeAction(values[0])}
							aria-required="true"
							aria-invalid={Boolean(typeError)}
						>
							{tipologieAnnuncio.map((opzione) => {
								const limited = isLimitedProfileType(opzione.valore as ProfileType);
								const enabledForAccount = enabledProfileTypes.includes(opzione.valore as PublishableProfileType);
								const disabled = limited || (registered && !enabledForAccount);
								const profileType = opzione.valore as ProfileType;
								const accent = getProfileAccent(profileType);
								return (
								<ToggleGroupItem
									key={opzione.valore}
									value={opzione.valore}
									disabled={disabled}
									className="h-auto min-h-24 w-full items-stretch justify-start whitespace-normal rounded-xl border bg-background p-0 text-left shadow-none hover:-translate-y-0.5 hover:bg-background hover:shadow-sm data-pressed:bg-background data-pressed:ring-1 data-pressed:ring-black/25 disabled:opacity-55"
								>
									<Field orientation="horizontal" data-disabled={disabled} className="h-full w-full items-start border-0 p-4">
										<span className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{backgroundColor: `${accent}14`}}>
											<ProfilePngIcon type={profileType} color={accent} className="size-7" />
										</span>
										<FieldContent>
											<FieldTitle className="field-content-title flex-wrap gap-1.5">
												{opzione.nome}
												{limited && <Badge variant="secondary" className="text-brand-indigo">Coming soon...</Badge>}
												{!limited && registered && !enabledForAccount && <Badge variant="outline">Non abilitato</Badge>}
											</FieldTitle>
											<FieldDescription>{opzione.descrizione}</FieldDescription>
										</FieldContent>
									</Field>
								</ToggleGroupItem>
								);
							})}
						</ToggleGroup>
					</Field>
				</FieldSet>

				{richiedeSottotipologia && tipologiaSelezionata?.sottotipologie && (
					<FieldSet>
						<FieldLegend variant="label" className="field-legend-title mb-0">Seleziona la tipologia di annuncio: <RequiredMark /></FieldLegend>
						<Field data-invalid={Boolean(subtypeError)} className="mt-4">
							{subtypeError && <FieldError>{subtypeError}</FieldError>}
						<ToggleGroup
							className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2"
							value={sottotipologia ? [sottotipologia] : []}
							onValueChange={(values) => values[0] && onSottotipologiaChangeAction(values[0])}
							aria-required="true"
							aria-invalid={Boolean(subtypeError)}
						>
							{tipologiaSelezionata.sottotipologie.map((opzione) => (
								<ToggleGroupItem key={opzione.valore} value={opzione.valore} className="h-auto min-h-12 w-full items-stretch justify-start whitespace-normal rounded-xl border bg-background p-0 text-left shadow-none hover:bg-brand-indigo/5 data-pressed:border-brand-indigo data-pressed:bg-brand-indigo/10 data-pressed:ring data-pressed:ring-brand-indigo/20">
									<Field orientation="horizontal" className="h-full w-full border-0 p-4">
										<FieldContent>
											<FieldTitle className="field-content-title gap-1.5">
												{opzione.icona && <DynamicLucideIcon iconName={opzione.icona} className="me-1.5 size-4 sm:me-0" />}
												{opzione.nome}
											</FieldTitle>
											{opzione.descrizione && <FieldDescription>{opzione.descrizione}</FieldDescription>}
										</FieldContent>
									</Field>
								</ToggleGroupItem>
							))}
						</ToggleGroup>
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

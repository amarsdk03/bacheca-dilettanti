import {type Dispatch, type SetStateAction} from "react";

import DynamicLucideIcon from "@/components/dynamic/DynamicLucideIcon";
import {Field, FieldDescription, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {
	SOCIAL_CONTACT_OPTIONS,
	type CanaleContattoAnnuncio,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export {
	CONTATTI_ANNUNCIO_DEFAULT,
	type CanaleContattoAnnuncio,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

export function hasContattoPubblico(contatti: ContattiAnnuncio) {
	return contatti.Email.trim() !== "" || contatti.Telefono.trim() !== "";
}

export function getCanaliContattoCompilati(contatti: ContattiAnnuncio) {
	return SOCIAL_CONTACT_OPTIONS.filter((canale) => contatti[canale.valore].trim() !== "");
}

type ContattiAnnuncioFieldsProps = {
	contatti: ContattiAnnuncio;
	setContatti: Dispatch<SetStateAction<ContattiAnnuncio>>;
};

export default function ContattiAnnuncioFields({
	contatti,
	setContatti,
}: ContattiAnnuncioFieldsProps) {
	const contattoPubblicoPresente = hasContattoPubblico(contatti);

	const handleContattoChange = (canale: CanaleContattoAnnuncio, valore: string) => {
		setContatti((prev) => ({...prev, [canale]: valore}));
	};

	const renderContattoField = (canale: (typeof SOCIAL_CONTACT_OPTIONS)[number]) => (
		<Field
			key={canale.valore}
			className="flex flex-col gap-1.5 space-y-0 sm:flex-row sm:items-center sm:gap-4 mb-2 sm:mb-0"
		>
			<FieldLabel
				htmlFor={`contatto-${canale.valore}`}
				className="flex items-center gap-2 text-sm font-medium sm:w-36 sm:shrink-0"
			>
				<DynamicLucideIcon
					iconName={canale.icona}
					className="size-4 shrink-0 text-muted-foreground"
				/>
				{canale.etichetta}:
			</FieldLabel>
			<Input
				id={`contatto-${canale.valore}`}
				type={canale.tipoInput}
				value={contatti[canale.valore] ?? ""}
				onChange={(event) => handleContattoChange(canale.valore, event.target.value)}
				placeholder={canale.placeholder}
				className="w-full flex-1"
			/>
		</Field>
	);

	return (
		<FieldSet>
			<div>
				<FieldLegend variant="label" className="field-legend-title mb-0">
					Contatti pubblici
				</FieldLegend>
				<FieldDescription
					className="text-red-800 font-medium mb-2 pt-1.5"
					hidden={contattoPubblicoPresente}
				>
					Inserisci almeno un contatto tra email e telefono.
				</FieldDescription>
				<FieldDescription>
					Consigliamo di inserire un indirizzo email, per associare questo annuncio a un futuro profilo del sito
				</FieldDescription>
			</div>

			<div className="grid gap-3">
				{SOCIAL_CONTACT_OPTIONS.filter(
					(canale) => canale.valore === "Email" || canale.valore === "Telefono"
				).map(renderContattoField)}
			</div>
		</FieldSet>
	);
}

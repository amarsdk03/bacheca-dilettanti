import type {ReactNode} from "react";

import {Field, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import LinkAnnuncioPremiumBadge from "@/features/pubblica-annuncio/components/InputFields/PremiumOnlyBadge";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {
	isLinkAnnuncioValid,
	MAX_LINK_ANNUNCIO_LENGTH,
} from "@/features/pubblica-annuncio/types/premiumAnnuncio";

type LinkAnnuncioPremiumFieldProps = {
	idPrefix: string;
	tipologia: string;
	value: string;
	onValueChange: (value: string) => void;
	label?: string;
	functionName?: string;
	placeholder?: string;
	description?: string;
	labelAddon?: ReactNode;
	error?: string;
};

export default function LinkAnnuncioPremiumField({
	idPrefix,
	tipologia,
	value,
	onValueChange,
	label = "Link annuncio",
	functionName = "Link annuncio",
	placeholder = "https://esempio.it/annuncio",
	description = "Il link viene salvato ora e potrà essere pubblicato con un piano a pagamento.",
	labelAddon,
	error,
}: LinkAnnuncioPremiumFieldProps) {
	const id = `${idPrefix}-link-annuncio`;
	const linkValido = isLinkAnnuncioValid(value);

	return (
		<Field data-invalid={!linkValido || Boolean(error)}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<FieldLabel htmlFor={id}>
					<span className="inline-flex items-center gap-1.5">{label} {labelAddon}</span> <OptionalLabel />
				</FieldLabel>
				<LinkAnnuncioPremiumBadge tipologia={tipologia} funzione={functionName} />
			</div>
			<Input
				id={id}
				type="url"
				inputMode="url"
				value={value}
				onChange={(event) => onValueChange(event.target.value.slice(0, MAX_LINK_ANNUNCIO_LENGTH))}
				placeholder={placeholder}
				maxLength={MAX_LINK_ANNUNCIO_LENGTH}
				aria-invalid={!linkValido || Boolean(error)}
			/>
			{(!linkValido || error) && (
				<FieldDescription className="font-medium text-destructive">
					{error ?? "Inserisci un link completo che inizi con http:// o https://."}
				</FieldDescription>
			)}
			<FieldDescription className="text-brand-indigo">{description}</FieldDescription>
		</Field>
	);
}

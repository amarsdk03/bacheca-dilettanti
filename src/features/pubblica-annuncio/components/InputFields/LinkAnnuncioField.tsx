import type {ReactNode} from "react";

import {Field, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {isLinkAnnuncioValid, MAX_LINK_ANNUNCIO_LENGTH,} from "@/features/pubblica-annuncio/types/announcementExtras";
import {InputGroup, InputGroupAddon, InputGroupInput, InputGroupText} from "@/components/ui/input-group";

type LinkAnnuncioFieldProps = {
	idPrefix: string;
	tipologia?: string;
	value: string;
	onValueChange: (value: string) => void;
	label?: string;
	functionName?: string;
	placeholder?: string;
	description?: string;
	labelAddon?: ReactNode;
	inputAddon?: string;
	error?: string;
	disabled?: boolean;
};

export default function LinkAnnuncioField({
	idPrefix,
	value,
	onValueChange,
	label = "Aggiungi link",
	placeholder = "https://www.esempio.it/annuncio",
	description = "Inserisci un link pubblico completo che inizi con http:// o https://.",
	labelAddon,
	inputAddon,
	error,
	disabled = false,
}: LinkAnnuncioFieldProps) {
	const id = `${idPrefix}-link-annuncio`;
	const linkValido = isLinkAnnuncioValid(value);

	return (
		<Field data-invalid={!linkValido || Boolean(error)} data-disabled={disabled}>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<FieldLabel htmlFor={id}>
					<span className="inline-flex items-center gap-1.5">{label} {labelAddon}</span> <OptionalLabel />
				</FieldLabel>
			</div>
			{
				inputAddon ? (
					<InputGroup>
						<InputGroupAddon>
							<InputGroupText>{inputAddon}</InputGroupText>
						</InputGroupAddon>
						<InputGroupInput
							id={id}
							type="url"
							inputMode="url"
							value={value}
							onChange={(event) => onValueChange(event.target.value.slice(0, MAX_LINK_ANNUNCIO_LENGTH))}
							placeholder={placeholder}
							maxLength={MAX_LINK_ANNUNCIO_LENGTH}
							disabled={disabled}
							aria-invalid={!linkValido || Boolean(error)}
						/>
					</InputGroup>
				) : (
					<Input
						id={id}
						type="url"
						inputMode="url"
						value={value}
						onChange={(event) => onValueChange(event.target.value.slice(0, MAX_LINK_ANNUNCIO_LENGTH))}
						placeholder={placeholder}
						maxLength={MAX_LINK_ANNUNCIO_LENGTH}
						disabled={disabled}
						aria-invalid={!linkValido || Boolean(error)}
					/>
				)
			}
			{(!linkValido || error) && (
				<FieldDescription className="font-medium text-destructive">
					{error ?? "Inserisci un link completo"}
				</FieldDescription>
			)}
		</Field>
	);
}

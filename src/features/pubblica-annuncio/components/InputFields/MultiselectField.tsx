import type {ReactNode} from "react";

import {Field, FieldDescription, FieldError, FieldLabel} from "@/components/ui/field";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
	ComboboxValue,
	useComboboxAnchor,
} from "@/components/ui/combobox";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";

type MultiselectFieldProps = {
	label: ReactNode;
	options: readonly string[];
	value: string[];
	onValueChange: (value: string[]) => void;
	placeholder?: string;
	emptyText?: string;
	description?: ReactNode;
	error?: ReactNode;
	required?: boolean;
};

export default function MultiselectField({
	label,
	options,
	value,
	onValueChange,
	placeholder = "Seleziona una o più opzioni...",
	emptyText = "Nessuna opzione trovata.",
	description,
	error,
	required = false,
}: MultiselectFieldProps) {
	const anchor = useComboboxAnchor();

	return (
		<Field data-invalid={Boolean(error)}>
			<FieldLabel>
				{label} {!required && <OptionalLabel />}
			</FieldLabel>
			<Combobox
				multiple
				autoHighlight
				items={[...options]}
				value={value}
				onValueChange={onValueChange}
			>
				<ComboboxChips ref={anchor} className="w-full">
					<ComboboxValue>
						{value.map((item) => (
							<ComboboxChip key={item}>{item}</ComboboxChip>
						))}
						<ComboboxChipsInput
							placeholder={value.length === 0 ? placeholder : ""}
							aria-invalid={Boolean(error)}
							aria-required={required}
						/>
					</ComboboxValue>
				</ComboboxChips>

				<ComboboxContent anchor={anchor}>
					<ComboboxEmpty>{emptyText}</ComboboxEmpty>
					<ComboboxList>
						{(item) => (
							<ComboboxItem key={item} value={item}>
								{item}
							</ComboboxItem>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
			{error && <FieldError>{error}</FieldError>}
			{description && <FieldDescription>{description}</FieldDescription>}
		</Field>
	);
}

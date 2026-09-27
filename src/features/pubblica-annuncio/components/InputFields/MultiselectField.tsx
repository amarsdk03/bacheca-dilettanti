import type {ReactNode} from "react";

import {Field, FieldDescription, FieldError, FieldLabel} from "@/components/ui/field";
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxCollection,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
	ComboboxSeparator,
	ComboboxValue,
	useComboboxAnchor,
} from "@/components/ui/combobox";
import FieldRequirementIndicator from "@/features/pubblica-annuncio/components/InputFields/FieldRequirementIndicator";

type MultiselectFieldProps = {
	label: ReactNode;
	options: readonly string[];
	groups?: readonly {label: string; options: readonly string[]}[];
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
	groups,
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
				{label} <FieldRequirementIndicator required={required} />
			</FieldLabel>
			<Combobox
				multiple
				autoHighlight
				items={groups ? groups.map(group => ({label: group.label, options: [...group.options]})) : [...options]}
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
						{(item, index) => typeof item === "string"
							? <ComboboxItem key={item} value={item}>{item}</ComboboxItem>
							: <ComboboxGroup key={item.label} items={item.options}>
								<ComboboxLabel>{item.label}</ComboboxLabel>
								<ComboboxCollection>{(option) => <ComboboxItem key={option} value={option}>{option}</ComboboxItem>}</ComboboxCollection>
								{index < (groups?.length ?? 0) - 1 && <ComboboxSeparator />}
							</ComboboxGroup>}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
			{error && <FieldError>{error}</FieldError>}
			{description && <FieldDescription>{description}</FieldDescription>}
		</Field>
	);
}

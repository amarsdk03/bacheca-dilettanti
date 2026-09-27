"use client";

import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
	ComboboxSeparator,
	ComboboxValue,
	useComboboxAnchor,
} from "@/components/ui/combobox";
import {Field, FieldError, FieldLabel} from "@/components/ui/field";
import FieldRequirementIndicator from "@/features/pubblica-annuncio/components/InputFields/FieldRequirementIndicator";
import {categoryKey, categoryLabel} from "@/features/pubblica-annuncio/types/category-catalog";

type CategorieCalcioMultiselectFieldProps = {
	label: string;
	value: string[];
	items: ReadonlyArray<{gruppo: string; opzioni: readonly string[]}>;
	onValueChangeAction: (value: string[]) => void;
	required?: boolean;
	error?: string;
	className?: string;
	optionValue?: (group: string, option: string) => string;
	formatValue?: (value: string) => string;
	placeholder?: string;
	emptyText?: string;
};

export default function CategorieCalcioMultiselectField({
	label,
	value,
	items,
	onValueChangeAction,
	required = false,
	error,
	className,
	optionValue = categoryKey,
	formatValue = categoryLabel,
	placeholder = "Seleziona categorie...",
	emptyText = "Nessuna categoria trovata.",
}: CategorieCalcioMultiselectFieldProps) {
	const anchor = useComboboxAnchor();
	const groupedItems = items.map(({gruppo, opzioni}) => ({
		gruppo,
		opzioni: opzioni.map((option) => optionValue(gruppo, option)),
	}));

	return (
		<Field className={className} data-invalid={Boolean(error)}>
			<FieldLabel>{label} <FieldRequirementIndicator required={required} /></FieldLabel>
			<Combobox
				multiple
				autoHighlight
				items={groupedItems}
				value={value}
				onValueChange={onValueChangeAction}
			>
				<ComboboxChips ref={anchor} className="w-full">
					<ComboboxValue>
						{value.map((item) => <ComboboxChip key={item}>{formatValue(item)}</ComboboxChip>)}
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
						{(group, index) => (
							<ComboboxGroup key={group.gruppo} items={group.opzioni}>
								<ComboboxLabel>{group.gruppo}</ComboboxLabel>
								<ComboboxCollection>
									{(item) => <ComboboxItem key={item} value={item}>{formatValue(item).replace(`${group.gruppo} · `, "")}</ComboboxItem>}
								</ComboboxCollection>
								{index < items.length - 1 && <ComboboxSeparator />}
							</ComboboxGroup>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
			{error && <FieldError>{error}</FieldError>}
		</Field>
	);
}

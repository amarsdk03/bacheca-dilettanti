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
import {ANY_CATEGORY, categoryKey, categoryLabel} from "@/features/pubblica-annuncio/types/category-catalog";

type CategorieCalcioMultiselectFieldProps = {
	label: string;
	value: string[];
	items: ReadonlyArray<{gruppo: string; opzioni: readonly string[]}>;
	onValueChangeAction: (value: string[]) => void;
	required?: boolean;
	error?: string;
	className?: string;
	optionValueAction?: (group: string, option: string) => string;
	formatValueAction?: (value: string) => string;
	placeholder?: string;
	emptyText?: string;
	includeAny?: boolean;
	anyExclusive?: boolean;
};

export default function CategorieCalcioMultiselectField({
	label,
	value,
	items,
	onValueChangeAction,
	required = false,
	error,
	className,
	optionValueAction = categoryKey,
	formatValueAction = categoryLabel,
	placeholder = "Seleziona categorie...",
	emptyText = "Nessuna categoria trovata.",
	includeAny = false,
	anyExclusive = includeAny,
}: CategorieCalcioMultiselectFieldProps) {
	const anchor = useComboboxAnchor();
	const groupedItems = [
		...(includeAny ? [{gruppo: "Selezione generale", opzioni: [ANY_CATEGORY]}] : []),
		...items.map(({gruppo, opzioni}) => ({
		gruppo,
		opzioni: opzioni.map((option) => optionValueAction(gruppo, option)),
		})),
	];
	const updateValue = (nextValue: string[]) => {
		if (!anyExclusive) return onValueChangeAction(nextValue);
		if (nextValue.includes(ANY_CATEGORY) && !value.includes(ANY_CATEGORY)) return onValueChangeAction([ANY_CATEGORY]);
		onValueChangeAction(nextValue.filter((item) => item !== ANY_CATEGORY));
	};

	return (
		<Field className={className} data-invalid={Boolean(error)}>
			<FieldLabel>{label} <FieldRequirementIndicator required={required} /></FieldLabel>
			<Combobox
				multiple
				autoHighlight
				items={groupedItems}
				value={value}
				onValueChange={updateValue}
			>
				<ComboboxChips ref={anchor} className="w-full">
					<ComboboxValue>
						{value.map((item) => <ComboboxChip key={item}>{formatValueAction(item)}</ComboboxChip>)}
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
									{(item) => <ComboboxItem key={item} value={item}>{formatValueAction(item).replace(`${group.gruppo} · `, "")}</ComboboxItem>}
								</ComboboxCollection>
								{index < groupedItems.length - 1 && <ComboboxSeparator />}
							</ComboboxGroup>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
			{error && <FieldError>{error}</FieldError>}
		</Field>
	);
}

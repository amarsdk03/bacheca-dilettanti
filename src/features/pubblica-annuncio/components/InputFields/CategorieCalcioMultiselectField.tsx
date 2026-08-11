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
import {Field, FieldLabel} from "@/components/ui/field";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";

type CategorieCalcioMultiselectFieldProps = {
	label: string;
	value: string[];
	items: ReadonlyArray<{gruppo: string; opzioni: readonly string[]}>;
	onValueChange: (value: string[]) => void;
	required?: boolean;
	className?: string;
};

export default function CategorieCalcioMultiselectField({
	label,
	value,
	items,
	onValueChange,
	required = false,
	className,
}: CategorieCalcioMultiselectFieldProps) {
	const anchor = useComboboxAnchor();

	return (
		<Field className={className}>
			<FieldLabel>{label} {!required && <OptionalLabel />}</FieldLabel>
			<Combobox
				multiple
				autoHighlight
				items={items}
				value={value}
				onValueChange={onValueChange}
			>
				<ComboboxChips ref={anchor} className="w-full">
					<ComboboxValue>
						{value.map((item) => <ComboboxChip key={item}>{item}</ComboboxChip>)}
						<ComboboxChipsInput placeholder={value.length === 0 ? "Seleziona categorie..." : ""} />
					</ComboboxValue>
				</ComboboxChips>

				<ComboboxContent anchor={anchor}>
					<ComboboxEmpty>Nessuna categoria trovata.</ComboboxEmpty>
					<ComboboxList>
						{(group, index) => (
							<ComboboxGroup key={group.gruppo} items={group.opzioni}>
								<ComboboxLabel>{group.gruppo}</ComboboxLabel>
								<ComboboxCollection>
									{(item) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}
								</ComboboxCollection>
								{index < items.length - 1 && <ComboboxSeparator />}
							</ComboboxGroup>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
		</Field>
	);
}

"use client";

import {Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxCollection, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxItem, ComboboxLabel, ComboboxList, ComboboxSeparator, ComboboxValue, useComboboxAnchor} from "@/components/ui/combobox";
import {Field, FieldLabel} from "@/components/ui/field";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";

type CategorieAvversarioFieldProps = {
	value: string[];
	items: Array<{ gruppo: string; opzioni: string[] }>;
	action: (value: string[]) => void;
	required?: boolean;
	className?: string;
};

export default function CategorieAvversarioField({ value, items, action, required = false, className }: CategorieAvversarioFieldProps) {
	const anchor = useComboboxAnchor();

	return (
		<Field className={className}>
			<FieldLabel>Categoria avversario {!required && <OptionalLabel />}</FieldLabel>
			<Combobox
				multiple
				autoHighlight
				items={items}
				value={value}
				onValueChange={action}
			>
				<ComboboxChips ref={anchor} className="w-full">
					<ComboboxValue>
						{value.map((item) => (
							<ComboboxChip key={item}>{item}</ComboboxChip>
						))}
						<ComboboxChipsInput
							placeholder={
								value.length === 0 ? "Seleziona categorie..." : ""
							}
						/>
					</ComboboxValue>
				</ComboboxChips>

				<ComboboxContent anchor={anchor}>
					<ComboboxEmpty>Nessuna categoria trovata.</ComboboxEmpty>
					<ComboboxList>
						{(group, index) => (
							<ComboboxGroup key={group.gruppo} items={group.opzioni}>
								<ComboboxLabel>{group.gruppo}</ComboboxLabel>
								<ComboboxCollection>
									{(item) => (
										<ComboboxItem key={item} value={item}>
											{item}
										</ComboboxItem>
									)}
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
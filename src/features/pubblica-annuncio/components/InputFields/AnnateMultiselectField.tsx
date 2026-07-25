import {Field, FieldLabel} from "@/components/ui/field";
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

export const ANNATE_OPTIONS = Array.from({length: 44}, (_, index) =>
	String(new Date().getFullYear() - 17 - index)
);

type AnnateMultiselectFieldProps = {
	value: string[];
	onValueChange: (value: string[]) => void;
	label: string;
	placeholder?: string;
	emptyText?: string;
};

export default function AnnateMultiselectField({
	value,
	onValueChange,
	label,
	placeholder = "Seleziona annate...",
	emptyText = "Nessuna annata trovata.",
}: AnnateMultiselectFieldProps) {
	const anchor = useComboboxAnchor();

	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<Combobox
				multiple
				autoHighlight
				items={ANNATE_OPTIONS}
				value={value}
				onValueChange={onValueChange}
			>
				<ComboboxChips ref={anchor} className="w-full">
					<ComboboxValue>
						{value.map((item) => (
							<ComboboxChip key={item}>{item}</ComboboxChip>
						))}
						<ComboboxChipsInput placeholder={value.length === 0 ? placeholder : ""} />
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
		</Field>
	);
}

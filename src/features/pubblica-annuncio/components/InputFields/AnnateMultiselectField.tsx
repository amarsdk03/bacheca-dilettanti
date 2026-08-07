import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";

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
	return (
		<MultiselectField
			label={label}
			options={ANNATE_OPTIONS}
			value={value}
			onValueChange={onValueChange}
			placeholder={placeholder}
			emptyText={emptyText}
		/>
	);
}

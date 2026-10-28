import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";
import {ANNATE_OPTIONS} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type AnnateMultiselectFieldProps = {
	value: string[];
	onValueChange: (value: string[]) => void;
	label: string;
	placeholder?: string;
	emptyText?: string;
	required?: boolean;
};

export default function AnnateMultiselectField({
	value,
	onValueChange,
	label,
	placeholder = "Seleziona annate...",
	emptyText = "Nessuna annata trovata.",
	required = false,
}: AnnateMultiselectFieldProps) {
	return (
		<MultiselectField
			label={label}
			options={ANNATE_OPTIONS}
			value={value}
			onValueChange={onValueChange}
			placeholder={placeholder}
			emptyText={emptyText}
			required={required}
		/>
	);
}

import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";
import {FIGURA_PROFESSIONALE_OPTIONS} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type FiguraProfessionaleMultiselectFieldProps = {
	value: string[];
	onValueChange: (value: string[]) => void;
	required?: boolean;
};

export default function FiguraProfessionaleMultiselectField({
	value,
	onValueChange,
	required = false,
}: FiguraProfessionaleMultiselectFieldProps) {
	return (
		<MultiselectField
			label="Figura professionale"
			options={FIGURA_PROFESSIONALE_OPTIONS}
			value={value}
			onValueChange={onValueChange}
			placeholder="Seleziona le figure..."
			emptyText="Nessuna figura trovata."
			required={required}
		/>
	);
}

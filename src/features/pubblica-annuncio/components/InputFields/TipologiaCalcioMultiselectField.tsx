import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";
import {TIPOLOGIA_CALCIO_OPTIONS} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type TipologiaCalcioMultiselectFieldProps = {
	value: string[];
	onValueChange: (value: string[]) => void;
	required?: boolean;
	error?: string;
};

export default function TipologiaCalcioMultiselectField({
	value,
	onValueChange,
	required = false,
	error,
}: TipologiaCalcioMultiselectFieldProps) {
	return (
		<MultiselectField
			label="Tipologia calcio"
			options={TIPOLOGIA_CALCIO_OPTIONS}
			value={value}
			onValueChange={onValueChange}
			placeholder="Seleziona le tipologie..."
			emptyText="Nessuna tipologia trovata."
			required={required}
			error={error}
		/>
	);
}

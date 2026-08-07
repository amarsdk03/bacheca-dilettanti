import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";

export const TIPOLOGIA_CALCIO_OPTIONS = ["Calcio a 11", "Calcio a 7", "Calcio a 5"] as const;

type TipologiaCalcioMultiselectFieldProps = {
	value: string[];
	onValueChange: (value: string[]) => void;
};

export default function TipologiaCalcioMultiselectField({
	value,
	onValueChange,
}: TipologiaCalcioMultiselectFieldProps) {
	return (
		<MultiselectField
			label="Tipologia calcio"
			options={TIPOLOGIA_CALCIO_OPTIONS}
			value={value}
			onValueChange={onValueChange}
			placeholder="Seleziona le tipologie..."
			emptyText="Nessuna tipologia trovata."
		/>
	);
}

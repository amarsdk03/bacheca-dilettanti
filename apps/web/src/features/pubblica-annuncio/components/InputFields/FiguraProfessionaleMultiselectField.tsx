import CategorieCalcioMultiselectField
	from "@/features/pubblica-annuncio/components/InputFields/CategorieCalcioMultiselectField";
import {FIGURA_PROFESSIONALE_GROUPS} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

const figureValue = (_group: string, option: string) => option;
const figureLabel = (value: string) => value;

type FiguraProfessionaleMultiselectFieldProps = {
	label?: string;
	value: string[];
	onValueChange: (value: string[]) => void;
	required?: boolean;
	error?: string;
};

export default function FiguraProfessionaleMultiselectField({
	label = "Figura professionale",
	value,
	onValueChange,
	required = false,
	error,
}: FiguraProfessionaleMultiselectFieldProps) {
	return (
		<CategorieCalcioMultiselectField
			label={label}
			items={FIGURA_PROFESSIONALE_GROUPS}
			value={value}
			onValueChangeAction={onValueChange}
			optionValueAction={figureValue}
			formatValueAction={figureLabel}
			placeholder="Seleziona le figure..."
			emptyText="Nessuna figura trovata."
			required={required}
			error={error}
		/>
	);
}

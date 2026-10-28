import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";
import {RUOLO_PRINCIPALE_OPTIONS} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type RuoloPrincipaleMultiselectFieldProps = {
	label?: string;
	value: string[];
	onValueChange: (value: string[]) => void;
	required?: boolean;
	error?: string;
};

export default function RuoloPrincipaleMultiselectField({
	label = "Ruoli principali",
	value,
	onValueChange,
	required = false,
	error,
}: RuoloPrincipaleMultiselectFieldProps) {
	return (
		<MultiselectField
			label={label}
			options={RUOLO_PRINCIPALE_OPTIONS}
			value={value}
			onValueChange={onValueChange}
			placeholder="Seleziona i ruoli..."
			emptyText="Nessun ruolo trovato."
			required={required}
			error={error}
		/>
	);
}

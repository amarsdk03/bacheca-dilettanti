import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";
import {RUOLO_PRINCIPALE_OPTIONS} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type RuoloPrincipaleMultiselectFieldProps = {
	value: string[];
	onValueChange: (value: string[]) => void;
	required?: boolean;
};

export default function RuoloPrincipaleMultiselectField({
	value,
	onValueChange,
	required = false,
}: RuoloPrincipaleMultiselectFieldProps) {
	return (
		<MultiselectField
			label="Ruolo principale"
			options={RUOLO_PRINCIPALE_OPTIONS}
			value={value}
			onValueChange={onValueChange}
			placeholder="Seleziona i ruoli..."
			emptyText="Nessun ruolo trovato."
			required={required}
		/>
	);
}

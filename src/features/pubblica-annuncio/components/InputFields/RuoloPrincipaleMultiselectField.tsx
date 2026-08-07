import MultiselectField from "@/features/pubblica-annuncio/components/InputFields/MultiselectField";

export const RUOLO_PRINCIPALE_OPTIONS = [
	"Portiere",
	"Difensore",
	"Centrocampista",
	"Attaccante",
] as const;

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
			error={required && value.length === 0 ? "Seleziona almeno un ruolo." : undefined}
		/>
	);
}

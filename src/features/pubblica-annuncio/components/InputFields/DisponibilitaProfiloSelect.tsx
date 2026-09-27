import {Field, FieldError, FieldLabel} from "@/components/ui/field";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {
	DISPONIBILITA_PROFILO_OPTIONS,
	type DisponibilitaProfilo,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type DisponibilitaProfiloSelectProps = {
	id: string;
	value: DisponibilitaProfilo;
	onValueChange: (value: DisponibilitaProfilo) => void;
	player?: boolean;
	required?: boolean;
	error?: string;
};

const defaultItems = DISPONIBILITA_PROFILO_OPTIONS.map((option) => ({
	value: option.valore,
	label: option.etichetta,
}));
const playerItems = [
	{value: "svincolato", label: "Svincolato"},
	{value: "sotto-contratto", label: "Al momento sotto contratto"},
];

export default function DisponibilitaProfiloSelect({
	id,
	value,
	onValueChange,
	player = false,
	required = false,
	error,
}: DisponibilitaProfiloSelectProps) {
	const items = player ? playerItems : defaultItems;
	return (
		<Field data-invalid={Boolean(error)}>
			<FieldLabel htmlFor={id}>Disponibilità {required ? <span className="text-destructive" aria-hidden="true">*</span> : <OptionalLabel />}</FieldLabel>
			<Select
				items={items}
				value={player && value === "non-specificare" ? null : value}
				onValueChange={(nextValue) => {
					if (nextValue) onValueChange(nextValue as DisponibilitaProfilo);
				}}
			>
				<SelectTrigger id={id} className="w-full" aria-required={required} aria-invalid={Boolean(error)}>
					<SelectValue placeholder="Seleziona la disponibilità" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{items.map((item) => (
							<SelectItem key={item.value} value={item.value}>
								{item.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			{error && <FieldError>{error}</FieldError>}
		</Field>
	);
}

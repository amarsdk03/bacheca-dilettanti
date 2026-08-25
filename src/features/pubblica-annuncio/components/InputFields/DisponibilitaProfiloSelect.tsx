import {Field, FieldLabel} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {
	DISPONIBILITA_PROFILO_OPTIONS,
	type DisponibilitaProfilo,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type DisponibilitaProfiloSelectProps = {
	id: string;
	value: DisponibilitaProfilo;
	onValueChange: (value: DisponibilitaProfilo) => void;
};

const items = DISPONIBILITA_PROFILO_OPTIONS.map((option) => ({
	value: option.valore,
	label: option.etichetta,
}));

export default function DisponibilitaProfiloSelect({
	id,
	value,
	onValueChange,
}: DisponibilitaProfiloSelectProps) {
	return (
		<Field>
			<FieldLabel htmlFor={id}>Disponibilità <OptionalLabel /></FieldLabel>
			<Select
				items={items}
				value={value}
				onValueChange={(nextValue) => {
					if (nextValue) onValueChange(nextValue as DisponibilitaProfilo);
				}}
			>
				<SelectTrigger id={id} className="w-full">
					<SelectValue />
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
		</Field>
	);
}

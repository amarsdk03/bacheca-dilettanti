import {type Dispatch, type SetStateAction} from "react";

import {Field, FieldLabel} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {DISPONIBILITA_SPOSTAMENTO_OPTIONS} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type DisponibilitaSpostamentoSelectProps = {
	value: string;
	setValue: Dispatch<SetStateAction<string>>;
	id?: string;
	label?: string;
	required?: boolean;
};

export default function DisponibilitaSpostamentoSelect({
	value,
	setValue,
	id = "disponibilita-spostamento",
	label = "Disponibilità spostamento",
	required = false,
}: DisponibilitaSpostamentoSelectProps) {
	return (
		<Field>
			<FieldLabel htmlFor={id}>
				{label} {!required && <OptionalLabel />}
			</FieldLabel>
			<Select value={value || "Non specificare"} onValueChange={(nextValue) => setValue(nextValue ?? "")}>
				<SelectTrigger id={id} className="w-full">
					<SelectValue placeholder="Non specificato" />
				</SelectTrigger>
				<SelectContent>
					{DISPONIBILITA_SPOSTAMENTO_OPTIONS.map((opzione) => (
						<SelectItem key={opzione} value={opzione}>
							{opzione}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</Field>
	);
}

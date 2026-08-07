import {type Dispatch, type SetStateAction} from "react";

import {Field, FieldLabel} from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export const DISPONIBILITA_SPOSTAMENTO_OPTIONS = ["Si", "No"] as const;

type DisponibilitaSpostamentoSelectProps = {
	value: string;
	setValue: Dispatch<SetStateAction<string>>;
	id?: string;
	label?: string;
};

export default function DisponibilitaSpostamentoSelect({
	value,
	setValue,
	id = "disponibilita-spostamento",
	label = "Disponibilità spostamento",
}: DisponibilitaSpostamentoSelectProps) {
	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Select value={value || null} onValueChange={(nextValue) => setValue(nextValue ?? "")}>
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

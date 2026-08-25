import {Field, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";

type AnnuncioTextFieldProps = {
	id: string;
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	type?: "text" | "number";
	min?: number;
	step?: number;
	required?: boolean;
};

export default function AnnuncioTextField({
	id,
	label,
	value,
	onValueChange,
	placeholder,
	type = "text",
	min,
	step,
	required = false,
}: AnnuncioTextFieldProps) {
	return (
		<Field>
			<FieldLabel htmlFor={id}>
				{label} {required ? <span aria-hidden="true" className="text-destructive">*</span> : <OptionalLabel />}
			</FieldLabel>
			<Input
				id={id}
				type={type}
				min={min}
				step={step}
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				placeholder={placeholder}
				required={required}
				aria-required={required}
			/>
		</Field>
	);
}

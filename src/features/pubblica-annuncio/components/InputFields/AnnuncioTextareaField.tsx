import {Field, FieldLabel} from "@/components/ui/field";
import {Textarea} from "@/components/ui/textarea";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";

type AnnuncioTextareaFieldProps = {
	id: string;
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	maxLength?: number;
};

export default function AnnuncioTextareaField({
	id,
	label,
	value,
	onValueChange,
	placeholder,
	maxLength = 2000,
}: AnnuncioTextareaFieldProps) {
	return (
		<Field>
			<div className="flex items-center justify-between gap-3">
				<FieldLabel htmlFor={id}>{label} <OptionalLabel /></FieldLabel>
				<span className="text-xs text-muted-foreground">{value.length}/{maxLength}</span>
			</div>
			<Textarea
				id={id}
				value={value}
				onChange={(event) => onValueChange(event.target.value.slice(0, maxLength))}
				maxLength={maxLength}
				placeholder={placeholder}
				className="min-h-28 resize-y"
			/>
		</Field>
	);
}

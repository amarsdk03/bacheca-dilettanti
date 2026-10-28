import {Field, FieldError, FieldLabel} from "@/components/ui/field";
import {InputGroup, InputGroupAddon, InputGroupInput, InputGroupText} from "@/components/ui/input-group";
import OptionalLabel from "./OptionalLabel";

/** Increment controls use €5; validation continues to accept manually entered cents. */
export default function MoneyField({id, label, value, onChange, error, max = 99_999_999.99, placeholder, unit}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	error?: string;
	max?: number;
	placeholder?: string;
	unit?: string;
}) {
	return <Field data-invalid={Boolean(error)}>
		<FieldLabel htmlFor={id}>{label} <OptionalLabel /></FieldLabel>
		<InputGroup>
			<InputGroupAddon><InputGroupText>€</InputGroupText></InputGroupAddon>
			<InputGroupInput id={id} type="number" min={0} max={max} step={5} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-invalid={Boolean(error)} />
			{unit && <InputGroupAddon align="inline-end"><InputGroupText>{unit}</InputGroupText></InputGroupAddon>}
		</InputGroup>
		{error && <FieldError>{error}</FieldError>}
	</Field>;
}

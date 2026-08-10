import {Field, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";

type DateRangeFieldsProps = {
	from: string;
	setFrom: (value: string) => void;
	to: string;
	setTo: (value: string) => void;
	idPrefix: string;
	required?: boolean;
	indicativo?: boolean;
};

export default function DateRangeFields({
	from,
	setFrom,
	to,
	setTo,
	idPrefix,
	required = false,
	indicativo = false,
}: DateRangeFieldsProps) {
	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<Field>
				<FieldLabel htmlFor={`${idPrefix}-dal`}>
					Periodo dal {indicativo && (" (indicativo)")} {!required && <OptionalLabel />}
				</FieldLabel>
				<Input
					id={`${idPrefix}-dal`}
					type="date"
					value={from}
					onChange={(event) => setFrom(event.target.value)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={`${idPrefix}-al`}>
					Periodo al {indicativo && (" (indicativo)")} {!required && <OptionalLabel />}
				</FieldLabel>
				<Input
					id={`${idPrefix}-al`}
					type="date"
					value={to}
					onChange={(event) => setTo(event.target.value)}
				/>
			</Field>
		</div>
	);
}

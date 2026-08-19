import {Field, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {
	ORARIO_INDICATIVO_A_OPTIONS,
	ORARIO_INDICATIVO_DA_OPTIONS,
} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type OrarioIndicativoFieldsProps = {
	from: string;
	setFrom: (value: string) => void;
	to: string;
	setTo: (value: string) => void;
	idPrefix: string;
};

export function isOrarioIndicativoValid(from: string, to: string) {
	return (from === "" && to === "") || (from !== "" && to !== "");
}

export default function OrarioIndicativoFields({
	from,
	setFrom,
	to,
	setTo,
	idPrefix,
}: OrarioIndicativoFieldsProps) {
	const intervalloCompleto = isOrarioIndicativoValid(from, to);

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<Field>
				<FieldLabel htmlFor={`${idPrefix}-dalle`}>Orario indicativo: dalle <OptionalLabel /></FieldLabel>
				<Select value={from || null} onValueChange={(value) => setFrom(value ?? "")}>
					<SelectTrigger id={`${idPrefix}-dalle`} className="w-full">
						<SelectValue placeholder="Dalle" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={null}>Non specificare</SelectItem>
						{ORARIO_INDICATIVO_DA_OPTIONS.map((opzione) => (
							<SelectItem key={opzione.valore} value={opzione.valore}>{opzione.etichetta}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</Field>
			<Field>
				<FieldLabel htmlFor={`${idPrefix}-alle`}>Orario indicativo: alle <OptionalLabel /></FieldLabel>
				<Select value={to || null} onValueChange={(value) => setTo(value ?? "")}>
					<SelectTrigger id={`${idPrefix}-alle`} className="w-full">
						<SelectValue placeholder="Alle" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={null}>Non specificare</SelectItem>
						{ORARIO_INDICATIVO_A_OPTIONS.map((opzione) => (
							<SelectItem key={opzione.valore} value={opzione.valore}>{opzione.etichetta}</SelectItem>
						))}
					</SelectContent>
				</Select>
			</Field>
			{!intervalloCompleto && (
				<FieldDescription className="font-medium text-red-800 sm:col-span-2">
					Seleziona sia l&apos;orario iniziale sia quello finale.
				</FieldDescription>
			)}
		</div>
	);
}

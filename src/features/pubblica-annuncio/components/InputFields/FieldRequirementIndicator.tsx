import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";

export function RequiredMark() {
	return <span aria-hidden="true" className="text-destructive">*</span>;
}

export default function FieldRequirementIndicator({required}: {required: boolean}) {
	return required ? <RequiredMark /> : <OptionalLabel />;
}

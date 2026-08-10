import {Field, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import LinkAnnuncioPremiumBadge from "@/features/pubblica-annuncio/components/InputFields/PremiumOnlyBadge";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {
	isLinkAnnuncioValid,
	MAX_LINK_ANNUNCIO_LENGTH,
} from "@/features/pubblica-annuncio/types/premiumAnnuncio";

type LinkAnnuncioPremiumFieldProps = {
	idPrefix: string;
	tipologia: string;
	value: string;
	onValueChange: (value: string) => void;
};

export default function LinkAnnuncioPremiumField({
	idPrefix,
	tipologia,
	value,
	onValueChange,
}: LinkAnnuncioPremiumFieldProps) {
	const id = `${idPrefix}-link-annuncio`;
	const linkValido = isLinkAnnuncioValid(value);

	return (
		<Field>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<FieldLabel htmlFor={id}>
					Link annuncio <OptionalLabel />
				</FieldLabel>
				<LinkAnnuncioPremiumBadge tipologia={tipologia} funzione="Link annuncio" />
			</div>
			<Input
				id={id}
				type="url"
				inputMode="url"
				value={value}
				onChange={(event) => onValueChange(event.target.value.slice(0, MAX_LINK_ANNUNCIO_LENGTH))}
				placeholder="https://esempio.it/annuncio"
				maxLength={MAX_LINK_ANNUNCIO_LENGTH}
				aria-invalid={!linkValido}
			/>
			{!linkValido && (
				<FieldDescription className="font-medium text-red-800">
					Inserisci un link completo che inizi con http:// o https://.
				</FieldDescription>
			)}
			<FieldDescription>
				Il link verrà pubblicato solo scegliendo un piano a pagamento.
			</FieldDescription>
		</Field>
	);
}

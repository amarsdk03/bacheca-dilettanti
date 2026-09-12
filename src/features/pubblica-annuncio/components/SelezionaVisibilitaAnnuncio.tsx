"use client";

import {CircleDollarSignIcon, CrownIcon} from "lucide-react";

import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import type {PublishVisibility} from "@/features/pubblica-annuncio/publish-model";

const VISIBILITY_OPTIONS = [
	{
		value: "gratuito",
		label: "Annuncio gratuito",
		price: "0 EUR",
		description: "L’annuncio viene inviato direttamente in revisione.",
		icon: CircleDollarSignIcon,
	},
	{
		value: "prioritario",
		label: "Annuncio prioritario",
		price: "7,90 EUR",
		description: "Dopo il pagamento, l’annuncio entra in revisione e avrà priorità per 7 giorni dall’approvazione.",
		icon: CrownIcon,
	},
] as const satisfies readonly {
	value: PublishVisibility;
	label: string;
	price: string;
	description: string;
	icon: typeof CircleDollarSignIcon;
}[];

export default function SelezionaVisibilitaAnnuncio({
	value,
	onValueChange,
}: {
	value: PublishVisibility;
	onValueChange: (value: PublishVisibility) => void;
}) {
	return (
		<FieldSet>
			<FieldLegend>Visibilità</FieldLegend>
			<FieldDescription className="mb-3">
				Scegli come pubblicare l’annuncio. Il pagamento viene richiesto soltanto per l’opzione prioritaria.
			</FieldDescription>
			<RadioGroup
				value={value}
				onValueChange={(nextValue) => onValueChange(nextValue as PublishVisibility)}
				className="grid gap-3 sm:grid-cols-2"
			>
				{VISIBILITY_OPTIONS.map((option) => {
					const Icon = option.icon;
					return (
						<FieldLabel key={option.value} htmlFor={`visibility-${option.value}`} className="group/card h-full">
							<Field className="h-full items-start rounded-xl border-2 p-4 transition-all group-has-[data-checked]/card:border-brand-indigo group-has-[data-checked]/card:bg-brand-indigo/5 group-has-[data-checked]/card:shadow-sm">
								<div className="flex w-full items-start justify-between gap-3">
									<div className="rounded-lg bg-brand-indigo/10 p-2 text-brand-indigo"><Icon className="size-5" /></div>
									<RadioGroupItem id={`visibility-${option.value}`} value={option.value} />
								</div>
								<FieldContent className="gap-1">
									<FieldTitle className="text-base">{option.label}</FieldTitle>
									<p className="text-sm font-semibold text-brand-indigo">{option.price}</p>
									<FieldDescription className="mt-1 leading-5">{option.description}</FieldDescription>
								</FieldContent>
							</Field>
						</FieldLabel>
					);
				})}
			</RadioGroup>
		</FieldSet>
	);
}

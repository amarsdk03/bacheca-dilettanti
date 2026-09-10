"use client";

import {useRef} from "react";
import {X} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Field, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import PremiumOnlyBadge from "@/features/pubblica-annuncio/components/InputFields/PremiumOnlyBadge";
import {getAnnouncementImageError} from "@/features/pubblica-annuncio/types/premiumAnnuncio";

type ImmagineAnnuncioPremiumFieldProps = {
	idPrefix: string;
	tipologia: string;
	value: File | null;
	onValueChange: (value: File | null) => void;
};

export default function ImmagineAnnuncioPremiumField({
	idPrefix,
	tipologia,
	value,
	onValueChange,
}: ImmagineAnnuncioPremiumFieldProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const error = getAnnouncementImageError(value);

	const removeImage = () => {
		onValueChange(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	return (
		<Field>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<FieldLabel htmlFor={`${idPrefix}-immagine-annuncio`}>
					Immagine dell&apos;annuncio <OptionalLabel />
				</FieldLabel>
				<PremiumOnlyBadge tipologia={tipologia} funzione="Immagine dell'annuncio" />
			</div>
			<Input
				ref={fileInputRef}
				id={`${idPrefix}-immagine-annuncio`}
				type="file"
				accept="image/png,image/jpeg,image/webp"
				onChange={(event) => onValueChange(event.target.files?.[0] ?? null)}
				aria-invalid={Boolean(error)}
			/>
			{error && <FieldDescription className="font-medium text-destructive">{error}</FieldDescription>}
			<FieldDescription className="text-brand-indigo">
				PNG, JPEG o WebP, massimo 5 MB. L&apos;immagine viene salvata ora e potrà essere pubblicata con un piano a pagamento.
			</FieldDescription>
			{value && (
				<div className="flex items-center justify-between gap-3 rounded-lg border border-brand-indigo/30 bg-brand-indigo/10 px-3 py-2 text-sm text-brand-ink">
					<span className="min-w-0 truncate">{value.name}</span>
					<Button type="button" variant="ghost" size="icon-xs" onClick={removeImage} aria-label="Rimuovi immagine">
						<X />
					</Button>
				</div>
			)}
		</Field>
	);
}

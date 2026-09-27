"use client";

import {hasFlag} from "country-flag-icons";
import {Button} from "@/components/ui/button";
import {Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList} from "@/components/ui/combobox";
import {Field, FieldDescription, FieldError, FieldLabel} from "@/components/ui/field";
import {InputGroupAddon} from "@/components/ui/input-group";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import DynamicReactFlag from "@/components/dynamic/DynamicReactFlag";
import {PLAYER_NATIONALITIES} from "./player-nationalities";

export default function PlayerNationalityField({id, value, onChange, error}: {id: string; value: string | null; onChange: (value: string) => void; error?: string}) {
	const selected = PLAYER_NATIONALITIES.find(({code}) => code === value) ?? null;
	return <Field data-invalid={Boolean(error)}>
		<FieldLabel htmlFor={id}>Nazionalità <OptionalLabel /></FieldLabel>
		<Combobox
			items={PLAYER_NATIONALITIES}
			value={selected}
			itemToStringLabel={(item: typeof PLAYER_NATIONALITIES[number]) => item.label}
			itemToStringValue={(item: typeof PLAYER_NATIONALITIES[number]) => item.code}
			isItemEqualToValue={(item: typeof PLAYER_NATIONALITIES[number], candidate: typeof PLAYER_NATIONALITIES[number]) => item.code === candidate.code}
			onValueChange={(item) => onChange(item?.code ?? "")}
		>
			<ComboboxInput id={id} className="w-full" placeholder="Cerca una nazionalità" showClear={Boolean(selected)} aria-invalid={Boolean(error)}>
				{selected && hasFlag(selected.code) && (
					<InputGroupAddon align="inline-end" aria-hidden="true">
						<DynamicReactFlag code={selected.code} className="h-4 w-6 rounded-xs" />
					</InputGroupAddon>
				)}
			</ComboboxInput>
			<ComboboxContent>
				<ComboboxEmpty>Nessuna nazionalità trovata.</ComboboxEmpty>
				<ComboboxList>
					{(item: typeof PLAYER_NATIONALITIES[number]) => (
						<ComboboxItem key={item.code} value={item}>
							<DynamicReactFlag code={item.code} className="h-4 w-6 shrink-0 rounded-xs" />{item.label}
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
		{value && !selected && !error && <FieldDescription>Il codice salvato ({value}) non è più disponibile. Seleziona una nazionalità valida o lascia il campo vuoto.</FieldDescription>}
		{value && !selected && <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange("")}>Svuota il campo</Button>}
		{error && <FieldError>{error}</FieldError>}
	</Field>;
}

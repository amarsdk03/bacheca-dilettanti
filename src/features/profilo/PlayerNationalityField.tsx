"use client";

import {Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList} from "@/components/ui/combobox";
import {Field, FieldLabel} from "@/components/ui/field";
import {InputGroupAddon} from "@/components/ui/input-group";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {nationalityFlag, PLAYER_NATIONALITIES} from "./player-nationalities";

export default function PlayerNationalityField({id, value, onChange}: {id: string; value: string | null; onChange: (value: string) => void}) {
	const selected = PLAYER_NATIONALITIES.find(({code}) => code === value) ?? null;
	return <Field>
		<FieldLabel htmlFor={id}>Nazionalità <OptionalLabel /></FieldLabel>
		<Combobox
			items={PLAYER_NATIONALITIES}
			value={selected}
			itemToStringLabel={(item: typeof PLAYER_NATIONALITIES[number]) => item.label}
			itemToStringValue={(item: typeof PLAYER_NATIONALITIES[number]) => item.code}
			isItemEqualToValue={(item: typeof PLAYER_NATIONALITIES[number], candidate: typeof PLAYER_NATIONALITIES[number]) => item.code === candidate.code}
			onValueChange={(item) => onChange(item?.code ?? "")}
		>
			<ComboboxInput id={id} className="w-full" placeholder="Cerca una nazionalità" showClear={Boolean(value)}>
				{selected && <InputGroupAddon align="inline-end" aria-hidden="true">{nationalityFlag(selected.code)}</InputGroupAddon>}
			</ComboboxInput>
			<ComboboxContent>
				<ComboboxEmpty>Nessuna nazionalità trovata.</ComboboxEmpty>
				<ComboboxList>{(item: typeof PLAYER_NATIONALITIES[number]) => <ComboboxItem key={item.code} value={item}>{item.label}<span className="ml-auto" aria-hidden="true">{nationalityFlag(item.code)}</span></ComboboxItem>}</ComboboxList>
			</ComboboxContent>
		</Combobox>
	</Field>;
}

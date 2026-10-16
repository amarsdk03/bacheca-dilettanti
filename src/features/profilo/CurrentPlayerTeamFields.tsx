"use client";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import type {ProfileDrafts, ProfileDraftUpdater} from "./profile-model";
import TeamProfileComboboxField from "./TeamProfileComboboxField";
import {currentCategoryLabel} from "./current-team";

export function CurrentPlayerTeamSelect({prefix, draft, onChange}: {prefix: string; draft: ProfileDrafts["giocatore"]; onChange: ProfileDraftUpdater}) {
	return <Field data-disabled={draft.disponibilita === "svincolato"}>
		<FieldLabel htmlFor={`${prefix}-squadra-attuale`}>Squadra attuale</FieldLabel>
		<TeamProfileComboboxField id={`${prefix}-squadra-attuale`} value={draft.squadra_attuale_nome ?? ""} maxLength={160}
			profileId={draft.squadra_attuale_profilo_id} disabled={draft.disponibilita === "svincolato"}
			onValueChange={(name, profileId, item) => {
				if (name !== draft.squadra_attuale_nome || (item && item.subprofileId !== draft.squadra_attuale_id)) onChange("giocatore", "squadra_attuale_dal", "");
				onChange("giocatore", "squadra_attuale_nome", name);
				onChange("giocatore", "squadra_attuale_id", item?.subprofileId ?? null);
				onChange("giocatore", "squadra_attuale_profilo_id", profileId);
				onChange("giocatore", "squadra_attuale_categoria", item?.currentCategory ?? "");
				onChange("giocatore", "squadra_attuale_torneo", item?.tournamentName ?? "");
				if (item) {
					onChange("giocatore", "categoria_attuale", item.currentCategory ?? "");
				}
			}} />
	</Field>;
}

export function CurrentPlayerCareerFields({prefix, draft, onFromChange}: {prefix: string; draft: ProfileDrafts["giocatore"]; onFromChange: (value: string) => void}) {
	if (!draft.squadra_attuale_nome || draft.disponibilita === "svincolato") return null;
	const year = new Date().getFullYear();
	return <FieldGroup className="rounded-lg border bg-background p-4">
		<p className="font-medium">Esperienza attuale</p>
		<FieldGroup className="grid gap-4 sm:grid-cols-2">
			<Field><FieldLabel htmlFor={`${prefix}-attuale-dal`}>Stagione: dal</FieldLabel>
				<Select value={draft.squadra_attuale_dal || null} onValueChange={value => onFromChange(value ?? "")}>
					<SelectTrigger id={`${prefix}-attuale-dal`}><SelectValue placeholder="Non specificare" /></SelectTrigger>
					<SelectContent><SelectGroup><SelectItem value={null}>Non specificare</SelectItem>{Array.from({length: year - 1899}, (_, i) => String(year - i)).map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectGroup></SelectContent>
				</Select>
			</Field>
			<Field data-disabled><FieldLabel htmlFor={`${prefix}-attuale-al`}>Stagione: al</FieldLabel><Input id={`${prefix}-attuale-al`} disabled value="Ad oggi" /></Field>
			<Field data-disabled><FieldLabel htmlFor={`${prefix}-attuale-squadra`}>Squadra</FieldLabel><Input id={`${prefix}-attuale-squadra`} disabled value={draft.squadra_attuale_nome} /></Field>
			<Field data-disabled><FieldLabel htmlFor={`${prefix}-attuale-categoria`}>Categoria</FieldLabel><Input id={`${prefix}-attuale-categoria`} disabled value={currentCategoryLabel(draft.categoria_attuale, draft.squadra_attuale_torneo)} /></Field>
		</FieldGroup>
	</FieldGroup>;
}

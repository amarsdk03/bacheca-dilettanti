import {type Dispatch, type SetStateAction} from "react";
import {Plus, Trash2} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Field, FieldDescription, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";

export type StatoEsperienza = "non-specificare" | "in-corso" | "conseguito";

export type EsperienzaAnnuncio = {
	id: string;
	titolo: string;
	ente: string;
	periodoDa: string;
	periodoA: string;
	descrizione: string;
	stato: StatoEsperienza;
};

export function createEsperienzaAnnuncio(): EsperienzaAnnuncio {
	const id =
		globalThis.crypto?.randomUUID?.() ??
		`esperienza-${Date.now()}-${Math.random().toString(36).slice(2)}`;

	return {
		id,
		titolo: "",
		ente: "",
		periodoDa: "",
		periodoA: "",
		descrizione: "",
		stato: "non-specificare",
	};
}

type EsperienzeAnnuncioFieldsProps = {
	esperienze: EsperienzaAnnuncio[];
	setEsperienze: Dispatch<SetStateAction<EsperienzaAnnuncio[]>>;
	idPrefix: string;
	titolo?: string;
};

const STATO_OPTIONS: {value: StatoEsperienza; label: string}[] = [
	{value: "non-specificare", label: "Non specificare"},
	{value: "in-corso", label: "In corso"},
	{value: "conseguito", label: "Conseguito"},
];

export default function EsperienzeAnnuncioFields({
	                                                 esperienze,
	                                                 setEsperienze,
	                                                 idPrefix,
	                                                 titolo = "Qualifiche / Patentini",
                                                 }: EsperienzeAnnuncioFieldsProps) {
	const addEsperienza = () => {
		setEsperienze((prev) => [...prev, createEsperienzaAnnuncio()]);
	};

	const updateEsperienza = <K extends keyof Omit<EsperienzaAnnuncio, "id">>(
		id: string,
		campo: K,
		valore: EsperienzaAnnuncio[K]
	) => {
		setEsperienze((prev) =>
			prev.map((esperienza) =>
				esperienza.id === id ? {...esperienza, [campo]: valore} : esperienza
			)
		);
	};

	const removeEsperienza = (id: string) => {
		setEsperienze((prev) => prev.filter((esperienza) => esperienza.id !== id));
	};

	return (
		<FieldSet>
			<div className="mt-4 flex items-start justify-between gap-3">
				<div>
					<FieldLegend variant="label" className="field-legend-title mb-0">
						{titolo}
					</FieldLegend>
					<FieldDescription>Licenze, patentini, incarichi o esperienze rilevanti.</FieldDescription>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={addEsperienza}>
					<Plus />
					Aggiungi
				</Button>
			</div>

			{esperienze.length === 0 ? (
				<div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
					Nessuna esperienza inserita.
				</div>
			) : (
				<div className="grid gap-4">
					{esperienze.map((esperienza, index) => (
						<div key={esperienza.id} className="rounded-lg border bg-background p-4">
							<div className="mb-4 flex items-center justify-between gap-3">
								<p className="text-base font-semibold">Esperienza #{index + 1}</p>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => removeEsperienza(esperienza.id)}
									aria-label={`Rimuovi esperienza ${index + 1}`}
								>
									<Trash2 />
								</Button>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<Field>
									<FieldLabel htmlFor={`${idPrefix}-esperienza-${esperienza.id}`}>
										Esperienza / patentino / licenza <OptionalLabel />
									</FieldLabel>
									<Input
										id={`${idPrefix}-esperienza-${esperienza.id}`}
										value={esperienza.titolo}
										onChange={(event) =>
											updateEsperienza(esperienza.id, "titolo", event.target.value)
										}
										placeholder="Arbitro FIGC, preparatore atletico..."
									/>
								</Field>

								<Field>
									<FieldLabel htmlFor={`${idPrefix}-ente-${esperienza.id}`}>
										Ente di origine / rilascio <OptionalLabel />
									</FieldLabel>
									<Input
										id={`${idPrefix}-ente-${esperienza.id}`}
										value={esperienza.ente}
										onChange={(event) =>
											updateEsperienza(esperienza.id, "ente", event.target.value)
										}
										placeholder="FIGC, LND, società..."
									/>
								</Field>
							</div>

							<RadioGroup
								className="mt-4"
								value={esperienza.stato}
								onValueChange={(value) => updateEsperienza(esperienza.id, "stato", value as StatoEsperienza)}
							>
								{STATO_OPTIONS.map((opzione) => (
									<Field key={opzione.value} orientation="horizontal">
										<RadioGroupItem
											value={opzione.value}
											id={`${idPrefix}-stato-${esperienza.id}-${opzione.value}`}
										/>
										<FieldLabel
											htmlFor={`${idPrefix}-stato-${esperienza.id}-${opzione.value}`}
											className="font-normal"
										>
											{opzione.label}
										</FieldLabel>
									</Field>
								))}
							</RadioGroup>
						</div>
					))}
				</div>
			)}
		</FieldSet>
	);
}
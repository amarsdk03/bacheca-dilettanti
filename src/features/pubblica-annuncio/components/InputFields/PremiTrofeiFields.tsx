import {type Dispatch, type SetStateAction} from "react";
import {PlusIcon, Trash2Icon} from "lucide-react";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {
	createPremioTrofeo,
	MAX_PREMI_TROFEI,
	type PremioTrofeo,
} from "@/features/pubblica-annuncio/state/AnnuncioTorneoEvento.store";

type PremiTrofeiFieldsProps = {
	premiTrofei: PremioTrofeo[];
	setPremiTrofei: Dispatch<SetStateAction<PremioTrofeo[]>>;
	error?: string | null;
};

export default function PremiTrofeiFields({
	premiTrofei,
	setPremiTrofei,
	error,
}: PremiTrofeiFieldsProps) {
	const addPremioTrofeo = () => {
		setPremiTrofei((previous) => previous.length >= MAX_PREMI_TROFEI
			? previous
			: [...previous, createPremioTrofeo()]);
	};

	const updatePremioTrofeo = <K extends keyof Omit<PremioTrofeo, "id">>(
		id: string,
		field: K,
		value: PremioTrofeo[K],
	) => {
		setPremiTrofei((previous) => previous.map((premio) =>
			premio.id === id ? {...premio, [field]: value} : premio
		));
	};

	const removePremioTrofeo = (id: string) => {
		setPremiTrofei((previous) => previous.filter((premio) => premio.id !== id));
	};

	return (
		<FieldSet>
			<div className="mt-4 flex items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<FieldLegend variant="label" className="field-legend-title mb-0">
							Premi e trofei
						</FieldLegend>
						<Badge variant="secondary">{premiTrofei.length}/{MAX_PREMI_TROFEI}</Badge>
					</div>
					<FieldDescription>
						Aggiungi i premi previsti per i diversi piazzamenti.
					</FieldDescription>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={addPremioTrofeo}
					disabled={premiTrofei.length >= MAX_PREMI_TROFEI}
				>
					<PlusIcon data-icon="inline-start" />
					Aggiungi
				</Button>
			</div>

			{premiTrofei.length === 0 ? (
				<FieldDescription>Nessun premio o trofeo inserito.</FieldDescription>
			) : (
				<FieldGroup>
					{premiTrofei.map((premio, index) => {
						const validationMessage = error === undefined
							? "Inserisci il titolo del premio."
							: error;
						const titoloNonValido = Boolean(validationMessage) && premio.titoloPremio.trim() === "";

						return (
							<div key={premio.id} className="rounded-lg border bg-background p-4">
								<div className="mb-4 flex items-center justify-between gap-3">
									<p className="text-base font-semibold">Premio #{index + 1}</p>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										onClick={() => removePremioTrofeo(premio.id)}
										aria-label={`Rimuovi premio ${index + 1}`}
									>
										<Trash2Icon />
									</Button>
								</div>

								<FieldGroup className="grid gap-4 sm:grid-cols-2">
									<Field>
										<FieldLabel htmlFor={`premio-posto-${premio.id}`}>
											Posto <OptionalLabel />
										</FieldLabel>
										<Input
											id={`premio-posto-${premio.id}`}
											value={premio.posto}
											onChange={(event) => updatePremioTrofeo(premio.id, "posto", event.target.value)}
											placeholder="1° posto Amatoriali"
										/>
									</Field>

									<Field data-invalid={titoloNonValido}>
										<FieldLabel htmlFor={`premio-titolo-${premio.id}`}>
											Titolo premio
										</FieldLabel>
										<Input
											id={`premio-titolo-${premio.id}`}
											value={premio.titoloPremio}
											onChange={(event) => updatePremioTrofeo(premio.id, "titoloPremio", event.target.value)}
											placeholder="1000 euro"
											required
											aria-invalid={titoloNonValido}
										/>
										{titoloNonValido && <FieldError>{validationMessage}</FieldError>}
									</Field>
								</FieldGroup>
							</div>
						);
					})}
				</FieldGroup>
			)}
		</FieldSet>
	);
}

import {useId, useState, type Dispatch, type SetStateAction} from "react";
import {Check, Plus, X} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Field, FieldDescription, FieldLabel, FieldLegend, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Regione, REGIONI_ITALIANE} from "@/const/defaultConstants";
import OptionalLabel from "@/features/pubblica-annuncio/components/InputFields/OptionalLabel";
import {CITTA_ESEMPIO_PER_REGIONE} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";
import {ScrollArea} from "@/components/ui/scroll-area";

export type CittaComuniPerRegione = Record<string, string[]>;

const regioniPerArea = REGIONI_ITALIANE.reduce(
	(acc, regione) => {
		acc[regione.area].push(regione);
		return acc;
	},
	{
		Nord: [],
		Centro: [],
		Sud: [],
	} as Record<"Nord" | "Centro" | "Sud", Regione[]>
);

type RegioniInteresseFieldProps = {
	regioniInteressate: string[];
	setRegioniInteressate: Dispatch<SetStateAction<string[]>>;
	cittaComuniPerRegione: CittaComuniPerRegione;
	setCittaComuniPerRegione: Dispatch<SetStateAction<CittaComuniPerRegione>>;
	idPrefix?: string;
};

// --- Sub-componente estratto: prima era duplicato 3 volte nel file originale ---
type RegioneCittaCardProps = {
	regione: string;
	fieldId: string;
	bozza: string;
	onBozzaChange: (valore: string) => void;
	onAddCittaComune: () => void;
	citta: string[];
	onRemoveCittaComune: (cittaComune: string) => void;
};

function RegioneCittaCard({
	                          regione,
	                          fieldId,
	                          bozza,
	                          onBozzaChange,
	                          onAddCittaComune,
	                          citta,
	                          onRemoveCittaComune,
                          }: RegioneCittaCardProps) {
	return (
		<div className="rounded-lg border bg-background p-3">
			<Field>
				<FieldLabel htmlFor={fieldId}>
					{regione}: inserisci città e comuni <OptionalLabel />
				</FieldLabel>
				<div className="flex gap-2">
					<Input
						id={fieldId}
						value={bozza}
						onChange={(event) => onBozzaChange(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === ",") {
								event.preventDefault();
								onAddCittaComune();
							}
						}}
						placeholder={`${(CITTA_ESEMPIO_PER_REGIONE[regione] ?? []).join(", ")}...`}
					/>
					<Button
						type="button"
						size="icon"
						variant="outline"
						onClick={onAddCittaComune}
						aria-label={`Aggiungi citta o comune per ${regione}`}
					>
						<Plus />
					</Button>
				</div>
				<FieldDescription className="text-xs" hidden={citta.length > 0}>
					Puoi lasciare vuoto questo dettaglio se l&apos;interesse vale per tutta la regione.
				</FieldDescription>
			</Field>

			{citta.length > 0 && (
				<div className="mt-3 flex flex-wrap gap-2">
					{citta.map((cittaComune) => (
						<span
							key={cittaComune}
							className="inline-flex items-center gap-1 rounded-full bg-fuchsia-100 px-2 py-1 text-xs font-medium text-fuchsia-800"
						>
							{cittaComune}
							<Button
								type="button"
								size="icon-xs"
								variant="ghost"
								onClick={() => onRemoveCittaComune(cittaComune)}
								aria-label={`Rimuovi ${cittaComune}`}
								className="size-5 rounded-full text-fuchsia-800 hover:bg-fuchsia-200"
							>
								<X />
							</Button>
						</span>
					))}
				</div>
			)}
		</div>
	);
}

export default function RegioniInteresseField({
	                                              regioniInteressate,
	                                              setRegioniInteressate,
	                                              cittaComuniPerRegione,
	                                              setCittaComuniPerRegione,
	                                              idPrefix,
                                              }: RegioniInteresseFieldProps) {
	const [bozzaCittaPerRegione, setBozzaCittaPerRegione] = useState<Record<string, string>>({});
	const generatedId = useId();
	const resolvedIdPrefix = idPrefix ?? `regioni-${generatedId}`;
	const getCittaFieldId = (regione: string) => `${resolvedIdPrefix}-citta-${encodeURIComponent(regione)}`;
	const tutteLeRegioni = REGIONI_ITALIANE.map((regione) => regione.nome);
	const tutteSelezionate = regioniInteressate.length === tutteLeRegioni.length;

	const handleRegioniChange = (prossimeRegioni: string[]) => {
		setRegioniInteressate(prossimeRegioni);
		setCittaComuniPerRegione((prev) =>
			Object.fromEntries(
				Object.entries(prev).filter(([regione]) => prossimeRegioni.includes(regione))
			)
		);
	};

	const addCittaComune = (regione: string) => {
		const valore = (bozzaCittaPerRegione[regione] ?? "").trim();
		if (!valore) return;

		setCittaComuniPerRegione((prev) => {
			const cittaCorrenti = prev[regione] ?? [];
			const giaPresente = cittaCorrenti.some(
				(citta) => citta.toLocaleLowerCase() === valore.toLocaleLowerCase()
			);
			if (giaPresente) return prev;

			return {...prev, [regione]: [...cittaCorrenti, valore]};
		});
		setBozzaCittaPerRegione((prev) => ({...prev, [regione]: ""}));
	};

	const removeCittaComune = (regione: string, cittaComune: string) => {
		setCittaComuniPerRegione((prev) => {
			const prossimeCitta = (prev[regione] ?? []).filter((citta) => citta !== cittaComune);
			if (prossimeCitta.length === 0) {
				const prossimeRegioni = {...prev};
				delete prossimeRegioni[regione];
				return prossimeRegioni;
			}
			return {...prev, [regione]: prossimeCitta};
		});
	};

	// Rendering condiviso tra ramo con ScrollArea e ramo senza: elimina la duplicazione del JSX
	const listaCittaRegioni = (
		<div className="grid gap-3 p-3">
			{regioniInteressate.map((regione) => (
				<RegioneCittaCard
					key={regione}
					regione={regione}
					fieldId={getCittaFieldId(regione)}
					bozza={bozzaCittaPerRegione[regione] ?? ""}
					onBozzaChange={(valore) =>
						setBozzaCittaPerRegione((prev) => ({...prev, [regione]: valore}))
					}
					onAddCittaComune={() => addCittaComune(regione)}
					citta={cittaComuniPerRegione[regione] ?? []}
					onRemoveCittaComune={(cittaComune) => removeCittaComune(regione, cittaComune)}
				/>
			))}
		</div>
	);

	return (
		<FieldSet>
			<div className="mt-4">
				<div className="flex items-center justify-between gap-3">
					<FieldLegend variant="label" className="field-legend-title mb-0">
						Regioni interessate
					</FieldLegend>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => handleRegioniChange(tutteSelezionate ? [] : tutteLeRegioni)}
					>
						{tutteSelezionate ? "Deseleziona tutte" : "Seleziona tutte"}
					</Button>
				</div>
				<FieldDescription
					className="text-red-800 font-medium"
					hidden={regioniInteressate.length > 0}
				>
					Almeno una regione va selezionata
				</FieldDescription>
			</div>

			{Object.entries(regioniPerArea).map(([area, regioni]) => (
				<Field key={area}>
					<FieldLabel htmlFor={`${resolvedIdPrefix}-area-${area}`}>{area}</FieldLabel>
					<ToggleGroup
						id={`${resolvedIdPrefix}-area-${area}`}
						variant="outline"
						spacing={2}
						size="lg"
						className="grid w-full grid-cols-2 flex-wrap sm:grid-cols-3"
						value={regioniInteressate}
						onValueChange={handleRegioniChange}
						multiple
						aria-required
					>
						{regioni.map((regione) => (
							<ToggleGroupItem
								key={regione.nome}
								value={regione.nome}
								aria-label={regione.nome}
								className="group flex min-w-0 items-center gap-2 overflow-hidden transition-all data-pressed:bg-fuchsia-200"
							>
								<Check
									className="size-3 -translate-x-2 scale-75 text-fuchsia-600 opacity-0 transition-all duration-300
									ease-out group-data-pressed:-translate-x-1 group-data-pressed:scale-100 group-data-pressed:opacity-100 sm:size-4"
								/>
								<span className="-translate-x-2.5 truncate text-xs transition-all duration-300 ease-out group-data-pressed:-translate-x-1 sm:text-sm">
									{regione.nome}
								</span>
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</Field>
			))}

			{regioniInteressate.length > 0 &&
				(regioniInteressate.length > 4 ? (
					<ScrollArea className="h-[520px] rounded-md border pe-1">{listaCittaRegioni}</ScrollArea>
				) : (
					listaCittaRegioni
				))}
		</FieldSet>
	);
}
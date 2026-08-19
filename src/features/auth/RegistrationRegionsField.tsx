import {Button} from "@/components/ui/button";
import {Field, FieldDescription, FieldError, FieldGroup, FieldLegend, FieldSet, FieldTitle} from "@/components/ui/field";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {REGIONI_ITALIANE, type Regione} from "@/const/defaultConstants";

interface RegistrationRegionsFieldProps {
	idPrefix: string;
	value: string[];
	onValueChange: (value: string[]) => void;
	showErrors: boolean;
}

const REGIONS_BY_AREA = REGIONI_ITALIANE.reduce(
	(groups, region) => {
		groups[region.area].push(region);
		return groups;
	},
	{Nord: [], Centro: [], Sud: []} as Record<Regione["area"], Regione[]>,
);

const ALL_REGIONS = REGIONI_ITALIANE.map((region) => region.nome);

export default function RegistrationRegionsField({
	idPrefix,
	value,
	onValueChange,
	showErrors,
}: RegistrationRegionsFieldProps) {
	const invalid = showErrors && value.length === 0;
	const allSelected = value.length === ALL_REGIONS.length;

	return (
		<FieldSet data-invalid={invalid}>
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<FieldLegend variant="label">
						Regioni interessate <span aria-hidden="true" className="text-destructive">*</span>
					</FieldLegend>
					<FieldDescription>Seleziona una o più regioni pertinenti per questo profilo.</FieldDescription>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onValueChange(allSelected ? [] : ALL_REGIONS)}
				>
					{allSelected ? "Deseleziona tutte" : "Seleziona tutte"}
				</Button>
			</div>

			<FieldGroup className="gap-4">
				{Object.entries(REGIONS_BY_AREA).map(([area, regions]) => {
					const labelId = `${idPrefix}-${area.toLowerCase()}-label`;

					return (
						<Field key={area} data-invalid={invalid}>
							<FieldTitle id={labelId}>{area}</FieldTitle>
							<ToggleGroup
								multiple
								value={value}
								onValueChange={onValueChange}
								variant="outline"
								spacing={2}
								className="grid w-full grid-cols-2 sm:grid-cols-3"
								aria-labelledby={labelId}
								aria-invalid={invalid}
								aria-required="true"
							>
								{regions.map((region) => (
									<ToggleGroupItem key={region.nome} value={region.nome} className="min-w-0">
										<span className="truncate">{region.nome}</span>
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</Field>
					);
				})}
			</FieldGroup>

			{invalid && <FieldError>Seleziona almeno una regione.</FieldError>}
		</FieldSet>
	);
}

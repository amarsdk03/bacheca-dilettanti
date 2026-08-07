import DynamicLucideIcon from "@/components/dynamic/DynamicLucideIcon";
import {Button} from "@/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@/components/ui/field";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {getTipologia, tipologieAnnuncio} from "@/features/pubblica-annuncio/types/pubblicaAnnuncio";

type SelezionaTipologiaAnnuncioProps = {
	tipologia: string;
	sottotipologia: string;
	onTipologiaChange: (value: string) => void;
	onSottotipologiaChange: (value: string) => void;
	onContinue: () => void;
};

export default function SelezionaTipologiaAnnuncio({
	tipologia,
	sottotipologia,
	onTipologiaChange,
	onSottotipologiaChange,
	onContinue,
}: SelezionaTipologiaAnnuncioProps) {
	const tipologiaSelezionata = getTipologia(tipologia);
	const richiedeSottotipologia = Boolean(tipologiaSelezionata?.sottotipologie?.length);
	const isValid = tipologia !== "" && (!richiedeSottotipologia || sottotipologia !== "");

	return (
		<div className="grid gap-8">
			<FieldGroup className="w-full">
				<FieldSet>
					<div className="mt-4">
						<FieldLegend variant="label" className="field-legend-title mb-0">Seleziona il tuo profilo:</FieldLegend>
						{tipologia === "" && <FieldDescription className="mb-2 font-medium text-red-800">Campo obbligatorio</FieldDescription>}
					</div>

					<RadioGroup className="grid w-full gap-3 sm:grid-cols-2" value={tipologia} onValueChange={onTipologiaChange}>
						{tipologieAnnuncio.map((opzione) => (
							<FieldLabel key={opzione.valore} htmlFor={opzione.valore} className="group/card">
								<Field orientation="horizontal" className="rounded-lg transition-all group-has-[data-checked]/card:bg-fuchsia-100">
									<FieldContent>
										<FieldTitle className="field-content-title gap-1.5">
											{opzione.icona && <DynamicLucideIcon iconName={opzione.icona} className="size-4" />}
											{opzione.nome}
										</FieldTitle>
										<FieldDescription>{opzione.descrizione}</FieldDescription>
									</FieldContent>
									<RadioGroupItem value={opzione.valore} id={opzione.valore} />
								</Field>
							</FieldLabel>
						))}
					</RadioGroup>
				</FieldSet>

				{richiedeSottotipologia && tipologiaSelezionata?.sottotipologie && (
					<FieldSet>
						<div className="mt-4">
							<FieldLegend variant="label" className="field-legend-title mb-0">Seleziona la tipologia di annuncio:</FieldLegend>
							{sottotipologia === "" && <FieldDescription className="mb-2 font-medium text-red-800">Campo obbligatorio</FieldDescription>}
						</div>
						<RadioGroup className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2" value={sottotipologia} onValueChange={onSottotipologiaChange}>
							{tipologiaSelezionata.sottotipologie.map((opzione) => (
								<FieldLabel key={opzione.valore} htmlFor={`sotto-${opzione.valore}`} className="group/card">
									<Field orientation="horizontal" className="rounded-lg transition-all group-has-[data-checked]/card:bg-fuchsia-100">
										<FieldContent>
											<FieldTitle className="field-content-title gap-1.5">
												{opzione.icona && <DynamicLucideIcon iconName={opzione.icona} className="me-1.5 size-4 sm:me-0" />}
												{opzione.nome}
											</FieldTitle>
											{opzione.descrizione && <FieldDescription>{opzione.descrizione}</FieldDescription>}
										</FieldContent>
										<RadioGroupItem value={opzione.valore} id={`sotto-${opzione.valore}`} />
									</Field>
								</FieldLabel>
							))}
						</RadioGroup>
					</FieldSet>
				)}
			</FieldGroup>

			<div className="flex justify-end">
				<Tooltip>
					<TooltipTrigger render={<span />}><Button disabled={!isValid} onClick={onContinue}>Avanti</Button></TooltipTrigger>
					{!isValid && <TooltipContent><p>Campi obbligatori mancanti!</p></TooltipContent>}
				</Tooltip>
			</div>
		</div>
	);
}

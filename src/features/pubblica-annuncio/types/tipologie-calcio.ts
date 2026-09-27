export const TIPOLOGIA_CALCIO_OPTIONS = ["Calcio 11", "Calcio 8", "Calcio 7", "Calcio 5"] as const;

const LEGACY_TIPOLOGIA_CALCIO_ALIASES: Readonly<Record<string, string>> = {
	"Calcio a 11": "Calcio 11",
	"Calcio a 8": "Calcio 8",
	"Calcio a 7": "Calcio 7",
	"Calcio a 5": "Calcio 5",
};

export function normalizeTipologiaCalcio(value: string): string {
	return LEGACY_TIPOLOGIA_CALCIO_ALIASES[value] ?? value;
}

export function ordinaTipologieCalcio(values: readonly string[]): string[] {
	const knownValues = new Set<string>(TIPOLOGIA_CALCIO_OPTIONS);
	const normalizedValues = [...new Set(values.map(normalizeTipologiaCalcio))];
	const selectedValues = new Set(normalizedValues);
	const orderedValues = TIPOLOGIA_CALCIO_OPTIONS.filter((value) => selectedValues.has(value));
	const unrecognizedValues = normalizedValues.filter((value) => !knownValues.has(value));
	return [...orderedValues, ...unrecognizedValues];
}

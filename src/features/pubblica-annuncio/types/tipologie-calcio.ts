export const TIPOLOGIA_CALCIO_OPTIONS = ["Calcio a 11", "Calcio a 8", "Calcio a 7", "Calcio a 5"] as const;

export function ordinaTipologieCalcio(values: readonly string[]): string[] {
	const knownValues = new Set<string>(TIPOLOGIA_CALCIO_OPTIONS);
	const orderedValues = TIPOLOGIA_CALCIO_OPTIONS.filter((value) => values.includes(value));
	const unrecognizedValues = values.filter((value) => !knownValues.has(value));
	return [...orderedValues, ...unrecognizedValues];
}

export function normalizePlayerMeasurement(value: unknown, kind: "height" | "weight"): string | null | undefined {
	if (value == null || value === "") return null;
	if (typeof value !== "string") return undefined;
	const text = value.trim().replace(",", ".");
	if (!text) return null;
	if (!(kind === "height" ? /^\d+$/ : /^\d+(?:\.\d)?$/).test(text)) return undefined;
	if (!Number.isFinite(Number(text)) || Number(text) <= 0) return undefined;
	const [integer, decimal] = text.split(".");
	const normalized = integer.replace(/^0+(?=\d)/, "");
	return decimal && decimal !== "0" ? `${normalized}.${decimal}` : normalized;
}

export function playerMeasurementError(value: unknown, kind: "height" | "weight"): string | undefined {
	return normalizePlayerMeasurement(value, kind) === undefined
		? kind === "height" ? "Inserisci un’altezza positiva in cm, senza decimali." : "Inserisci un peso positivo in kg, con massimo un decimale."
		: undefined;
}

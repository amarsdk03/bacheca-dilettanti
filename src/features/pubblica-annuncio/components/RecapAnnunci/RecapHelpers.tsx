import {type EsperienzaAnnuncio} from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";

export function formatDataNascita(giorno: string, mese: string, anno: string) {
	return [giorno, mese, anno].filter(Boolean).join("/") || "—";
}

export function formatPeriodo(periodoDa: string, periodoA: string) {
	return [periodoDa, periodoA].filter(Boolean).join(" / ") || "—";
}

export function EsperienzeRecap({esperienze}: {esperienze: EsperienzaAnnuncio[]}) {
	if (esperienze.length === 0) {
		return null;
	}

	return (
		<div className="sm:col-span-2">
			<dt className="text-xs text-muted-foreground">Esperienze</dt>
			<dd className="font-medium">
				<ul className="grid gap-2">
					{esperienze.map((esperienza, index) => (
						<li key={esperienza.id}>
							<p>
								{esperienza.titolo || `Esperienza ${index + 1}`}
								{esperienza.ente ? ` · ${esperienza.ente}` : ""}
								{esperienza.periodoDa || esperienza.periodoA
									? ` · ${formatPeriodo(esperienza.periodoDa, esperienza.periodoA)}`
									: ""}
							</p>
							{esperienza.descrizione.trim() !== "" && (
								<p className="mt-1 whitespace-pre-wrap text-muted-foreground">
									{esperienza.descrizione}
								</p>
							)}
						</li>
					))}
				</ul>
			</dd>
		</div>
	);
}

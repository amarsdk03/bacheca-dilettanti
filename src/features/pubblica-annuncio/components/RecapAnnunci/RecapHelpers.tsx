import type {ReactNode} from "react";

import {type EsperienzaAnnuncio} from "@/features/pubblica-annuncio/components/InputFields/EsperienzeAnnuncioFields";
import {
	getCanaliContattoCompilati,
	type ContattiAnnuncio,
} from "@/features/pubblica-annuncio/components/InputFields/ContattiAnnuncio";

export function formatDataNascita(giorno: string, mese: string, anno: string) {
	return [giorno, mese, anno].filter(Boolean).join("/") || "—";
}

export function formatPeriodo(periodoDa: string, periodoA: string) {
	return [periodoDa, periodoA].filter(Boolean).join(" / ") || "—";
}

export function formatContatti(contatti: ContattiAnnuncio) {
	return getCanaliContattoCompilati(contatti)
		.map((canale) => `${canale.etichetta}: ${contatti[canale.valore]}`)
		.join(" · ") || "—";
}

export function RecapField({label, children, wide = false}: {label: string; children: ReactNode; wide?: boolean}) {
	return (
		<div className={wide ? "sm:col-span-2" : undefined}>
			<dt className="text-xs text-muted-foreground">{label}</dt>
			<dd className="whitespace-pre-wrap font-medium">{children || "—"}</dd>
		</div>
	);
}

export function PremiumLinkRecap({link}: {link: string}) {
	if (link.trim() === "") return null;

	return (
		<RecapField label="Link annuncio (Premium)" wide>
			<a
				href={link}
				target="_blank"
				rel="noreferrer"
				className="break-all text-fuchsia-700 underline underline-offset-2"
			>
				{link}
			</a>
		</RecapField>
	);
}

export function PremiumImageRecap({image}: {image: File | null}) {
	if (!image) return null;

	return (
		<RecapField label="Immagine dell'annuncio" wide>
			{image.name}
		</RecapField>
	);
}

export function RegioniRecap({
	regioni,
	cittaComuniPerRegione,
}: {
	regioni: string[];
	cittaComuniPerRegione: Record<string, string[]>;
}) {
	return (
		<div className="sm:col-span-2">
			<dt className="text-xs text-muted-foreground">Regioni interessate</dt>
			<dd className="mt-1 flex flex-wrap gap-1.5">
				{regioni.length > 0
					? regioni.map((regione) => {
						const localita = cittaComuniPerRegione[regione] ?? [];
						return (
							<span key={regione} className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-xs font-medium text-fuchsia-800">
								{regione}{localita.length > 0 ? `: ${localita.join(", ")}` : ""}
							</span>
						);
					})
					: "—"}
			</dd>
		</div>
	);
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

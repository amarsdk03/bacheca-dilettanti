interface EmbedLegalBlinkProps {
	tipologia: "termini-e-condizioni" | "privacy-policy" | "cookie-policy";
}

export default function EmbedLegalBlink({tipologia}: EmbedLegalBlinkProps) {
	switch (tipologia) {
		case "termini-e-condizioni":
			return (
				<div className="w-full h-128 flex flex-col">
					<iframe
						src="https://app.legalblink.it/api/documents/6a96dd034295910029c0bccc/condizioni-d'uso-del-sito-it"
						className="h-full py-12"
					/>
				</div>
			);
		case "privacy-policy":
			return (
				<div className="w-full h-128 flex flex-col">
					<iframe
						src="https://app.legalblink.it/api/documents/6a96dd034295910029c0bccc/privacy-policy-per-siti-web-o-e-commerce-it"
						className="h-full py-12"
					/>
				</div>
			);
		case "cookie-policy":
		default:
			return (
				<div className="w-full h-128 flex flex-col">
					<h2 className={"text-lg font-semibold text-center py-64"}>In arrivo...</h2>
				</div>
			);
	}
}
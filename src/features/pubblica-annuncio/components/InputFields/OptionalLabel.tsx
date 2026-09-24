export default function OptionalLabel({recommended = false}: {recommended?: boolean}) {
	return (
		<span className="font-normal text-neutral-400 -translate-x-1">
			({recommended ? "raccomandato" : "facoltativo"})
		</span>
	);
}

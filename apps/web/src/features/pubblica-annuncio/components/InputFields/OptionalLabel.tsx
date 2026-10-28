export default function OptionalLabel({value = "facoltativo"}: {value?: string}) {
	return (
		<span className="font-normal text-neutral-400 -translate-x-1">
			({value})
		</span>
	);
}

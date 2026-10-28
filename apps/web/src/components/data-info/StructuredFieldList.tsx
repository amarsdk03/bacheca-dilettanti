export type StructuredFieldListStyle = "chips" | "rows";

export default function StructuredFieldList({
	items,
	style = "rows",
}: {
	items: readonly string[];
	style?: StructuredFieldListStyle;
}) {
	if (style === "chips") {
		return <ul className="flex flex-wrap gap-2">
			{items.map((item, index) => <li key={`${item}-${index}`} className="max-w-full rounded-md bg-accent px-2.5 py-1 text-sm text-accent-foreground wrap-anywhere">{item}</li>)}
		</ul>;
	}

	return <ul className="flex flex-col gap-2">
		{items.map((item, index) => <li key={`${item}-${index}`} className="border-l-2 border-accent pl-3 text-sm leading-6 wrap-anywhere">{item}</li>)}
	</ul>;
}

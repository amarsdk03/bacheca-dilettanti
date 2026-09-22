/** Only web navigation to another origin requires confirmation. */
export function externalNavigationUrl(href: string, origin: string): URL | null {
	try {
		const url = new URL(href, origin);
		return (url.protocol === "https:" || url.protocol === "http:") && url.origin !== new URL(origin).origin ? url : null;
	} catch {
		return null;
	}
}

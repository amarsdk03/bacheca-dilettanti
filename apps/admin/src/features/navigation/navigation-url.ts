/** Reject unsafe schemes before rendering href, including on the server. */
export function safeNavigationHref(href: string): string | undefined {
  if (!href.trim() || /[\u0000-\u001f\u007f]/.test(href)) return;
  try {
    const url = new URL(href, "https://admin.invalid");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return;
    return href.trim();
  } catch { return; }
}

export function classifyNavigation(href: string, origin: string) {
  const safe = safeNavigationHref(href);
  if (!safe) return { kind: "invalid" as const };
  try {
    const url = new URL(safe, origin);
    return { kind: url.origin === new URL(origin).origin ? "internal" as const : "external" as const, url };
  } catch { return { kind: "invalid" as const }; }
}

/** Neue Such-URL mit geänderten Parametern; leere Werte fallen weg, Seite springt auf 1 */
export function withParams(url: URL, patch: Record<string, string | number | null | undefined>, keepPage = false): string {
	const u = new URL(url);
	for (const [k, v] of Object.entries(patch)) {
		if (v === null || v === undefined || v === '') u.searchParams.delete(k);
		else u.searchParams.set(k, String(v));
	}
	if (!keepPage && !('seite' in patch)) u.searchParams.delete('seite');
	return `${u.pathname}${u.search}`;
}

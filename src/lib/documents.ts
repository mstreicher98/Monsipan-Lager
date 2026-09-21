/** Materialbeschreibungen und andere PDFs am Artikel – geteilt zwischen Browser und Server */

export const DOCUMENT_KIND_LABELS = {
	materialbeschreibung: 'Materialbeschreibung',
	sicherheitsdatenblatt: 'Sicherheitsdatenblatt',
	sonstiges: 'Sonstiges'
} as const;

export type DocumentKind = keyof typeof DOCUMENT_KIND_LABELS;

/** Größte erlaubte PDF-Datei */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

/** "REMO_2000_Merkblatt.pdf" → "REMO 2000 Merkblatt" – als Vorschlag für den Titel */
export function titleFromFileName(name: string): string {
	return name
		.replace(/\.pdf$/i, '')
		.replace(/_+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 120);
}

export function fileSizeLabel(bytes: number): string {
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / 1024 / 1024).toLocaleString('de-AT', { maximumFractionDigits: 1 })} MB`;
}

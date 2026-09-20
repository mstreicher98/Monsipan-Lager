/**
 * CSV für Excel (österreichische Einstellungen): Semikolon, Dezimalkomma,
 * UTF-8 mit BOM, damit Umlaute korrekt ankommen.
 */
type Cell = string | number | null | undefined | Date;

const dec = new Intl.NumberFormat('de-AT', { maximumFractionDigits: 3, useGrouping: false });
const dt = new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function cell(v: Cell): string {
	if (v == null) return '';
	let s: string;
	if (v instanceof Date) s = dt.format(v);
	else if (typeof v === 'number') s = Number.isFinite(v) ? dec.format(v) : '';
	else s = v;
	// Formeln in Excel verhindern
	if (/^[=+\-@\t\r]/.test(s) && typeof v === 'string') s = `'${s}`;
	return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
	return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

export function csvResponse(filename: string, body: string): Response {
	return new Response(body, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${filename}"`,
			'cache-control': 'no-store'
		}
	});
}

export function today(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

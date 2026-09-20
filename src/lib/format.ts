export const UNITS = [
	{ value: 'kg', label: 'kg' },
	{ value: 'l', label: 'Liter' },
	{ value: 'm', label: 'Meter' },
	{ value: 'm2', label: 'm²' },
	{ value: 'stk', label: 'Stück' }
] as const;

export function unitLabel(unit: string | null | undefined): string {
	if (!unit) return '';
	if (unit === 'm2') return 'm²';
	if (unit === 'stk') return 'Stk';
	return unit;
}

const nf = new Intl.NumberFormat('de-AT', { maximumFractionDigits: 2 });
const intf = new Intl.NumberFormat('de-AT', { maximumFractionDigits: 0 });

export function num(value: number | null | undefined): string {
	if (value == null || Number.isNaN(value)) return '–';
	return nf.format(value);
}

export function int(value: number | null | undefined): string {
	if (value == null || Number.isNaN(value)) return '–';
	return intf.format(value);
}

/** "15 kg" – Inhalt eines Stücks */
export function packageLabel(size: number | null | undefined, unit: string | null | undefined): string {
	if (size == null) return unit && unit !== 'stk' ? unitLabel(unit) : '';
	return `${nf.format(size)} ${unitLabel(unit)}`;
}

/** Gesamtmenge in der Basiseinheit, z. B. 12 Stück × 15 kg = "180 kg" */
export function amountLabel(qty: number, size: number | null | undefined, unit: string | null | undefined): string {
	if (size == null || !unit || unit === 'stk') return '';
	return `${nf.format(qty * size)} ${unitLabel(unit)}`;
}

const dateFmt = new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('de-AT', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit'
});
const timeFmt = new Intl.DateTimeFormat('de-AT', { hour: '2-digit', minute: '2-digit' });
const monthFmt = new Intl.DateTimeFormat('de-AT', { month: 'short', year: '2-digit' });
const monthLongFmt = new Intl.DateTimeFormat('de-AT', { month: 'long', year: 'numeric' });

type DateLike = Date | number | string | null | undefined;
const toDate = (d: DateLike) => (d == null ? null : d instanceof Date ? d : new Date(d));

export function date(d: DateLike): string {
	const v = toDate(d);
	return v ? dateFmt.format(v) : '–';
}

export function dateTime(d: DateLike): string {
	const v = toDate(d);
	return v ? dateTimeFmt.format(v) : '–';
}

/** "Heute, 14:05" / "Gestern, 09:12" / "12.09.2026, 08:00" */
export function relativeDateTime(d: DateLike, now = new Date()): string {
	const v = toDate(d);
	if (!v) return '–';
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	const t = v.getTime();
	if (t >= startOfToday) return `Heute, ${timeFmt.format(v)}`;
	if (t >= startOfToday - 86_400_000) return `Gestern, ${timeFmt.format(v)}`;
	return dateTimeFmt.format(v);
}

/** "2026-09" → "Sep. 26" */
export function monthShort(key: string): string {
	const [y, m] = key.split('-').map(Number);
	return monthFmt.format(new Date(y, m - 1, 1));
}

export function monthLong(key: string): string {
	const [y, m] = key.split('-').map(Number);
	return monthLongFmt.format(new Date(y, m - 1, 1));
}

export function fullName(u: { firstName?: string | null; lastName?: string | null; username?: string | null }): string {
	const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
	return n || u.username || '';
}

export function initials(u: { firstName?: string | null; lastName?: string | null; username?: string | null }): string {
	const a = (u.firstName ?? '').trim()[0] ?? '';
	const b = (u.lastName ?? '').trim()[0] ?? '';
	const s = (a + b).toUpperCase();
	return s || (u.username ?? '?').slice(0, 2).toUpperCase();
}

export const MOVEMENT_LABELS = {
	IN: 'Einbuchen',
	OUT: 'Ausbuchen',
	TRANSFER: 'Umlagern',
	RETURN: 'Rückgabe',
	INVENTORY: 'Inventur'
} as const;

/** Für Listen: Substantiv statt Verb */
export const MOVEMENT_NOUNS = {
	IN: 'Wareneingang',
	OUT: 'Ausgabe',
	TRANSFER: 'Umlagerung',
	RETURN: 'Rückgabe',
	INVENTORY: 'Inventur'
} as const;

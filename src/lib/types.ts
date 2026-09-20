import type { ParsedScan } from '$lib/scan/parse';

export interface ProductSummary {
	id: number;
	name: string;
	articleNumber: string | null;
	manufacturer: string;
	packageSize: number | null;
	unit: string;
	minStock: number | null;
	targetStock: number | null;
	active: boolean;
	categoryId: number | null;
	categoryName: string | null;
	colorId: number | null;
	colorName: string | null;
	colorHex: string | null;
	colorRal: string | null;
	total: number;
}

export interface LocationQty {
	locationId: number;
	name: string;
	quantity: number;
}

export interface LookupResult {
	product: (ProductSummary & { locations: LocationQty[] }) | null;
	parsed: ParsedScan | null;
	matched: string | null;
}

export interface Option {
	id: number;
	name: string;
}

export interface PartyOption extends Option {
	kind: 'person' | 'gruppe';
}

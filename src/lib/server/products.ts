import { and, eq, inArray, ne, sql, type SQL } from 'drizzle-orm';
import { db, type Tx } from './db';
import { col } from './db/sql';
import { categories, colors, locations, productCodes, products, stock } from './db/schema';
import { displayGtin, normalizeCode, parseScan } from '$lib/scan/parse';
import type { ProductSummary } from '$lib/types';

type Conn = typeof db | Tx;

/** Kleinschreibung + Umlaute ausschreiben: "GRÜN" und "gruen" finden sich gegenseitig */
export function fold(s: string): string {
	return s
		.toLowerCase()
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/ß/g, 'ss')
		.replace(/\s+/g, ' ')
		.trim();
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export const totalSql = sql<number>`coalesce((select sum(${col(stock.quantity)}) from ${stock} where ${col(stock.productId)} = ${col(products.id)}), 0)`;

/** Felder, die fast jede Liste braucht */
export const productSummaryFields = {
	id: products.id,
	name: products.name,
	articleNumber: products.articleNumber,
	manufacturer: products.manufacturer,
	packageSize: products.packageSize,
	unit: products.unit,
	minStock: products.minStock,
	targetStock: products.targetStock,
	active: products.active,
	categoryId: products.categoryId,
	categoryName: categories.name,
	colorId: products.colorId,
	colorName: colors.name,
	colorHex: colors.hex,
	colorRal: colors.ral,
	total: totalSql.mapWith(Number)
};

export type { ProductSummary };

export function summaryQuery(conn: Conn = db) {
	return conn
		.select(productSummaryFields)
		.from(products)
		.leftJoin(categories, eq(categories.id, products.categoryId))
		.leftJoin(colors, eq(colors.id, products.colorId));
}

/** Bestand je Lagerort (nur > 0) für mehrere Artikel */
export async function stockByLocation(productIds: number[], conn: Conn = db) {
	if (!productIds.length) return new Map<number, { locationId: number; quantity: number }[]>();
	const rows = await conn
		.select({ productId: stock.productId, locationId: stock.locationId, quantity: stock.quantity })
		.from(stock)
		.where(and(inArray(stock.productId, productIds), sql`${stock.quantity} <> 0`))
		.all();
	const map = new Map<number, { locationId: number; quantity: number }[]>();
	for (const r of rows) {
		const list = map.get(r.productId) ?? [];
		list.push({ locationId: r.locationId, quantity: r.quantity });
		map.set(r.productId, list);
	}
	return map;
}

/** Artikel inklusive Bestand je Lagerort (mit Namen) */
export async function productWithLocations(id: number) {
	const product = await summaryQuery().where(eq(products.id, id)).get();
	if (!product) return null;
	const locs = await db
		.select({ locationId: stock.locationId, name: locations.name, quantity: stock.quantity, sortOrder: locations.sortOrder })
		.from(stock)
		.innerJoin(locations, eq(locations.id, stock.locationId))
		.where(and(eq(stock.productId, id), sql`${stock.quantity} <> 0`))
		.orderBy(locations.sortOrder, locations.name)
		.all();
	return { ...product, locations: locs.map(({ sortOrder: _s, ...l }) => l) };
}

/* --------------------------------------------------------------- Suche */

/** Bedingungen für die Freitextsuche; gescannte DataMatrix-Texte werden als Codes gesucht */
export async function searchCondition(q: string): Promise<SQL | undefined> {
	const query = q.trim();
	if (!query) return undefined;
	const parsed = parseScan(query);
	if ((parsed.format === 'kv' || parsed.format === 'gs1' || parsed.format === 'swarco') && parsed.candidates.length) {
		const ids = await db
			.select({ id: productCodes.productId })
			.from(productCodes)
			.where(inArray(productCodes.normalized, parsed.candidates))
			.all();
		return ids.length ? inArray(products.id, ids.map((r) => r.id)) : sql`0`;
	}
	const terms = fold(query).split(' ').filter(Boolean).slice(0, 8);
	const parts = terms.map((t) => sql`${products.searchText} LIKE ${`%${escapeLike(t)}%`} ESCAPE '\\'`);
	return parts.length ? and(...parts) : undefined;
}

export async function quickSearch(q: string, limit = 8, includeInactive = false): Promise<ProductSummary[]> {
	const cond = await searchCondition(q);
	if (!cond) return [];
	return summaryQuery()
		.where(includeInactive ? cond : and(cond, eq(products.active, true)))
		.orderBy(products.name)
		.limit(limit)
		.all();
}

/* --------------------------------------------------------------- Codes */

export async function lookupByCandidates(candidates: string[]) {
	if (!candidates.length) return null;
	const rows = await db
		.select({ normalized: productCodes.normalized, productId: productCodes.productId })
		.from(productCodes)
		.where(inArray(productCodes.normalized, candidates))
		.all();
	for (const c of candidates) {
		const hit = rows.find((r) => r.normalized === c);
		if (hit) {
			const product = await summaryQuery().where(eq(products.id, hit.productId)).get();
			if (product) return { product, matched: c };
		}
	}
	return null;
}

export class CodeConflictError extends Error {
	constructor(
		public code: string,
		public productName: string
	) {
		super(`Der Code ${code} gehört schon zu „${productName}“.`);
	}
}

export interface CodeInput {
	code: string;
	kind: 'ean' | 'artikel' | 'sonstige';
}

/** Setzt die Codes eines Artikels; die Artikelnummer ist immer auch scanbar */
export async function syncCodes(tx: Tx, productId: number, articleNumber: string | null, codes: CodeInput[]) {
	const wanted = new Map<string, CodeInput>();
	if (articleNumber?.trim()) {
		const n = normalizeCode(articleNumber);
		if (n) wanted.set(n, { code: articleNumber.trim(), kind: 'artikel' });
	}
	for (const c of codes) {
		const n = normalizeCode(c.code);
		if (n && !wanted.has(n)) wanted.set(n, { code: c.code.trim(), kind: c.kind });
	}
	const keys = [...wanted.keys()];
	if (keys.length) {
		const taken = await tx
			.select({ normalized: productCodes.normalized, name: products.name })
			.from(productCodes)
			.innerJoin(products, eq(products.id, productCodes.productId))
			.where(and(inArray(productCodes.normalized, keys), ne(productCodes.productId, productId)))
			.get();
		if (taken) throw new CodeConflictError(wanted.get(taken.normalized)!.code, taken.name);
	}
	await tx.delete(productCodes).where(eq(productCodes.productId, productId));
	for (const [normalized, c] of wanted) {
		await tx.insert(productCodes).values({ productId, code: c.code, normalized, kind: c.kind });
	}
}

export async function addCode(productId: number, code: string, kind: CodeInput['kind'] = 'sonstige') {
	const normalized = normalizeCode(code);
	if (!normalized) throw new Error('Leerer Code');
	await db.transaction(async (tx) => {
		const existing = await tx
			.select({ productId: productCodes.productId, name: products.name })
			.from(productCodes)
			.innerJoin(products, eq(products.id, productCodes.productId))
			.where(eq(productCodes.normalized, normalized))
			.get();
		if (existing && existing.productId !== productId) throw new CodeConflictError(code, existing.name);
		if (!existing) await tx.insert(productCodes).values({ productId, code: code.trim(), normalized, kind });
		await refreshSearchText(tx, productId);
	});
}

/* ----------------------------------------------------------- Suchtext */

export async function refreshSearchText(conn: Conn, productId: number) {
	const p = await conn
		.select({
			name: products.name,
			articleNumber: products.articleNumber,
			manufacturer: products.manufacturer,
			category: categories.name,
			color: colors.name,
			ral: colors.ral
		})
		.from(products)
		.leftJoin(categories, eq(categories.id, products.categoryId))
		.leftJoin(colors, eq(colors.id, products.colorId))
		.where(eq(products.id, productId))
		.get();
	if (!p) return;
	const codes = await conn
		.select({ code: productCodes.code, normalized: productCodes.normalized })
		.from(productCodes)
		.where(eq(productCodes.productId, productId))
		.all();
	const parts = [p.name, p.articleNumber, p.manufacturer, p.category, p.color, p.ral && `RAL ${p.ral} RAL${p.ral}`];
	for (const c of codes) parts.push(c.code, displayGtin(c.normalized));
	await conn
		.update(products)
		.set({ searchText: fold(parts.filter(Boolean).join(' ')) })
		.where(eq(products.id, productId));
}

/** Nach dem Umbenennen einer Materialart oder Farbe */
export async function refreshAllSearchTexts() {
	const ids = await db.select({ id: products.id }).from(products).all();
	for (const { id } of ids) await refreshSearchText(db, id);
}

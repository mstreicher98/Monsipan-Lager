import { and, eq, isNotNull, ne, sql } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { createBackup } from './backup';
import { client, db } from './db';
import { categories, colors, locations, movements, parties, productCodes, productDocuments, products, stock, users } from './db/schema';
import { seedCatalog } from './db/seed';
import { broadcast } from './events';

const n = async (table: SQLiteTable) => Number((await db.select({ n: sql<number>`count(*)` }).from(table).get())?.n ?? 0);

/** Was beim Zurücksetzen verloren geht – für die Übersicht vor der Bestätigung */
export async function dataCounts(keepUserId: number) {
	const [prod, mov, loc, par, cat, col, others] = await Promise.all([
		n(products),
		n(movements),
		n(locations),
		n(parties),
		n(categories),
		n(colors),
		db
			.select({ n: sql<number>`count(*)` })
			.from(users)
			.where(and(ne(users.id, keepUserId), eq(users.owner, false), sql`${users.deletedAt} is null`))
			.get()
	]);
	return {
		products: prod,
		movements: mov,
		locations: loc,
		parties: par,
		categories: cat,
		colors: col,
		otherUsers: Number(others?.n ?? 0)
	};
}

export { isResetPhrase, RESET_PHRASE } from '$lib/reset-phrase';

export interface ResetOptions {
	/** Wer zurücksetzt – dieses Konto bleibt immer bestehen */
	keepUserId: number;
	deleteOtherUsers: boolean;
	/** Standard-Materialarten und RAL-Verkehrsfarben direkt wieder anlegen */
	reseedCatalog: boolean;
}

/**
 * Löscht Artikel, Codes, Bestand, Bewegungen und alle Stammdaten.
 * Vorher wird eine Sicherung angelegt; gelöscht wird in einer Transaktion.
 */
export async function resetAllData(opts: ResetOptions): Promise<{ backup: string }> {
	const backup = await createBackup('before-reset');

	await db.transaction(async (tx) => {
		await tx.delete(movements);
		await tx.delete(stock);
		await tx.delete(productCodes);
		// Die PDF-Dateien bleiben liegen, bis das tägliche Aufräumen sie nach 90 Tagen entfernt
		await tx.delete(productDocuments);
		await tx.delete(products);
		// Partie-Zuordnung lösen, bevor die Partien verschwinden
		await tx.update(users).set({ partyId: null });
		// Gelöschte Benutzer existierten nur noch für die Historie – die ist jetzt weg
		await tx.delete(users).where(isNotNull(users.deletedAt));
		// Das Inhaber-Konto bleibt immer erhalten, auch wenn jemand anderes zurücksetzt
		if (opts.deleteOtherUsers) await tx.delete(users).where(and(ne(users.id, opts.keepUserId), eq(users.owner, false)));
		await tx.delete(parties);
		await tx.delete(locations);
		await tx.delete(categories);
		await tx.delete(colors);
		// Nummerierung neu beginnen
		await tx.run(
			sql`delete from sqlite_sequence where name in ('movements', 'product_codes', 'product_documents', 'products', 'parties', 'locations', 'categories', 'colors')`
		);
	});

	if (opts.reseedCatalog) await seedCatalog();
	// Datei verkleinern; Fehler hier sind unkritisch
	await client.execute('VACUUM').catch(() => {});
	// Offene Browser laden ihre Daten neu
	broadcast('stock', { productIds: [] });
	return { backup };
}

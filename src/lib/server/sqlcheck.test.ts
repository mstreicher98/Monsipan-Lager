import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { describe, expect, it } from 'vitest';
import { colors, products } from './db/schema';
import { col } from './db/sql';

describe('korrelierte Unterabfragen', () => {
	it('qualifizieren Spalten auch ohne Join', () => {
		const db = drizzle(createClient({ url: ':memory:' }));
		const q = db
			.select({ n: sql`(select count(*) from ${products} where ${col(products.colorId)} = ${col(colors.id)})` })
			.from(colors)
			.toSQL();
		expect(q.sql).toContain('"products"."color_id" = "colors"."id"');
	});

	it('zählen Artikel je Farbe richtig', async () => {
		const db = drizzle(createClient({ url: ':memory:' }));
		await migrate(db, { migrationsFolder: 'drizzle' });
		const [gelb, rot] = await db.insert(colors).values([{ name: 'Gelb' }, { name: 'Rot' }]).returning();
		await db.insert(products).values([
			{ name: 'A', colorId: gelb.id },
			{ name: 'B', colorId: gelb.id },
			{ name: 'C', colorId: null }
		]);
		const rows = await db
			.select({
				name: colors.name,
				n: sql<number>`(select count(*) from ${products} where ${col(products.colorId)} = ${col(colors.id)})`.mapWith(Number)
			})
			.from(colors)
			.all();
		expect(rows).toEqual([
			{ name: 'Gelb', n: 2 },
			{ name: rot.name, n: 0 }
		]);
	});
});

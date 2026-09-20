import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lager-restore-'));

vi.mock('$env/dynamic/private', () => ({ env: { DATA_DIR: TMP, DEMO_DATA: 'false' } }));
vi.mock('$app/environment', () => ({ dev: true, browser: false, building: false, version: 'test' }));

const { db, ensureDatabase } = await import('./db');
const { categories, products } = await import('./db/schema');
const { createBackup, BACKUP_DIR, listBackups } = await import('./backup');
const { inspectBackup, restoreFromFile, RestoreError } = await import('./restore');

async function addProduct(name: string) {
	const category = await db.insert(categories).values({ name: `Art ${name}` }).returning({ id: categories.id }).get();
	await db
		.insert(products)
		.values({ name, unit: 'Stk', categoryId: category.id, searchText: name.toLowerCase() })
		.run();
}

const productNames = async () => (await db.select({ name: products.name }).from(products).all()).map((p) => p.name).sort();

beforeAll(async () => {
	await ensureDatabase();
});

afterAll(() => {
	try {
		fs.rmSync(TMP, { recursive: true, force: true });
	} catch {
		// Windows gibt die geöffnete Datenbankdatei erst nach dem Prozessende frei
	}
});

describe('Sicherung prüfen', () => {
	it('lehnt Dateien ab, die keine SQLite-Datenbank sind', async () => {
		const file = path.join(TMP, 'kaputt.db');
		fs.writeFileSync(file, 'nur Text');
		await expect(inspectBackup(file)).rejects.toThrow(RestoreError);
	});

	it('lehnt fremde SQLite-Datenbanken ab', async () => {
		const { createClient } = await import('@libsql/client');
		const file = path.join(TMP, 'fremd.db');
		const c = createClient({ url: `file:${file}` });
		await c.execute('create table irgendwas (id integer primary key)');
		c.close();
		await expect(inspectBackup(file)).rejects.toThrow(/Monsipan Lager/);
	});

	it('liest die Zahlen einer echten Sicherung', async () => {
		await addProduct('Prüfartikel');
		const name = await createBackup();
		const info = await inspectBackup(path.join(BACKUP_DIR, name));
		expect(info.products).toBe(1);
		expect(info.users).toBe(1);
		expect(info.size).toBeGreaterThan(0);
	});
});

describe('Sicherung einspielen', () => {
	it('stellt den alten Stand wieder her und sichert den jetzigen vorher', async () => {
		// Stand 1: ein Artikel, davon eine Sicherung
		expect(await productNames()).toEqual(['Prüfartikel']);
		const backup = await createBackup();

		// Stand 2: ein zweiter Artikel kommt dazu
		await addProduct('Zweiter Artikel');
		expect(await productNames()).toEqual(['Prüfartikel', 'Zweiter Artikel']);

		const result = await restoreFromFile(path.join(BACKUP_DIR, backup), 'Test');
		expect(result.contents.products).toBe(1);

		// Die laufende Verbindung zeigt auf die eingespielte Datei
		expect(await productNames()).toEqual(['Prüfartikel']);

		// Der Stand von vorher ist als eigene Sicherung erhalten
		const before = listBackups().find((b) => b.file === result.backup);
		expect(before?.kind).toBe('before-restore');
		expect((await inspectBackup(path.join(BACKUP_DIR, result.backup))).products).toBe(2);
	});

	it('lässt sich danach normal weiter benutzen', async () => {
		await addProduct('Nach dem Einspielen');
		expect(await productNames()).toEqual(['Nach dem Einspielen', 'Prüfartikel']);
	});
});

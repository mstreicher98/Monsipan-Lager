import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

export const DATA_DIR = path.resolve(env.DATA_DIR || 'data');
export const DB_FILE = path.join(DATA_DIR, 'lager.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

// libsql öffnet mehrere Verbindungen; Transaktionen laufen als BEGIN IMMEDIATE,
// damit sich gleichzeitige Buchungen nie überschneiden.
export const client = createClient({ url: `file:${DB_FILE}`, timeout: 8000 });
export const db = drizzle(client, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];

let ready: Promise<void> | null = null;

function migrationsFolder(): string {
	const candidates = [path.resolve('drizzle'), path.resolve(process.cwd(), 'drizzle')];
	for (const c of candidates) if (fs.existsSync(path.join(c, 'meta', '_journal.json'))) return c;
	throw new Error('Migrationsordner "drizzle" nicht gefunden');
}

/** Einmalig beim Start: WAL, Migrationen, Grunddaten */
export function ensureDatabase(): Promise<void> {
	ready ??= (async () => {
		await client.execute('PRAGMA journal_mode = WAL');
		await client.execute('PRAGMA synchronous = NORMAL');
		await migrate(db, { migrationsFolder: migrationsFolder() });
		const { bootstrap } = await import('./seed');
		await bootstrap();
	})();
	return ready;
}

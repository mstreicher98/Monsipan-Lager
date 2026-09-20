import fs from 'node:fs';
import path from 'node:path';
import { client, DATA_DIR } from './db';
import { purgeExpired } from './auth';

export const BACKUP_DIR = path.join(DATA_DIR, 'backups');
/** Wie viele normale Sicherungen bzw. Sicherungen vor einem Zurücksetzen erhalten bleiben */
const KEEP_REGULAR = 14;
const KEEP_BEFORE_RESET = 10;
const RESET_SUFFIX = '-vor-reset';

/** Gültige Dateinamen – auch zum Absichern des Downloads */
export const BACKUP_FILE_RE = /^lager-[\d-]+(-vor-reset)?\.db$/;

export function listBackups() {
	if (!fs.existsSync(BACKUP_DIR)) return [];
	return fs
		.readdirSync(BACKUP_DIR)
		.filter((f) => BACKUP_FILE_RE.test(f))
		.map((f) => {
			const stat = fs.statSync(path.join(BACKUP_DIR, f));
			return { file: f, size: stat.size, createdAt: stat.mtime, beforeReset: f.includes(RESET_SUFFIX) };
		})
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Konsistente Kopie der laufenden Datenbank (VACUUM INTO). Vorhandene Sicherungen
 * werden nie überschrieben; alte Stände werden getrennt nach Art aufgeräumt.
 */
export async function createBackup(kind: 'regular' | 'before-reset' = 'regular'): Promise<string> {
	fs.mkdirSync(BACKUP_DIR, { recursive: true });
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
	const suffix = kind === 'before-reset' ? RESET_SUFFIX : '';
	let name = `lager-${stamp}${suffix}.db`;
	for (let i = 2; fs.existsSync(path.join(BACKUP_DIR, name)); i++) name = `lager-${stamp}-${i}${suffix}.db`;
	await client.execute({ sql: 'VACUUM INTO ?', args: [path.join(BACKUP_DIR, name)] });

	const all = listBackups();
	const stale = [
		...all.filter((b) => !b.beforeReset).slice(KEEP_REGULAR),
		...all.filter((b) => b.beforeReset).slice(KEEP_BEFORE_RESET)
	];
	for (const old of stale) fs.rmSync(path.join(BACKUP_DIR, old.file), { force: true });
	return name;
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Stündlich prüfen: einmal pro Nacht (ab 2 Uhr) sichern und Altlasten löschen */
export function scheduleMaintenance() {
	if (timer) return;
	const tick = async () => {
		try {
			const now = new Date();
			const today = now.toDateString();
			const latest = listBackups().find((b) => !b.beforeReset);
			if (now.getHours() >= 2 && (!latest || latest.createdAt.toDateString() !== today)) {
				const name = await createBackup();
				console.info(`[backup] ${name} erstellt`);
			}
			await purgeExpired();
		} catch (err) {
			console.error('[backup]', err);
		}
	};
	timer = setInterval(tick, 60 * 60_000);
	timer.unref?.();
	setTimeout(tick, 30_000).unref?.();
}

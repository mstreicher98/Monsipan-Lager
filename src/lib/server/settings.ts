import { db } from './db';
import { settings } from './db/schema';
import { ROLES, type Role } from '$lib/permissions';

export interface AppSettings {
	/** Wer Warn-E-Mails zum Mindestbestand bekommt */
	alertRoles: Role[];
	alertEmailsEnabled: boolean;
}

const DEFAULTS: AppSettings = {
	alertRoles: ['admin', 'bauleiter'],
	alertEmailsEnabled: true
};

let cache: AppSettings | null = null;

export async function getSettings(): Promise<AppSettings> {
	if (cache) return cache;
	const rows = await db.select().from(settings).all();
	const out: AppSettings = { ...DEFAULTS };
	for (const r of rows) {
		try {
			(out as unknown as Record<string, unknown>)[r.key] = JSON.parse(r.value);
		} catch {
			/* kaputte Einträge ignorieren */
		}
	}
	out.alertRoles = out.alertRoles.filter((r) => (ROLES as readonly string[]).includes(r));
	cache = out;
	return out;
}

/** Nach dem Einspielen einer Sicherung: gemerkte Einstellungen verwerfen */
export function clearSettingsCache() {
	cache = null;
}

export async function updateSettings(patch: Partial<AppSettings>) {
	for (const [key, value] of Object.entries(patch)) {
		const json = JSON.stringify(value);
		await db.insert(settings).values({ key, value: json }).onConflictDoUpdate({ target: settings.key, set: { value: json } });
	}
	cache = null;
}

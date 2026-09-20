/**
 * Rollen und Rechte an einer Stelle. Wer eine Rolle anders zuschneiden will,
 * ändert nur die Tabelle PERMISSIONS.
 */
export const ROLES = ['admin', 'bauleiter', 'partiefuehrer', 'arbeiter', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
	admin: 'Admin',
	bauleiter: 'Bauleiter',
	partiefuehrer: 'Partieführer',
	arbeiter: 'Arbeiter',
	viewer: 'Nur ansehen'
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
	admin: 'Alles, inklusive Benutzer und Einstellungen',
	bauleiter: 'Buchen, Inventur, Korrekturen, Artikel und Stammdaten pflegen, Berichte',
	partiefuehrer: 'Bestand und Bewegungen ansehen, ein- und ausbuchen, umlagern',
	arbeiter: 'Bestand ansehen, ein- und ausbuchen, umlagern – ohne Einblick in Bewegungen',
	viewer: 'Alles ansehen außer Stammdaten, Benutzer und Einstellungen – ohne Änderungen'
};

/** Diese Rollen gehören immer zu einer Partie; sie ist beim Buchen vorausgewählt. */
export const PARTY_ROLES: readonly Role[] = ['partiefuehrer', 'arbeiter'];

export function needsParty(role: Role | undefined | null): boolean {
	return !!role && PARTY_ROLES.includes(role);
}

const PERMISSIONS = {
	'stock.book': ['admin', 'bauleiter', 'partiefuehrer', 'arbeiter'],
	'stock.inventory': ['admin', 'bauleiter'],
	'movements.view': ['admin', 'bauleiter', 'partiefuehrer', 'viewer'],
	'movements.correct': ['admin', 'bauleiter'],
	'products.manage': ['admin', 'bauleiter'],
	'masterdata.manage': ['admin', 'bauleiter'],
	'reports.view': ['admin', 'bauleiter', 'viewer'],
	'alerts.view': ['admin', 'bauleiter', 'viewer'],
	'users.manage': ['admin'],
	'settings.manage': ['admin']
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined | null, permission: Permission): boolean {
	if (!role) return false;
	return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

import { describe, expect, it } from 'vitest';
import { canBecomeOwner, denyReason, type UserRef } from './user-rules';

const owner: UserRef = { id: 1, role: 'admin', owner: true };
const admin: UserRef = { id: 2, role: 'admin', owner: false };
const admin2: UserRef = { id: 3, role: 'admin', owner: false };
const bauleiter: UserRef = { id: 4, role: 'bauleiter', owner: false };

describe('Inhaber-Regeln', () => {
	it('lässt den Inhaber Admins löschen, deaktivieren und herabstufen', () => {
		for (const action of ['delete', 'deactivate', 'role'] as const) {
			expect(denyReason(owner, admin, action)).toBeNull();
		}
	});

	it('verbietet Admins den Zugriff auf andere Admins', () => {
		expect(denyReason(admin, admin2, 'delete')).toMatch(/Nur der Inhaber/);
		expect(denyReason(admin, admin2, 'deactivate')).toMatch(/Nur der Inhaber/);
		expect(denyReason(admin, admin2, 'role')).toMatch(/Nur der Inhaber/);
		// Name, E-Mail und Passwort eines anderen Admins bleiben erlaubt
		expect(denyReason(admin, admin2, 'edit')).toBeNull();
		expect(denyReason(admin, admin2, 'password')).toBeNull();
	});

	it('schützt das Inhaber-Konto vor allen anderen', () => {
		for (const action of ['delete', 'deactivate', 'role', 'edit', 'password'] as const) {
			expect(denyReason(admin, owner, action)).toMatch(/nur der Inhaber selbst/i);
		}
	});

	it('schützt den Inhaber auch vor sich selbst', () => {
		expect(denyReason(owner, owner, 'delete')).toMatch(/Inhaberschaft übergeben/);
		expect(denyReason(owner, owner, 'role')).toMatch(/Inhaberschaft übergeben/);
		// Eigene Daten und Passwort darf der Inhaber ändern
		expect(denyReason(owner, owner, 'edit')).toBeNull();
		expect(denyReason(owner, owner, 'password')).toBeNull();
	});

	it('lässt Admins alle übrigen Benutzer verwalten', () => {
		for (const action of ['delete', 'deactivate', 'role', 'edit', 'password'] as const) {
			expect(denyReason(admin, bauleiter, action)).toBeNull();
		}
	});

	it('verbietet Admins, sich selbst herabzustufen', () => {
		expect(denyReason(admin, admin, 'role')).toMatch(/Nur der Inhaber/);
	});

	it('kennt die möglichen neuen Inhaber', () => {
		expect(canBecomeOwner({ role: 'admin', active: true, owner: false })).toBe(true);
		expect(canBecomeOwner({ role: 'admin', active: false, owner: false })).toBe(false);
		expect(canBecomeOwner({ role: 'bauleiter', active: true, owner: false })).toBe(false);
		expect(canBecomeOwner({ role: 'admin', active: true, owner: true })).toBe(false);
	});
});

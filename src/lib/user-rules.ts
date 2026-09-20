/**
 * Inhaber-Regeln: Genau ein Konto ist Inhaber (zu Beginn der erste Admin).
 * Nur der Inhaber darf Admins löschen, deaktivieren oder herabstufen; das
 * Inhaber-Konto selbst ist davor geschützt und nur vom Inhaber änderbar.
 * Die Inhaberschaft lässt sich an einen anderen aktiven Admin übergeben.
 */
import type { Role } from './permissions';

export interface UserRef {
	id: number;
	role: Role;
	owner: boolean;
}

export type UserAction = 'delete' | 'deactivate' | 'role' | 'edit' | 'password';

export const OWNER_LABEL = 'Inhaber';
export const OWNER_HINT = 'Nur der Inhaber kann Admins löschen, deaktivieren oder herabstufen.';

/** Grund, warum die Aktion nicht erlaubt ist – null heißt erlaubt */
export function denyReason(actor: UserRef, target: UserRef, action: UserAction): string | null {
	if (target.owner) {
		if (actor.id !== target.id) return 'Das Inhaber-Konto kann nur der Inhaber selbst ändern.';
		if (action === 'delete' || action === 'deactivate' || action === 'role') {
			return 'Das Inhaber-Konto kann nicht gelöscht, deaktiviert oder herabgestuft werden. Vorher die Inhaberschaft übergeben.';
		}
		return null;
	}
	if (target.role === 'admin' && !actor.owner && (action === 'delete' || action === 'deactivate' || action === 'role')) {
		return actor.id === target.id
			? 'Nur der Inhaber kann Admin-Konten herabstufen oder deaktivieren.'
			: 'Nur der Inhaber kann andere Admins löschen, deaktivieren oder herabstufen.';
	}
	return null;
}

/** An wen die Inhaberschaft übergeben werden kann: aktive Admins außer dem Inhaber selbst */
export function canBecomeOwner(target: { role: Role; active: boolean; owner: boolean }): boolean {
	return target.role === 'admin' && target.active && !target.owner;
}

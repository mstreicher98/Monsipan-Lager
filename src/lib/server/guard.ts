import { error, redirect } from '@sveltejs/kit';
import { can, type Permission } from '$lib/permissions';
import type { SessionUser } from './auth';

export function requireUser(locals: App.Locals): SessionUser {
	if (!locals.user) redirect(303, '/login');
	return locals.user;
}

export function requirePermission(locals: App.Locals, permission: Permission): SessionUser {
	const user = requireUser(locals);
	if (!can(user.role, permission)) error(403, 'Dafür fehlt dir die Berechtigung.');
	return user;
}

/** Ganze Zahl aus einem Formularfeld, sonst null */
export function intOrNull(v: FormDataEntryValue | null | undefined): number | null {
	if (v == null) return null;
	const s = String(v).trim();
	if (!s) return null;
	const n = Number(s);
	return Number.isInteger(n) ? n : null;
}

export function str(v: FormDataEntryValue | null | undefined, max = 200): string {
	return String(v ?? '')
		.trim()
		.slice(0, max);
}

import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { hashPassword, invalidateUserSessions, MIN_PASSWORD_LENGTH } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	if (!user.mustChangePassword) redirect(303, '/');
	return { username: user.username };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		if (password.length < MIN_PASSWORD_LENGTH) return fail(400, { message: `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.` });
		if (password !== confirm) return fail(400, { message: 'Die beiden Passwörter stimmen nicht überein.' });
		await db
			.update(users)
			.set({ passwordHash: await hashPassword(password), mustChangePassword: false })
			.where(eq(users.id, user.id));
		await invalidateUserSessions(user.id, locals.sessionToken ?? undefined);
		redirect(303, '/');
	}
};

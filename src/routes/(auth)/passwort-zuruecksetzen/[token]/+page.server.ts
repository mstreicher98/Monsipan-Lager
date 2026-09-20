import { fail, redirect } from '@sveltejs/kit';
import { consumePasswordReset, findPasswordReset, MIN_PASSWORD_LENGTH } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const reset = await findPasswordReset(params.token);
	return { valid: Boolean(reset), username: reset?.username ?? null };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		if (password.length < MIN_PASSWORD_LENGTH) return fail(400, { message: `Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.` });
		if (password !== confirm) return fail(400, { message: 'Die beiden Passwörter stimmen nicht überein.' });
		const userId = await consumePasswordReset(params.token, password);
		if (!userId) return fail(400, { message: 'Der Link ist abgelaufen oder wurde schon benutzt.' });
		redirect(303, '/login?zurueckgesetzt=1');
	}
};

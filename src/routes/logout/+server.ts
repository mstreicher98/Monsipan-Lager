import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, invalidateSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.sessionToken) await invalidateSession(locals.sessionToken);
	clearSessionCookie(cookies);
	redirect(303, '/login');
};
